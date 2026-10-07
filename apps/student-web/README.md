# Student Playable Demo

Sprint 11 student-facing browser demo.

## Start

From the repository root:

```bash
npm run student-demo
```

Open the local student demo on port 4173.

With no query parameters the UI runs in safe demo mode using Grade 5 sample questions.

To bind the Today Learning home to an existing local student/API, provide:
- `student`: student UUID
- `user`: owning user UUID
- `api`: API origin, defaults to local API port 3000
- `date`: optional YYYY-MM-DD
- `contentVersion`: required only when writing real Attempt records from the current sample question surface

The student UI consumes existing Active Learning and Feedback contracts. It does not redefine mastery, scheduler, evidence, error-cause verification, or MicroRepair semantics.

## Current vertical slice

Today Learning → question → Attempt → wrong-answer observation/hypothesis → StudentCheck verification → bounded MicroRepair → complete repair → return to mainline → completion.

Demo mode keeps the same visible flow without writing production facts.
