# ADR: Isolated verification question persistence

Status: **Proposed, not approved for migration or activation** (Sprint 11).

## Decision proposed
Introduce separate immutable verification-answer facts, rather than inserting verification answers into `question_attempts` and triggering `AttemptRecorded`. Keep existing S0–S4, EvidenceBuilder, OutboxWorker, and Sprint 7 verification semantics unchanged.

## Proposed entities
`verification_question_assignments`: `assignment_id` UUID PK; `student_id` FK; `error_cause_hypothesis_id` FK; `content_version_id` FK; `status` (Pending, Answered, Expired, Cancelled); `expires_at`; `created_at`. An assignment must reference one human-reviewed approved, currently published content version mapped to a relevant knowledge/ability target. Authorize ownership via hypothesis → observation → student, not a client-supplied student ID alone.

`verification_question_answers`: `verification_answer_id` UUID PK; `assignment_id` FK UNIQUE; `student_id` FK; `request_id` varchar(128); `answer_payload` JSONB; `result` (Correct/Wrong); `occurred_at`; UNIQUE(student_id,request_id). Store one immutable server-scored answer per assignment. No `AttemptRecorded` outbox event. Never insert an answer key or explanation into a student-visible response before submission.

## Transaction and concurrency
- Claim the assignment under row lock; validate Pending, student ownership, expiry, published/current approved content, and input contract.
- Compute correctness server-side. Insert the answer and mark assignment Answered in one transaction; concurrent distinct submissions return conflict, same idempotency key returns the original outcome.
- If an assignment expires, never accept a late answer even if a cached client still displays it.
- The answer remains auditable and immutable. No automatic evidence, state refresh, or feedback observation.
- A separate reviewed cause-specific rubric must precede any Supports/Contradicts. Until then, record Inconclusive only; do not fabricate a `question_attempts.attempt_id` FK for a verification answer.

## Compatibility note
Existing `error_cause_verifications.attempt_id` references `question_attempts`, **not** the proposed verification-answer table. A later approved additive FK (e.g. `verification_answer_id`) or an explicit association table is needed for traceability. Do not populate `attempt_id` with an unrelated attempt.

## Tests before rollout
1. Ownership and hypothesis-student binding, including cross-student denial.
2. Content approval/published/current and mapping eligibility, including revocation between GET and POST.
3. Idempotent replay, simultaneous distinct requests, expiry, unsupported answer format.
4. Student GET never returns answer key or pre-answer explanation.
5. No `AttemptRecorded`, `evidences`, `mastery_records`, `ability_states`, or recursive feedback observation from verification answers.
6. Existing daily-task answer and Sprint 7 verification tests remain unchanged.

## Review gates
Schema/migration review; immutable fact policy; evidence isolation; retention/privacy policy for minors; confirmation-question content selection; cause-specific rubric. No implementation or production migration without these gates.
