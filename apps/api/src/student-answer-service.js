function norm(v){return String(v??"").trim().toLocaleLowerCase("en-US").replace(/\s+/g," ");}
export class StudentAnswerService{
 constructor(pool,learningRepo){this.pool=pool;this.learningRepo=learningRepo;}
 async submit(studentId,input,requestId){
  const q=await this.pool.query(`SELECT cv.answer_payload FROM content_versions cv JOIN content_items ci ON ci.content_id=cv.content_id WHERE cv.content_version_id=$1 AND ci.current_version_id=cv.content_version_id AND ci.status='Published' AND cv.review_status='Approved' AND cv.reviewed_by IS NOT NULL AND cv.published_at IS NOT NULL`,[input.content_version_id]);
  if(!q.rows[0]){const e=new Error("approved published content not found");e.status=409;e.code="STUDENT_CONTENT_NOT_AVAILABLE";throw e}
  const key=q.rows[0].answer_payload||{},ans=input.answer_payload||{};let correct=false;
  if(Number.isInteger(key.correct_index)&&Number.isInteger(ans.choice_index))correct=key.correct_index===ans.choice_index;
  else{const accepted=Array.isArray(key.accepted_answers)?key.accepted_answers:(typeof key.answer==="string"?[key.answer]:[]);if(accepted.length&&typeof ans.answer==="string")correct=accepted.map(norm).includes(norm(ans.answer));else{const e=new Error("unsupported answer contract");e.status=422;e.code="STUDENT_ANSWER_UNSUPPORTED";throw e}}
  return this.learningRepo.createAttempt(studentId,{...input,result:correct?"Correct":"Wrong",request_id:requestId});
 }
}
