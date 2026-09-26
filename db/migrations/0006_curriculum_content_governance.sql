BEGIN;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS edition_year int;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS isbn varchar(32);
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS cover_uri text;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS source_type varchar(24) DEFAULT 'Manual';
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE TABLE curriculum_knowledge_mappings(
 mapping_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 textbook_id uuid NOT NULL REFERENCES textbooks(textbook_id),
 unit_id uuid REFERENCES units(unit_id),
 section_id uuid REFERENCES sections(section_id),
 knowledge_id uuid NOT NULL REFERENCES knowledge_points(knowledge_id),
 importance varchar(16) NOT NULL DEFAULT 'Standard',
 source varchar(24) NOT NULL DEFAULT 'Research',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(textbook_id,section_id,knowledge_id)
);

CREATE TABLE curriculum_ability_mappings(
 mapping_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 textbook_id uuid NOT NULL REFERENCES textbooks(textbook_id),
 unit_id uuid REFERENCES units(unit_id),
 section_id uuid REFERENCES sections(section_id),
 ability_id uuid NOT NULL REFERENCES abilities(ability_id),
 importance varchar(16) NOT NULL DEFAULT 'Standard',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(textbook_id,section_id,ability_id)
);

CREATE TABLE textbook_import_rows(
 import_row_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 import_job_id uuid NOT NULL REFERENCES textbook_import_jobs(import_job_id) ON DELETE CASCADE,
 row_number int NOT NULL,
 raw_payload jsonb NOT NULL,
 normalized_payload jsonb,
 validation_status varchar(24) NOT NULL DEFAULT 'Pending',
 validation_errors jsonb,
 review_status varchar(24) NOT NULL DEFAULT 'Pending',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(import_job_id,row_number)
);
COMMIT;
