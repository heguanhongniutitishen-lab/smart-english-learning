import test from "node:test";import assert from "node:assert/strict";
import {createHandler} from "../src/app.js";
import {MemoryStore} from "../src/store.js";
import {IdempotencyStore} from "../src/idempotency.js";
import {issueStudentToken} from "../src/student-auth-boundary.js";
const secret="integration-test-secret-with-at-least-32-bytes";
const victim="00000000-0000-4000-8000-000000000011";
const stranger="00000000-0000-4000-8000-000000000022";
async function request(handler,path,headers={}){
 const req={method:"GET",url:path,headers},res={writeHead(status){this.statusCode=status},end(body){this.body=JSON.parse(body)}};
 await handler(req,res);return res;
}
test("student API rejects spoofed x-user-id and requires signed token at real app boundary",async()=>{
 const store=new MemoryStore(),s=store.createStudent(victim,{display_name:"student",current_stage:"Primary",current_grade:5});
 const handler=createHandler(store,new IdempotencyStore(),null,null,null,null,null,null,null,null,null,null,null,{mode:"signed",secret});
 const path="/api/v1/students/"+s.student_id+"/config";
 const missing=await request(handler,path,{"x-user-id":victim});
 assert.equal(missing.statusCode,401);
 assert.equal(missing.body.error.code,"AUTH_TOKEN_REQUIRED");
 const forged=await request(handler,path,{"authorization":"Bearer "+issueStudentToken(stranger,secret),"x-user-id":victim});
 assert.equal(forged.statusCode,404); // no GET config route: identity is verified before dispatch
 const login=await request(handler,"/api/v1/auth/wechat/login",{"x-user-id":victim});
 assert.equal(login.statusCode,403);assert.equal(login.body.error.code,"AUTH_WECHAT_EXCHANGE_DISABLED");
 const health=await request(handler,"/health");
 assert.equal(health.statusCode,200);
});
