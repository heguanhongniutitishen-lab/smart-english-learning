import test from "node:test";
import assert from "node:assert/strict";
import {Flow,transition,canSubmitAnswer,canCompleteTask} from "../public/flow-state.js";
import {recoveryPriority,canBeginTaskCompletion} from "../public/recovery-priority.js";
import {prepareAnswerSubmission,pendingReplayRequest,pendingTaskChanged} from "../public/answer-submission.js";
import {isTaskCompleted,shouldRetryCompletion} from "../public/task-completion-recovery.js";
import {createSessionStats,recordAnswer,recordRepairPractice,completionMessage} from "../public/session-summary.js";

test("acceptance: correct answer can complete task, load next, and finish day",()=>{
 let state=Flow.HOME,stats=createSessionStats();
 state=transition(state,Flow.ANSWERING);assert.equal(canSubmitAnswer(state),true);
 state=transition(state,Flow.FEEDBACK);stats=recordAnswer(stats,true);
 assert.equal(canBeginTaskCompletion(null,null),true);
 state=transition(state,Flow.COMPLETING);assert.equal(canCompleteTask(state),false);
 state=transition(state,Flow.LOADING_NEXT);
 state=transition(state,Flow.ANSWERING);
 state=transition(state,Flow.FEEDBACK);stats=recordAnswer(stats,true);
 state=transition(state,Flow.COMPLETING);
 state=transition(state,Flow.LOADING_NEXT);
 state=transition(state,Flow.TODAY_COMPLETE);
 assert.match(completionMessage(stats),/答对 2 道/);
 assert.match(completionMessage(stats),/未进行错题修复/);
});
test("acceptance: wrong answer follows demo repair before completing",()=>{
 let state=Flow.HOME,stats=createSessionStats();
 state=transition(state,Flow.ANSWERING);
 state=transition(state,Flow.FEEDBACK);stats=recordAnswer(stats,false);
 state=transition(state,Flow.REPAIRING);stats=recordRepairPractice(stats);
 state=transition(state,Flow.COMPLETING);
 state=transition(state,Flow.LOADING_NEXT);
 state=transition(state,Flow.TODAY_COMPLETE);
 assert.match(completionMessage(stats),/答错 1 道/);
 assert.match(completionMessage(stats),/进行了 1 次演示修复练习/);
});
test("acceptance: uncertain answer takes precedence over completion and cannot migrate to new task",()=>{
 const pending=prepareAnswerSubmission(null,{taskId:"old",contentVersion:"cv",chosen:1,answerPayload:{choice_index:1},responseTimeMs:900},()=>"stable-key");
 assert.equal(recoveryPriority(pending,"old","new"),"answer-previous");
 assert.equal(pendingTaskChanged(pending,"new"),true);
 assert.equal(canBeginTaskCompletion(pending,"old"),false);
 assert.deepEqual(pendingReplayRequest(pending),{taskId:"old",key:"stable-key",body:pending.body});
 assert.equal(recoveryPriority(null,"old","new"),"completion");
});
test("acceptance: server-confirmed completion never retries; pending completion may retry",()=>{
 const done={current_task:{task_id:"new"},tasks:[{task_id:"old",status:"Completed"},{task_id:"new",status:"Pending"}]};
 assert.equal(isTaskCompleted(done,"old"),true);
 assert.equal(shouldRetryCompletion(done,"old"),false);
 assert.equal(shouldRetryCompletion({tasks:[{task_id:"old",status:"Pending"}]},"old"),true);
 assert.equal(shouldRetryCompletion(done,"missing"),false);
});
