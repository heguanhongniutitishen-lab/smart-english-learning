BEGIN;
CREATE TABLE idempotency_keys(
  idempotency_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope varchar(128) NOT NULL,
  request_id varchar(128) NOT NULL,
  request_hash varchar(128),
  response_status int,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(scope,request_id)
);
CREATE INDEX idx_idempotency_expiry ON idempotency_keys(expires_at);

CREATE TABLE textbook_import_jobs(
  import_job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id uuid REFERENCES textbooks(textbook_id),
  import_type varchar(16) NOT NULL CHECK(import_type IN ('Manual','Excel','PDF','Image')),
  source_file_uri text,
  source_checksum varchar(128),
  status varchar(24) NOT NULL DEFAULT 'Draft',
  ai_parse_status varchar(24),
  validation_summary jsonb,
  created_by uuid REFERENCES users(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES users(user_id),
  reviewed_at timestamptz
);
COMMENT ON TABLE textbook_import_jobs IS 'Import staging only. AI/OCR output must be human-reviewed before publication.';
COMMIT;
