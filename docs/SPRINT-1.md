# Sprint 1: Identity / Student / Curriculum

Implemented:
- request-id aware HTTP layer
- WeChat login adapter contract (development stub accepts open_id)
- student creation and binding
- append-only student config history
- curriculum-position history with unknown-textbook fallback
- API smoke tests

The MemoryStore is development-only. Production wiring must use PostgreSQL.

Next:
1. PostgreSQL repository and transaction layer
2. WeChat code exchange adapter
3. academic-history endpoint
4. textbook read APIs
5. idempotency middleware for fact-creating endpoints
