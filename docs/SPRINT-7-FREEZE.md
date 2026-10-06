# Sprint 7 Freeze — Feedback + Error Cause + Micro Repair + Student Loop

Status: FROZEN pending final CI on this documentation commit.
Branch: `sprint-7/feedback-micro-repair`
Base: `sprint-6/onboarding-diagnostic`
Do not merge without explicit product-owner approval.

## 1. Scope frozen

Sprint 7 closes the normal wrong-answer feedback loop without allowing a single error or a repair-completion click to directly redefine long-term mastery.

Frozen flow:

```
QuestionAttempt
  -> Outbox AttemptRecorded
  -> EvidenceBuilder
  -> Evidence
  -> StateEngine
     -> Mastery / Review
     -> Ability
  -> Feedback
     -> ErrorObservation
     -> Candidate ErrorCauseHypothesis
     -> Verification
     -> Verified cause
     -> MicroRepairTask
     -> Completion
     -> ErrorObservation Resolved
     -> Return to DailyPlan main line
```

Long-term Mastery / Ability remains owned only by Evidence -> StateEngine.

## 2. Database additions

Migrations:
- `0022_feedback_micro_repair.sql`
- `0023_micro_repair_idempotency.sql`

Entities:
- error_observations
- error_cause_hypotheses
- error_cause_verifications
- micro_repair_tasks

Migrations are additive. Sprint 7 adds no destructive schema migration.

## 3. Error observation guarantees

`ErrorObservationService`:
- ignores technical failures and non-Wrong attempts
- creates replay-safe WrongAnswer observations
- may create RepeatedWrong when prior wrong history exists for the same content version
- uniqueness prevents duplicate observation type for the same attempt

Known semantic limitation:
RepeatedWrong currently uses same `content_version_id` history. It is not yet semantic repeated weakness across equivalent knowledge/content variants.

Hesitation and HintDependency observation types exist in schema but are not yet automatically generated.

## 4. Error-cause guarantees

`ErrorCauseHypothesisService`:
- creates Candidate hypotheses only
- uses approved content mappings as candidate targets
- does not auto-verify a cause
- candidate confidence is an ordering heuristic, not a probability

`ErrorCauseVerificationService`:
- requires an explicit verification record
- Supports may move a non-terminal hypothesis to Verified
- Contradicts may move it to Rejected
- otherwise it remains Inconclusive
- Verified / Rejected are terminal for the current service contract

A single wrong answer does not become a permanent diagnosis merely because a rule or AI-like component proposed a cause.

## 5. Micro Repair guarantees

`MicroRepairPlanner`:
- plans only from Verified causes
- reuses an existing open repair for the same cause/target
- database uniqueness protects duplicate open cause-target repair creation
- locks the student before counting open repairs
- concurrent planning is tested so the per-student open-task cap cannot be exceeded by racing transactions

Current engineering defaults:
- max open repairs per student: 2
- estimated repair time: 180 seconds
- priority: 80
- default return policy: ReturnToMainLine

These are provisional implementation defaults, not validated educational truths.

`MicroRepairCompletionService`:
- only completes the requesting student's Pending/Active repair
- replay of an already Completed task is safe
- resolves the observation when no open repairs remain
- can return the next DailyPlan task
- DOES NOT update Mastery directly

Repair Completed != Mastered.

## 6. Automatic state + feedback pipeline

`OutboxWorker` now performs the normal AttemptRecorded projection path:
1. EvidenceBuilder
2. StateEngine state refresh
3. Feedback observation/hypothesis generation
4. mark outbox event processed

Knowledge targets rebuild Mastery and Review.
Ability targets rebuild Ability state.

Feedback stops at Candidate hypothesis. Verification and repair planning remain explicit later steps.

## 7. Replay and reliability guarantees

StateEngine:
- identical durable Mastery / Ability rebuild does not advance `state_version`
- identical durable rebuild does not move `updated_at`

ReviewPlanner:
- identical `next_review_at` refresh does not move `updated_at`

Outbox:
- failed events release their lease for retry
- claim ordering prefers lower `attempt_count` before older creation time so one poison event cannot continuously starve all later unattempted events

Feedback:
- observation/hypothesis generation is replay-safe under current uniqueness contracts

## 8. HTTP surface frozen

- `POST /api/v1/students/:studentId/feedback/attempts/:attemptId`
- `POST /api/v1/students/:studentId/feedback/causes/:hypothesisId/verify`
- `POST /api/v1/students/:studentId/feedback/repairs/:repairTaskId/complete`

All three mutation routes require `Idempotency-Key`.

The server uses `PostgresIdempotencyStore`, not the in-memory test/demo store.

Known limitation:
the business operation and the idempotency response record are not committed in one database transaction. Advisory locking and durable response reuse cover normal concurrent/retry behavior, but a rare process failure after business commit and before idempotency-record commit can still cause re-execution. Underlying Sprint 7 services are designed to be replay-safe where currently tested, but this transaction-boundary debt remains explicit.

## 9. Verified engineering behavior

Sprint 7 PostgreSQL / HTTP coverage includes:
- automatic AttemptRecorded -> Evidence -> State refresh
- automatic wrong-attempt -> ErrorObservation -> Candidate hypothesis
- feedback replay does not duplicate WrongAnswer observation or same cause hypothesis
- StateEngine identical replay version stability
- MicroRepair only from Verified cause
- repair reuse
- per-student concurrent open-repair cap
- repair completion and observation resolution
- repair completion does not mutate Mastery
- ReturnToMainLine via DailyPlan next task
- full wrong-attempt -> state -> feedback -> verification -> repair -> completion -> main-line E2E
- Feedback HTTP ownership checks
- Feedback mutation Idempotency-Key requirement and response reuse
- Outbox failed-event anti-starvation ordering

## 10. Learning / research values that remain provisional

The following are NOT validated educational truths:
- S0-S4 thresholds and evidence-count rules
- 45-day confidence half-life
- Review interval defaults and confidence floor
- Ability scoring formula
- ErrorCause candidate confidence heuristic
- MicroRepair 180-second estimate
- max two open repairs
- priority 80
- any inference that Candidate confidence equals causal probability

These require pilot evidence and teaching-research review.

## 11. Known debt carried forward

Engineering:
1. Evidence invalidation still lacks a durable recalculation worker. Current invalidation rebuild is synchronous and the invalidate/rebuild boundary is not one durable projection transaction.
2. EvidenceBuilder still writes content mapping `weight` into `difficulty_factor`. Mapping weight is not semantic difficulty. Current Ability scoring does not use this field, but the semantic debt remains.
3. Persistent request idempotency has the rare post-business/pre-idempotency-record failure window described above.
4. RepeatedWrong is content-version based rather than semantic knowledge-level recurrence.
5. No read endpoint yet exposes a student's current pending feedback / repairs as a dedicated feedback inbox.
6. Outbox retry has no exponential backoff / dead-letter policy yet; Sprint 7 only prevents a repeatedly failing oldest event from starving all fresh events.
7. StateReplay `rebuildAll` selects students from all Evidence regardless of current validity; per-student rebuild then uses Valid Evidence only. This is inefficient/semantically loose but does not change calculated state.
8. Diagnostic dimension/domain canonical taxonomy debt from Sprint 6 remains.

Learning/research:
1. cause verification strategy needs pilot validation
2. repair type selection is currently target-type based and intentionally simple
3. repair duration/cap/priority require pilot tuning
4. richer causes such as careless reading, long-sentence parsing, information location, and prerequisite chains need future governed models
5. no claim is made that one verification item establishes true causality

## 12. Explicit non-goals / safety boundaries

Sprint 7 does not:
- ingest copyrighted textbook content
- introduce invasive tracking of minors
- add destructive migrations
- change S0-S4 learning semantics
- change diagnostic calibration ownership
- allow Repair Completed to directly mean Mastered
- allow Candidate cause to auto-promote to Verified without verification
- finalize educational thresholds
- merge any Sprint branch to main

## 13. Freeze exit rule

After this freeze commit:
- only defect fixes, test-isolation fixes, documentation corrections, or approved risk fixes belong on Sprint 7
- new feedback taxonomies, causal models, repair pedagogy, UI surfaces, active-learning features, and new product semantics move to Sprint 8+ or explicit review
- PR #7 remains Draft and must not be merged without explicit approval
