BEGIN;
CREATE TABLE IF NOT EXISTS learning_events (
  learning_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(student_id),
  session_id uuid REFERENCES learning_sessions(session_id),
  event_type varchar(64) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_events_student_time ON learning_events(student_id,occurred_at DESC);
COMMIT;