import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {PostgresStore} from "../src/repositories/postgres.js";
import {PostgresIdempotencyStore} from "../src/idempotency-postgres.js";

const enabled=Boolean(process.env.TEST_DATABASE_URL);
const it=enabled?test:test.skip;

it("rolls back curriculum business write when idempotency record cannot commit",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 try{
  const student=(await p.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('idem-crash','Primary',5) RETURNING student_id")).rows[0];
  const store=new PostgresStore(p),idem=new PostgresIdempotencyStore(p);
  idem.put=async()=>{throw new Error("simulated idempotency persistence failure");};
  await assert.rejects(
   ()=>idem.run(`curriculum:${student.student_id}`,"crash-window",client=>store.setPosition(student.student_id,{progress_note:"Unit 2"},client)),
   /simulated idempotency persistence failure/
  );
  const positions=(await p.query("SELECT count(*)::int n FROM curriculum_positions WHERE student_id=$1",[student.student_id])).rows[0];
  assert.equal(positions.n,0);
 }finally{await p.end();}
});

it("commits curriculum position and idempotency response atomically and reuses it",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 try{
  const student=(await p.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('idem-ok','Primary',5) RETURNING student_id")).rows[0];
  const store=new PostgresStore(p),idem=new PostgresIdempotencyStore(p),scope=`curriculum:${student.student_id}`;
  const first=await idem.run(scope,"same-key",client=>store.setPosition(student.student_id,{progress_note:"Unit 3"},client));
  const second=await idem.run(scope,"same-key",client=>store.setPosition(student.student_id,{progress_note:"SHOULD NOT WRITE"},client));
  assert.equal(first.reused,false);
  assert.equal(second.reused,true);
  assert.equal(second.value.position_id,first.value.position_id);
  const positions=(await p.query("SELECT progress_note FROM curriculum_positions WHERE student_id=$1",[student.student_id])).rows;
  assert.equal(positions.length,1);
  assert.equal(positions[0].progress_note,"Unit 3");
 }finally{await p.end();}
});
