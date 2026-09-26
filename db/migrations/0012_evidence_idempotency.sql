BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_attempt_target_model ON evidences(attempt_id,target_type,target_id,model_version) WHERE attempt_id IS NOT NULL;
COMMIT;