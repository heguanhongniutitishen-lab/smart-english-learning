BEGIN;
CREATE TABLE daily_plans(
 daily_plan_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id uuid NOT NULL REFERENCES students(student_id),
 plan_date date NOT NULL,
 version int NOT NULL,
 status varchar(16) NOT NULL DEFAULT 'Draft',
 available_minutes smallint NOT NULL CHECK(available_minutes>0),
 strategy_version varchar(64) NOT NULL,
 generated_at timestamptz NOT NULL DEFAULT now(),
 superseded_at timestamptz,
 UNIQUE(student_id,plan_date,version)
);
CREATE UNIQUE INDEX uq_daily_plan_active ON daily_plans(student_id,plan_date) WHERE status='Active';
CREATE TABLE daily_tasks(
 daily_task_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 daily_plan_id uuid NOT NULL REFERENCES daily_plans(daily_plan_id),
 source_type varchar(24) NOT NULL,
 target_type varchar(24) NOT NULL,
 target_id uuid,
 curriculum_position_id uuid REFERENCES curriculum_positions(position_id),
 estimated_seconds int NOT NULL CHECK(estimated_seconds>0),
 priority numeric(8,4) NOT NULL,
 sort_order int NOT NULL,
 reason_code varchar(64) NOT NULL,
 status varchar(16) NOT NULL DEFAULT 'Pending'
);
CREATE TABLE daily_plan_candidates(
 candidate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 daily_plan_id uuid NOT NULL REFERENCES daily_plans(daily_plan_id),
 source_type varchar(24) NOT NULL,
 target_type varchar(24) NOT NULL,
 target_id uuid,
 estimated_seconds int NOT NULL CHECK(estimated_seconds>0),
 priority numeric(8,4) NOT NULL,
 decision varchar(16) NOT NULL,
 reason_code varchar(64) NOT NULL
);
COMMIT;