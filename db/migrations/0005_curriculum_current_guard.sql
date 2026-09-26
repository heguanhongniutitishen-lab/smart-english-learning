BEGIN;
CREATE UNIQUE INDEX ux_curriculum_one_current_per_student
ON curriculum_positions(student_id) WHERE is_current=true;
COMMIT;
