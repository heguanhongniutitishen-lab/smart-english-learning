# Pilot 0 Data Dictionary and Analysis Notes

Status: Sprint 10 working contract

## Purpose
This document defines Pilot 0 research/admin fields and interpretation boundaries. Pilot metrics are operational measurements derived from durable product facts. They are not validated educational-impact measures.

## Identity and privacy
- `student_id` is the Pilot analysis identifier. It is pseudonymous, not anonymous.
- Pilot exports MUST NOT include student display name, mobile hash, WeChat identifiers, device identifier hashes, or raw `answer_payload`.
- `cohort_code` and `pilot_cohorts.name` are operational labels only. Do not place student names, contact details, school identifiers, or other personal information in them.
- No new sensitive profiling fields are introduced by Sprint 10.

## Cohort
- `cohort_id`: durable Pilot cohort identifier.
- membership `status`: Enrolled, Withdrawn, or Completed.
- `enrolled_at` / `ended_at`: cohort participation lifecycle facts.
- Membership is an analysis boundary, not a claim that all enrolled students were exposed to learning.

## Attempts
- Attempt rows are immutable durable facts.
- `content_version_id` identifies the exact content version used.
- `daily_plan_id`, plan version and `strategy_version` provide scheduling provenance when a task link exists.
- `technical_status='OK'` means the attempt was technically usable; it is not a learning-success label.
- Raw answer payload is intentionally excluded from Pilot export v1.

## Evidence
- Evidence is derived from learning facts and carries `model_version`.
- `difficulty_factor` is semantic evidence input and MUST NOT be substituted with curriculum mapping weight.
- Evidence validity is exported as its current validity state. Invalidated evidence must remain visible as historical durable data rather than being physically deleted.

## State
- Mastery and Ability export is a CURRENT PROJECTION AT EXPORT TIME.
- It MUST NOT be interpreted as historical mastery/ability at the end of a prior reporting period.
- S0-S4 thresholds, confidence decay and Ability formulas remain frozen.
- Ability values are operational aggregate indicators, not validated educational measurement.

## Review
- `due_current_snapshot` is derived from the current state projection.
- It MUST NOT be labeled as the historical number of reviews due during the requested period.
- `verified_in_period` is a durable timestamp count, not proof that a scheduled review was completed on time.
- A true historical review-adherence metric requires durable due/completion event history and is not claimed in Pilot baseline v1.

## Error and repair
- ErrorObservation and MicroRepair counts are workflow facts.
- ErrorCause hypothesis `confidence` is heuristic confidence, NOT a statistical probability.
- Repair completion is not evidence by itself that the learner mastered the target.

## Measurement baseline
Current baseline fields cover:
- exposure: exposed students, session count, effective learning seconds
- completion: tasks total/completed and completion rate
- attempts: total, technically usable, correct and wrong
- review: explicitly labeled current-snapshot due count plus verified timestamps in period
- error/repair: observations, WrongAnswer observations, repair tasks and completions
- data completeness: missing/broken provenance and technically usable attempts without downstream Evidence

All baseline metrics MUST retain the semantic marker:
`operational_baseline_not_validated_learning_impact`.

## Data completeness
Missing data is reported, never silently imputed. A completeness failure does not mean learning failed; it means the analysis chain is incomplete and should not support stronger conclusions.

## Prohibited Pilot 0 claims
Without a separate validated study, do not claim:
- score improvement caused by the product
- predicted school/exam score
- causal learning effect
- peer percentile or ranking
- mastery improvement inferred solely from current-state snapshots
- review adherence inferred from current `next_review_at`

## Time
Pilot measurement uses explicit `from` and `to` dates and Asia/Shanghai reporting semantics. Analysis must record the requested period and must not silently widen it.

## Version provenance
Where available, retain:
- content version
- daily plan version
- scheduler strategy version
- Evidence model version
- State model/state version
- relevant policy versions when added to a durable export contract

Missing version provenance is a data-quality concern, not something to fill with a guessed default.
