# Sprint 3 Freeze — Learning Facts & Player Foundation

Status: FROZEN pending merge approval

## Validated chain
LearningSession -> LearningEvent -> QuestionAttempt -> OutboxEvent -> OutboxWorker -> Evidence

## Invariants
- QuestionAttempt is append-only at the database level.
- Attempt idempotency is scoped by (student_id, request_id).
- Attempts retain exact content_version_id and curriculum_position_id traceability.
- AttemptRecorded outbox creation is atomic with a newly inserted attempt.
- Outbox workers use SKIP LOCKED leases and retry failed processing.
- Technical failures remain factual attempts but produce no Evidence.
- Evidence is idempotent by attempt + target + model_version.
- Only approved tested knowledge mappings contribute knowledge Evidence; ContextOnly does not.
- LearningEvent is append-only telemetry/fact data and does not imply mastery.
- Session completion cannot rewrite an already completed session.

## Explicitly deferred to Sprint 4
- MasteryRecord state transitions S0-S4
- mastery confidence updates
- AbilityState updates
- evidence invalidation/recalculation workflows
- delayed verification and review scheduling

## Validation
Sprint 3 head CI uses PostgreSQL integration tests for migrations, immutable attempts, historical ContentVersion traceability, outbox atomicity, evidence idempotency, technical-failure isolation, worker concurrency/retry, LearningEvent append, and session completion.
