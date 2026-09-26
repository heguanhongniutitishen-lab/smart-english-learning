BEGIN;
CREATE TABLE IF NOT EXISTS review_policies(
 policy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 policy_key varchar(64) NOT NULL,
 version int NOT NULL,
 intervals jsonb NOT NULL,
 confidence_floor numeric(5,4) NOT NULL DEFAULT 0.45,
 status varchar(16) NOT NULL DEFAULT 'Draft',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(policy_key,version)
);
INSERT INTO review_policies(policy_key,version,intervals,confidence_floor,status)
VALUES('default',1,'{"S1":1,"S2":3,"S3":7,"S4":30}'::jsonb,0.45,'Active')
ON CONFLICT(policy_key,version) DO NOTHING;
COMMIT;