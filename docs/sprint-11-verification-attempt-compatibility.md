# Sprint 11 verification attempt compatibility audit

## Confirmed from migrations 0003, 0009, 0011
- `question_attempts.daily_task_id` is nullable; a verification attempt can be represented without inventing a daily task.
- `content_version_id` is NOT NULL and references a real content version.
- `student_id` is NOT NULL; `(student_id, request_id)` is unique.
- `question_attempts` rejects UPDATE and DELETE, so a verification attempt must be inserted once, never retroactively linked by mutating it.
- `error_cause_verifications` already has nullable `attempt_id` and `content_version_id` foreign keys.
- `LearningPostgresRepository.createAttempt` emits `AttemptRecorded` outbox for every newly inserted attempt, including attempts without daily_task_id. The evidence pipeline impact must be reviewed before enabling this path.

## Safe implementation sequence
1. Add a verification assignment entity binding student, hypothesis, approved content version, expiry and lifecycle, without new PII.
2. GET returns only approved prompt and allowed input contract; POST verifies assignment ownership, content approval, expiry and idempotency.
3. Store the immutable attempt with null daily_task_id and link it from a verification record. Do not mutate question_attempts.
4. Before enabling POST in production, verify whether `AttemptRecorded` evidence generation treats verification attempts differently; prevent unintended mastery/ability scoring changes through an explicit reviewed policy.
5. Default cause outcome to Inconclusive. No automatic Supports/Contradicts until cause-specific verification rubric and tests are reviewed.
6. Test replay, cross-student assignment, expiry, answer-key non-disclosure, and no unintended state update.

## Freeze gate
Verification attempts may influence the frozen evidence engine via the outbox. Implementation must stop at this gate until the existing evidence handling contract is inspected and a compatible, explicitly reviewed treatment is established.
