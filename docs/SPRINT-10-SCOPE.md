# Sprint 10 Scope — Pilot 0 Readiness + Measurement

Status: FROZEN
Branch: `sprint-10/pilot-readiness-measurement`
Base: Sprint 9 freeze `b4e6cd790105fbe60be24b09fe1e52bf140fd15f`

## Goal
Make the frozen learning loop operable and measurable for a small Pilot 0 cohort without changing learning semantics or making unsupported learning-outcome claims.

## P0
1. Pilot cohort definition and enrollment metadata using minimal non-sensitive identifiers.
2. Pilot event/version traceability across plan, attempt, evidence, state and feedback paths.
3. Pilot data-quality/readiness report built only from durable facts.
4. Research/admin export for Pilot analysis with stable field definitions and version provenance.
5. Pilot measurement baseline: exposure, completion, effective learning time, review adherence, error/repair flow and data completeness.
6. PostgreSQL integration coverage and blocking CI for all Pilot readiness paths.

## P1
- cohort filters on existing research/admin read surfaces
- operational anomaly summaries for Pilot support
- export pagination/batching appropriate for Pilot scale
- concise Pilot data dictionary and analysis notes
- address Diagnostic dimension taxonomy governance debt if it can be done without changing frozen diagnostic semantics

## Explicitly out of scope
- claims of score improvement, grade prediction, peer percentile or causal learning effect
- changing S0-S4 thresholds, confidence decay, Ability formula, Review intervals, Scheduler weights/shares, Diagnostic thresholds/calibration, ErrorCause verification semantics or MicroRepair pedagogy/default limits
- full curriculum/textbook ingestion
- invasive minors tracking or new sensitive PII
- destructive migrations
- redesign of student UI unrelated to Pilot readiness

## Measurement principles
- distinguish operational metrics from validated educational measurement
- preserve model/policy/content version provenance
- do not treat ErrorCause confidence as probability
- do not label current-state mastery snapshots as historical mastery-at-period-end
- missing data must remain visible rather than silently imputed

## Implementation order
1. audit existing durable facts and version provenance for Pilot measurement
2. cohort model + authorization boundary
3. data-quality/readiness read model
4. Pilot export contract
5. integration/failure tests
6. data dictionary + Pilot analysis notes
7. final readiness audit and Sprint 10 freeze

## Exit
Sprint 10 freezes only when:
- Pilot cohort data can be isolated without new sensitive profiling;
- exported rows are traceable to durable facts and relevant versions;
- missing/inconsistent Pilot data is observable;
- no metric is presented as validated educational impact without supporting study evidence;
- PostgreSQL integration tests and CI are green.

Do not merge without explicit approval.


## Freeze candidate
- Functional candidate HEAD: `f7c1d12f1c1697e6b7bc77e2129b201c3b0df1e7`
- Freeze-document HEAD before final status commit: `44060b3fa9be95cd25fa3b582092d46632fb046c`
- Blocking CI: GitHub Actions run #197 — SUCCESS
- Freeze-document CI: GitHub Actions run #198 — SUCCESS
- Base remains Sprint 9 freeze `b4e6cd790105fbe60be24b09fe1e52bf140fd15f`
- PR #10 remains Draft and MUST NOT be merged without explicit approval.

### Exit audit
- Cohort isolation uses minimal identifiers and membership lifecycle boundaries.
- Attempt, Evidence, Feedback and Repair exports are scoped to membership lifecycle; state export is explicitly a current projection.
- Feedback pagination uses an Observation + Hypothesis composite cursor so joined rows are not skipped across pages.
- Pilot readiness and measurement keep pre-enrollment/post-membership durable facts out of Pilot-period counts.
- Missing/broken provenance remains visible; no silent imputation was introduced.
- Operational metrics remain explicitly non-validated learning-impact measurements.
- PostgreSQL integration coverage is blocking and the candidate HEAD passed CI.

### Frozen-boundary confirmation
Sprint 10 does not change S0-S4 thresholds, confidence decay, Ability scoring, Review intervals, Scheduler weights/shares, Diagnostic calibration, ErrorCause verification semantics, MicroRepair pedagogy/default limits, or long-term state ownership.

### Known non-blocking debt
- Diagnostic dimension taxonomy remains free-string governance debt.
- RepeatedWrong recurrence remains content-version recurrence rather than semantic-knowledge recurrence.
- State export remains current projection, not historical period-end state.
- Review `due_current_snapshot` remains a current snapshot and MUST NOT be represented as historical adherence.
- Pilot membership currently rejects re-enrollment of the same student into the same cohort instead of creating multiple membership episodes; changing that requires reviewed schema evolution.
- Offset pagination remains acceptable for Pilot-scale membership listing.

Sprint 10 is FROZEN. No additional Sprint 10 scope should be added without explicitly reopening the sprint.
