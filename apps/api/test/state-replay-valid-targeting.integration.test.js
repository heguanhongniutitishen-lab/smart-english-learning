import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {StateReplayService} from "../src/state-replay.js";

const it=process.env.TEST_DATABASE_URL?test:test.skip;

it("batch replay selects only students that still have valid evidence",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 try{
  async function fixture(name,status){
   const s=(await p.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES($1,'Primary',5) RETURNING student_id",[name])).rows[0];
   const k=(await p.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Vocabulary',$1,$2) RETURNING knowledge_id",["BATCH-"+crypto.randomUUID(),name])).rows[0];
   const e=(await p.query("INSERT INTO evidences(student_id,target_type,target_id,direction,quality_score,independence_score,source,model_version) VALUES($1,'Knowledge',$2,'Positive',1,1,'Rule','batch-test') RETURNING evidence_id",[s.student_id,k.knowledge_id])).rows[0];
   await p.query("INSERT INTO evidence_validity(evidence_id,status) VALUES($1,$2)",[e.evidence_id,status]);
   return s.student_id;
  }
  const validStudent=await fixture("batch-valid","Valid");
  const invalidStudent=await fixture("batch-invalid","Invalid");
  const seen=[];
  const replay=new StateReplayService(p,{rebuildKnowledgeAndReview:async(studentId)=>{seen.push(studentId);return{};},rebuildAbility:async()=>({})});
  const result=await replay.rebuildAll({limit:10000});
  assert.ok(result.students.some(x=>x.student_id===validStudent));
  assert.equal(result.students.some(x=>x.student_id===invalidStudent),false);
  assert.ok(seen.includes(validStudent));
  assert.equal(seen.includes(invalidStudent),false);
 }finally{await p.end();}
});
