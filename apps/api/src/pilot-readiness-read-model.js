export class PilotReadinessReadModel{
 constructor(pool){this.pool=pool;}
 async get(cohortId){
  const cohort=(await this.pool.query("SELECT cohort_id,cohort_code,name,status,starts_on,ends_on FROM pilot_cohorts WHERE cohort_id=$1",[cohortId])).rows[0];if(!cohort)return null;
  const [members,attempts,evidence,plans,feedback]=await Promise.all([
   this.pool.query(`SELECT count(*)::int total,count(*) FILTER(WHERE status='Enrolled')::int enrolled FROM pilot_cohort_memberships WHERE cohort_id=$1`,[cohortId]),
   this.pool.query(`SELECT count(*)::int total,
    count(*) FILTER(WHERE a.content_version_id IS NULL)::int missing_content_version,
    count(*) FILTER(WHERE a.daily_task_id IS NOT NULL AND t.daily_task_id IS NULL)::int broken_task_link,
    count(*) FILTER(WHERE a.position_id IS NOT NULL AND cp.position_id IS NULL)::int broken_position_link
    FROM pilot_cohort_memberships m JOIN question_attempts a ON a.student_id=m.student_id
    LEFT JOIN daily_tasks t ON t.daily_task_id=a.daily_task_id LEFT JOIN curriculum_positions cp ON cp.position_id=a.position_id
    WHERE m.cohort_id=$1`,[cohortId]),
   this.pool.query(`SELECT count(*)::int total,
    count(*) FILTER(WHERE v.evidence_id IS NULL)::int missing_validity,
    count(*) FILTER(WHERE e.attempt_id IS NOT NULL AND a.attempt_id IS NULL)::int broken_attempt_link,
    count(*) FILTER(WHERE e.model_version IS NULL OR e.model_version='')::int missing_model_version
    FROM pilot_cohort_memberships m JOIN evidences e ON e.student_id=m.student_id
    LEFT JOIN evidence_validity v USING(evidence_id) LEFT JOIN question_attempts a USING(attempt_id)
    WHERE m.cohort_id=$1`,[cohortId]),
   this.pool.query(`SELECT count(*)::int total,count(*) FILTER(WHERE p.strategy_version IS NULL OR p.strategy_version='')::int missing_strategy_version
    FROM pilot_cohort_memberships m JOIN daily_plans p ON p.student_id=m.student_id WHERE m.cohort_id=$1`,[cohortId]),
   this.pool.query(`SELECT count(*)::int observations,
    count(*) FILTER(WHERE o.attempt_id IS NULL OR a.attempt_id IS NULL)::int broken_attempt_link,
    count(*) FILTER(WHERE o.content_version_id IS NULL)::int missing_content_version
    FROM pilot_cohort_memberships m JOIN error_observations o ON o.student_id=m.student_id LEFT JOIN question_attempts a ON a.attempt_id=o.attempt_id
    WHERE m.cohort_id=$1`,[cohortId])
  ]);
  const details={members:members.rows[0],attempts:attempts.rows[0],evidence:evidence.rows[0],plans:plans.rows[0],feedback:feedback.rows[0]};
  const blockers=Number(details.attempts.missing_content_version)+Number(details.attempts.broken_task_link)+Number(details.attempts.broken_position_link)+Number(details.evidence.missing_validity)+Number(details.evidence.broken_attempt_link)+Number(details.evidence.missing_model_version)+Number(details.plans.missing_strategy_version)+Number(details.feedback.broken_attempt_link)+Number(details.feedback.missing_content_version);
  return{cohort,ready:blockers===0,blockers,details};
 }
}
