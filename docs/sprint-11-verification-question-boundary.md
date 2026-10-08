# Sprint 11: Verification Question Boundary (design gate)

Status: design only; no frozen learning-engine change.

## Existing contract
- Ordinary student answer endpoint requires an active Pending daily task and approved, published, human-reviewed content mapped to that task.
- Error-cause verification records support `Question`, `content_version_id`, `attempt_id`, and `Supports / Contradicts / Inconclusive`.
- A correct answer alone does not establish that a particular error-cause hypothesis is true.

## Proposed implementation boundary
1. Add a separate short-lived verification assignment tied to one student, one hypothesis, one approved content version, and an expiry. Do not use a daily task ID as a substitute.
2. Select only human-approved published current content with a tested knowledge/ability mapping relevant to the observation; exclude the original wrong-answer content version where possible.
3. Expose only prompt/options/input schema to the student. Never expose answer keys or explanation before submission.
4. Server validates student ownership, assignment expiry/status, content eligibility, and idempotency; scores against the server-held answer key and persists an immutable attempt.
5. Associate the attempt with the hypothesis and content version. Default verification outcome to `Inconclusive` until a separately reviewed cause-specific evidence rule supports `Supports` or `Contradicts`.
6. Only existing verified-hypothesis rules may plan a MicroRepair. Do not change Sprint 7 thresholds or semantics.
7. Cover unauthorized access, replay, stale assignment, wrong content, absent approved content, and answer-key non-disclosure with PostgreSQL tests.

## Open design gates
- Confirm how verification attempts are represented without violating current question_attempts foreign keys and immutable semantics.
- Define cause-specific evidence criteria and review them before enabling automatic Supports/Contradicts.
- Define whether verification assignments need expiry and retry limits without introducing student profiling fields.
