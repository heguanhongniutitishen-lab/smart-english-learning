BEGIN;
CREATE UNIQUE INDEX uq_micro_repair_open_cause_target
ON micro_repair_tasks(error_cause_hypothesis_id,target_type,target_id,repair_type)
WHERE status IN ('Pending','Active');
COMMIT;
