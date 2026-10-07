import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {PilotCohortService} from "../src/pilot-cohort-service.js";
import {requirePilotAdminRole} from "../src/authz.js";
const it=process.env.TEST_DATABASE_URL?test:test.skip;

it("creates a minimal cohort and enrolls a student without exposing display name",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 const c=await p.connect();
 try{
  await c.query("BEGIN");
  const actor=(await c.query("INSERT INTO users(status) VALUES('Active') RETURNING user_id")).rows[0].user_id;
  const student=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('private-name','Primary',5) RETURNING student_id")).rows[0].student_id;
  const svc=new PilotCohortService(c);
  const cohort=await svc.create({cohort_code:"P0-"+crypto.randomUUID(),name:"Pilot 0"},actor);
  await svc.enroll(cohort.cohort_id,student,actor);
  const rows=await svc.listMembers(cohort.cohort_id);
  assert.equal(rows.length,1);assert.equal(rows[0].student_id,student);assert.equal(rows[0].current_grade,5);assert.equal("display_name" in rows[0],false);
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});

test("Pilot admin boundary allows only PlatformAdmin and ResearchAdmin",async()=>{
 for(const role of ["PlatformAdmin","ResearchAdmin"])await assert.doesNotReject(()=>requirePilotAdminRole({listUserRoles:async()=>[role]},"u"));
 for(const role of ["ResearchEditor","ResearchReviewer"])await assert.rejects(()=>requirePilotAdminRole({listUserRoles:async()=>[role]},"u"),x=>x.code==="AUTH_PILOT_ADMIN_FORBIDDEN");
});


it("does not reactivate a terminal Pilot membership in place",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}),c=await p.connect();
 try{await c.query("BEGIN");
  const s=(await c.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('history-private','Primary',5) RETURNING student_id")).rows[0].student_id;
  const service=new PilotCohortService(c),cohort=await service.create({cohort_code:"HIST-"+crypto.randomUUID(),name:"history"},null);
  await service.enroll(cohort.cohort_id,s,null);await service.endMembership(cohort.cohort_id,s,"Completed");
  await c.query("SAVEPOINT duplicate_membership");
  await assert.rejects(()=>service.enroll(cohort.cohort_id,s,null),e=>e.code==="PILOT_MEMBERSHIP_EXISTS"&&e.status===409);
  await c.query("ROLLBACK TO SAVEPOINT duplicate_membership");
  const rows=await service.listMembers(cohort.cohort_id,{});assert.equal(rows.length,1);assert.equal(rows[0].status,"Completed");assert.ok(rows[0].ended_at);
 }finally{await c.query("ROLLBACK");c.release();await p.end();}
});
