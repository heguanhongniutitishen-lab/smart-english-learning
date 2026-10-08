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
 }finally{await p.end()}
});
