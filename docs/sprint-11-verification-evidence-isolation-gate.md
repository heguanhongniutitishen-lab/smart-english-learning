# Sprint 11: AttemptRecorded evidence isolation gate

## Verified current path
`LearningPostgresRepository.createAttempt` emits `AttemptRecorded` for every newly inserted attempt, regardless of `daily_task_id`. `OutboxWorker.processOne` routes every `AttemptRecorded` through `EvidenceBuilder.buildForAttempt`, state refresh, and optionally `feedback.observeAttempt`.

`EvidenceBuilder` currently selects approved content knowledge/ability mappings from the attempted content version, creates positive/negative evidence for Correct/Wrong attempts, and does **not** check daily_task_id or verification context. Therefore a verification attempt inserted through the existing repository would affect the frozen mastery/ability projection and might recursively create error observations.

## Implementation gate
- Do not insert verification attempts through the current generic `createAttempt` flow until the event semantics are reviewed.
- Do not use `technical_status` or `result` as a stealth suppression flag: those are learning facts, not routing metadata.
- Do not modify frozen EvidenceBuilder or OutboxWorker behavior inside Sprint 11.
- Prefer an explicit, separately named verification-attempt event with narrowly scoped consumer semantics, or a dedicated verification-answer record, subject to architecture review. The original answer and server score must remain auditable and immutable.
- No automatic `Supports`/`Contradicts` based solely on correctness.
- Required integration tests: verification answer produces no mastery/ability evidence or feedback observation; ordinary AttemptRecorded still behaves exactly as before; replay and cross-student attempts rejected.

## Decision required before implementation
Whether to introduce a dedicated immutable verification-answer record, or extend the existing immutable attempt event contract in a reviewed follow-on change. Either path changes persistence/event semantics and requires explicit review before activation.
