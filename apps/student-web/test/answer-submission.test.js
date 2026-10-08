import test from "node:test";
import assert from "node:assert/strict";
import {prepareAnswerSubmission,shouldKeepPendingAnswer,savePendingAnswer,readPendingAnswer,clearPendingAnswer,pendingTaskChanged,pendingReplayRequest} from "../public/answer-submission.js";
const first={taskId:"task-1",contentVersion:"version-1",chosen:2,answerPayload:{choice_index:2},responseTimeMs:1200};
test("retry reuses the original idempotency key and exact body",()=>{let count=0;const make=()=>String(++count);const a=prepareAnswerSubmission(null,first,make);const b=prepareAnswerSubmission(a,{...first,responseTimeMs:9400,answerPayload:{choice_index:1}},make);assert.strictEqual(b,a);assert.equal(count,1);assert.deepEqual(b.body,{content_version_id:"version-1",answer_payload:{choice_index:2},response_time_ms:1200})});
test("different answer or task is rejected until pending submission resolved",()=>{const a=prepareAnswerSubmission(null,first,()=>"key");assert.throws(()=>prepareAnswerSubmission(a,{...first,chosen:1},()=>""),e=>e.code==="PENDING_ANSWER_CONFLICT");assert.throws(()=>prepareAnswerSubmission(a,{...first,taskId:"task-2"},()=>""),e=>e.code==="PENDING_ANSWER_CONFLICT");assert.equal(shouldKeepPendingAnswer(a,"task-1"),true);assert.equal(shouldKeepPendingAnswer(a,"task-2"),false)});

function fakeStorage(){const items=new Map();return{getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value),removeItem:key=>items.delete(key)}}
test("pending answer survives refresh with original key and payload only for same identity",()=>{
 const storage=fakeStorage(),identity={student:"student-1",user:"user-1"},a=prepareAnswerSubmission(null,first,()=>"stable-key");
 assert.equal(savePendingAnswer(storage,identity,a,1000),true);
 assert.deepEqual(readPendingAnswer(storage,identity,1500),a);
 assert.equal(readPendingAnswer(storage,{student:"other",user:"user-1"},1500),null);
 assert.equal(readPendingAnswer(storage,identity,1500),null);
});
test("expired and malformed submissions are discarded instead of replayed",()=>{
 const storage=fakeStorage(),identity={student:"student-1",user:"user-1"},a=prepareAnswerSubmission(null,first,()=>"stable-key");
 savePendingAnswer(storage,identity,a,1000);
 assert.equal(readPendingAnswer(storage,identity,1000+31*60*1000),null);
 savePendingAnswer(storage,identity,a,2000);
 clearPendingAnswer(storage);
 assert.equal(readPendingAnswer(storage,identity,2001),null);
});
test("unavailable session storage does not prevent normal submissions",()=>{
 const storage={getItem(){throw Error("blocked")},setItem(){throw Error("blocked")},removeItem(){throw Error("blocked")}};
 assert.equal(savePendingAnswer(storage,{student:"s",user:"u"},prepareAnswerSubmission(null,first,()=>"key")),false);
 assert.equal(readPendingAnswer(storage,{student:"s",user:"u"}),null);
});

test("old pending submission is retained when the server advances to another task",()=>{
 const pending=prepareAnswerSubmission(null,first,()=>"original-request");
 assert.equal(pendingTaskChanged(pending,"task-2"),true);
 assert.equal(pendingTaskChanged(pending,null),true);
 assert.equal(pendingTaskChanged(pending,"task-1"),false);
 assert.equal(pendingTaskChanged(null,"task-2"),false);
 const original=pendingReplayRequest(pending);
 assert.deepEqual(original,{taskId:"task-1",key:"original-request",body:pending.body});
 assert.strictEqual(original.body,pending.body);
});
test("pending recovery requires an existing immutable request",()=>{
 assert.throws(()=>pendingReplayRequest({taskId:"task-1",body:{}}),/missing pending answer/);
});
