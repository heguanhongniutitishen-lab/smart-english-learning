import test from "node:test";import assert from "node:assert/strict";
import {saveConfirmationReceipt,readConfirmationReceipt,clearConfirmationReceipt} from "../public/confirmation-receipt.js";
function storage(){const data=new Map();return{setItem(k,v){data.set(k,v)},getItem(k){return data.get(k)??null},removeItem(k){data.delete(k)}}}
const identity={student:"s",user:"u",date:"2026-10-08"};
test("saved confirmation receipt holds only cause lookup hint and survives same-identity reload",()=>{
 const s=storage();assert.equal(saveConfirmationReceipt(s,identity,"cause",1000),true);
 assert.deepEqual(readConfirmationReceipt(s,identity,1500),{causeId:"cause"});
 clearConfirmationReceipt(s);assert.equal(readConfirmationReceipt(s,identity,1500),null);
});
test("receipt refuses other identity, another day and expired lookup hint",()=>{
 for(const x of [{student:"other"},{user:"other"},{date:"2026-10-09"}]){
  const s=storage();saveConfirmationReceipt(s,identity,"cause",1000);
  assert.equal(readConfirmationReceipt(s,{...identity,...x},1500),null);
 }
 const s=storage();saveConfirmationReceipt(s,identity,"cause",1000);
 assert.equal(readConfirmationReceipt(s,identity,1000+25*60*60*1000),null);
});
