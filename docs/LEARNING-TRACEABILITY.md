# Learning traceability

Every scored QuestionAttempt must retain the exact content_version_id used when the learner answered.

Optional curriculum_position_id captures the learner's school-progress context at that moment.

Trace chain:
QuestionAttempt -> ContentVersion -> ContentItem -> Knowledge/Ability mappings.

When curriculum context exists:
QuestionAttempt -> CurriculumPosition -> Textbook / Unit / Section.

Published content is never edited in place. New authoring creates another ContentVersion, so historical evidence remains reproducible.

This rule is required for mastery recalculation, error investigation, teaching-research QA and future algorithm audits.
