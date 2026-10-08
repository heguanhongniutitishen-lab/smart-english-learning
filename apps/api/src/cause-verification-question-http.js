import {ok,fail,readJson} from "./http.js";
export function createCauseVerificationQuestionHttpHandler({store,readModel,answerService,auditReadModel}){return async(req,res,u,id)=>{
 const get=u.pathname.match(/^\/api\/v1\/students\/([^/]+)\/feedback\/causes\/([^/]+)\/question$/);
 const post=u.pathname.match(/^\/api\/v1\/students\/([^/]+)\/feedback\/causes\/([^/]+)\/question\/answer$/);
 const audit=u.pathname.match(/^\/api\/v1\/students\/([^/]+)\/feedback\/causes\/([^/]+)\/evidence-status$/);
 const match=req.method==="GET"?(get||audit):req.method==="POST"?post:null;
 if(!match)return false;
 if(!await store.owns(String(req.headers["x-user-id"]||""),match[1]))return fail(res,403,"STUDENT_FORBIDDEN","student is not bound to user",id);
 if(req.method==="GET"&&audit){
  const report=await auditReadModel.forCause(match[1],match[2]);
  if(!report)return fail(res,404,"ERROR_CAUSE_NOT_FOUND","error cause not found",id);
  // Do not expose question answer keys, internal hypothesis confidence or raw evidence.
  return ok(res,{state:report.state,eligible_attempt_count:report.eligible_attempt_count,correct_count:report.correct_count,wrong_count:report.wrong_count,reasons:report.reasons},id);
 }
 if(req.method==="POST"){
  const key=String(req.headers["idempotency-key"]||"").trim();
  if(!key)return fail(res,400,"IDEMPOTENCY_KEY_REQUIRED","Idempotency-Key is required",id);
  const body=await readJson(req);
  if(!body.content_version_id||!body.answer_payload)return fail(res,400,"VERIFICATION_ANSWER_INVALID","content_version_id and answer_payload are required",id);
  const result=await answerService.submit(match[1],match[2],body,key);
  return ok(res,result,id,201);
 }
 const view=await readModel.forHypothesis(match[1],match[2]);
 if(!view)return fail(res,404,"ERROR_CAUSE_NOT_FOUND","error cause not found",id);
 if(!view.question)return fail(res,404,"VERIFICATION_QUESTION_UNAVAILABLE",view.reason,id);
 return ok(res,view,id);
};}
