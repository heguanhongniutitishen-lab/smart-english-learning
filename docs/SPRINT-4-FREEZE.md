# Sprint 4 Freeze — Mastery, Ability & Review State

Status: FROZEN pending merge approval

## Validated chain
Valid Evidence -> StateEngine -> MasteryRecord / AbilityState -> ReviewPlanner -> Review Candidates

## Invariants
- Attempt and Evidence facts are never rewritten by state inference.
- Only Valid Evidence participates in state rebuilds.
- Mastery and Ability are derived, replayable state.
- State model_version is independent from Evidence model_version.
- Evidence invalidation triggers target-state rebuild and preserves the invalidated Evidence row.
- S0-S4 state does not decay merely because time passes; confidence can decay with time.
- Strong recent negative Evidence may degrade S3/S4 by one state.
- Review timing is derived from a versioned active policy, not hard-coded into callers.
- Review candidate priority is advisory input for the future Scheduler, not a DailyPlan decision.
- Batch replay can upgrade state model versions without mutating historical Evidence.

## Initial V1 calibration notes
Current thresholds and review intervals are provisional product rules for pilot validation, not empirically validated pedagogy. They must remain configurable/versioned and should be calibrated with pilot data before broad rollout.

## Deferred to Sprint 5
- DailyPlan and DailyTask generation
- school-sync / weakness / review / exam candidate arbitration
- daily time-budget allocation
- plan versioning and replan behavior
- candidate rejection/defer reasons
