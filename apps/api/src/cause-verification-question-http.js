import {ok,fail} from "./http.js";
export function createCauseVerificationQuestionHttpHandler({store,readModel}){return async(req,res,u,id)=>{
 const match=u.pathname.match(/^\/api\/v1\/students\/([^/]+)\/feedback\/causes\/([^/]+)\/question$/);
 if(req.method!=="GET"||!match)return false;
 if(!await store.owns(String(req.headers["x-user-id"]||""),match[1]))return fail(res,403,"STUDENT_FORBIDDEN","student is not bound to user",id);
 const view=await readModel.forHypothesis(match[1],match[2]);
 if(!view)return fail(res,404,"ERROR_CAUSE_NOT_FOUND","error cause not found",id);
 if(!view.question)return fail(res,404,"VERIFICATION_QUESTION_UNAVAILABLE",view.reason,id);
 return ok(res,view,id);
};}
