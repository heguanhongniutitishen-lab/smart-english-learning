# API Conventions V1

Base path: /api/v1

## Response
```json
{"success":true,"data":{},"request_id":"req_x","server_time":"ISO-8601"}
```

## Error
```json
{"success":false,"error":{"code":"PLAN_REPLAN_CONFLICT","message":"...","retryable":true},"request_id":"req_x"}
```

## Invariants
- Fact-creating endpoints require idempotency.
- Server owns mastery and task-completion decisions.
- Client never invents mastery, evidence or equivalent-task satisfaction.
- All content attempts reference content_version_id.
