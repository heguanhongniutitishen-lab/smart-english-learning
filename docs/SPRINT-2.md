# Sprint 2: Curriculum / Knowledge / Content Foundation

## Goal
Build the governed master-data chain:
Textbook -> Unit -> Section -> KnowledgePoint / Ability -> ContentVersion.

## Invariants
- Published textbook editions are immutable; changes create a new edition.
- Textbook structure is not the same thing as knowledge mastery.
- Knowledge and ability mappings are reusable across textbook editions.
- Import data enters staging first.
- OCR/AI parsed data is draft-only and cannot bypass human review.
- ContentVersion remains the traceability anchor for learning attempts.

## Delivery slices
1. curriculum governance schema
2. import staging + validation
3. knowledge/ability mapping
4. content version authoring
5. research-admin APIs
6. Excel import contract
7. publication workflow
