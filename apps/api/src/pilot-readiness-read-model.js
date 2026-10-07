export class PilotReadinessReadModel{
 constructor(pool){this.pool=pool;}
 async get(cohortId){
  const cohort=(await this.pool.query("SELECT cohort_id,cohort_code,name,status,starts_on,ends_on FROM pilot_cohorts WHERE cohort_id=$1",[cohortId])).rows[0];if(!cohort)return null;
  const [members,attempts,evidence,plans,feedback,state,repairs]=await Promise.all([
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
    WHERE m.cohort_id=$1`,[cohortId]),
   this.pool.query(`WITH valid AS (
      SELECT e.student_id,e.target_type,e.target_id,count(*)::int n FROM pilot_cohort_memberships m
      JOIN evidences e ON e.student_id=m.student_id JOIN evidence_validity v USING(evidence_id)
      WHERE m.cohort_id=$1 AND v.status='Valid' GROUP BY e.student_id,e.target_type,e.target_id
    )
    SELECT count(*) FILTER(WHERE x.target_type='Knowledge' AND mr.student_id IS NULL)::int missing_mastery,
      count(*) FILTER(WHERE x.target_type='Knowledge' AND mr.student_id IS NOT NULL AND mr.evidence_count<>x.n)::int mastery_count_mismatch,
      count(*) FILTER(WHERE x.target_type='Knowledge' AND mr.student_id IS NOT NULL AND (mr.model_version IS NULL OR mr.model_version=''))::int mastery_missing_model_version,
      count(*) FILTER(WHERE x.target_type='Ability' AND ab.student_id IS NULL)::int missing_ability,
      count(*) FILTER(WHERE x.target_type='Ability' AND ab.student_id IS NOT NULL AND ab.evidence_count<>x.n)::int ability_count_mismatch,
      count(*) FILTER(WHERE x.target_type='Ability' AND ab.student_id IS NOT NULL AND (ab.model_version IS NULL OR ab.model_version=''))::int ability_missing_model_version
    FROM valid x LEFT JOIN mastery_records mr ON x.target_type='Knowledge' AND mr.student_id=x.student_id AND mr.knowledge_id=x.target_id
    LEFT JOIN ability_states ab ON x.target_type='Ability' AND ab.student_id=x.student_id AND ab.ability_id=x.target_id`,[cohortId]),
   this.pool.query(`SELECT count(*)::int total,
    count(*) FILTER(WHERE r.error_observation_id IS NULL OR o.error_observation_id IS NULL)::int broken_observation_link,
    count(*) FILTER(WHERE r.error_cause_hypothesis_id IS NOT NULL AND h.error_cause_hypothesis_id IS NULL)::int broken_hypothesis_link
    FROM pilot_cohort_memberships m JOIN micro_repair_tasks r ON r.student_id=m.student_id
    LEFT JOIN error_observations o ON o.error_observation_id=r.error_observation_id
    LEFT JOIN error_cause_hypotheses h ON h.error_cause_hypothesis_id=r.error_cause_hypothesis_id
    WHERE m.cohort_id=$1`,[cohortId])
  ]);
  const details={members:members.rows[0],attempts:attempts.rows[0],evidence:evidence.rows[0],plans:plans.rows[0],feedback:feedback.rows[0],state:state.rows[0],repairs:repairs.rows[0]};
  const blockers=Number(details.attempts.missing_content_version)+Number(details.attempts.broken_task_link)+Number(details.attempts.broken_position_link)+Number(details.evidence.missing_validity)+Number(details.evidence.broken_attempt_link)+Number(details.evidence.missing_model_version)+Number(details.plans.missing_strategy_version)+Number(details.feedback.broken_attempt_link)+Number(details.feedback.missing_content_version)+Number(details.state.missing_mastery)+Number(details.state.mastery_count_mismatch)+Number(details.state.mastery_missing_model_version)+Number(details.state.missing_ability)+Number(details.state.ability_count_mismatch)+Number(details.state.ability_missing_model_version)+Number(details.repairs.broken_observation_link)+Number(details.repairs.broken_hypothesis_link);
  return{cohort,ready:blockers===0,blockers,details};
 }
}
