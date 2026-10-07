import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {ReliabilityOpsReadModel} from "../src/reliability-ops-read-model.js";

const it=process.env.TEST_DATABASE_URL?test:test.skip;

it("reliability ops separates ready delayed dead-letter and recalculation backlog",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 try{
  await p.query("UPDATE outbox_events SET processed_at=now() WHERE processed_at IS NULL AND dead_lettered_at IS NULL");
  await p.query("UPDATE state_recalculation_jobs SET status='Completed',completed_at=now() WHERE status<>'Completed'");

  const student=(await p.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('ops-read','Primary',5) RETURNING student_id")).rows[0];
  const knowledge=(await p.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Vocabulary',$1,'ops read') RETURNING knowledge_id",["OPS-"+crypto.randomUUID()])).rows[0];
  const evidence=(await p.query("INSERT INTO evidences(student_id,target_type,target_id,direction,quality_score,independence_score,confidence_delta,source,model_version) VALUES($1,'Knowledge',$2,'Negative',1,1,-1,'Rule','ops-test') RETURNING evidence_id",[student.student_id,knowledge.knowledge_id])).rows[0];

  await p.query("INSERT INTO outbox_events(event_type,aggregate_type,aggregate_id,payload,available_at) VALUES('OpsReady','Test',gen_random_uuid(),'{}',now()-interval '1 minute')");
  await p.query("INSERT INTO outbox_events(event_type,aggregate_type,aggregate_id,payload,available_at) VALUES('OpsDelayed','Test',gen_random_uuid(),'{}',now()+interval '1 hour')");
  await p.query("INSERT INTO outbox_events(event_type,aggregate_type,aggregate_id,payload,dead_lettered_at,dead_letter_reason,attempt_count) VALUES('OpsDead','Test',gen_random_uuid(),'{}',now(),'ops dead reason',8)");

  await p.query("INSERT INTO state_recalculation_jobs(evidence_id,student_id,target_type,target_id,status,available_at,last_error) VALUES($1,$2,'Knowledge',$3,'Retry',now()-interval '1 minute','retry now')",[evidence.evidence_id,student.student_id,knowledge.knowledge_id]);
  const evidence2=(await p.query("INSERT INTO evidences(student_id,target_type,target_id,direction,quality_score,independence_score,confidence_delta,source,model_version) VALUES($1,'Knowledge',$2,'Negative',1,1,-1,'Rule','ops-test-2') RETURNING evidence_id",[student.student_id,knowledge.knowledge_id])).rows[0];
  await p.query("INSERT INTO state_recalculation_jobs(evidence_id,student_id,target_type,target_id,status,available_at,last_error) VALUES($1,$2,'Knowledge',$3,'Retry',now()+interval '1 hour','retry later')",[evidence2.evidence_id,student.student_id,knowledge.knowledge_id]);

  const data=await new ReliabilityOpsReadModel(p).get();
  assert.equal(Number(data.outbox.ready),1);
  assert.equal(Number(data.outbox.delayed),1);
  assert.ok(Number(data.outbox.dead_letter)>=1);
  assert.ok(data.outbox.oldest_unprocessed_at);
  assert.equal(Number(data.recalculation.ready),1);
  assert.equal(Number(data.recalculation.delayed),1);
  assert.ok(data.recalculation.oldest_incomplete_at);
  assert.ok(data.recent_dead_letters.some(x=>x.event_type==="OpsDead"&&x.reason==="ops dead reason"));
  assert.ok(data.recent_recalculation_failures.some(x=>x.last_error==="retry now"));
  assert.ok(data.recent_recalculation_failures.some(x=>x.last_error==="retry later"));
 }finally{await p.end();}
});
