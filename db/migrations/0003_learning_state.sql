BEGIN;

CREATE TABLE learning_sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(student_id),
  daily_plan_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  effective_seconds int NOT NULL DEFAULT 0,
  device_id_hash varchar(128),
  status varchar(16) NOT NULL DEFAULT 'Active'
);

CREATE TABLE question_attempts (
  attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(student_id),
  session_id uuid REFERENCES learning_sessions(session_id),
  daily_task_id uuid,
  content_version_id uuid NOT NULL REFERENCES content_versions(content_version_id),
  request_id varchar(128) NOT NULL,
  answer_payload jsonb NOT NULL,
  result varchar(16) NOT NULL,
  response_time_ms int,
  hint_level smallint NOT NULL DEFAULT 0,
  attempt_no smallint NOT NULL DEFAULT 1,
  exposure_type varchar(16) NOT NULL DEFAULT 'FirstSeen',
  technical_status varchar(32) NOT NULL DEFAULT 'OK',
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id,request_id)
);
CREATE INDEX idx_attempt_student_time ON question_attempts(student_id,occurred_at DESC);

CREATE TABLE evidences (
  evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(student_id),
  attempt_id uuid REFERENCES question_attempts(attempt_id),
  target_type varchar(16) NOT NULL,
  target_id uuid NOT NULL,
  direction varchar(16) NOT NULL,
  quality_score numeric(5,4) NOT NULL,
  independence_score numeric(5,4) NOT NULL,
  difficulty_factor numeric(7,4),
  confidence_delta numeric(7,4),
  source varchar(16) NOT NULL,
  model_version varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evidence_validity (
  evidence_id uuid PRIMARY KEY REFERENCES evidences(evidence_id),
  status varchar(16) NOT NULL DEFAULT 'Valid',
  reason_code varchar(64),
  invalidated_at timestamptz,
  invalidated_by uuid,
  recalc_required boolean NOT NULL DEFAULT false
);

CREATE TABLE mastery_records (
  student_id uuid NOT NULL REFERENCES students(student_id),
  knowledge_id uuid NOT NULL REFERENCES knowledge_points(knowledge_id),
  mastery_state varchar(4) NOT NULL DEFAULT 'S0',
  confidence numeric(5,4) NOT NULL DEFAULT 0,
  last_evidence_at timestamptz,
  last_verified_at timestamptz,
  next_review_at timestamptz,
  evidence_count int NOT NULL DEFAULT 0,
  model_version varchar(64) NOT NULL,
  state_version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(student_id,knowledge_id)
);

CREATE TABLE ability_states (
  student_id uuid NOT NULL REFERENCES students(student_id),
  ability_id uuid NOT NULL REFERENCES abilities(ability_id),
  level_score numeric(8,4) NOT NULL DEFAULT 0,
  confidence numeric(5,4) NOT NULL DEFAULT 0,
  evidence_count int NOT NULL DEFAULT 0,
  model_version varchar(64) NOT NULL,
  state_version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(student_id,ability_id)
);

CREATE TABLE outbox_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type varchar(64) NOT NULL,
  aggregate_type varchar(64) NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX idx_outbox_unprocessed ON outbox_events(created_at) WHERE processed_at IS NULL;

COMMIT;
