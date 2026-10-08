import test from "node:test";import assert from "node:assert/strict";
import {recoveryPriority,canBeginTaskCompletion} from "../public/recovery-priority.js";
test("answer always precedes completion, even after active task changes",()=>{
 const answer={taskId:"old"};
 assert.equal(recoveryPriority(answer,"old","new"),"answer-previous");
 assert.equal(recoveryPriority(answer,"old","old"),"answer-current");
 assert.equal(recoveryPriority(answer,null,"new"),"answer-previous");
 assert.equal(recoveryPriority(null,"old","new"),"completion");
 assert.equal(recoveryPriority(null,null,"new"),"none");
});
test("completion remains blocked until every pending submission is settled",()=>{
 assert.equal(canBeginTaskCompletion({taskId:"old"},null),false);
 assert.equal(canBeginTaskCompletion(null,"old"),false);
 assert.equal(canBeginTaskCompletion({taskId:"old"},"old"),false);
 assert.equal(canBeginTaskCompletion(null,null),true);
});
