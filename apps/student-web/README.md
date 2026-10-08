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

## Authenticated API browser acceptance

The Sprint 11 CI browser job now starts PostgreSQL 16 and the real API, inserts isolated synthetic users, student binding, an active plan and two human-approved published question versions, and drives Chromium through both tasks. It asserts precisely two persisted Correct attempts, two completed daily tasks, and two AttemptRecorded outbox records. No real student records or external API are used. The fixture does not prove production login, deployment, or adaptive mistake repair; those remain separate release gates.

## Wrong-answer real API browser acceptance

The authenticated Chromium test now also uses a second isolated synthetic student to submit a wrong answer, asserts a persisted `WrongAnswer` observation and a `Candidate` error-cause hypothesis, confirms **zero** `micro_repair_tasks` without verified evidence, and returns to the next mainline task. This verifies observation and non-fabrication of repairs, **not** the full independent error-cause verification and personalized repair loop. That remains an explicit Sprint 11 gap.

## Independent cause-verification question lookup (partial)

The real API now exposes `GET /api/v1/students/:studentId/feedback/causes/:hypothesisId/question` to an authorized bound student. It selects a **different** current published, human-approved content version mapped to the candidate cause target, without returning its answer or explanation payload. If none is eligible, it returns an unavailable response. This endpoint **only selects a question**: it does not accept a verification answer, score verification evidence, update candidate status, or create repair tasks. Those remain future, separately reviewed work, and arbitrary client-reported `Supports` must not be treated as independently demonstrated evidence.

## Independent confirmation answer, evidence-only slice

The authorized student may now POST `/api/v1/students/:studentId/feedback/causes/:hypothesisId/question/answer` with an idempotency key, approved `content_version_id` and `answer_payload`. The API grades it using the server-held answer key and persists a `question_attempts` record with `exposure_type=Verification`. The student UI can display the independent question after real wrong-answer review. A grading response **does not** set the hypothesis to Verified/Rejected or create a MicroRepair task. The legacy student-facing verification mutation also rejects direct `Supports` / `Contradicts` claims without trusted server evidence. Future work must securely associate independently graded attempts with cause evidence before any cause status transitions or personalized repair planning. This is not a full error-cause verification loop yet.

## Pending confirmation evidence association

The independently graded verification attempt is now linked to its originating cause hypothesis through a nullable-result `error_cause_verifications` Question record. The same attempt cannot be linked to two different hypotheses. A replay reuses the original record. Its `result` stays `NULL`: an answer graded Correct/Wrong is not, by itself, a trusted Supports/Contradicts verdict, and neither the cause state nor MicroRepair eligibility changes here. Subsequent evidence adjudication requires explicit documented rules and tests.

## Evidence replay safety

A persisted independent verification attempt may belong to only one candidate cause. Replaying its original idempotent request returns that original evidence link even after the cause status changes, without adding a second evidence or repair record. Attempting to attach the same answer to a different cause is a conflict. These are evidence-integrity protections, **not** cause adjudication criteria.

## Read-only cause evidence audit (Sprint 11)

`CauseEvidenceAuditReadModel` and `inspectCauseEvidence` inspect provenance, ownership, original-versus-independent content identity, approved publication, target mapping, duplicate attempt references, technical status, and whether evidence has already been adjudicated. They return `PendingReview`, eligibility counts, and diagnostic reason codes. They **never** translate one correct or wrong answer into a `Supports` or `Contradicts` verdict, alter cause status/mastery, or create repair tasks. No reviewed cause-adjudication policy exists yet. The audit is internal only and is not exposed as a student-facing proof or recommendation.

## Original wrong-answer provenance gate

Read-only cause evidence audit now checks the initiating error observation against its original question attempt: the original attempt must belong to the same student, refer to the observed content version, have technical status `OK`, and actually be graded `Wrong`. A valid independent confirmation cannot make an invalid original observation eligible for cause adjudication. The outcome stays `PendingReview`; this remains an audit-only safeguard, not an automatic cause verdict or repair trigger.

## Student-scoped evidence status (read only)

`GET /api/v1/students/:studentId/feedback/causes/:hypothesisId/evidence-status` exposes only `PendingReview`, eligible-answer counts, correct/wrong counts and reason codes to the bound student. It omits private rationale, answer keys, original attempt details and internal hypothesis confidence. It does **not** adjudicate causes, update mastery or generate repairs. This is a status readout, not an approved cause-verdict algorithm. The endpoint has an authorization unit test and a real API + Chromium acceptance assertion.

## Student-facing pending evidence status

After a successful independent confirmation answer, the real student UI reads the student-scoped evidence status endpoint and displays the server-confirmed count of eligible answers, correct/wrong counts, and an explicit `错因待审查` message. It never says the cause is verified or mastery has been achieved. If this secondary status query fails, the answer remains recorded and the learner can return to the mainline. Chromium acceptance asserts the actual on-screen pending status. No repair is automatically planned.

## Interrupted independent confirmation recovery

Before POSTing an independently approved confirmation answer, the browser stores the original cause ID, server content version, answer payload and idempotency key in session storage, scoped by bound student, user and plan date. On reload, the student is offered a deliberate **same-request replay**; it does not choose a fresh answer or generate a new request ID. The pending record clears only after the server confirms the original request. Storage is discarded if identity/date differs or it exceeds 30 minutes. If the network response is lost after server persistence, replay should return the original immutable attempt and exactly one linked cause evidence. This does not adjudicate the cause or complete a micro-repair.
