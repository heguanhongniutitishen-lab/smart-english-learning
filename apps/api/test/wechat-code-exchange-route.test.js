import test from "node:test";import assert from "node:assert/strict";
import {createHandler} from "../src/app.js";
import {MemoryStore} from "../src/store.js";
import {IdempotencyStore} from "../src/idempotency.js";
import {verifyStudentBearer} from "../src/student-auth-boundary.js";
const secret="route-test-secret-longer-than-thirty-two-bytes";
async function invoke(handler,path,method="POST",body={},headers={}){
 const req={method,url:path,headers,async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(body))}};
 const res={writeHead(status){this.statusCode=status},end(text){this.body=JSON.parse(text)}};
 await handler(req,res);return res;
}
test("real HTTP handler exchanges provider code then accepts its bearer and ignores a spoofed header",async()=>{
 const store=new MemoryStore();let count=0;
 const options={mode:"signed",secret,wechatAppId:"app",wechatAppSecret:"secret",wechatFetch:async()=>{count++;return{ok:true,async json(){return{openid:"trusted-wx-subject",session_key:"secret-from-wechat"}}}}}};
 const handler=createHandler(store,new IdempotencyStore(),null,null,null,null,null,null,null,null,null,null,null,options);
 const login=await invoke(handler,"/api/v1/auth/wechat/code-exchange","POST",{code:"validCode123",open_id:"attacker"});
 assert.equal(login.statusCode,200);assert.equal(count,1);
 const userId=login.body.data.user_id,token=login.body.data.access_token;
 assert.equal(verifyStudentBearer("Bearer "+token,secret),userId);
 const student=store.createStudent(userId,{display_name:"test",current_stage:"Primary",current_grade:5});
 const accepted=await invoke(handler,"/api/v1/students/"+student.student_id+"/config","PATCH",{daily_minutes:30},{authorization:"Bearer "+token,"x-user-id":"attacker"});
 assert.equal(accepted.statusCode,200);
 const other=await invoke(handler,"/api/v1/students/"+student.student_id+"/config","PATCH",{daily_minutes:40},{"x-user-id":userId});
 assert.equal(other.statusCode,401);
 const legacy=await invoke(handler,"/api/v1/auth/wechat/login","POST",{open_id:"spoofed"});
 assert.equal(legacy.statusCode,403);
 assert.equal(store.users.size,1);
});
