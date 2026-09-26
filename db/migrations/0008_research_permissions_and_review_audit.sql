BEGIN;
CREATE TABLE user_roles(
 user_role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(user_id),
 role_code varchar(40) NOT NULL,
 status varchar(16) NOT NULL DEFAULT 'Active',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,role_code)
);
ALTER TABLE textbook_import_rows ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(user_id);
ALTER TABLE textbook_import_rows ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
CREATE INDEX idx_user_roles_active ON user_roles(user_id,role_code) WHERE status='Active';
COMMIT;
