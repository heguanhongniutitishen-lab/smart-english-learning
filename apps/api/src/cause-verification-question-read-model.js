export class CauseVerificationQuestionReadModel {
 constructor(pool){this.pool=pool}
 async forHypothesis(studentId,hypothesisId){
  const h=(await this.pool.query(`SELECT h.error_cause_hypothesis_id,h.status,h.rationale,o.content_version_id AS original_version
    FROM error_cause_hypotheses h JOIN error_observations o USING(error_observation_id)
    WHERE h.error_cause_hypothesis_id=$1 AND o.student_id=$2`,[hypothesisId,studentId])).rows[0];
  if(!h)return null;
  if(!["Candidate","Inconclusive"].includes(h.status))return{question:null,reason:"CAUSE_NOT_AWAITING_VERIFICATION"};
  const target=h.rationale||{};
  if(!["Knowledge","Ability"].includes(target.target_type)||!target.target_id)return{question:null,reason:"CAUSE_TARGET_MISSING"};
  const relation=target.target_type==="Knowledge"?
   `EXISTS(SELECT 1 FROM content_knowledge ck WHERE ck.content_version_id=cv.content_version_id AND ck.knowledge_id=$2 AND ck.review_status='Approved' AND ck.role<>'ContextOnly')`:
   `EXISTS(SELECT 1 FROM content_ability ca WHERE ca.content_version_id=cv.content_version_id AND ca.ability_id=$2)`;
  const row=(await this.pool.query(`SELECT cv.content_version_id,cv.payload,ci.content_type
    FROM content_versions cv JOIN content_items ci ON ci.content_id=cv.content_id
    WHERE cv.content_version_id<>$1 AND ci.current_version_id=cv.content_version_id
    AND ci.status='Published' AND cv.review_status='Approved' AND cv.reviewed_by IS NOT NULL
    AND cv.published_at IS NOT NULL AND ${relation}
    AND (jsonb_typeof(cv.payload->'options')='array' OR cv.payload->>'input_type'='text' OR cv.payload->>'response_type'='text')
    ORDER BY cv.published_at DESC,cv.content_version_id LIMIT 1`,[h.original_version,target.target_id])).rows[0];
  return row?{question:row,reason:null}:{question:null,reason:"NO_INDEPENDENT_APPROVED_QUESTION"};
 }
}
