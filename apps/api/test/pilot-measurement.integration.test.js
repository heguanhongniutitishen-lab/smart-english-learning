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
