import test from "node:test";
import assert from "node:assert/strict";
import {MemoryStore} from "../src/store.js";
import {createHandler} from "../src/app.js";
import {issueStudentToken} from "../src/student-auth-boundary.js";
const secret="testing-only-secret-longer-than-thirty-two-bytes";
function response(){return {status:0,body:"",writeHead(status){this.status=status;},end(value){this.body=String(value??"");}};}
async function request(handler,token,headers={}){const res=response();await handler({url:"/api/v1/students/me/bindings",method:"GET",headers:{authorization:token?"Bearer "+token:"",...headers}},res);return {status:res.status,body:JSON.parse(res.body)};}
test("signed binding discovery excludes other users and inactive students",async()=>{
 const store=new MemoryStore(),alice=store.loginWechat("trusted-openid-a"),bob=store.loginWechat("trusted-openid-b");
 const own=store.createStudent(alice.user_id,{display_name:"A",current_stage:"Primary",current_grade:5});
 const disabled=store.createStudent(alice.user_id,{display_name:"B",current_stage:"Middle",current_grade:7});
 store.students.get(disabled.student_id).status="Inactive";
 store.createStudent(bob.user_id,{display_name:"Other",current_stage:"High",current_grade:11});
 const handler=createHandler(store,undefined,null,null,null,null,null,null,null,null,null,null,{mode:"signed",secret});
 const a=await request(handler,issueStudentToken(alice.user_id,secret),{"x-user-id":bob.user_id});
 assert.equal(a.status,200);
 const entries=a.body.data.students;
 assert.deepEqual(entries.map(s=>s.student_id),[own.student_id]);
 assert.ok(!JSON.stringify(entries).includes("wechat_open_id"));
 const b=await request(handler,issueStudentToken(bob.user_id,secret));
 assert.equal(b.status,200);
 assert.equal(b.body.data.students.length,1);
 const rejected=await request(handler,"");
 assert.equal(rejected.status,401);
});
test("development identity mode cannot enumerate bindings",async()=>{
 const handler=createHandler(new MemoryStore(),undefined,null,null,null,null,null,null,null,null,null,null,{mode:"development"});
 const r=await request(handler,"",{"x-user-id":"someone"});
 assert.equal(r.status,403);
});
