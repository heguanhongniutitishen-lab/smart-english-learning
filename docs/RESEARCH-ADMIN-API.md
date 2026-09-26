# Research Admin API V1

Research routes are server-side administrative capabilities. They are not student APIs.

Initial endpoints:
- POST /api/v1/research/knowledge-points
- POST /api/v1/research/abilities
- POST /api/v1/research/content
- POST /api/v1/research/content/:contentItemId/versions
- POST /api/v1/research/content/:contentItemId/versions/:versionId/approve
- POST /api/v1/research/content/:contentItemId/versions/:versionId/publish

## Security boundary
x-user-id is temporary Sprint infrastructure, not production authorization. Before external deployment, research routes require role/permission middleware and audit logging. This is a release blocker, not optional polish.

## Content rule
Published versions are immutable historical anchors. Editing published content creates a new version.
