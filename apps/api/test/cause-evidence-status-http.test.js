import test from "node:test";
import assert from "node:assert/strict";
import {createCauseVerificationQuestionHttpHandler} from "../src/cause-verification-question-http.js";
function response(){return{statusCode:0,setHeader(){},writeHead(code){this.statusCode=code},end(body){this.body=body}}}
function request(user){return{method:"GET",headers:{"x-user-id":user}}}
test("evidence status is student scoped and exposes only pending review counts",async()=>{
 const report={state:"PendingReview",eligible_attempt_count:2,correct_count:1,wrong_count:1,reasons:["CAUSE_ADJUDICATION_POLICY_NOT_APPROVED"],cause_status:"Candidate",private_rationale:{secret:"hidden"}};
 let readCalls=0;
 const h=createCauseVerificationQuestionHttpHandler({store:{async owns(user,student){return user==="owner"&&student==="student"}},auditReadModel:{async forCause(student,cause){readCalls++;return cause==="missing"?null:report}}});
 const url=new URL("http://example.test/api/v1/students/student/feedback/causes/cause/evidence-status");
 const denied=response();
 await h(request("stranger"),denied,url,"request-1");
 assert.equal(denied.statusCode,403);assert.equal(readCalls,0);
 const allowed=response();
 await h(request("owner"),allowed,url,"request-2");
 assert.equal(allowed.statusCode,200);
 const data=JSON.parse(allowed.body).data;
 assert.equal(data.state,"PendingReview");assert.equal(data.eligible_attempt_count,2);
 assert.equal(data.correct_count,1);assert.equal(data.wrong_count,1);
 assert.equal("cause_status" in data,false);assert.equal("private_rationale" in data,false);
 const missing=response();
 await h(request("owner"),missing,new URL("http://example.test/api/v1/students/student/feedback/causes/missing/evidence-status"),"request-3");
 assert.equal(missing.statusCode,404);
});
