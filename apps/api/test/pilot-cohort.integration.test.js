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
