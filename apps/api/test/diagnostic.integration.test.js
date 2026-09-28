import test from "node:test";import assert from "node:assert/strict";import pg from "pg";import {DiagnosticPolicyService,DiagnosticSessionService} from "../src/diagnostic-service.js";
const enabled=Boolean(process.env.TEST_DATABASE_URL);const it=enabled?test:test.skip;
it("diagnostic policy resolves by stage and grade and active session is reused",async()=>{const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});try{const s=(await p.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('diag','Primary',5) RETURNING student_id")).rows[0];const ps=new DiagnosticPolicyService(p),ss=new DiagnosticSessionService(p,ps);const policy=await ps.resolve(s.student_id);assert.equal(policy.policy_key,"primary-upper-v1");const a=await ss.start(s.student_id),b=await ss.start(s.student_id);assert.equal(a.reused,false);assert.equal(b.reused,true);assert.equal(a.session.diagnostic_session_id,b.session.diagnostic_session_id);const done=await ss.complete(a.session.diagnostic_session_id);assert.equal(done.status,"Completed");}finally{await p.end();}});

import {DiagnosticSelector} from "../src/diagnostic-selector.js";
it("concurrent diagnostic next calls reuse exactly one unanswered item",async()=>{const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});try{
 const s=(await p.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('diag-concurrent','Primary',5) RETURNING student_id")).rows[0];
 const a=(await p.query("INSERT INTO abilities(domain,code,name,stage_min,stage_max) VALUES('Vocabulary',$1,'Diagnostic vocabulary','Primary','Middle') RETURNING ability_id",["DV-"+crypto.randomUUID()])).rows[0];
 const ci=(await p.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Draft') RETURNING content_id")).rows[0];
 const cv=(await p.query("INSERT INTO content_versions(content_id,version_no,payload,difficulty_label,review_status,published_at) VALUES($1,1,$2,'Q3','Approved',now()) RETURNING content_version_id",[ci.content_id,{stem:"diagnostic"}])).rows[0];
 await p.query("UPDATE content_items SET current_version_id=$2,status='Published' WHERE content_id=$1",[ci.content_id,cv.content_version_id]);
 await p.query("INSERT INTO content_ability(content_version_id,ability_id,weight,purpose) VALUES($1,$2,1,'Diagnostic')",[cv.content_version_id,a.ability_id]);
 const ps=new DiagnosticPolicyService(p),ss=new DiagnosticSessionService(p,ps),selector=new DiagnosticSelector(p);const started=await ss.start(s.student_id);
 const [one,two]=await Promise.all([selector.next(started.session.diagnostic_session_id),selector.next(started.session.diagnostic_session_id)]);
 assert.equal(one.item.diagnostic_item_id,two.item.diagnostic_item_id);assert.equal([one.reused,two.reused].filter(Boolean).length,1);
 const rows=(await p.query("SELECT * FROM diagnostic_items WHERE diagnostic_session_id=$1 AND answered_attempt_id IS NULL",[started.session.diagnostic_session_id])).rows;assert.equal(rows.length,1);assert.equal(rows[0].sequence_no,1);
}finally{await p.end();}});
