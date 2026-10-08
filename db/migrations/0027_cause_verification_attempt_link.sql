BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cause_verification_attempt_link
 ON error_cause_verifications(attempt_id)
 WHERE attempt_id IS NOT NULL;
COMMIT;
