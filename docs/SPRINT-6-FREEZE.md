# Sprint 6 Freeze — Onboarding + Adaptive Diagnostic

Status: FROZEN pending final CI on this documentation commit.
Branch: `sprint-6/onboarding-diagnostic`
Base: `sprint-5/daily-scheduler`
Do not merge without explicit product-owner approval.

## 1. Scope frozen

Sprint 6 connects onboarding, adaptive diagnostic, diagnostic calibration, and first-plan generation without changing the previously frozen long-term mastery/ability ownership model.

Frozen flow:

```
Onboarding
  -> DiagnosticSession
  -> DiagnosticSelector
  -> QuestionAttempt
  -> DiagnosticEstimate
  -> Diagnostic completion
  -> Calibration audit / planning prior
  -> DailyPlan

QuestionAttempt
  -> Outbox
  -> EvidenceBuilder
  -> Evidence
  -> StateEngine
  -> long-term Mastery / Ability state
```

Diagnostic calibration is NOT an owner of long-term `ability_states`.

## 2. Database additions

Migrations:
- `0019_onboarding_diagnostic.sql`
- `0020_diagnostic_calibrations.sql`
- `0021_diagnostic_concurrency.sql`

Key entities:
- onboarding_profiles
- diagnostic_policies
- diagnostic_sessions
- diagnostic_items
- diagnostic_estimates
- diagnostic_calibrations

Only one Active diagnostic session per student is allowed by a partial unique index.

Deployment note: migration 0021 assumes existing databases do not already contain duplicate Active sessions. Any destructive cleanup requires explicit review.

## 3. Onboarding guarantees

`OnboardingService.complete`:
- locks the student row
- validates daily minutes and primary goal
- versions onboarding profiles instead of overwriting history
- writes `student_config_history` in the same transaction
- updates region when explicitly supplied
- when an existing `curriculum_position_id` is supplied, validates student ownership and safely switches the student's current curriculum position
- does not invent or create textbook/unit/section curriculum positions from incomplete input

Verified PostgreSQL behavior:
- profile + config persist together
- invalid daily minutes persist neither
- repeated direct completion creates a new profile version and config history
- selected curriculum position becomes the source consumed by `CandidateBuilder.schoolSync`
- another student's curriculum position is rejected without partial onboarding writes
- same-key concurrent HTTP onboarding executes once for the tested path

## 4. Diagnostic session and selector guarantees

Session creation:
- locks the student before active-session check
- reuses an existing Active session
- database partial unique index provides a second concurrency guard

Selector:
- serializes `next()` per diagnostic session with `FOR UPDATE`
- reuses an unanswered pending item
- evaluates stop state only after pending-item reuse
- ranks unresolved dimensions by current uncertainty and coverage count
- if the highest-ranked dimension lacks eligible content, tries later configured dimensions
- returns `CONTENT_COVERAGE_INSUFFICIENT` only when no configured unresolved dimension has eligible Published + Approved diagnostic/assessment content
- does not fail session creation merely because a configured dimension currently lacks an Ability/content mapping

Important taxonomy debt:
`diagnostic_policies.dimensions` and `abilities.domain` are currently free-form strings. The selector relies on exact string equality. This should eventually be governed through a canonical taxonomy / research-admin workflow. Sprint 6 intentionally does not add a hard database enum because that would change the broader content model.

## 5. Diagnostic estimate guarantees

For valid scorable diagnostic attempts:
- estimate update is transactional
- same attempt replay returns `ALREADY_APPLIED` and does not update twice
- a different attempt cannot answer an already answered diagnostic item
- technical failures do not update estimates and do not mark the diagnostic item answered

The estimate algorithm is provisional. See section 10.

## 6. Calibration and long-term state ownership

Frozen architecture decision:

**Diagnostic Calibration does not write long-term `ability_states`.**

Calibration may record:
- Promote / PriorOnly / Insufficient
- diagnostic estimate
- confidence
- evidence count
- promoted score/confidence as an audited planning prior

Long-term Ability state is owned by:
```
QuestionAttempt -> Outbox -> EvidenceBuilder -> Ability Evidence -> StateEngine.rebuildAbility -> ability_states
```

Verified PostgreSQL ownership test:
1. diagnostic attempt is scored
2. diagnostic estimate is calibrated
3. no `ability_states` row exists immediately after calibration
4. target Outbox event is processed
5. exactly one valid Ability Evidence exists
6. `ability_states` still does not exist merely because Evidence exists
7. `StateEngine.rebuildAbility` creates the durable Ability state

This prevents Calibration and StateEngine from racing as dual writers.

## 7. Completion and first DailyPlan

`DiagnosticCompletionOrchestrator`:
- rejects Abandoned sessions
- returns pending state when an unanswered item exists
- continues when stop conditions are not met
- completes the session when stop conditions are met
- calibrates completed diagnostic state
- creates or reuses the first DailyPlan

Concurrent same-key Finalize requests are verified to return the same plan with one active DailyPlan and one idempotency record for the tested path.

## 8. HTTP surface frozen

- `POST /api/v1/students/:id/onboarding`
- `POST /api/v1/students/:id/diagnostic/start`
- `GET /api/v1/students/:id/diagnostic/:sessionId/next`
- `POST /api/v1/students/:id/diagnostic/:sessionId/answer`
- `GET /api/v1/students/:id/diagnostic/:sessionId/status`
- `POST /api/v1/students/:id/diagnostic/:sessionId/finalize`

Mutation paths that require request idempotency use `Idempotency-Key`.

Known limitation: the persistent idempotency wrapper and business transaction are not one database transaction. Same-key concurrency is serialized and tested, but a rare failure after business commit and before idempotency-record commit could still allow retry re-execution.

## 9. Verified engineering behavior

Sprint 6 integration coverage includes:
- diagnostic policy resolution
- active session reuse and concurrency
- selector pending-item reuse
- selector cross-dimension fallback
- content-coverage-insufficient behavior
- diagnostic attempt replay idempotency
- answer -> next loop
- completion -> calibration -> first DailyPlan
- HTTP authorization and idempotency
- concurrent same-key onboarding
- concurrent same-key finalize
- onboarding persistence semantics
- curriculum position -> SchoolSync consumption
- calibration does not directly write long-term Ability
- Evidence -> StateEngine is the durable Ability state path

## 10. Provisional learning values — NOT validated educational truths

The following are implementation/configuration starting points only and must not be described as scientifically validated learning thresholds:

Diagnostic policy defaults:
- Primary upper: Vocabulary, SentencePattern, Reading, Listening
- Middle: Vocabulary, Grammar, Reading, Listening
- max items: 24 / 30
- max minutes: 12 / 15
- target confidence: 0.75

Selector heuristics:
- Q1–Q5 as a difficulty proxy
- desired difficulty derived from current estimate
- `expected_information_gain = 1 - confidence`
- uncertainty/count ranking

Estimate updater heuristics:
- initial estimate 3
- independence penalty from hints and repeated attempts
- gain coefficient 0.45
- estimate movement multiplier 1.5
- confidence cap 0.95

Calibration defaults:
- promote confidence 0.75
- prior confidence 0.45
- minimum promote evidence 3
- minimum prior evidence 1
- linear 1..5 estimate -> 0..100 promoted-score mapping

These values require pilot data, calibration analysis, and teaching-research review before being treated as stable product rules.

## 11. Known debt carried forward

Engineering:
1. Evidence invalidation still needs a durable recalculation worker.
2. EvidenceBuilder historically writes mapping weight into `difficulty_factor`; mapping weight is not semantic difficulty. Ability scoring no longer uses it, but the field should be cleaned up.
3. OutboxWorker currently builds Evidence and marks the event processed. The automatic trigger from new Evidence to StateEngine rebuild must be audited end-to-end; Sprint 6 tests explicitly invoke StateEngine rather than pretending the worker already owns that step.
4. Persistent request idempotency has a rare post-business/pre-idempotency-commit failure window.
5. Diagnostic dimension/domain taxonomy needs canonical governance.
6. Diagnostic selector content coverage depends on research/content publication quality.

Learning/research:
1. diagnostic thresholds and time limits need pilot validation
2. Q1–Q5 proxy is not IRT
3. current information-gain value is a heuristic, not information theory
4. calibration score conversion is not a validated measurement scale
5. no claim is made that diagnostic confidence equals psychometric reliability

## 12. Explicit non-goals / safety boundaries

Sprint 6 does not:
- ingest copyrighted textbook content
- introduce invasive tracking of minors
- add destructive migrations
- change S0–S4 long-term mastery semantics
- change StateEngine ownership
- finalize diagnostic psychometrics
- hard-code a universal ability-domain taxonomy
- merge any Sprint branch to main

## 13. Freeze exit rule

After this freeze commit:
- only defect fixes, test-isolation fixes, documentation corrections, or approved risk fixes belong on Sprint 6
- new learning algorithms, new product semantics, new onboarding fields, and taxonomy redesign move to a later sprint / explicit review
- PR #6 remains Draft and must not be merged without explicit approval
