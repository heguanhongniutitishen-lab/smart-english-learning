BEGIN;

CREATE TABLE onboarding_profiles (
  onboarding_profile_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(student_id),
  version int NOT NULL,
  region_code varchar(32),
  textbook_id uuid REFERENCES textbooks(textbook_id),
  curriculum_position_id uuid REFERENCES curriculum_positions(position_id),
  recent_score_range jsonb,
  primary_goal varchar(64),
  secondary_goal varchar(64),
  daily_minutes smallint CHECK (daily_minutes > 0),
  self_reported_weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  source varchar(32) NOT NULL DEFAULT 'Student',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id,version)
);
CREATE INDEX idx_onboarding_profile_student ON onboarding_profiles(student_id,version DESC);

CREATE TABLE diagnostic_policies (
  diagnostic_policy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key varchar(64) NOT NULL,
  version int NOT NULL,
  stage varchar(16),
  grade_min smallint,
  grade_max smallint,
  dimensions jsonb NOT NULL,
  stop_rules jsonb NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'Draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(policy_key,version)
);
CREATE INDEX idx_diagnostic_policy_active ON diagnostic_policies(status,stage,grade_min,grade_max);

CREATE TABLE diagnostic_sessions (
  diagnostic_session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(student_id),
  onboarding_profile_id uuid REFERENCES onboarding_profiles(onboarding_profile_id),
  policy_key varchar(64) NOT NULL,
  policy_version int NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Completed','Abandoned')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  stop_reason varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_diagnostic_session_student ON diagnostic_sessions(student_id,started_at DESC);

CREATE TABLE diagnostic_items (
  diagnostic_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_session_id uuid NOT NULL REFERENCES diagnostic_sessions(diagnostic_session_id),
  sequence_no int NOT NULL,
  content_version_id uuid NOT NULL REFERENCES content_versions(content_version_id),
  dimension varchar(32) NOT NULL,
  target_type varchar(16) NOT NULL CHECK (target_type IN ('Knowledge','Ability')),
  target_id uuid NOT NULL,
  selection_reason varchar(64) NOT NULL,
  expected_information_gain numeric(7,4),
  selected_at timestamptz NOT NULL DEFAULT now(),
  answered_attempt_id uuid REFERENCES question_attempts(attempt_id),
  UNIQUE(diagnostic_session_id,sequence_no),
  UNIQUE(diagnostic_session_id,content_version_id)
);

CREATE TABLE diagnostic_estimates (
  diagnostic_session_id uuid NOT NULL REFERENCES diagnostic_sessions(diagnostic_session_id),
  target_type varchar(16) NOT NULL CHECK (target_type IN ('Knowledge','Ability')),
  target_id uuid NOT NULL,
  estimate numeric(8,4) NOT NULL,
  confidence numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  evidence_count int NOT NULL DEFAULT 0,
  model_version varchar(64) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(diagnostic_session_id,target_type,target_id)
);

INSERT INTO diagnostic_policies(policy_key,version,stage,grade_min,grade_max,dimensions,stop_rules,status)
VALUES
('primary-upper-v1',1,'Primary',4,6,'["Vocabulary","SentencePattern","Reading","Listening"]'::jsonb,'{"max_items":24,"max_minutes":12,"target_confidence":0.75}'::jsonb,'Active'),
('middle-v1',1,'Middle',7,9,'["Vocabulary","Grammar","Reading","Listening"]'::jsonb,'{"max_items":30,"max_minutes":15,"target_confidence":0.75}'::jsonb,'Active');

COMMIT;
