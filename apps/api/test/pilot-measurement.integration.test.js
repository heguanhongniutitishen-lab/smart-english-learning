import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {PilotMeasurementReadModel} from "../src/pilot-measurement-read-model.js";
const it=process.env.TEST_DATABASE_URL?test:test.skip;

it("reports Pilot operational exposure and completion without impact claims",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}),c=await p.connect();
 try{await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('measure-private','Primary',5) RETURNING student_id")).rows[0].student_id;
  const cohort=(await c.query("INSERT INTO pilot_cohorts(cohort_code,name) VALUES($1,'measure') RETURNING cohort_id",["MEAS-"+crypto.randomUUID()])).rows[0].cohort_id;
  await c.query("INSERT INTO pilot_cohort_memberships(cohort_id,student_id) VALUES($1,$2)",[cohort,s]);
  await c.query("INSERT INTO learning_sessions(student_id,started_at,ended_at,effective_seconds,status) VALUES($1,'2026-10-05T02:00:00Z','2026-10-05T02:10:00Z',480,'Completed')",[s]);
  const plan=(await c.query("INSERT INTO daily_plans(student_id,plan_date,version,status,available_minutes,strategy_version) VALUES($1,'2026-10-05',1,'Active',20,'scheduler-v1') RETURNING daily_plan_id",[s])).rows[0].daily_plan_id;
  await c.query("INSERT INTO daily_tasks(daily_plan_id,source_type,target_type,estimated_seconds,priority,sort_order,reason_code,status) VALUES($1,'SchoolSync','Knowledge',60,1,1,'Pilot','Completed'),($1,'Review','Knowledge',60,2,2,'Pilot','Pending')",[plan]);
  const z=await new PilotMeasurementReadModel(c).baseline(cohort,{from:"2026-10-05",to:"2026-10-05"});
  assert.equal(z.cohort.exposed_students,1);assert.equal(z.exposure.session_count,1);assert.equal(z.exposure.effective_seconds,480);
  assert.equal(z.completion.tasks_total,2);assert.equal(z.completion.tasks_completed,1);assert.equal(z.completion.task_completion_rate,.5);
  assert.equal(z.semantics.measurement,"operational_baseline_not_validated_learning_impact");
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});

test("Pilot measurement requires an explicit period",async()=>{
 await assert.rejects(()=>new PilotMeasurementReadModel({}).baseline("c1",{}),e=>e.code==="PILOT_MEASUREMENT_PERIOD_REQUIRED");
});


it("counts technical attempts separately from correct/wrong and keeps repair flow factual",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}),c=await p.connect();
 try{await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('flow-private','Primary',5) RETURNING student_id")).rows[0].student_id;
  const cohort=(await c.query("INSERT INTO pilot_cohorts(cohort_code,name) VALUES($1,'flow') RETURNING cohort_id",["FLOW-"+crypto.randomUUID()])).rows[0].cohort_id;
  await c.query("INSERT INTO pilot_cohort_memberships(cohort_id,student_id) VALUES($1,$2)",[cohort,s]);
  const item=(await c.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Draft') RETURNING content_id")).rows[0].content_id;
  const cv=(await c.query("INSERT INTO content_versions(content_id,version_no,payload,review_status) VALUES($1,1,'{}','Approved') RETURNING content_version_id",[item])).rows[0].content_version_id;
  const a=(await c.query("INSERT INTO question_attempts(student_id,content_version_id,request_id,answer_payload,result,technical_status,occurred_at) VALUES($1,$2,$3,'{}','Wrong','OK','2026-10-05T03:00:00Z') RETURNING attempt_id",[s,cv,crypto.randomUUID()])).rows[0].attempt_id;
  const o=(await c.query("INSERT INTO error_observations(student_id,attempt_id,content_version_id,observation_type,created_at) VALUES($1,$2,$3,'WrongAnswer','2026-10-05T03:01:00Z') RETURNING error_observation_id",[s,a,cv])).rows[0].error_observation_id;
  await c.query("INSERT INTO micro_repair_tasks(student_id,error_observation_id,target_type,target_id,repair_type,status,estimated_seconds,created_at,completed_at) VALUES($1,$2,'Knowledge',gen_random_uuid(),'Explain','Completed',60,'2026-10-05T03:02:00Z','2026-10-05T03:03:00Z')",[s,o]);
  const z=await new PilotMeasurementReadModel(c).baseline(cohort,{from:"2026-10-05",to:"2026-10-05"});
  assert.deepEqual(z.attempts,{total:1,technical_ok:1,correct:0,wrong:1});
  assert.equal(z.error_repair.observations,1);assert.equal(z.error_repair.wrong_answer_observations,1);assert.equal(z.error_repair.repairs_total,1);assert.equal(z.error_repair.repairs_completed,1);
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});


it("keeps missing downstream Evidence visible in measurement completeness",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}),c=await p.connect();
 try{await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('gap-private','Primary',5) RETURNING student_id")).rows[0].student_id;
  const cohort=(await c.query("INSERT INTO pilot_cohorts(cohort_code,name) VALUES($1,'gap') RETURNING cohort_id",["GAP-"+crypto.randomUUID()])).rows[0].cohort_id;
  await c.query("INSERT INTO pilot_cohort_memberships(cohort_id,student_id) VALUES($1,$2)",[cohort,s]);
  const item=(await c.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Draft') RETURNING content_id")).rows[0].content_id;
  const cv=(await c.query("INSERT INTO content_versions(content_id,version_no,payload,review_status) VALUES($1,1,'{}','Approved') RETURNING content_version_id",[item])).rows[0].content_version_id;
  await c.query("INSERT INTO question_attempts(student_id,content_version_id,request_id,answer_payload,result,technical_status,occurred_at) VALUES($1,$2,$3,'{}','Correct','OK','2026-10-05T03:00:00Z')",[s,cv,crypto.randomUUID()]);
  const z=await new PilotMeasurementReadModel(c).baseline(cohort,{from:"2026-10-05",to:"2026-10-05"});
  assert.equal(z.data_completeness.attempts,1);assert.equal(z.data_completeness.technical_ok_without_evidence,1);assert.equal(z.data_completeness.complete,false);
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});
