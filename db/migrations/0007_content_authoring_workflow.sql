BEGIN;




ALTER TABLE content_versions ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(user_id);
ALTER TABLE content_versions ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE content_versions ADD COLUMN IF NOT EXISTS source_metadata jsonb;
CREATE TABLE publication_events(
 publication_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 aggregate_type varchar(32) NOT NULL,
 aggregate_id uuid NOT NULL,
 from_status varchar(24),
 to_status varchar(24) NOT NULL,
 actor_user_id uuid REFERENCES users(user_id),
 reason text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_publication_events_aggregate ON publication_events(aggregate_type,aggregate_id,created_at);
COMMIT;
