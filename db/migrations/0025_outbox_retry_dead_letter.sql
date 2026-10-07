BEGIN;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS available_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS dead_letter_reason text;
CREATE INDEX IF NOT EXISTS idx_outbox_retry_claimable ON outbox_events(available_at,attempt_count,created_at) WHERE processed_at IS NULL AND dead_lettered_at IS NULL;
COMMIT;
