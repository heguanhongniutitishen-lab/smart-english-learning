# Student Playable Demo (Sprint 11)

This is an incremental student-facing browser demo, **not a fully deployed self-study learning system**.

## Start

From the repository root:

```bash
npm run student-demo
```

Open port 4173. With no `student` or `user` parameters the page runs a safe Grade 5 demonstration without recording real learning evidence.

To use the existing local API, supply both `student` and `user` identities, optionally `api` (API origin), `date` (YYYY-MM-DD), and `contentVersion` only where a real published question does not already expose a version. Real mode requires the running API, authorized identities, an active daily plan, and eligible approved content. Never use fake identities on a public deployment.

## Verified implementation boundaries

- Demo: home, sample choice questions, correct/wrong explanation, separate sample repair practice, session summary.
- Real mode: reads active plan/content, submits approved answers, calls existing feedback API, completes a task, and loads the next item.
- Answer retry: retains the original payload and idempotency key in session storage for up to 30 minutes; uncertain old-task results must be reconciled first.
- Completion retry: reads server plan status before deciding whether to retry; answer recovery has priority over completion recovery.
- **Not implemented as a validated full loop:** independent approved error-cause verification questions, arbitrary personalized repair generation, real student authentication on this static deployment, and production-grade end-to-end browser tests. Wrong-answer review in real mode is not a mastery verification.

## Sprint 11 acceptance and limits

`npm test --workspace=@sel/student-web` covers flow transitions, choice/text payload handling, sample repair and summary accounting, pending answer replay, task-completion reconciliation, recovery ordering, and static asset smoke tests. API CI uses its own PostgreSQL integration checks.

A green CI does **not** prove the Vercel production URL has deployed the newest commit, or that a real student account can complete a live end-to-end session. Validate both separately before declaring release-ready. Do not merge the draft Sprint 11 PR without approval.

This student UI consumes existing contracts and does not redefine scoring, mastery, scheduler, evidence or error-cause verification rules.

## Public Vercel deployment verification

From a machine with access to the public Internet:

```bash
npm run verify:deployment --workspace=@sel/student-web -- https://smart-english-demo.vercel.app
```

This checks the public home page, CSS and JavaScript module URLs and tests for the latest recovery-flow code markers. A PASS confirms these public static assets can be read; it does not prove a specific Git commit was deployed or that production API/student authentication works. A FAIL may indicate access restrictions, connectivity, or stale deployment. CI itself does not perform this production check.

To independently inspect the actual production commit, open Vercel → smart-english-demo → Deployments → current Production deployment and compare its branch/commit with the Sprint 11 GitHub HEAD.

## Independent GitHub Actions deployment smoke

The branch contains `.github/workflows/student-production-smoke.yml` to run the same public asset verification from a GitHub-hosted runner. GitHub only exposes `workflow_dispatch` workflows in the Actions UI when the workflow file also exists on the repository default branch. Since Sprint 11 is an unmerged draft PR, **do not claim the manual workflow is runnable in the UI yet**. It remains prepared for after approved integration. Local verification using the command above works independently and needs no merge.

## Browser acceptance (Chromium)

Sprint 11 PR CI additionally runs `apps/student-web/test/browser-acceptance.mjs` in headless Chromium. It exercises the actual Grade 5 demo controls, wrong-answer explanation, demo repair, correct answer, completion summary, and all-correct scenario. This browser check is distinct from unit tests and static asset checks. It does not exercise authenticated production students or a live API, which still need separate end-to-end verification.
