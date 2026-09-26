# Research permissions V1

Server-side roles:
- PlatformAdmin: full research administration
- ResearchAdmin: research administration and review
- ResearchEditor: authoring/import editing, no approval
- ResearchReviewer: review/approval

Student/Parent/Teacher identities do not gain research privileges.

## Separation of duties
ResearchEditor cannot approve publication. Review endpoints require a reviewer-capable role.

## Audit
Import-row review stores reviewed_by and reviewed_at. ContentVersion already stores reviewer identity and timestamp. Publication events remain append-only audit records.

Hiding an admin button in the UI is not authorization. All privileged operations are enforced by the API.
