# Sprint 8 Scope — Active Learning + Wrong Book + Growth + Admin

Status: ACTIVE
Branch: `sprint-8/active-learning-growth-admin`
Base: Sprint 7 freeze `892d41524cdda739445d66baadee2076148258d3`

## Goal
Turn the frozen learning engine into usable student-facing and research/admin read workflows without changing frozen learning semantics.

## P0
1. Active learning read model: today's plan, next task, task context, completion state.
2. Wrong Book: wrong attempts, observation status, verified/candidate cause state, repair state.
3. Growth: learning time, completed tasks, mastery distribution, due review, recent progress.
4. Admin/research read surfaces for student learning state and feedback exceptions.
5. Authorization, pagination, stable API contracts, PostgreSQL integration coverage.

## P1
- filters and lightweight summaries
- pending-repair inbox
- recent learning history
- anomaly/readiness indicators based only on existing durable facts

## Frozen boundaries
Sprint 8 must not change without explicit review:
- S0-S4 thresholds
- confidence decay
- Ability scoring
- Review intervals
- Scheduler weights/shares
- Diagnostic thresholds/calibration
- ErrorCause verification semantics
- MicroRepair pedagogy/default limits
- long-term state ownership

## Safety/content boundaries
- no copyrighted textbook ingestion
- no invasive minors tracking
- no destructive migrations
- no new PII fields unless explicitly reviewed
- admin surfaces expose only data required for learning/operations

## Exit
Sprint 8 freezes only after student/read/admin flows have PostgreSQL integration tests and CI is green.
