import test from "node:test";import assert from "node:assert/strict";
import {savePendingVerification,readPendingVerification,clearPendingVerification,verificationReplayRequest} from "../public/verification-recovery.js";
const makeStorage=()=>{const map=new Map();return{setItem(k,v){map.set(k,v)},getItem(k){return map.get(k)??null},removeItem(k){map.delete(k)}}};
const identity={student:"s",user:"u",date:"2026-10-08"},pending={causeId:"c",key:"k",body:{content_version_id:"v",answer_payload:{choice_index:0}}};
test("confirmation recovery keeps original answer, key and cause across reload",()=>{
 const storage=makeStorage();assert.equal(savePendingVerification(storage,identity,pending,1000),true);
 assert.deepEqual(readPendingVerification(storage,identity,1500),pending);
 assert.deepEqual(verificationReplayRequest(readPendingVerification(storage,identity,1500)),pending);
 clearPendingVerification(storage);assert.equal(readPendingVerification(storage,identity,1500),null);
});
test("confirmation recovery rejects another student, user, date or expired request",()=>{
 for(const changed of [{student:"other"},{user:"other"},{date:"2026-10-09"}]){
  const storage=makeStorage();savePendingVerification(storage,identity,pending,1000);
  assert.equal(readPendingVerification(storage,{...identity,...changed},1500),null);
 }
 const old=makeStorage();savePendingVerification(old,identity,pending,1000);
 assert.equal(readPendingVerification(old,identity,1000+31*60*1000),null);
});
