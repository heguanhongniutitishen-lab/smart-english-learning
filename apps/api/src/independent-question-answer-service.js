function normalized(v){return String(v??"").trim().toLocaleLowerCase("en-US").replace(/\s+/g," ")}
export class IndependentQuestionAnswerService{
 constructor(pool,readModel,learningRepo){this.pool=pool;this.readModel=readModel;this.learningRepo=learningRepo}
 async submit(studentId,causeId,input,requestId){
  const replay=(await this.pool.query("SELECT a.*,a.answer_payload=$3::jsonb AS same_answer FROM question_attempts a WHERE a.student_id=$1 AND a.request_id=$2",[studentId,requestId,input.answer_payload])).rows[0];
  if(replay){
   const mapped=(await this.pool.query("SELECT 1 FROM error_cause_hypotheses h JOIN error_observations o USING(error_observation_id) WHERE h.error_cause_hypothesis_id=$1 AND o.student_id=$2",[causeId,studentId])).rowCount;
   if(!mapped||replay.content_version_id!==input.content_version_id||!replay.same_answer||replay.exposure_type!=="Verification"){const e=new Error("verification request conflict");e.status=409;e.code="VERIFICATION_REPLAY_CONFLICT";throw e}
   const{same_answer,...attempt}=replay;return{attempt,graded:true,cause_updated:false};
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
  return{attempt,graded:true,cause_updated:false};
 }
}
