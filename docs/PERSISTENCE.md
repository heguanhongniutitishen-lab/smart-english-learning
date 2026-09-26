# Persistence V1

Production API uses PostgreSQL. MemoryStore exists only for deterministic unit/API tests.

## Transaction boundaries
- Student + StudentUserBinding: one transaction.
- Curriculum position switch: advisory lock + deactivate old + insert new in one transaction.
- QuestionAttempt + Outbox will be one transaction in the learning sprint.
- Evidence/Mastery remain derived state and are not allowed to rewrite immutable Attempt facts.

## Concurrency
A partial unique index guarantees at most one current curriculum position per student.

## Idempotency
Fact-changing endpoints use scope + request_id. PostgreSQL stores successful response snapshots for retry safety.

## Failure rule
Database/technical failures are infrastructure failures. They must never be translated into negative learning evidence.
