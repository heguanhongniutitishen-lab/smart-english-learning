BEGIN;

CREATE TABLE error_observations (
  error_observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(student_id),
  attempt_id uuid NOT NULL REFERENCES question_attempts(attempt_id),
  content_version_id uuid NOT NULL REFERENCES content_versions(content_version_id),
  observation_type varchar(32) NOT NULL DEFAULT 'WrongAnswer'
    CHECK (observation_type IN ('WrongAnswer','RepeatedWrong','Hesitation','HintDependency')),
  status varchar(24) NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open','UnderVerification','Resolved','Dismissed')),
  source varchar(24) NOT NULL DEFAULT 'Rule'
    CHECK (source IN ('Rule','Teacher','Student','AI')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(attempt_id,observation_type)
);
CREATE INDEX idx_error_observation_student_open
  ON error_observations(student_id,created_at DESC)
  WHERE status IN ('Open','UnderVerification');

CREATE TABLE error_cause_hypotheses (
  error_cause_hypothesis_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_observation_id uuid NOT NULL REFERENCES error_observations(error_observation_id),
  cause_code varchar(64) NOT NULL,
  confidence numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  status varchar(24) NOT NULL DEFAULT 'Candidate'
    CHECK (status IN ('Candidate','Verified','Rejected','Inconclusive')),
  source varchar(24) NOT NULL
    CHECK (source IN ('Rule','Teacher','Student','AI','Verification')),
  rationale jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  UNIQUE(error_observation_id,cause_code)
);
CREATE INDEX idx_error_cause_observation
  ON error_cause_hypotheses(error_observation_id,status);

CREATE TABLE error_cause_verifications (
  error_cause_verification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_cause_hypothesis_id uuid NOT NULL REFERENCES error_cause_hypotheses(error_cause_hypothesis_id),
  verification_type varchar(32) NOT NULL
    CHECK (verification_type IN ('Question','MicroTask','TeacherReview','StudentCheck')),
  content_version_id uuid REFERENCES content_versions(content_version_id),
  attempt_id uuid REFERENCES question_attempts(attempt_id),
  result varchar(24)
    CHECK (result IS NULL OR result IN ('Supports','Contradicts','Inconclusive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX idx_error_verification_pending
  ON error_cause_verifications(error_cause_hypothesis_id,created_at)
  WHERE result IS NULL;

CREATE TABLE micro_repair_tasks (
  micro_repair_task_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(student_id),
  error_observation_id uuid NOT NULL REFERENCES error_observations(error_observation_id),
  error_cause_hypothesis_id uuid REFERENCES error_cause_hypotheses(error_cause_hypothesis_id),
  target_type varchar(16) NOT NULL CHECK (target_type IN ('Knowledge','Ability')),
  target_id uuid NOT NULL,
  repair_type varchar(32) NOT NULL
    CHECK (repair_type IN ('Explain','Contrast','Prerequisite','GuidedPractice','VariantPractice')),
  status varchar(24) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending','Active','Completed','Deferred','Cancelled')),
  priority smallint NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  estimated_seconds int NOT NULL CHECK (estimated_seconds > 0),
  return_policy varchar(32) NOT NULL DEFAULT 'ReturnToMainLine'
    CHECK (return_policy IN ('ReturnToMainLine','ContinueRepair','DeferToReview')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX idx_micro_repair_student_pending
  ON micro_repair_tasks(student_id,priority DESC,created_at)
  WHERE status IN ('Pending','Active');

COMMIT;
