import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {RecoveryIntegrityService} from "../src/recovery-integrity.js";
import {StateEngine} from "../src/state-engine.js";
import {StateReplayService} from "../src/state-replay.js";
import {ReviewPlanner} from "../src/review-planner.js";

const it=process.env.TEST_DATABASE_URL?test:test.skip;

it("detects missing projections after restore and becomes clean after replay",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 const c=await p.connect();
 try{
  await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('recovery-check','Primary',5) RETURNING student_id")).rows[0];
  const k=(await c.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Vocabulary',$1,'recovery k') RETURNING knowledge_id",["REC-K-"+crypto.randomUUID()])).rows[0];
  const a=(await c.query("INSERT INTO abilities(domain,code,name,status) VALUES('Vocabulary',$1,'recovery a','Active') RETURNING ability_id",["REC-A-"+crypto.randomUUID()])).rows[0];
  for(const [type,id] of [["Knowledge",k.knowledge_id],["Ability",a.ability_id]]){
   const e=(await c.query("INSERT INTO evidences(student_id,target_type,target_id,direction,quality_score,independence_score,confidence_delta,source,model_version) VALUES($1,$2,$3,'Positive',1,1,1,'Rule','recovery-test') RETURNING evidence_id",[s.student_id,type,id])).rows[0];
   await c.query("INSERT INTO evidence_validity(evidence_id,status) VALUES($1,'Valid')",[e.evidence_id]);
  }
  const integrity=new RecoveryIntegrityService(c);
  const broken=await integrity.check();
  assert.equal(broken.ok,false);
  assert.ok(Number(broken.details.mastery.missing_projection)>=1);
  assert.ok(Number(broken.details.ability.missing_projection)>=1);

  const engine=new StateEngine(c,"state-rules-v1",{reviewPlanner:new ReviewPlanner(c)});
  await new StateReplayService(c,engine).rebuildStudent(s.student_id);
  const clean=await integrity.check();
  assert.equal(clean.ok,true);
  assert.equal(Number(clean.details.mastery.missing_projection),0);
  assert.equal(Number(clean.details.ability.missing_projection),0);
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});

it("detects evidence without validity metadata as a recovery blocker",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 const c=await p.connect();
 try{
  await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('recovery-orphan','Primary',5) RETURNING student_id")).rows[0];
  const k=(await c.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Vocabulary',$1,'orphan k') RETURNING knowledge_id",["REC-O-"+crypto.randomUUID()])).rows[0];
  await c.query("INSERT INTO evidences(student_id,target_type,target_id,direction,quality_score,independence_score,source,model_version) VALUES($1,'Knowledge',$2,'Positive',1,1,'Rule','recovery-test')",[s.student_id,k.knowledge_id]);
  const result=await new RecoveryIntegrityService(c).check();
  assert.equal(result.ok,false);
  assert.ok(Number(result.details.evidence.missing_validity)>=1);
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});
