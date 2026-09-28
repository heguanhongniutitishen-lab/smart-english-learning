BEGIN;
CREATE TABLE scheduler_policies(
 scheduler_policy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 policy_key varchar(64) NOT NULL,
 version int NOT NULL,
 stage varchar(16),
 grade_min smallint,
 grade_max smallint,
 exam_days_max int,
 minimum_share jsonb NOT NULL,
 status varchar(16) NOT NULL DEFAULT 'Draft',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(policy_key,version)
);
CREATE INDEX idx_scheduler_policy_match ON scheduler_policies(status,stage,grade_min,grade_max,exam_days_max);
INSERT INTO scheduler_policies(policy_key,version,minimum_share,status)
VALUES('default',1,'{"SchoolSync":0.35,"Review":0.15,"Weakness":0.15,"Exam":0}'::jsonb,'Active')
ON CONFLICT(policy_key,version) DO NOTHING;
COMMIT;