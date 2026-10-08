import {CauseEvidenceAuditReadModel} from "../src/cause-evidence-audit.js";
import {IndependentQuestionAnswerService} from "../src/independent-question-answer-service.js";import {LearningPostgresRepository} from "../src/repositories/learning-postgres.js";
import test from "node:test";import assert from "node:assert/strict";import pg from "pg";import {CauseVerificationQuestionReadModel} from "../src/cause-verification-question-read-model.js";
const it=process.env.TEST_DATABASE_URL?test:test.skip;
it("returns only a different, published and human-approved question without answer key",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 try{
 const reviewer=(await p.query("INSERT INTO users(status) VALUES('Active') RETURNING user_id")).rows[0];
 const student=(await p.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('verify-question-fixture','Primary',5) RETURNING student_id")).rows[0];
 const other=(await p.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('verify-question-other','Primary',5) RETURNING student_id")).rows[0];
 const k=(await p.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Grammar',$1,'verification knowledge') RETURNING knowledge_id",["VQ-"+crypto.randomUUID()])).rows[0];
 async function version(stem,approved=true){
  const item=(await p.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Published') RETURNING content_id")).rows[0];
  const v=(await p.query("INSERT INTO content_versions(content_id,version_no,payload,answer_payload,explanation_payload,review_status,reviewed_by,reviewed_at,published_at) VALUES($1,1,$2,$3,$4,$5,$6,now(),$7) RETURNING content_version_id",[item.content_id,{stem,options:["a","b"]},{correct_index:1},{text:"explanation"},approved?"Approved":"Draft",approved?reviewer.user_id:null,approved?new Date():null])).rows[0];
  await p.query("UPDATE content_items SET current_version_id=$2 WHERE content_id=$1",[item.content_id,v.content_version_id]);
  await p.query("INSERT INTO content_knowledge(content_version_id,knowledge_id,role,weight,purpose,review_status) VALUES($1,$2,'PrimaryTested',1,'Learn','Approved')",[v.content_version_id,k.knowledge_id]);
  return v;
 }
 const original=await version("original"),unapproved=await version("draft",false);
 const attempt=(await p.query("INSERT INTO question_attempts(student_id,content_version_id,request_id,answer_payload,result,technical_status,occurred_at) VALUES($1,$2,$3,$4,'Wrong','OK',now()) RETURNING attempt_id",[student.student_id,original.content_version_id,"v-q-"+crypto.randomUUID(),{choice_index:0}])).rows[0];
 const o=(await p.query("INSERT INTO error_observations(student_id,attempt_id,content_version_id,observation_type,status,source) VALUES($1,$2,$3,'WrongAnswer','UnderVerification','Rule') RETURNING error_observation_id",[student.student_id,attempt.attempt_id,original.content_version_id])).rows[0];
 const h=(await p.query("INSERT INTO error_cause_hypotheses(error_observation_id,cause_code,confidence,status,source,rationale) VALUES($1,$2,.5,'Candidate','Rule',$3) RETURNING error_cause_hypothesis_id",[o.error_observation_id,"TEST:"+crypto.randomUUID(),{target_type:"Knowledge",target_id:k.knowledge_id}])).rows[0];
 const svc=new CauseVerificationQuestionReadModel(p);
 let view=await svc.forHypothesis(student.student_id,h.error_cause_hypothesis_id);
 assert.equal(view.question,null);assert.equal(view.reason,"NO_INDEPENDENT_APPROVED_QUESTION");
 const independent=await version("independent");
 view=await svc.forHypothesis(student.student_id,h.error_cause_hypothesis_id);
 assert.equal(view.question.content_version_id,independent.content_version_id);
 assert.equal(view.question.payload.stem,"independent");
 assert.equal("answer_payload" in view.question,false);
 assert.equal("explanation_payload" in view.question,false);
 assert.equal(await svc.forHypothesis(other.student_id,h.error_cause_hypothesis_id),null);
 const state=(await p.query("SELECT status FROM error_cause_hypotheses WHERE error_cause_hypothesis_id=$1",[h.error_cause_hypothesis_id])).rows[0];
 assert.equal(state.status,"Candidate");
 const grader=new IndependentQuestionAnswerService(p,svc,new LearningPostgresRepository(p));
 const body={content_version_id:independent.content_version_id,answer_payload:{choice_index:0}};
 const key="verify-"+crypto.randomUUID();
 const graded=await grader.submit(student.student_id,h.error_cause_hypothesis_id,body,key);
 assert.equal(graded.attempt.result,"Wrong");
 assert.equal(graded.attempt.exposure_type,"Verification");
 assert.equal(graded.cause_updated,false);
 const replay=await grader.submit(student.student_id,h.error_cause_hypothesis_id,body,key);
 assert.equal(replay.attempt.attempt_id,graded.attempt.attempt_id);
 const evidence=(await p.query("SELECT verification_type,content_version_id,attempt_id,result FROM error_cause_verifications WHERE error_cause_hypothesis_id=$1",[h.error_cause_hypothesis_id])).rows;
 assert.equal(evidence.length,1);
 assert.equal(evidence[0].attempt_id,graded.attempt.attempt_id);
 assert.equal(evidence[0].content_version_id,independent.content_version_id);
 assert.equal(evidence[0].verification_type,"Question");
 assert.equal(evidence[0].result,null);
 const report=await new CauseEvidenceAuditReadModel(p).forCause(student.student_id,h.error_cause_hypothesis_id);
 assert.equal(report.state,"PendingReview");
 assert.equal(report.cause_status,"Candidate");
 assert.equal(report.eligible_attempt_count,1);
 assert.equal(report.wrong_count,1);
 assert.ok(report.reasons.includes("CAUSE_ADJUDICATION_POLICY_NOT_APPROVED"));
 assert.equal(await new CauseEvidenceAuditReadModel(p).forCause(other.student_id,h.error_cause_hypothesis_id),null);
 const unrelated=(await p.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Grammar',$1,'unrelated knowledge') RETURNING knowledge_id",["VQ-UNRELATED-"+crypto.randomUUID()])).rows[0];
 const foreignItem=(await p.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Published') RETURNING content_id")).rows[0];
 const foreignVersion=(await p.query("INSERT INTO content_versions(content_id,version_no,payload,answer_payload,review_status,reviewed_by,reviewed_at,published_at) VALUES($1,1,$2,$3,'Approved',$4,now(),now()) RETURNING content_version_id",[foreignItem.content_id,{stem:"unrelated",options:["a","b"]},{correct_index:1},reviewer.user_id])).rows[0];
 await p.query("UPDATE content_items SET current_version_id=$2 WHERE content_id=$1",[foreignItem.content_id,foreignVersion.content_version_id]);
 await p.query("INSERT INTO content_knowledge(content_version_id,knowledge_id,role,weight,purpose,review_status) VALUES($1,$2,'PrimaryTested',1,'Learn','Approved')",[foreignVersion.content_version_id,unrelated.knowledge_id]);
 const unrelatedAttempt=await new LearningPostgresRepository(p).createAttempt(student.student_id,{content_version_id:foreignVersion.content_version_id,request_id:"v-unrelated-"+crypto.randomUUID(),answer_payload:{choice_index:0},result:"Wrong",exposure_type:"Verification",technical_status:"OK"});
 await assert.rejects(()=>grader.linkEvidence(student.student_id,h.error_cause_hypothesis_id,unrelatedAttempt),e=>e.code==="VERIFICATION_EVIDENCE_LINK_CONFLICT");
 const unrelatedEvidence=Number((await p.query("SELECT count(*) AS n FROM error_cause_verifications WHERE attempt_id=$1",[unrelatedAttempt.attempt_id])).rows[0].n);
 assert.equal(unrelatedEvidence,0);


 await assert.rejects(()=>grader.submit(student.student_id,h.error_cause_hypothesis_id,{...body,answer_payload:{choice_index:1}},key),e=>e.code==="VERIFICATION_REPLAY_CONFLICT");
 assert.equal(Number((await p.query("SELECT count(*) n FROM question_attempts WHERE student_id=$1 AND request_id=$2",[student.student_id,key])).rows[0].n),1);
 assert.equal(Number((await p.query("SELECT count(*) n FROM outbox_events WHERE aggregate_id=$1 AND event_type='AttemptRecorded'",[graded.attempt.attempt_id])).rows[0].n),1);
 assert.equal((await p.query("SELECT status FROM error_cause_hypotheses WHERE error_cause_hypothesis_id=$1",[h.error_cause_hypothesis_id])).rows[0].status,"Candidate");
 assert.equal(Number((await p.query("SELECT count(*) n FROM micro_repair_tasks WHERE student_id=$1",[student.student_id])).rows[0].n),0);
 const otherCause=(await p.query("INSERT INTO error_cause_hypotheses(error_observation_id,cause_code,confidence,status,source,rationale) VALUES($1,$2,.5,'Candidate','Rule',$3) RETURNING error_cause_hypothesis_id",[o.error_observation_id,"SECOND:"+crypto.randomUUID(),{target_type:"Knowledge",target_id:k.knowledge_id}])).rows[0];
 await assert.rejects(()=>grader.linkEvidence(student.student_id,otherCause.error_cause_hypothesis_id,graded.attempt),e=>e.code==="VERIFICATION_EVIDENCE_LINK_CONFLICT");
 assert.equal(Number((await p.query("SELECT count(*) n FROM error_cause_verifications WHERE attempt_id=$1",[graded.attempt.attempt_id])).rows[0].n),1);
 await p.query("UPDATE error_cause_hypotheses SET status='Verified' WHERE error_cause_hypothesis_id=$1",[h.error_cause_hypothesis_id]);
 const lateReplay=await grader.submit(student.student_id,h.error_cause_hypothesis_id,body,key);
 assert.equal(lateReplay.attempt.attempt_id,graded.attempt.attempt_id);
 assert.equal(Number((await p.query("SELECT count(*) n FROM error_cause_verifications WHERE attempt_id=$1",[graded.attempt.attempt_id])).rows[0].n),1);
 assert.equal(Number((await p.query("SELECT count(*) n FROM micro_repair_tasks WHERE student_id=$1",[student.student_id])).rows[0].n),0);

 }finally{await p.end()}
});
