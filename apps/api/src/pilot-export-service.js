export class PilotExportService{
 constructor(pool){this.pool=pool;}
 async attempts(cohortId,{limit=500,after=null}={}){
  const n=Math.min(Math.max(Number(limit)||500,1),2000);
  const r=await this.pool.query(`SELECT a.attempt_id,a.student_id,a.session_id,a.daily_task_id,a.position_id,
   a.content_version_id,a.result,a.response_time_ms,a.hint_level,a.attempt_no,a.exposure_type,a.technical_status,a.occurred_at,
   p.daily_plan_id,p.plan_date,p.version plan_version,p.strategy_version,
   t.source_type task_source_type,t.target_type task_target_type,t.target_id task_target_id
   FROM pilot_cohort_memberships m JOIN question_attempts a ON a.student_id=m.student_id
   LEFT JOIN daily_tasks t ON t.daily_task_id=a.daily_task_id LEFT JOIN daily_plans p ON p.daily_plan_id=t.daily_plan_id
   WHERE m.cohort_id=$1 AND ($2::uuid IS NULL OR a.attempt_id>$2::uuid)
   ORDER BY a.attempt_id LIMIT $3`,[cohortId,after,n]);
  return{dataset:"attempts",snapshot_semantics:"durable_facts_with_plan_provenance",rows:r.rows,next_cursor:r.rows.length===n?r.rows.at(-1).attempt_id:null};
 }
 async state(cohortId,{limit=500,afterStudent=null}={}){
  const n=Math.min(Math.max(Number(limit)||500,1),2000);
  const r=await this.pool.query(`SELECT m.student_id,mr.knowledge_id target_id,'Knowledge' target_type,mr.mastery_state state_value,
   mr.confidence,mr.evidence_count,mr.model_version,mr.state_version,mr.last_evidence_at,mr.last_verified_at,mr.next_review_at,mr.updated_at
   FROM pilot_cohort_memberships m JOIN mastery_records mr ON mr.student_id=m.student_id
   WHERE m.cohort_id=$1 AND ($2::uuid IS NULL OR m.student_id>$2::uuid)
   UNION ALL
   SELECT m.student_id,ab.ability_id,'Ability',ab.level_score::text,ab.confidence,ab.evidence_count,ab.model_version,ab.state_version,NULL,NULL,NULL,ab.updated_at
   FROM pilot_cohort_memberships m JOIN ability_states ab ON ab.student_id=m.student_id
   WHERE m.cohort_id=$1 AND ($2::uuid IS NULL OR m.student_id>$2::uuid)
   ORDER BY student_id,target_type,target_id LIMIT $3`,[cohortId,afterStudent,n]);
  return{dataset:"state",snapshot_semantics:"current_projection_not_historical_period_state",rows:r.rows,next_cursor:null};
 }
}
