BEGIN;
ALTER TABLE question_attempts ADD COLUMN IF NOT EXISTS curriculum_position_id uuid REFERENCES curriculum_positions(curriculum_position_id);
CREATE INDEX IF NOT EXISTS idx_attempt_content_version ON question_attempts(content_version_id);
CREATE INDEX IF NOT EXISTS idx_attempt_curriculum_position ON question_attempts(curriculum_position_id);
CREATE TABLE textbook_publication_events(
 event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 textbook_id uuid NOT NULL REFERENCES textbooks(textbook_id),
 import_job_id uuid REFERENCES textbook_import_jobs(import_job_id),
 actor_user_id uuid REFERENCES users(user_id),
 published_at timestamptz NOT NULL DEFAULT now(),
 snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
);
COMMIT;
