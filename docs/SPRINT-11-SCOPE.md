# Sprint 11 Scope — Student Playable Demo

Status: ACTIVE
Branch: `sprint-11/student-playable-demo`
Base: Sprint 10 frozen branch

## Goal
Turn the existing frozen learning loop into a student-facing experience that can be opened and clicked through, beginning with the Today Learning home surface.

## P0
1. Student web shell suitable for desktop/mobile browser demo.
2. Today Learning home backed by the existing Active Learning read model.
3. Clear current task, progress, estimated time and task sequence.
4. Playable path from Today Learning into task execution, wrong-answer repair, return-to-mainline and completion summary.
5. Demo fixtures for the agreed Grade 5 learner persona without adding profiling fields to production data.
6. Keep frozen learning semantics unchanged.

## UX principles
- Student sees the next useful action, not internal engine terminology.
- Keep a single main action per screen.
- Wrong answers trigger bounded repair, not punishment or endless drilling.
- Do not expose mastery/ability internals as precise educational claims.
- Mobile-first, but usable in desktop browser for product review.

## Out of scope
- changing frozen learning thresholds or scheduling semantics
- production WeChat mini-program packaging
- parent/admin redesign
- textbook copyrighted content ingestion
- score prediction or unsupported learning-impact claims

## First vertical slice
Student home → Today Learning → current task → answer → wrong-answer repair when needed → return to mainline → daily completion.
