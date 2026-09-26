# Architecture Baseline V1

## Runtime
MVP uses a modular monolith API with a separate boundary for future AI services.

## Modules
Identity, Student, Curriculum, Knowledge, Content, Learning, Mastery, Review, Planning, Assessment, Report, Strategy.

## Hard invariants
1. QuestionAttempt is append-only.
2. Every valid attempt references a ContentVersion.
3. Technical failures are not negative learning evidence.
4. Evidence validity is independent from the immutable attempt fact.
5. Mastery and Ability are derived state and may be recalculated.
6. DailyPlan is versioned; completed tasks survive replanning.
7. DeferredBySystem is not student incompletion.
8. Core strategy changes carry strategy_version.

## Initial infrastructure
PostgreSQL + Redis + object storage. Outbox is used for reliable domain-event delivery.
