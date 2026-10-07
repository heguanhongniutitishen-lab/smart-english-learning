BEGIN;
CREATE TABLE IF NOT EXISTS state_recalculation_jobs(
 job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 evidence_id uuid NOT NULL REFERENCES evidences(evidence_id),
 student_id uuid NOT NULL REFERENCES students(student_id),
 target_type varchar(16) NOT NULL,
 target_id uuid NOT NULL,
 status varchar(16) NOT NULL DEFAULT 'Pending',
 attempt_count int NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(),
 claimed_at timestamptz,
 claim_token uuid,
 last_error text,
 completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(evidence_id)
);
CREATE INDEX IF NOT EXISTS idx_state_recalc_claimable ON state_recalculation_jobs(available_at,created_at) WHERE status IN ('Pending','Retry');
COMMIT;
