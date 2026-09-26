# Textbook Ingestion Architecture V1

## Entry
Research Admin -> Textbook Center -> Textbook Library -> New / Import.

## Supported ingestion path
1. Manual structured editing
2. Excel batch import
3. PDF/Image OCR + AI-assisted parsing (later)
4. Human review
5. Publish

AI/OCR output is always draft data. It never becomes published textbook truth without human review.

## Structure
Textbook -> Unit -> Section -> curriculum mapping -> KnowledgePoint/Ability -> ContentVersion.

Textbook, knowledge and content are separate domains. Switching textbook must not erase a student's knowledge mastery.

## Version policy
Never overwrite an old published textbook edition. Create a new edition/version and migrate bindings deliberately.

## MVP
Sprint 2 prepares import contracts and structured data. Full Research Admin upload UI remains scheduled for the research-admin sprint.
