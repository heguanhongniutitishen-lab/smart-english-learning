import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {StateEngine} from "../src/state-engine.js";
import {StateReplayService} from "../src/state-replay.js";
import {ReviewPlanner} from "../src/review-planner.js";

const it=process.env.TEST_DATABASE_URL?test:test.skip;

it("replaying identical durable evidence restores review and leaves projections byte-for-byte stable",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 try{
  const s=(await p.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('s9-replay-consistency','Primary',5) RETURNING student_id")).rows[0];
  const k=(await p.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Vocabulary',$1,'replay consistency k') RETURNING knowledge_id",["S9-RK-"+crypto.randomUUID()])).rows[0];
  const a=(await p.query("INSERT INTO abilities(domain,code,name,status) VALUES('Vocabulary',$1,'replay consistency a','Active') RETURNING ability_id",["S9-RA-"+crypto.randomUUID()])).rows[0];
  for(const [type,id,dir,days] of [["Knowledge",k.knowledge_id,"Positive",2],["Knowledge",k.knowledge_id,"Positive",1],["Ability",a.ability_id,"Positive",2],["Ability",a.ability_id,"Negative",1]]){
   const e=(await p.query("INSERT INTO evidences(student_id,target_type,target_id,direction,quality_score,independence_score,confidence_delta,source,model_version,created_at) VALUES($1,$2,$3,$4,0.9,0.9,$5,'Rule','replay-fixture',now()-($6::int*interval '1 day')) RETURNING evidence_id",[s.student_id,type,id,dir,dir==="Positive"?0.81:-0.81,days])).rows[0];
   await p.query("INSERT INTO evidence_validity(evidence_id,status) VALUES($1,'Valid')",[e.evidence_id]);
  }
  const engine=new StateEngine(p,"state-rules-v1",{reviewPlanner:new ReviewPlanner(p)});
  const replay=new StateReplayService(p,engine);
  await replay.rebuildStudent(s.student_id);
  const firstMastery=(await p.query("SELECT mastery_state,confidence,last_evidence_at,last_verified_at,next_review_at,evidence_count,model_version,state_version,updated_at FROM mastery_records WHERE student_id=$1 AND knowledge_id=$2",[s.student_id,k.knowledge_id])).rows[0];
  const firstAbility=(await p.query("SELECT level_score,confidence,evidence_count,model_version,state_version,updated_at FROM ability_states WHERE student_id=$1 AND ability_id=$2",[s.student_id,a.ability_id])).rows[0];
  assert.ok(firstMastery.next_review_at);

  await new Promise(r=>setTimeout(r,10));
  await replay.rebuildStudent(s.student_id);
  const secondMastery=(await p.query("SELECT mastery_state,confidence,last_evidence_at,last_verified_at,next_review_at,evidence_count,model_version,state_version,updated_at FROM mastery_records WHERE student_id=$1 AND knowledge_id=$2",[s.student_id,k.knowledge_id])).rows[0];
  const secondAbility=(await p.query("SELECT level_score,confidence,evidence_count,model_version,state_version,updated_at FROM ability_states WHERE student_id=$1 AND ability_id=$2",[s.student_id,a.ability_id])).rows[0];

  assert.deepEqual(secondMastery,firstMastery);
  assert.deepEqual(secondAbility,firstAbility);
 }finally{await p.end();}
});
