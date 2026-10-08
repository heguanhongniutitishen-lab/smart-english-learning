function normalized(v){return String(v??"").trim().toLocaleLowerCase("en-US").replace(/\s+/g," ")}
export class IndependentQuestionAnswerService{
 constructor(pool,readModel,learningRepo){this.pool=pool;this.readModel=readModel;this.learningRepo=learningRepo}
 async linkEvidence(studentId,causeId,attempt){
  // A confirmed original link is immutable even if the cause later changes state
  // or the approved content is replaced. Never reattach to another cause.
  const existing=(await this.pool.query(`SELECT v.error_cause_hypothesis_id FROM error_cause_verifications v
    JOIN error_cause_hypotheses h USING(error_cause_hypothesis_id)
    JOIN error_observations o USING(error_observation_id)
    JOIN question_attempts a ON a.attempt_id=v.attempt_id
    WHERE v.attempt_id=$1 AND o.student_id=$2 AND a.student_id=$2
    AND a.exposure_type='Verification' AND a.technical_status='OK'`,[attempt.attempt_id,studentId])).rows[0];
  if(existing){
   if(existing.error_cause_hypothesis_id===causeId)return existing;
   const e=new Error("verification attempt already linked to another cause");e.status=409;e.code="VERIFICATION_EVIDENCE_LINK_CONFLICT";throw e;
  }
  const inserted=await this.pool.query(`INSERT INTO error_cause_verifications(error_cause_hypothesis_id,verification_type,content_version_id,attempt_id,result)
   SELECT h.error_cause_hypothesis_id,'Question',a.content_version_id,a.attempt_id,NULL
   FROM error_cause_hypotheses h JOIN error_observations o USING(error_observation_id)
   JOIN question_attempts a ON a.attempt_id=$3
   JOIN content_versions cv ON cv.content_version_id=a.content_version_id
   JOIN content_items ci ON ci.content_id=cv.content_id
   JOIN content_versions original ON original.content_version_id=o.content_version_id
   WHERE h.error_cause_hypothesis_id=$1 AND o.student_id=$2 AND a.student_id=$2
   AND h.status IN ('Candidate','Inconclusive')
   AND a.exposure_type='Verification' AND a.technical_status='OK'
   AND a.content_version_id<>o.content_version_id AND ci.content_id<>original.content_id
   AND ci.current_version_id=cv.content_version_id AND ci.status='Published'
   AND cv.review_status='Approved' AND cv.reviewed_by IS NOT NULL AND cv.published_at IS NOT NULL
   AND (
    ((h.rationale->>'target_type')='Knowledge' AND EXISTS(
      SELECT 1 FROM content_knowledge ck WHERE ck.content_version_id=cv.content_version_id
      AND ck.knowledge_id=(h.rationale->>'target_id')::uuid AND ck.review_status='Approved' AND ck.role<>'ContextOnly'))
    OR
    ((h.rationale->>'target_type')='Ability' AND EXISTS(
      SELECT 1 FROM content_ability ca WHERE ca.content_version_id=cv.content_version_id
      AND ca.ability_id=(h.rationale->>'target_id')::uuid))
   )
   ON CONFLICT (attempt_id) WHERE attempt_id IS NOT NULL DO NOTHING RETURNING error_cause_verification_id`,[causeId,studentId,attempt.attempt_id]);
  const association=(await this.pool.query("SELECT error_cause_hypothesis_id FROM error_cause_verifications WHERE attempt_id=$1",[attempt.attempt_id])).rows[0];
  if(!association||association.error_cause_hypothesis_id!==causeId){const e=new Error("verification attempt cannot be linked to this cause");e.status=409;e.code="VERIFICATION_EVIDENCE_LINK_CONFLICT";throw e}
  return association;
 }
 async submit(studentId,causeId,input,requestId){
  const replay=(await this.pool.query("SELECT a.*,a.answer_payload=$3::jsonb AS same_answer FROM question_attempts a WHERE a.student_id=$1 AND a.request_id=$2",[studentId,requestId,input.answer_payload])).rows[0];
  if(replay){
   const mapped=(await this.pool.query("SELECT 1 FROM error_cause_hypotheses h JOIN error_observations o USING(error_observation_id) WHERE h.error_cause_hypothesis_id=$1 AND o.student_id=$2",[causeId,studentId])).rowCount;
   if(!mapped||replay.content_version_id!==input.content_version_id||!replay.same_answer||replay.exposure_type!=="Verification"){const e=new Error("verification request conflict");e.status=409;e.code="VERIFICATION_REPLAY_CONFLICT";throw e}
   const{same_answer,...attempt}=replay;await this.linkEvidence(studentId,causeId,attempt);return{attempt,graded:true,cause_updated:false};
  }
  const selected=await this.readModel.forHypothesis(studentId,causeId);
  if(!selected?.question){const e=new Error(selected?.reason||"verification question unavailable");e.status=409;e.code="VERIFICATION_QUESTION_NOT_AVAILABLE";throw e}
  if(selected.question.content_version_id!==input.content_version_id){const e=new Error("verification question changed");e.status=409;e.code="VERIFICATION_QUESTION_CHANGED";throw e}
  const row=(await this.pool.query("SELECT answer_payload FROM content_versions WHERE content_version_id=$1",[input.content_version_id])).rows[0];
  const expected=row?.answer_payload||{},answer=input.answer_payload||{};
  let correct;
  if(Number.isInteger(expected.correct_index)&&Number.isInteger(answer.choice_index))correct=expected.correct_index===answer.choice_index;
  else{
   const accepted=Array.isArray(expected.accepted_answers)?expected.accepted_answers:typeof expected.answer==="string"?[expected.answer]:[];
   if(!accepted.length||typeof answer.answer!=="string"){const e=new Error("unsupported verification answer");e.status=422;e.code="VERIFICATION_ANSWER_UNSUPPORTED";throw e}
   correct=accepted.map(normalized).includes(normalized(answer.answer));
  }
  const attempt=await this.learningRepo.createAttempt(studentId,{content_version_id:input.content_version_id,request_id:requestId,answer_payload:answer,result:correct?"Correct":"Wrong",exposure_type:"Verification",technical_status:"OK"});
  if(attempt.content_version_id!==input.content_version_id||JSON.stringify(attempt.answer_payload)!==JSON.stringify(answer)||attempt.exposure_type!=="Verification"){const e=new Error("verification request conflict");e.status=409;e.code="VERIFICATION_REPLAY_CONFLICT";throw e}
  await this.linkEvidence(studentId,causeId,attempt);
  return{attempt,graded:true,cause_updated:false};
 }
}
