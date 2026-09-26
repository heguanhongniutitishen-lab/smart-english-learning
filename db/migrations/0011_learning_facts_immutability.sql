BEGIN;
ALTER TABLE question_attempts ADD COLUMN IF NOT EXISTS curriculum_position_id uuid REFERENCES curriculum_positions(position_id);
ALTER TABLE question_attempts ADD COLUMN IF NOT EXISTS client_occurred_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_learning_session_student_status ON learning_sessions(student_id,status,started_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempt_session_time ON question_attempts(session_id,occurred_at);
CREATE OR REPLACE FUNCTION reject_question_attempt_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'question_attempts are immutable'; END $$;
DROP TRIGGER IF EXISTS trg_question_attempts_immutable ON question_attempts;
CREATE TRIGGER trg_question_attempts_immutable BEFORE UPDATE OR DELETE ON question_attempts FOR EACH ROW EXECUTE FUNCTION reject_question_attempt_mutation();
COMMIT;