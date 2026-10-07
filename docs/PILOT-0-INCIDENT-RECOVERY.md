# Pilot 0 Incident Recovery Runbook

Use this runbook only for reliability/data incidents. It does not authorize changes to frozen learning rules.

## 1. Observe before changing anything

Read the protected operational surfaces:

- `GET /api/v1/research/ops/reliability`
- `GET /api/v1/research/ops/recovery-readiness`

Record the request time, affected student IDs, pending/delayed/dead-letter counts, recalculation backlog, and integrity blockers.

Do not delete outbox events, evidences, validity rows, or recalculation jobs to make counters look clean.

## 2. Classify

### Outbox retry
If an event is pending/delayed and not dead-lettered, allow the worker retry policy to run. Investigate `last_error` before manual intervention.

### Dead letter
A dead-letter item is a Pilot 0 blocker until its cause is understood and the resulting durable facts/projections are verified. Do not mark it processed by hand.

### Evidence invalidation/recalculation
If `recalc_required=true`, a durable recalculation job must exist. Missing jobs or completed jobs still marked required are integrity blockers.

### Projection mismatch after restore
If durable Evidence/validity facts exist but Mastery/Ability/Review projections are missing or inconsistent, use guarded student replay.

## 3. Check recovery integrity

From the API workspace:

```sh
DATABASE_URL=... npm run recovery:check
```

This is read-only. A non-zero exit means recovery readiness is not clean.

## 4. Replay one affected student

Only after identifying the affected student:

```sh
DATABASE_URL=... npm run recovery:replay -- --student=<uuid>
```

The command intentionally refuses an unscoped `--apply`. It rebuilds only the specified student's valid-evidence targets and then runs the integrity check again.

Do not use `StateReplayService.rebuildAll()` as an incident shortcut during Pilot 0.

## 5. Verify convergence

After replay:

1. `recovery:check` must report no projection/validity/recalculation integrity blocker attributable to the incident.
2. Reliability ops must show the expected queue movement.
3. Repeating replay for the same unchanged student must not advance state versions or timestamps.
4. Review projection must exist for replayed Knowledge targets.
5. No unresolved dead-letter item may remain in a restore rehearsal dataset.

## 6. Escalate instead of mutating facts

Stop and escalate if recovery would require:

- changing S0-S4 thresholds, confidence decay, Ability scoring, Review intervals, scheduler weights, diagnostic calibration, or repair semantics;
- deleting or rewriting Evidence/history;
- a destructive migration;
- full-database replay during Pilot 0;
- suppressing an integrity blocker without understanding its cause.

## Pilot 0 recovery gate

A rehearsal passes only when schema migration succeeds, representative durable facts are restored, guarded replay converges, recovery readiness is clean, read models are deterministic, and the rehearsal dataset has no unresolved dead-letter item.
