import { randomUUID } from "node:crypto";
import { readJson, ok, fail } from "./http.js";
import { MemoryStore } from "./store.js";

export function createHandler(store=new MemoryStore()){
  return async function handler(req,res){
    const requestId=String(req.headers["x-request-id"]||randomUUID());
    try{
      const url=new URL(req.url,"http://localhost");
      if(req.method==="GET"&&url.pathname==="/health") return ok(res,{status:"ok",service:"smart-english-api"},requestId);

      if(req.method==="POST"&&url.pathname==="/api/v1/auth/wechat/login"){
        const body=await readJson(req);
        if(!body.open_id) return fail(res,400,"AUTH_OPEN_ID_REQUIRED","open_id is required",requestId);
        const user=store.loginWechat(String(body.open_id));
        return ok(res,{user_id:user.user_id,status:user.status},requestId);
      }

      if(req.method==="POST"&&url.pathname==="/api/v1/students"){
        const body=await readJson(req), userId=req.headers["x-user-id"];
        if(!userId) return fail(res,401,"AUTH_REQUIRED","x-user-id is required",requestId);
        if(!body.display_name||!body.current_stage||!Number.isInteger(body.current_grade))
          return fail(res,400,"STUDENT_INVALID_INPUT","display_name, current_stage and integer current_grade are required",requestId);
        if(!["Primary","Middle","High"].includes(body.current_stage)||body.current_grade<1||body.current_grade>12)
          return fail(res,400,"STUDENT_INVALID_GRADE","invalid stage or grade",requestId);
        return ok(res,store.createStudent(String(userId),body),requestId,201);
      }

      let m=url.pathname.match(/^\/api\/v1\/students\/([^/]+)\/config$/);
      if(req.method==="PATCH"&&m){
        const userId=req.headers["x-user-id"]; if(!store.owns(String(userId),m[1])) return fail(res,403,"STUDENT_FORBIDDEN","student is not bound to user",requestId);
        const body=await readJson(req);
        if(!Number.isInteger(body.daily_minutes)||body.daily_minutes<5||body.daily_minutes>180) return fail(res,400,"STUDENT_INVALID_DAILY_MINUTES","daily_minutes must be 5..180",requestId);
        return ok(res,store.addConfig(m[1],body),requestId);
      }

      m=url.pathname.match(/^\/api\/v1\/students\/([^/]+)\/curriculum-position$/);
      if(req.method==="POST"&&m){
        const userId=req.headers["x-user-id"]; if(!store.owns(String(userId),m[1])) return fail(res,403,"STUDENT_FORBIDDEN","student is not bound to user",requestId);
        const body=await readJson(req);
        if(!body.unit_id&&!body.progress_note) return fail(res,400,"CURRICULUM_POSITION_REQUIRED","unit_id or progress_note is required",requestId);
        return ok(res,store.setPosition(m[1],body),requestId,201);
      }
      return fail(res,404,"SYS_NOT_FOUND","Resource not found",requestId);
    }catch(e){ return fail(res,e.status||500,e.code||"SYS_INTERNAL",e.status?e.message:"Internal server error",requestId,e.status>=500); }
  };
}
