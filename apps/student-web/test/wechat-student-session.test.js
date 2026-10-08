import test from "node:test";import assert from "node:assert/strict";
import {createWechatStudentSession} from "../public/wechat-student-session.js";
test("trusted host code can create a memory-only signed student session and expire it",async()=>{
 let time=1000,requestBody;
 const s=createWechatStudentSession({now:()=>time,getCode:async()=>"wx-once-code",request:async(path,options)=>{
  assert.equal(path,"/api/v1/auth/wechat/code-exchange");requestBody=JSON.parse(options.body);
  assert.equal("openid" in requestBody,false);assert.equal("x-user-id" in options.headers,false);
  return{ok:true,async json(){return{data:{access_token:"server-signed-opaque",token_type:"Bearer",expires_in:60,user_id:"u1"}}}};
 }});
 assert.equal(s.currentUser(),null);
 assert.throws(()=>s.headers(),/absent or expired/);
 assert.deepEqual(await s.login(),{user_id:"u1",expires_in:60});
 assert.deepEqual(requestBody,{code:"wx-once-code"});
 assert.equal(s.currentUser(),"u1");
 assert.deepEqual(s.headers(),{authorization:"Bearer server-signed-opaque"});
 time=1000+55001;
 assert.equal(s.currentUser(),null);
 assert.throws(()=>s.headers(),/absent or expired/);
});
test("login fails closed on missing trusted code, rejected exchange and logout",async()=>{
 const bad=createWechatStudentSession({getCode:async()=>"",request:async()=>{throw Error("not called")}});
 await assert.rejects(()=>bad.login(),/missing WeChat login code/);
 const denied=createWechatStudentSession({getCode:async()=>"wx-code",request:async()=>({ok:false})});
 await assert.rejects(()=>denied.login(),/exchange failed/);
 assert.equal(denied.currentUser(),null);
 const good=createWechatStudentSession({getCode:async()=>"wx-code",request:async()=>({ok:true,async json(){return{data:{access_token:"token",token_type:"Bearer",expires_in:900,user_id:"u"}}}})});
 await good.login();good.logout();assert.equal(good.currentUser(),null);
});
