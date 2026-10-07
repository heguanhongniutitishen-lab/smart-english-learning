# Sprint 9 Scope — Reliability + Data

Status: FREEZE CANDIDATE
Branch: `sprint-9/reliability-data`
Base: Sprint 8 freeze `8e5b769f6eb70340c8a4c100ebf37183b4d56b04`

## Goal
Harden the existing learning loop for Pilot 0. Sprint 9 is a reliability/data sprint, not a feature-expansion sprint.

## P0
Status: COMPLETE pending final CI confirmation.\n\n1. Durable Evidence invalidation -> state recalculation workflow.
2. Outbox retry policy with bounded backoff and dead-letter visibility without starving fresh events.
3. Close or explicitly harden the persistent Idempotency-Key business-commit crash window.
4. Correct semantic misuse of content mapping weight as `difficulty_factor` without changing frozen learning formulas.
5. Reliability/integrity tests for Attempt -> Outbox -> Evidence -> State -> Review/Feedback under retries and failures.
6. Operational read surface for failed/dead-letter/recalculation work needed for Pilot support.

## P1
Status: COMPLETE pending final CI confirmation.\n\n- tighten StateReplay valid-evidence targeting
- repair replay response consistency
- data integrity checks and readiness report
- indexes only when justified by measured/query-plan need
- concise runbook for Pilot incident recovery

## Frozen learning boundaries
Sprint 9 must not change without explicit review:
- S0-S4 thresholds
- confidence decay
- Ability scoring formula
- Review intervals
- Scheduler weights/shares
- Diagnostic thresholds/calibration
- ErrorCause verification semantics
- MicroRepair pedagogy/default limits
- long-term state ownership

## Safety/data boundaries
- no destructive migration without explicit approval
- no new sensitive/PII fields without review
- no copyrighted textbook ingestion
- no invasive minors tracking
- reliability metadata must not become student profiling data

## Implementation order
1. audit current outbox/invalidation/idempotency paths
2. durable recalculation
3. outbox retry/dead-letter
4. idempotency crash-window hardening
5. semantic cleanup + replay consistency
6. end-to-end fault-injection/integrity tests
7. Pilot readiness/runbook
8. Sprint 9 freeze

## Exit
Freeze candidate audit completed. Final freeze requires the latest branch HEAD CI to be green.\n\nSprint 9 freezes only when:
- all P0 reliability paths have PostgreSQL integration coverage
- failure/retry behavior is explicit and observable
- no confirmed P0/P1 data-integrity defect remains
- CI is green

Do not merge without explicit approval.
