import test from "node:test";import assert from "node:assert/strict";
import {exchangeWechatCode} from "../src/wechat-code-exchange.js";
import {verifyStudentBearer} from "../src/student-auth-boundary.js";
import {MemoryStore} from "../src/store.js";
const secret="unit-test-secret-long-enough-for-hmac-sha256-signing";
const configuration={secret,appId:"test-app-id",appSecret:"test-secret"};
test("server exchanges trusted WeChat code, stores server returned openid, signs short-lived token",async()=>{
 const store=new MemoryStore();let calls=0;
 const fetchImpl=async(url,options)=>{
  calls++;assert.equal(url.hostname,"api.weixin.qq.com");
  assert.equal(url.pathname,"/sns/jscode2session");
  assert.equal(url.searchParams.get("js_code"),"acceptedCode");
  assert.equal(url.searchParams.get("appid"),"test-app-id");
  assert.equal(options.redirect,"error");
  return{ok:true,async json(){return{openid:"wx-trusted-user",session_key:"provider-private-value"}}};
 };
 const first=await exchangeWechatCode({...configuration,code:"acceptedCode",store,fetchImpl});
 assert.equal(first.token_type,"Bearer");assert.equal(first.expires_in,900);
 assert.equal(verifyStudentBearer("Bearer "+first.access_token,secret),first.user_id);
 assert.equal(JSON.stringify(first).includes("wx-trusted-user"),false);
 assert.equal(JSON.stringify(first).includes("provider-private-value"),false);
 const second=await exchangeWechatCode({...configuration,code:"acceptedCode",store,fetchImpl});
 assert.equal(second.user_id,first.user_id);assert.equal(calls,2);
});
test("invalid, unconfigured, provider-rejected and failed exchanges never create user or token",async()=>{
 const store=new MemoryStore(),accepted=async()=>({ok:true,async json(){return{errcode:40029,errmsg:"invalid code"}}});
 await assert.rejects(()=>exchangeWechatCode({...configuration,code:"unsafe code",store,fetchImpl:accepted}),e=>e.code==="AUTH_WECHAT_CODE_INVALID");
 await assert.rejects(()=>exchangeWechatCode({code:"acceptedCode",store,secret,fetchImpl:accepted}),e=>e.code==="AUTH_WECHAT_NOT_CONFIGURED");
 await assert.rejects(()=>exchangeWechatCode({...configuration,code:"acceptedCode",store,fetchImpl:accepted}),e=>e.code==="AUTH_WECHAT_CODE_REJECTED");
 await assert.rejects(()=>exchangeWechatCode({...configuration,code:"acceptedCode",store,fetchImpl:async()=>{throw Error("offline")}}),e=>e.code==="AUTH_WECHAT_PROVIDER_UNAVAILABLE");
 await assert.rejects(()=>exchangeWechatCode({...configuration,code:"acceptedCode",store,fetchImpl:async()=>({ok:true,async json(){return{openid:"client-spoof",session_key:null}}})}),e=>e.code==="AUTH_WECHAT_CODE_REJECTED");
 assert.equal(store.users.size,0);
});
