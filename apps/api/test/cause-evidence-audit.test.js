import test from "node:test";import assert from "node:assert/strict";import {inspectCauseEvidence} from "../src/cause-evidence-audit.js";
const valid={attempt_id:"a",verification_type:"Question",exposure_type:"Verification",technical_status:"OK",student_id:"s",observation_student_id:"s",content_version_id:"v",attempt_content_version_id:"v",original_content_version_id:"old",content_item_id:"new",original_content_item_id:"old-item",observation_type:"WrongAnswer",original_attempt_student_id:"s",original_attempt_content_version_id:"old",original_attempt_result:"Wrong",original_attempt_technical_status:"OK",review_status:"Approved",item_status:"Published",reviewed_by:"reviewer",published_at:"2026-10-08",current_version_id:"v",target_mapped:true,result:null,attempt_result:"Wrong"};
test("independent attempt is eligible to review but never sufficient to adjudicate cause",()=>{
 const report=inspectCauseEvidence([valid,{...valid,attempt_id:"b",attempt_result:"Correct"}]);
 assert.equal(report.state,"PendingReview");assert.equal(report.eligible_attempt_count,2);
 assert.equal(report.correct_count,1);assert.equal(report.wrong_count,1);
 assert.deepEqual(report.reasons,["CAUSE_ADJUDICATION_POLICY_NOT_APPROVED"]);
});
test("duplicates and evidence from another student or original content are rejected",()=>{
 const report=inspectCauseEvidence([valid,{...valid},{...valid,attempt_id:"c",student_id:"foreign"},{...valid,attempt_id:"d",content_item_id:"old-item"}]);
 assert.equal(report.eligible_attempt_count,1);
 assert.ok(report.reasons.includes("DUPLICATE_OR_MISSING_ATTEMPT"));
 assert.ok(report.reasons.includes("INVALID_EVIDENCE_PROVENANCE"));
});
test("unapproved, unmapped, already adjudicated, or unavailable evidence does not pass",()=>{
 const report=inspectCauseEvidence([{...valid,review_status:"Draft"},{...valid,attempt_id:"b",target_mapped:false},{...valid,attempt_id:"c",result:"Supports"},{...valid,attempt_id:"d",technical_status:"AudioFailure"}]);
 assert.equal(report.eligible_attempt_count,0);
 assert.ok(report.reasons.includes("NO_ELIGIBLE_INDEPENDENT_ATTEMPT"));
 assert.ok(report.reasons.includes("CONTENT_APPROVAL_OR_TARGET_INVALID"));
 assert.ok(report.reasons.includes("EVIDENCE_ALREADY_ADJUDICATED"));
 assert.ok(report.reasons.includes("INVALID_EVIDENCE_PROVENANCE"));
});

test("invalid original attempt never qualifies independent answers for cause judgment",()=>{
 for(const changes of [
  {original_attempt_result:"Correct"},
  {original_attempt_technical_status:"AudioFailure"},
  {original_attempt_student_id:"foreign"},
  {original_attempt_content_version_id:"unrelated"},
  {observation_type:"HintDependency"}
 ]){
  const report=inspectCauseEvidence([{...valid,...changes}]);
  assert.equal(report.state,"PendingReview");
  assert.equal(report.eligible_attempt_count,0);
  assert.ok(report.reasons.includes("ORIGINAL_WRONG_ATTEMPT_INVALID"));
 }
});
