import test from "node:test";
import assert from "node:assert/strict";
import {prepareAnswerSubmission,shouldKeepPendingAnswer} from "../public/answer-submission.js";
const first={taskId:"task-1",contentVersion:"version-1",chosen:2,answerPayload:{choice_index:2},responseTimeMs:1200};
test("retry reuses the original idempotency key and exact body",()=>{let count=0;const make=()=>String(++count);const a=prepareAnswerSubmission(null,first,make);const b=prepareAnswerSubmission(a,{...first,responseTimeMs:9400,answerPayload:{choice_index:1}},make);assert.strictEqual(b,a);assert.equal(count,1);assert.deepEqual(b.body,{content_version_id:"version-1",answer_payload:{choice_index:2},response_time_ms:1200})});
test("different answer or task is rejected until pending submission resolved",()=>{const a=prepareAnswerSubmission(null,first,()=>"key");assert.throws(()=>prepareAnswerSubmission(a,{...first,chosen:1},()=>""),e=>e.code==="PENDING_ANSWER_CONFLICT");assert.throws(()=>prepareAnswerSubmission(a,{...first,taskId:"task-2"},()=>""),e=>e.code==="PENDING_ANSWER_CONFLICT");assert.equal(shouldKeepPendingAnswer(a,"task-1"),true);assert.equal(shouldKeepPendingAnswer(a,"task-2"),false)});
