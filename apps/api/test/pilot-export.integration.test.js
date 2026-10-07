import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {PilotExportService} from "../src/pilot-export-service.js";
const it=process.env.TEST_DATABASE_URL?test:test.skip;

it("exports Pilot attempts with version provenance and no direct identity fields",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}),c=await p.connect();
 try{await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('private-name','Primary',5) RETURNING student_id")).rows[0].student_id;
  const cohort=(await c.query("INSERT INTO pilot_cohorts(cohort_code,name) VALUES($1,'export') RETURNING cohort_id",["EXP-"+crypto.randomUUID()])).rows[0].cohort_id;
  await c.query("INSERT INTO pilot_cohort_memberships(cohort_id,student_id) VALUES($1,$2)",[cohort,s]);
  const content=(await c.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Draft') RETURNING content_id")).rows[0].content_id;
  const cv=(await c.query("INSERT INTO content_versions(content_id,version_no,payload,review_status) VALUES($1,1,'{}','Approved') RETURNING content_version_id",[content])).rows[0].content_version_id;
  const plan=(await c.query("INSERT INTO daily_plans(student_id,plan_date,version,status,available_minutes,strategy_version) VALUES($1,current_date,1,'Active',20,'scheduler-v1') RETURNING daily_plan_id",[s])).rows[0].daily_plan_id;
  const task=(await c.query("INSERT INTO daily_tasks(daily_plan_id,source_type,target_type,estimated_seconds,priority,sort_order,reason_code) VALUES($1,'SchoolSync','Knowledge',60,1,1,'Pilot') RETURNING daily_task_id",[plan])).rows[0].daily_task_id;
  await c.query("INSERT INTO question_attempts(student_id,daily_task_id,content_version_id,request_id,answer_payload,result,occurred_at) VALUES($1,$2,$3,$4,'{}','Correct',now())",[s,task,cv,crypto.randomUUID()]);
  const z=await new PilotExportService(c).attempts(cohort);assert.equal(z.dataset,"attempts");assert.equal(z.rows.length,1);assert.equal(z.rows[0].strategy_version,"scheduler-v1");
  for(const k of ["display_name","mobile_hash","wechat_open_id","answer_payload"])assert.equal(k in z.rows[0],false);
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});

it("labels state export explicitly as a current projection snapshot",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}),c=await p.connect();
 try{await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('state-private','Primary',5) RETURNING student_id")).rows[0].student_id;
  const cohort=(await c.query("INSERT INTO pilot_cohorts(cohort_code,name) VALUES($1,'state') RETURNING cohort_id",["ST-"+crypto.randomUUID()])).rows[0].cohort_id;
  await c.query("INSERT INTO pilot_cohort_memberships(cohort_id,student_id) VALUES($1,$2)",[cohort,s]);
  const z=await new PilotExportService(c).state(cohort);assert.equal(z.snapshot_semantics,"current_projection_not_historical_period_state");
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});


it("exports Evidence without payloads and labels validity semantics",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}),c=await p.connect();
 try{await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('e-private','Primary',5) RETURNING student_id")).rows[0].student_id;
  const cohort=(await c.query("INSERT INTO pilot_cohorts(cohort_code,name) VALUES($1,'evidence') RETURNING cohort_id",["EV-"+crypto.randomUUID()])).rows[0].cohort_id;
  await c.query("INSERT INTO pilot_cohort_memberships(cohort_id,student_id) VALUES($1,$2)",[cohort,s]);
  const e=(await c.query("INSERT INTO evidences(student_id,target_type,target_id,direction,quality_score,independence_score,source,model_version) VALUES($1,'Knowledge',gen_random_uuid(),'Positive',1,1,'Rule','v1') RETURNING evidence_id",[s])).rows[0].evidence_id;
  await c.query("INSERT INTO evidence_validity(evidence_id,status) VALUES($1,'Valid')",[e]);
  const z=await new PilotExportService(c).evidence(cohort);assert.equal(z.rows.length,1);assert.equal(z.rows[0].validity_status,"Valid");assert.equal(z.snapshot_semantics,"durable_evidence_with_current_validity");
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});

it("state export cursor does not duplicate rows",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}),c=await p.connect();
 try{await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('cursor-private','Primary',5) RETURNING student_id")).rows[0].student_id;
  const cohort=(await c.query("INSERT INTO pilot_cohorts(cohort_code,name) VALUES($1,'cursor') RETURNING cohort_id",["CUR-"+crypto.randomUUID()])).rows[0].cohort_id;
  await c.query("INSERT INTO pilot_cohort_memberships(cohort_id,student_id) VALUES($1,$2)",[cohort,s]);
  const k1=(await c.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Vocabulary',$1,'cursor-1') RETURNING knowledge_id",["CUR-K1-"+crypto.randomUUID()])).rows[0].knowledge_id;
  const k2=(await c.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Vocabulary',$1,'cursor-2') RETURNING knowledge_id",["CUR-K2-"+crypto.randomUUID()])).rows[0].knowledge_id;
  await c.query("INSERT INTO mastery_records(student_id,knowledge_id,mastery_state,confidence,evidence_count,model_version) VALUES($1,$2,'S1',.5,0,'v1'),($1,$3,'S2',.6,0,'v1')",[s,k1,k2]);
  const svc=new PilotExportService(c),a=await svc.state(cohort,{limit:1}),b=await svc.state(cohort,{limit:1,after:a.next_cursor});
  assert.equal(a.rows.length,1);assert.equal(b.rows.length,1);assert.notEqual(a.rows[0].target_id,b.rows[0].target_id);
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});
