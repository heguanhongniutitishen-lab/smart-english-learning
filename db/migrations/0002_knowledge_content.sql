BEGIN;

CREATE TABLE knowledge_points (
  knowledge_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES knowledge_points(knowledge_id),
  level smallint NOT NULL CHECK (level BETWEEN 1 AND 5),
  domain varchar(32) NOT NULL,
  code varchar(128) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'Active',
  version int NOT NULL DEFAULT 1
);

CREATE TABLE abilities (
  ability_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES abilities(ability_id),
  domain varchar(32) NOT NULL,
  code varchar(128) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  stage_min varchar(16),
  stage_max varchar(16),
  status varchar(16) NOT NULL DEFAULT 'Active'
);

CREATE TABLE knowledge_relations (
  relation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_knowledge_id uuid NOT NULL REFERENCES knowledge_points(knowledge_id),
  to_knowledge_id uuid NOT NULL REFERENCES knowledge_points(knowledge_id),
  relation_type varchar(32) NOT NULL,
  strength numeric(5,4),
  source varchar(16) NOT NULL,
  review_status varchar(16) NOT NULL DEFAULT 'Pending',
  version int NOT NULL DEFAULT 1
);

CREATE TABLE content_items (
  content_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type varchar(32) NOT NULL,
  current_version_id uuid,
  source_type varchar(32) NOT NULL,
  quality_level varchar(8) NOT NULL DEFAULT 'Q0',
  status varchar(32) NOT NULL DEFAULT 'Draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content_versions (
  content_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES content_items(content_id),
  version_no int NOT NULL,
  payload jsonb NOT NULL,
  answer_payload jsonb,
  explanation_payload jsonb,
  difficulty_label varchar(8),
  estimated_seconds int,
  review_status varchar(32) NOT NULL DEFAULT 'Draft',
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_id,version_no)
);
ALTER TABLE content_items ADD CONSTRAINT fk_current_content_version
  FOREIGN KEY (current_version_id) REFERENCES content_versions(content_version_id);

CREATE TABLE content_knowledge (
  content_version_id uuid NOT NULL REFERENCES content_versions(content_version_id),
  knowledge_id uuid NOT NULL REFERENCES knowledge_points(knowledge_id),
  role varchar(32) NOT NULL CHECK (role IN ('PrimaryTested','SecondaryTested','ContextOnly')),
  weight numeric(5,4),
  purpose varchar(16) NOT NULL,
  review_status varchar(16) NOT NULL DEFAULT 'Pending',
  PRIMARY KEY(content_version_id,knowledge_id,role)
);

CREATE TABLE content_ability (
  content_version_id uuid NOT NULL REFERENCES content_versions(content_version_id),
  ability_id uuid NOT NULL REFERENCES abilities(ability_id),
  weight numeric(5,4),
  purpose varchar(16) NOT NULL,
  PRIMARY KEY(content_version_id,ability_id,purpose)
);

COMMIT;
