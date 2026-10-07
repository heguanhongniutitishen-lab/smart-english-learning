BEGIN;

CREATE TABLE pilot_cohorts(
 cohort_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 cohort_code varchar(64) NOT NULL UNIQUE,
 name varchar(120) NOT NULL,
 status varchar(16) NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Active','Closed')),
 starts_on date,
 ends_on date,
 created_by uuid REFERENCES users(user_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_on IS NULL OR starts_on IS NULL OR ends_on>=starts_on)
);

CREATE TABLE pilot_cohort_memberships(
 membership_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 cohort_id uuid NOT NULL REFERENCES pilot_cohorts(cohort_id),
 student_id uuid NOT NULL REFERENCES students(student_id),
 status varchar(16) NOT NULL DEFAULT 'Enrolled' CHECK(status IN ('Enrolled','Withdrawn','Completed')),
 enrolled_at timestamptz NOT NULL DEFAULT now(),
 ended_at timestamptz,
 created_by uuid REFERENCES users(user_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(cohort_id,student_id),
 CHECK((status='Enrolled' AND ended_at IS NULL) OR status<>'Enrolled')
);
CREATE INDEX idx_pilot_membership_student ON pilot_cohort_memberships(student_id,cohort_id);
CREATE INDEX idx_pilot_membership_active ON pilot_cohort_memberships(cohort_id,student_id) WHERE status='Enrolled';

COMMIT;
