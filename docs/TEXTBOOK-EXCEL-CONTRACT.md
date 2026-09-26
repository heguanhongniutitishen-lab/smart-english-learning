# Textbook Excel Import Contract V1

Required columns:
- unit_code
- section_code
- content_type
- content_text
- translation
- knowledge_codes
- ability_codes

Allowed content_type values:
Word, Phrase, SentencePattern, Grammar, Dialogue, Reading, Listening, Writing, Other.

knowledge_codes and ability_codes may contain multiple codes separated by semicolon or Chinese semicolon/comma.

## Pipeline
Upload -> header validation -> row normalization -> staging -> row validation -> human review -> publish.

Import never writes directly into published curriculum/content tables.

## Error handling
Each row keeps raw payload, normalized payload, validation status and validation errors. A bad row does not silently disappear.

## Versioning
Updating a published textbook creates a new edition/version. Updating published learning content creates a new ContentVersion. Historical attempts retain their original content_version_id.
