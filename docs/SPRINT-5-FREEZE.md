# Sprint 5 Freeze — Daily Scheduler

Status: FROZEN
Freeze base: 41bb1abbf1b7b890973893978d89a158cf3aba29
Scope: candidate generation, scheduler policy resolution, daily plan allocation/versioning, explicit replan, progress/next-task APIs.

## Frozen invariants
- DailyPlan is versioned per student and plan date; only one version is Active.
- Candidate sources use one normalized contract across SchoolSync, Review, Weakness and Exam.
- Allocation is constrained by the student's daily time budget.
- Source minimum shares are policy-driven and versioned, not hard-coded product truth.
- Strategy version is request-local; scheduler instances do not mutate shared strategy state across students.
- Generate and Replan both persist Selected/Deferred candidate audit records.
- Completed work is preserved across Replan with lineage through carried_from_task_id.
- Replan reasons are explicit and fail closed for unknown values.
- Replans for the same student are serialized transactionally.
- Concurrent Replans form a linear version chain. PostgreSQL integration coverage verifies V1 -> V2 -> V3 with exactly one Active plan.
- Student DailyPlan HTTP coverage includes create/read/next/complete, ownership authorization and invalid replan input.
- Task completion is idempotent at state level and retains the first completion timestamp.

## Deliberately provisional
These are configurable pilot assumptions, not validated educational conclusions:
- minimum-share percentages by learning line;
- candidate priority coefficients;
- estimated task durations;
- exam-window thresholds;
- current placeholder ExamGoal candidate until the Exam Graph produces concrete ability tasks;
- using estimated task seconds, rather than measured active learning time, when calculating remaining Replan budget.

## Known follow-up debt
- Add request-level idempotency for mutation/replan retries so the same network request cannot intentionally create another plan version.
- Separate candidate source reason from allocation/defer decision reason in schema if analytics needs both independently.
- Tighten scheduler policy specificity ordering for overlapping grade ranges.
- Replace placeholder exam candidate with concrete exam-ability tasks when Exam Graph is available.
- Review EvidenceBuilder semantic cleanup: mapping weight must not masquerade as difficulty.
- Evidence invalidation still needs a durable pending-recalculation worker path before reliability freeze.
- Validate all learning weights and intervals with pilot data before treating them as product rules.

## Scope boundary
Sprint 5 does not decide whether a learner truly mastered English content. It consumes upstream state and produces an auditable, time-budgeted daily execution plan. Mastery thresholds, review intervals and educational weights remain separately versioned and calibratable.

## Next sprint
Sprint 6: Onboarding + Diagnostic + initial calibration.
Primary goals:
1. collect minimum student context without turning onboarding into a census;
2. resolve grade, region, textbook/current school progress, goals and daily time;
3. run adaptive diagnostic across the relevant skill dimensions;
4. create an initial ability/mastery profile with uncertainty preserved;
5. feed calibrated inputs into the frozen scheduler contract.
