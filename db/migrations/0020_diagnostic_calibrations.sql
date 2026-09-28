BEGIN;
CREATE TABLE diagnostic_calibrations (
  diagnostic_calibration_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_session_id uuid NOT NULL REFERENCES diagnostic_sessions(diagnostic_session_id),
  student_id uuid NOT NULL REFERENCES students(student_id),
  target_type varchar(16) NOT NULL CHECK (target_type IN ('Knowledge','Ability')),
  target_id uuid NOT NULL,
  decision varchar(24) NOT NULL CHECK (decision IN ('Promote','PriorOnly','Insufficient')),
  source_estimate numeric(8,4) NOT NULL,
  source_confidence numeric(5,4) NOT NULL,
  evidence_count int NOT NULL,
  promoted_score numeric(8,4),
  promoted_confidence numeric(5,4),
  reason_code varchar(64) NOT NULL,
  model_version varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(diagnostic_session_id,target_type,target_id,model_version)
);
CREATE INDEX idx_diagnostic_calibration_student ON diagnostic_calibrations(student_id,created_at DESC);
COMMIT;
