import test from "node:test";
import assert from "node:assert/strict";
import {OutboxWorker} from "../src/outbox-worker.js";

test("outbox does not route a distinct verification-answer event into mastery or feedback",async()=>{
 const calls=[];
 const event={event_id:"event-1",event_type:"VerificationAnswerRecorded",aggregate_id:"verification-answer-1",claim_token:"claim-1"};
 const pool={query:async(sql)=>{
  if(sql.includes("WITH candidate AS"))return{rows:[event]};
  if(sql.includes("SET processed_at=now()"))return{rows:[],rowCount:1};
  throw new Error("unexpected query: "+sql);
 }};
 const worker=new OutboxWorker(pool,{buildForAttempt:async()=>{calls.push("evidence");return[];}},{stateEngine:{rebuildKnowledgeAndReview:async()=>calls.push("mastery"),rebuildAbility:async()=>calls.push("ability")},feedback:{observeAttempt:async()=>calls.push("feedback")}});
 const result=await worker.processOne();
 assert.equal(result.status,"Processed");
 assert.deepEqual(calls,[]);
});

test("ordinary AttemptRecorded still enters existing evidence and feedback route",async()=>{
 const calls=[];
 const event={event_id:"event-2",event_type:"AttemptRecorded",aggregate_id:"attempt-1",claim_token:"claim-2"};
 const pool={query:async(sql)=>{
  if(sql.includes("WITH candidate AS"))return{rows:[event]};
  if(sql.includes("SET processed_at=now()"))return{rows:[],rowCount:1};
  throw new Error("unexpected query: "+sql);
 }};
 const worker=new OutboxWorker(pool,{buildForAttempt:async()=>{calls.push("evidence");return[{target_type:"Knowledge",student_id:"student-1",target_id:"knowledge-1"}];}},{stateEngine:{rebuildKnowledgeAndReview:async()=>calls.push("mastery"),rebuildAbility:async()=>calls.push("ability")},feedback:{observeAttempt:async()=>calls.push("feedback")}});
 const result=await worker.processOne();
 assert.equal(result.status,"Processed");
 assert.deepEqual(calls,["evidence","mastery","feedback"]);
});
