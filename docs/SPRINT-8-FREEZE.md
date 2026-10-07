# Sprint 8 Freeze — Active Learning + Wrong Book + Growth + Admin

Status: FROZEN
Branch: `sprint-8/active-learning-growth-admin`
Base: Sprint 7 freeze `892d41524cdda739445d66baadee2076148258d3`

## Delivered
### Student Active Learning
- `GET /api/v1/students/:studentId/active-learning/today?date=YYYY-MM-DD`
- Active DailyPlan, progress summary, ordered tasks and first Pending task.
- Student DTO intentionally excludes scheduler priority, reason and strategy internals.

### Wrong Book
- `GET /api/v1/students/:studentId/wrong-book`
- Wrong fact, ErrorObservation status, Candidate/Verified cause distinction and repair state.
- Pagination is by ErrorObservation before expanding causes/repairs, preventing truncated observations.

### Growth
- `GET /api/v1/students/:studentId/growth`
- Effective learning time, session/task completion, mastery distribution, due review and attempt counts.
- Uses Asia/Shanghai learning-calendar semantics, aligned with Diagnostic/DailyPlan.
- No invented improvement score, predicted score gain or peer percentile.

### Research/Admin Student State
- `GET /api/v1/research/students/:studentId/state`
- Latest active plan, mastery, aggregate ability state, due review, feedback and repair counts.
- Read-only.
- Student-state access restricted to PlatformAdmin and ResearchAdmin. ResearchEditor/ResearchReviewer are excluded.

## Invariants preserved
- No S0-S4 threshold changes.
- No confidence decay changes.
- No Ability scoring changes.
- No Review interval changes.
- No Scheduler weight/share changes.
- No Diagnostic threshold/calibration changes.
- No ErrorCause verification semantic changes.
- No MicroRepair pedagogy/default-limit changes.
- Long-term Ability remains owned by Evidence -> StateEngine.
- Repair completion still does not directly update Mastery.
- No destructive migration, copyrighted textbook ingestion or new PII field.

## Verification
PostgreSQL integration coverage includes:
- active learning task/progress projection
- wrong-book Candidate vs Verified cause and repair projection
- wrong-book observation-safe pagination
- growth durable-fact aggregation
- growth Asia/Shanghai calendar boundary
- research student-state aggregation
- student-state role restriction

## Debt carried to Sprint 9
Engineering:
1. Persistent request idempotency still has rare post-business/pre-idempotency-record crash window.
2. Evidence invalidation lacks a durable recalculation worker / durable projection boundary.
3. EvidenceBuilder still stores mapping weight as difficulty_factor; mapping weight is not semantic difficulty.
4. Outbox has anti-starvation ordering but no exponential backoff/dead-letter policy.
5. StateReplay rebuildAll selects students from all Evidence even though calculation uses Valid only.
6. Diagnostic dimension taxonomy remains free-string governance debt.
7. RepeatedWrong is content-version recurrence, not semantic knowledge recurrence.
8. MicroRepair completion replay may return observation_resolved=false even if original completion resolved it.
9. Read APIs use offset pagination; acceptable for MVP, cursor pagination can follow if scale requires it.
10. Active Learning current_task assumes current task states remain Pending/Completed; revisit if Active/Skipped/Blocked states are introduced.
11. Growth mastery and due-review are current-state snapshots, not historical snapshots for the requested period. UI must not label them as historical mastery-at-period-end.
12. Admin student-state ability values are aggregate operational indicators, not validated educational measurement.

Learning/research:
- S0-S4 thresholds, confidence half-life, review intervals and Ability formula remain provisional.
- Diagnostic heuristics remain provisional.
- ErrorCause confidence remains ordering heuristic, not probability.
- MicroRepair 180 sec / max 2 open / priority 80 remain provisional.
- No claims of score improvement until Pilot data and validated measurement support them.

## Freeze rule
Sprint 8 is frozen after this commit passes CI. Further work belongs in Sprint 9 unless a confirmed Sprint 8 defect requires a targeted fix. Do not merge this PR without explicit approval.
