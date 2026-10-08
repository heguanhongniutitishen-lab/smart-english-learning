# Student miniapp (Sprint 11 foundation)

Native WeChat Mini Program home screen, separate from apps/student-web. Contains WXML/WXSS/JS for Primary, Middle, High themes and read-only Today / Growth data bindings.

## Security and unfinished work

- Login is NOT implemented. app.globalData.auth and apiBase are integration points, not credentials. Never put fake x-user-id identities, fixed tokens or real student data into the client.
- The current API includes development identity and signed student auth modes. The Bearer request contract here is provisional and must be wired to a reviewed WeChat login/exchange flow and verified against backend authentication before live use.
- No synthetic progress, mastery percentages, grades or error-cause judgments are displayed. Without a verified session the home displays an unsigned/empty state.
- The native answer UI, idempotent answer retry, completion reconciliation, independent verification, and pending evidence recovery are NOT YET implemented. The Start control remains disabled by design. Do not treat this as a fully playable client.
- The default touristappid is for scaffolding, not a configured production miniapp. No release or developer-tool/physical-device acceptance has been performed.

## Next acceptance gates

1. Add trusted WeChat miniapp login/identity exchange with backend validation and tests.
2. Port answer-and-recovery behavior while preserving frozen S0-S4 semantics.
3. Validate the home UI with WeChat Developer Tools on three stage themes and multiple device sizes.
4. Test cross-client server-side session/task continuity using a single authenticated student identity.

Do not merge PR #11 or deploy without explicit approval.
