import test from"node:test";import assert from"node:assert/strict";import pg from"pg";import{StudentTaskContentReadModel}from"../src/student-task-content-read-model.js";
const it=process.env.TEST_DATABASE_URL?test:test.skip;
it("serves only current human-approved published content mapped to the active task target",async()=>{const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});try{
 const reviewer=(await p.query("INSERT INTO users(status) VALUES('Active') RETURNING user_id")).rows[0];
 const student=(await p.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('s11-content','Primary',5) RETURNING student_id")).rows[0];
 const k=(await p.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Grammar',$1,'third person singular') RETURNING knowledge_id",["S11-"+crypto.randomUUID()])).rows[0];
 const plan=(await p.query("INSERT INTO daily_plans(student_id,plan_date,version,status,available_minutes,strategy_version) VALUES($1,'2026-10-07',1,'Active',20,'s11@1') RETURNING daily_plan_id",[student.student_id])).rows[0];
 const task=(await p.query("INSERT INTO daily_tasks(daily_plan_id,source_type,target_type,target_id,estimated_seconds,priority,sort_order,reason_code,status) VALUES($1,'Review','Knowledge',$2,180,90,1,'DUE_REVIEW','Pending') RETURNING daily_task_id",[plan.daily_plan_id,k.knowledge_id])).rows[0];
 const item=(await p.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Published') RETURNING content_id")).rows[0];
 const draft=(await p.query("INSERT INTO content_versions(content_id,version_no,payload,answer_payload,review_status) VALUES($1,1,$2,$3,'Draft') RETURNING content_version_id",[item.content_id,{stem:"draft"},{correct_index:0}])).rows[0];
 await p.query("UPDATE content_items SET current_version_id=$2 WHERE content_id=$1",[item.content_id,draft.content_version_id]);
 await p.query("INSERT INTO content_knowledge(content_version_id,knowledge_id,role,weight,purpose,review_status) VALUES($1,$2,'PrimaryTested',1,'Learn','Approved')",[draft.content_version_id,k.knowledge_id]);
 const model=new StudentTaskContentReadModel(p);let view=await model.forTask(student.student_id,task.daily_task_id);assert.equal(view.content,null);assert.equal(view.reason,"NO_APPROVED_PUBLISHED_CONTENT");
 const approved=(await p.query("INSERT INTO content_versions(content_id,version_no,payload,answer_payload,explanation_payload,review_status,reviewed_by,reviewed_at,published_at) VALUES($1,2,$2,$3,$4,'Approved',$5,now(),now()) RETURNING content_version_id",[item.content_id,{stem:"My brother ___ football.",options:["play","plays"]},{correct_index:1},{text:"third-person singular"},reviewer.user_id])).rows[0];
 await p.query("INSERT INTO content_knowledge(content_version_id,knowledge_id,role,weight,purpose,review_status) VALUES($1,$2,'PrimaryTested',1,'Learn','Approved')",[approved.content_version_id,k.knowledge_id]);await p.query("UPDATE content_items SET current_version_id=$2 WHERE content_id=$1",[item.content_id,approved.content_version_id]);
 view=await model.forTask(student.student_id,task.daily_task_id);assert.equal(view.content.content_version_id,approved.content_version_id);assert.equal(view.content.payload.stem,"My brother ___ football.");
}finally{await p.end();}});
