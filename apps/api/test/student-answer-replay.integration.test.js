import test from "node:test";import assert from "node:assert/strict";import pg from "pg";
import {StudentAnswerService} from "../src/student-answer-service.js";
import {LearningPostgresRepository} from "../src/repositories/learning-postgres.js";
const it=process.env.TEST_DATABASE_URL?test:test.skip;
it("replays the same persisted answer after its task is no longer Pending, rejecting changed payload",async()=>{
 const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 try{
 const reviewer=(await pool.query("INSERT INTO users(status) VALUES('Active') RETURNING user_id")).rows[0];
 const student=(await pool.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('replay-test','Primary',5) RETURNING student_id")).rows[0];
 const k=(await pool.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Grammar',$1,'replay knowledge') RETURNING knowledge_id",["REPLAY-"+crypto.randomUUID()])).rows[0];
 const plan=(await pool.query("INSERT INTO daily_plans(student_id,plan_date,version,status,available_minutes,strategy_version) VALUES($1,'2026-10-08',1,'Active',20,'s11@1') RETURNING daily_plan_id",[student.student_id])).rows[0];
 const task=(await pool.query("INSERT INTO daily_tasks(daily_plan_id,source_type,target_type,target_id,estimated_seconds,priority,sort_order,reason_code,status) VALUES($1,'Review','Knowledge',$2,180,90,1,'DUE_REVIEW','Pending') RETURNING daily_task_id",[plan.daily_plan_id,k.knowledge_id])).rows[0];
 const item=(await pool.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Published') RETURNING content_id")).rows[0];
 const v=(await pool.query("INSERT INTO content_versions(content_id,version_no,payload,answer_payload,explanation_payload,review_status,reviewed_by,reviewed_at,published_at) VALUES($1,1,$2,$3,$4,'Approved',$5,now(),now()) RETURNING content_version_id",[item.content_id,{stem:"He ___",options:["go","goes"]},{correct_index:1},{text:"goes is correct"},reviewer.user_id])).rows[0];
 await pool.query("UPDATE content_items SET current_version_id=$2 WHERE content_id=$1",[item.content_id,v.content_version_id]);
 await pool.query("INSERT INTO content_knowledge(content_version_id,knowledge_id,role,weight,purpose,review_status) VALUES($1,$2,'PrimaryTested',1,'Learn','Approved')",[v.content_version_id,k.knowledge_id]);
 const svc=new StudentAnswerService(pool,new LearningPostgresRepository(pool)),input={daily_task_id:task.daily_task_id,content_version_id:v.content_version_id,answer_payload:{choice_index:1}};
 const requestId="answer-replay-"+crypto.randomUUID();
 const concurrent=await Promise.all([svc.submit(student.student_id,input,requestId),svc.submit(student.student_id,input,requestId)]);
 const first=concurrent[0];assert.equal(concurrent[1].attempt_id,first.attempt_id);
 assert.equal(first.result,"Correct");
 const conflictingKey="answer-conflict-"+crypto.randomUUID();
 const conflicting=await Promise.allSettled([svc.submit(student.student_id,input,conflictingKey),svc.submit(student.student_id,{...input,answer_payload:{choice_index:0}},conflictingKey)]);
 assert.equal(conflicting.filter(x=>x.status==="fulfilled").length,1);
 assert.equal(conflicting.filter(x=>x.status==="rejected"&&x.reason?.code==="STUDENT_ANSWER_IDEMPOTENCY_CONFLICT").length,1);
 const conflictingAttempts=await pool.query("SELECT count(*)::int AS n FROM question_attempts WHERE student_id=$1 AND request_id=$2",[student.student_id,conflictingKey]);
 assert.equal(conflictingAttempts.rows[0].n,1);
 const conflictEvents=await pool.query("SELECT count(*)::int AS n FROM outbox_events o JOIN question_attempts a ON a.attempt_id=o.aggregate_id WHERE a.student_id=$1 AND a.request_id=$2 AND o.event_type='AttemptRecorded'",[student.student_id,conflictingKey]);
 assert.equal(conflictEvents.rows[0].n,1);
 await pool.query("UPDATE daily_tasks SET status='Completed' WHERE daily_task_id=$1",[task.daily_task_id]);
 const replay=await svc.submit(student.student_id,{...input,answer_payload:{choice_index:1}},requestId);
 assert.equal(replay.attempt_id,first.attempt_id);assert.equal(replay.explanation_payload.text,"goes is correct");
 await assert.rejects(()=>svc.submit(student.student_id,{...input,answer_payload:{choice_index:0}},requestId),e=>e.code==="STUDENT_ANSWER_IDEMPOTENCY_CONFLICT"&&e.status===409);
 await assert.rejects(()=>svc.submit(student.student_id,{...input,daily_task_id:crypto.randomUUID()},requestId),e=>e.code==="STUDENT_ANSWER_IDEMPOTENCY_CONFLICT"&&e.status===409);
 await assert.rejects(()=>svc.submit(student.student_id,{...input,content_version_id:crypto.randomUUID()},requestId),e=>e.code==="STUDENT_ANSWER_IDEMPOTENCY_CONFLICT"&&e.status===409);
 assert.equal(Number((await pool.query("SELECT count(*) AS n FROM question_attempts WHERE student_id=$1 AND request_id=$2",[student.student_id,requestId])).rows[0].n),1);
 assert.equal(Number((await pool.query("SELECT count(*) AS n FROM outbox_events WHERE aggregate_id=$1 AND event_type='AttemptRecorded'",[first.attempt_id])).rows[0].n),1);
 }finally{await pool.end()}
});
