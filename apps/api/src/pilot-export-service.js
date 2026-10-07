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
 async state(cohortId,{limit=500,after=null}={}){
  const n=Math.min(Math.max(Number(limit)||500,1),2000);
  const cursor=after?JSON.parse(Buffer.from(after,"base64url").toString("utf8")):null;
  const r=await this.pool.query(`SELECT m.student_id,mr.knowledge_id target_id,'Knowledge' target_type,mr.mastery_state state_value,
   mr.confidence,mr.evidence_count,mr.model_version,mr.state_version,mr.last_evidence_at,mr.last_verified_at,mr.next_review_at,mr.updated_at
   FROM pilot_cohort_memberships m JOIN mastery_records mr ON mr.student_id=m.student_id
   WHERE m.cohort_id=$1
   UNION ALL
   SELECT m.student_id,ab.ability_id,'Ability',ab.level_score::text,ab.confidence,ab.evidence_count,ab.model_version,ab.state_version,NULL,NULL,NULL,ab.updated_at
   FROM pilot_cohort_memberships m JOIN ability_states ab ON ab.student_id=m.student_id
   WHERE m.cohort_id=$1
   ORDER BY student_id,target_type,target_id`,[cohortId]);
  const rows=r.rows.filter(x=>!cursor||[x.student_id,x.target_type,x.target_id].join("|")>[cursor.student_id,cursor.target_type,cursor.target_id].join("|")).slice(0,n);
  const last=rows.at(-1),next_cursor=rows.length===n?Buffer.from(JSON.stringify({student_id:last.student_id,target_type:last.target_type,target_id:last.target_id})).toString("base64url"):null;
  return{dataset:"state",snapshot_semantics:"current_projection_not_historical_period_state",rows,next_cursor};
 }
 async evidence(cohortId,{limit=500,after=null}={}){
  const n=Math.min(Math.max(Number(limit)||500,1),2000);
  const r=await this.pool.query(`SELECT e.evidence_id,e.student_id,e.attempt_id,e.target_type,e.target_id,e.direction,e.quality_score,e.independence_score,e.difficulty_factor,e.confidence_delta,e.source,e.model_version,e.created_at,v.status validity_status,v.reason_code validity_reason_code,v.invalidated_at,v.recalc_required
   FROM pilot_cohort_memberships m JOIN evidences e ON e.student_id=m.student_id LEFT JOIN evidence_validity v USING(evidence_id)
   WHERE m.cohort_id=$1 AND ($2::uuid IS NULL OR e.evidence_id>$2::uuid) ORDER BY e.evidence_id LIMIT $3`,[cohortId,after,n]);
  return{dataset:"evidence",snapshot_semantics:"durable_evidence_with_current_validity",rows:r.rows,next_cursor:r.rows.length===n?r.rows.at(-1).evidence_id:null};
 }
 async feedback(cohortId,{limit=500,after=null}={}){
  const n=Math.min(Math.max(Number(limit)||500,1),2000);
  const r=await this.pool.query(`SELECT o.error_observation_id,o.student_id,o.attempt_id,o.content_version_id,o.observation_type,o.status observation_status,o.source observation_source,o.created_at,
   h.error_cause_hypothesis_id,h.cause_code,h.confidence hypothesis_confidence,h.status hypothesis_status,h.source hypothesis_source,h.created_at hypothesis_created_at,h.verified_at
   FROM pilot_cohort_memberships m JOIN error_observations o ON o.student_id=m.student_id LEFT JOIN error_cause_hypotheses h USING(error_observation_id)
   WHERE m.cohort_id=$1 AND ($2::uuid IS NULL OR o.error_observation_id>$2::uuid) ORDER BY o.error_observation_id,h.error_cause_hypothesis_id NULLS FIRST LIMIT $3`,[cohortId,after,n]);
  return{dataset:"feedback",snapshot_semantics:"observations_and_hypotheses_confidence_is_heuristic_not_probability",rows:r.rows,next_cursor:r.rows.length===n?r.rows.at(-1).error_observation_id:null};
 }
 async repairs(cohortId,{limit=500,after=null}={}){
  const n=Math.min(Math.max(Number(limit)||500,1),2000);
  const r=await this.pool.query(`SELECT r.micro_repair_task_id,r.student_id,r.error_observation_id,r.error_cause_hypothesis_id,r.target_type,r.target_id,r.repair_type,r.status,r.priority,r.estimated_seconds,r.return_policy,r.created_at,r.completed_at
   FROM pilot_cohort_memberships m JOIN micro_repair_tasks r ON r.student_id=m.student_id
   WHERE m.cohort_id=$1 AND ($2::uuid IS NULL OR r.micro_repair_task_id>$2::uuid) ORDER BY r.micro_repair_task_id LIMIT $3`,[cohortId,after,n]);
  return{dataset:"repairs",snapshot_semantics:"durable_repair_workflow_facts",rows:r.rows,next_cursor:r.rows.length===n?r.rows.at(-1).micro_repair_task_id:null};
 }
}
