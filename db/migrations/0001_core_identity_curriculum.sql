BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wechat_open_id varchar(128) UNIQUE,
  union_id varchar(128),
  mobile_hash varchar(128),
  status varchar(32) NOT NULL DEFAULT 'Active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE students (
  student_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name varchar(80) NOT NULL,
  current_stage varchar(16) NOT NULL CHECK (current_stage IN ('Primary','Middle','High')),
  current_grade smallint NOT NULL CHECK (current_grade BETWEEN 1 AND 12),
  region_code varchar(32),
  timezone varchar(64) NOT NULL DEFAULT 'Asia/Shanghai',
  status varchar(32) NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE student_user_bindings (
  binding_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(student_id),
  user_id uuid NOT NULL REFERENCES users(user_id),
  role varchar(16) NOT NULL CHECK (role IN ('Student','Parent')),
  status varchar(16) NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id,user_id,role)
);

CREATE TABLE student_academic_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(student_id),
  stage varchar(16) NOT NULL,
  grade smallint NOT NULL,
  semester varchar(16),
  effective_from date NOT NULL,
  effective_to date,
  source varchar(16) NOT NULL
);

CREATE TABLE student_config_history (
  config_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(student_id),
  primary_goal varchar(64) NOT NULL,
  secondary_goal varchar(64),
  daily_minutes smallint NOT NULL CHECK (daily_minutes > 0),
  exam_date date,
  exam_target varchar(128),
  effective_at timestamptz NOT NULL DEFAULT now(),
  source varchar(16) NOT NULL
);

CREATE TABLE textbooks (
  textbook_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher varchar(128) NOT NULL,
  edition varchar(128),
  stage varchar(16) NOT NULL,
  grade smallint NOT NULL,
  volume varchar(32),
  edition_year smallint,
  status varchar(16) NOT NULL DEFAULT 'Active'
);

CREATE TABLE units (
  unit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id uuid NOT NULL REFERENCES textbooks(textbook_id),
  unit_no varchar(32) NOT NULL,
  title varchar(255),
  sort_order int NOT NULL,
  UNIQUE(textbook_id, unit_no)
);

CREATE TABLE sections (
  section_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(unit_id),
  section_code varchar(64),
  title varchar(255),
  sort_order int NOT NULL
);

CREATE TABLE curriculum_positions (
  position_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(student_id),
  textbook_id uuid REFERENCES textbooks(textbook_id),
  unit_id uuid REFERENCES units(unit_id),
  section_id uuid REFERENCES sections(section_id),
  progress_note varchar(500),
  effective_at timestamptz NOT NULL DEFAULT now(),
  source varchar(16) NOT NULL,
  is_current boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_curriculum_student_current ON curriculum_positions(student_id,is_current);

COMMIT;
