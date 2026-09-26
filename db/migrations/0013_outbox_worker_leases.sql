BEGIN;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS claim_token uuid;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS attempt_count int NOT NULL DEFAULT 0;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS last_error text;
CREATE INDEX IF NOT EXISTS idx_outbox_claimable ON outbox_events(created_at) WHERE processed_at IS NULL;
COMMIT;