BEGIN;
ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS carried_from_task_id uuid REFERENCES daily_tasks(daily_task_id);
ALTER TABLE daily_plans ADD COLUMN IF NOT EXISTS replan_reason varchar(64);
ALTER TABLE daily_plans ADD COLUMN IF NOT EXISTS previous_plan_id uuid REFERENCES daily_plans(daily_plan_id);
COMMIT;