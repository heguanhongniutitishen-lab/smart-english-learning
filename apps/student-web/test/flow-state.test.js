import test from"node:test";import assert from"node:assert/strict";import{Flow,transition,canSubmitAnswer,canCompleteTask,canUseDemoQuestions}from"../public/flow-state.js";
test("student happy path is explicit",()=>{let s=Flow.HOME;s=transition(s,Flow.ANSWERING);assert.equal(canSubmitAnswer(s),true);s=transition(s,Flow.FEEDBACK);s=transition(s,Flow.REPAIRING);s=transition(s,Flow.COMPLETING);assert.equal(canCompleteTask(s),false);s=transition(s,Flow.LOADING_NEXT);s=transition(s,Flow.ANSWERING);assert.equal(s,Flow.ANSWERING)});
test("today can finish after loading next",()=>{assert.equal(transition(Flow.LOADING_NEXT,Flow.TODAY_COMPLETE),Flow.TODAY_COMPLETE);assert.equal(transition(Flow.TODAY_COMPLETE,Flow.HOME),Flow.HOME)});
test("duplicate answer and impossible jumps are rejected",()=>{assert.equal(canSubmitAnswer(Flow.FEEDBACK),false);assert.throws(()=>transition(Flow.HOME,Flow.COMPLETING),e=>e.code==="INVALID_STUDENT_FLOW_TRANSITION")});

test("student can leave feedback or repair and complete demo without a transition crash",()=>{
 assert.equal(transition(Flow.FEEDBACK,Flow.HOME),Flow.HOME);
 assert.equal(transition(Flow.REPAIRING,Flow.HOME),Flow.HOME);
 assert.equal(transition(Flow.ANSWERING,Flow.TODAY_COMPLETE),Flow.TODAY_COMPLETE);
 assert.equal(transition(Flow.TODAY_COMPLETE,Flow.HOME),Flow.HOME);
});

test("demo content is only enabled when both identity parameters are absent",()=>{assert.equal(canUseDemoQuestions(null,null),true);assert.equal(canUseDemoQuestions("student-1","user-1"),false);assert.equal(canUseDemoQuestions("student-1",null),false);assert.equal(canUseDemoQuestions(null,"user-1"),false)});
