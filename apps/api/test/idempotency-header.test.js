import test from "node:test";import assert from "node:assert/strict";import {createHandler} from "../src/app.js";
function req(headers={}){return {method:"POST",url:"/api/v1/students/s1/curriculum-position",headers:{"x-user-id":"u1","x-request-id":"trace-1",...headers},[Symbol.asyncIterator]:async function*(){yield Buffer.from('{"progress_note":"Unit 2"}');}}}
function res(){return {writeHead(s,h={}){this.statusCode=s;this.headers=h},end(v){this.body=v}}}
const store={owns:async()=>true,setPosition:async()=>({position_id:"p1"})};
test("curriculum position requires Idempotency-Key independent of request id",async()=>{const r=res();await createHandler(store)(req(),r);assert.equal(r.statusCode,400);assert.equal(JSON.parse(r.body).error.code,"IDEMPOTENCY_KEY_REQUIRED");});
test("same idempotency key reuses result across different request ids",async()=>{let calls=0;const st={...store,setPosition:async()=>({position_id:"p"+(++calls)})};const h=createHandler(st);let a=res();await h(req({"idempotency-key":"same"}),a);let b=res();const q=req({"idempotency-key":"same","x-request-id":"trace-2"});await h(q,b);assert.equal(calls,1);assert.equal(JSON.parse(b.body).data.position_id,"p1");});
