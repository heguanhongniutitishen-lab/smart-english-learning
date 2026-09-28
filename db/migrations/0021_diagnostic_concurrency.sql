BEGIN;
CREATE UNIQUE INDEX uq_diagnostic_active_student
ON diagnostic_sessions(student_id)
WHERE status='Active';
COMMIT;
