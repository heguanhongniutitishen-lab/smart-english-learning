// A diagnostic gate only: it never assigns Supports/Contradicts, updates
// mastery, or changes the cause hypothesis status.
export function inspectCauseEvidence(rows){
 const reasons=[],seen=new Set(),valid=[];
 for(const r of rows||[]){
  if(!r.attempt_id||seen.has(r.attempt_id)){reasons.push("DUPLICATE_OR_MISSING_ATTEMPT");continue}
  seen.add(r.attempt_id);
  if(r.verification_type!=="Question"||r.exposure_type!=="Verification"||r.technical_status!=="OK"||
    r.student_id!==r.observation_student_id||r.content_version_id!==r.attempt_content_version_id||
    r.content_version_id===r.original_content_version_id||r.content_item_id===r.original_content_item_id){
   reasons.push("INVALID_EVIDENCE_PROVENANCE");continue;
  }
  if(r.observation_type!=="WrongAnswer"&&r.observation_type!=="RepeatedWrong"||
    r.original_attempt_student_id!==r.observation_student_id||
    r.original_attempt_content_version_id!==r.original_content_version_id||
    r.original_attempt_result!=="Wrong"||r.original_attempt_technical_status!=="OK"){
   reasons.push("ORIGINAL_WRONG_ATTEMPT_INVALID");continue;
  }
  if(r.review_status!=="Approved"||r.item_status!=="Published"||!r.reviewed_by||!r.published_at||
    r.current_version_id!==r.content_version_id||r.target_mapped!==true){
   reasons.push("CONTENT_APPROVAL_OR_TARGET_INVALID");continue;
  }
  if(r.result!==null){reasons.push("EVIDENCE_ALREADY_ADJUDICATED");continue}
  if(!["Correct","Wrong"].includes(r.attempt_result)){reasons.push("ATTEMPT_RESULT_UNKNOWN");continue}
  valid.push(r);
 }
 if(valid.length===0)reasons.push("NO_ELIGIBLE_INDEPENDENT_ATTEMPT");
 // No rule currently approves a number or pattern of answers as sufficient
 // proof of the exact original cause. This must stay pending even with many valid rows.
 reasons.push("CAUSE_ADJUDICATION_POLICY_NOT_APPROVED");
 return{state:"PendingReview",eligible_attempt_count:valid.length,
   correct_count:valid.filter(r=>r.attempt_result==="Correct").length,
   wrong_count:valid.filter(r=>r.attempt_result==="Wrong").length,
   reasons:[...new Set(reasons)]};
}
export class CauseEvidenceAuditReadModel{
 constructor(pool){this.pool=pool}
 async forCause(studentId,causeId){
  const h=(await this.pool.query(`SELECT h.status FROM error_cause_hypotheses h
   JOIN error_observations o USING(error_observation_id)
   WHERE h.error_cause_hypothesis_id=$1 AND o.student_id=$2`,[causeId,studentId])).rows[0];
  if(!h)return null;
  const result=await this.pool.query(`SELECT v.attempt_id,v.verification_type,v.result,v.content_version_id,
    a.content_version_id AS attempt_content_version_id,a.student_id,a.exposure_type,a.technical_status,a.result AS attempt_result,
    o.student_id AS observation_student_id,o.content_version_id AS original_content_version_id,
    o.observation_type,source_attempt.student_id AS original_attempt_student_id,
    source_attempt.content_version_id AS original_attempt_content_version_id,
    source_attempt.result AS original_attempt_result,
    source_attempt.technical_status AS original_attempt_technical_status,
    ci.content_id AS content_item_id,original.content_id AS original_content_item_id,
    ci.current_version_id,ci.status AS item_status,cv.review_status,cv.reviewed_by,cv.published_at,
    CASE WHEN h.rationale->>'target_type'='Knowledge' THEN EXISTS(
      SELECT 1 FROM content_knowledge ck WHERE ck.content_version_id=cv.content_version_id
      AND ck.knowledge_id=(h.rationale->>'target_id')::uuid AND ck.review_status='Approved' AND ck.role<>'ContextOnly')
    WHEN h.rationale->>'target_type'='Ability' THEN EXISTS(
      SELECT 1 FROM content_ability ca WHERE ca.content_version_id=cv.content_version_id
      AND ca.ability_id=(h.rationale->>'target_id')::uuid) ELSE false END AS target_mapped
    FROM error_cause_verifications v
    JOIN error_cause_hypotheses h ON h.error_cause_hypothesis_id=v.error_cause_hypothesis_id
    JOIN error_observations o USING(error_observation_id)
    LEFT JOIN question_attempts source_attempt ON source_attempt.attempt_id=o.attempt_id
    LEFT JOIN question_attempts a ON a.attempt_id=v.attempt_id
    LEFT JOIN content_versions cv ON cv.content_version_id=v.content_version_id
    LEFT JOIN content_items ci ON ci.content_id=cv.content_id
    JOIN content_versions original ON original.content_version_id=o.content_version_id
    WHERE v.error_cause_hypothesis_id=$1 AND o.student_id=$2`,[causeId,studentId]);
  return{cause_status:h.status,...inspectCauseEvidence(result.rows)};
 }
}
