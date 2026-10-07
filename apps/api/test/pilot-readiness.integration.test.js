import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {PilotReadinessReadModel} from "../src/pilot-readiness-read-model.js";
const it=process.env.TEST_DATABASE_URL?test:test.skip;

it("reports a clean Pilot cohort when durable provenance is complete",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}),c=await p.connect();
 try{await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('pilot-ready','Primary',5) RETURNING student_id")).rows[0].student_id;
  const cohort=(await c.query("INSERT INTO pilot_cohorts(cohort_code,name) VALUES($1,'ready') RETURNING cohort_id",["READY-"+crypto.randomUUID()])).rows[0].cohort_id;
  await c.query("INSERT INTO pilot_cohort_memberships(cohort_id,student_id) VALUES($1,$2)",[cohort,s]);
  const content=(await c.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Draft') RETURNING content_id")).rows[0].content_id;
  const cv=(await c.query("INSERT INTO content_versions(content_id,version_no,payload,review_status) VALUES($1,1,'{}','Approved') RETURNING content_version_id",[content])).rows[0].content_version_id;
  const plan=(await c.query("INSERT INTO daily_plans(student_id,plan_date,version,status,available_minutes,strategy_version) VALUES($1,current_date,1,'Active',20,'scheduler-v1') RETURNING daily_plan_id",[s])).rows[0].daily_plan_id;
  const task=(await c.query("INSERT INTO daily_tasks(daily_plan_id,source_type,target_type,estimated_seconds,priority,sort_order,reason_code) VALUES($1,'SchoolSync','Knowledge',60,1,1,'Pilot') RETURNING daily_task_id",[plan])).rows[0].daily_task_id;
  const a=(await c.query("INSERT INTO question_attempts(student_id,daily_task_id,content_version_id,request_id,answer_payload,result,occurred_at) VALUES($1,$2,$3,$4,'{}','Correct',now()) RETURNING attempt_id",[s,task,cv,crypto.randomUUID()])).rows[0].attempt_id;
  const k=(await c.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Vocabulary',$1,'pilot-ready-k') RETURNING knowledge_id",["READY-K-"+crypto.randomUUID()])).rows[0].knowledge_id;
  const e=(await c.query("INSERT INTO evidences(student_id,attempt_id,target_type,target_id,direction,quality_score,independence_score,source,model_version) VALUES($1,$2,'Knowledge',$3,'Positive',1,1,'Rule','evidence-v1') RETURNING evidence_id",[s,a,k])).rows[0].evidence_id;
  await c.query("INSERT INTO evidence_validity(evidence_id,status) VALUES($1,'Valid')",[e]);
  await c.query("INSERT INTO mastery_records(student_id,knowledge_id,mastery_state,confidence,evidence_count,model_version) SELECT student_id,target_id,'S1',1,1,'state-v1' FROM evidences WHERE evidence_id=$1",[e]);
  const z=await new PilotReadinessReadModel(c).get(cohort);assert.equal(z.ready,true);assert.equal(z.blockers,0);assert.equal(Number(z.details.attempts.total),1);assert.equal(Number(z.details.evidence.total),1);
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});

it("makes missing evidence validity visible as a Pilot blocker",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}),c=await p.connect();
 try{await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('pilot-bad','Primary',5) RETURNING student_id")).rows[0].student_id;
  const cohort=(await c.query("INSERT INTO pilot_cohorts(cohort_code,name) VALUES($1,'bad') RETURNING cohort_id",["BAD-"+crypto.randomUUID()])).rows[0].cohort_id;
  await c.query("INSERT INTO pilot_cohort_memberships(cohort_id,student_id) VALUES($1,$2)",[cohort,s]);
  await c.query("INSERT INTO evidences(student_id,target_type,target_id,direction,quality_score,independence_score,source,model_version) VALUES($1,'Knowledge',gen_random_uuid(),'Positive',1,1,'Rule','v1')",[s]);
  const z=await new PilotReadinessReadModel(c).get(cohort);assert.equal(z.ready,false);assert.ok(Number(z.details.evidence.missing_validity)>=1);
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});


it("blocks Pilot readiness when valid evidence has no state projection",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}),c=await p.connect();
 try{await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('pilot-state-gap','Primary',5) RETURNING student_id")).rows[0].student_id;
  const cohort=(await c.query("INSERT INTO pilot_cohorts(cohort_code,name) VALUES($1,'state-gap') RETURNING cohort_id",["STATE-"+crypto.randomUUID()])).rows[0].cohort_id;
  await c.query("INSERT INTO pilot_cohort_memberships(cohort_id,student_id) VALUES($1,$2)",[cohort,s]);
  const e=(await c.query("INSERT INTO evidences(student_id,target_type,target_id,direction,quality_score,independence_score,source,model_version) VALUES($1,'Knowledge',gen_random_uuid(),'Positive',1,1,'Rule','v1') RETURNING evidence_id",[s])).rows[0].evidence_id;
  await c.query("INSERT INTO evidence_validity(evidence_id,status) VALUES($1,'Valid')",[e]);
  const z=await new PilotReadinessReadModel(c).get(cohort);assert.equal(z.ready,false);assert.ok(Number(z.details.state.missing_mastery)>=1);
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});
