import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {randomUUID} from "node:crypto";
import pg from "pg";
import {chromium} from "playwright";
if(!process.env.TEST_DATABASE_URL)throw Error("TEST_DATABASE_URL is required for authenticated API browser acceptance");
const date="2026-10-08",apiPort=4322,webPort=4323;
const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
const children=[];let browser;
function runProcess(args,env){const child=spawn(process.execPath,args,{cwd:new URL("../",import.meta.url),env:{...process.env,...env},stdio:"ignore"});children.push(child);return child}
async function ready(url){for(let i=0;i<90;i++){try{const r=await fetch(url);if(r.status<500)return}catch{}await new Promise(r=>setTimeout(r,150))}throw Error("test server did not become ready: "+url)}
async function seed(){
 const user=(await pool.query("INSERT INTO users(status) VALUES('Active') RETURNING user_id")).rows[0];
 const student=(await pool.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('browser-api-fixture','Primary',5) RETURNING student_id")).rows[0];
 await pool.query("INSERT INTO student_user_bindings(student_id,user_id,role,status) VALUES($1,$2,'Student','Active')",[student.student_id,user.user_id]);
 const plan=(await pool.query("INSERT INTO daily_plans(student_id,plan_date,version,status,available_minutes,strategy_version) VALUES($1,$2,1,'Active',20,'browser-e2e@1') RETURNING daily_plan_id",[student.student_id,date])).rows[0];
 const tasks=[];
 for(let i=0;i<2;i++){
  const knowledge=(await pool.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Grammar',$1,$2) RETURNING knowledge_id",["S11B-"+randomUUID(),"browser grammar "+i])).rows[0];
  const task=(await pool.query("INSERT INTO daily_tasks(daily_plan_id,source_type,target_type,target_id,estimated_seconds,priority,sort_order,reason_code,status) VALUES($1,'Review','Knowledge',$2,180,90,$3,'DUE_REVIEW','Pending') RETURNING daily_task_id",[plan.daily_plan_id,knowledge.knowledge_id,i+1])).rows[0];
  const item=(await pool.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Published') RETURNING content_id")).rows[0];
  const version=(await pool.query("INSERT INTO content_versions(content_id,version_no,payload,answer_payload,explanation_payload,review_status,reviewed_by,reviewed_at,published_at) VALUES($1,1,$2,$3,$4,'Approved',$5,now(),now()) RETURNING content_version_id",[item.content_id,{stem:i===0?"My brother ___ football.":"She ___ to school.",options:i===0?["play","plays"]:["go","goes"]},{correct_index:1},{text:"Use third-person singular."},user.user_id])).rows[0];
  await pool.query("UPDATE content_items SET current_version_id=$2 WHERE content_id=$1",[item.content_id,version.content_version_id]);
  await pool.query("INSERT INTO content_knowledge(content_version_id,knowledge_id,role,weight,purpose,review_status) VALUES($1,$2,'PrimaryTested',1,'Learn','Approved')",[version.content_version_id,knowledge.knowledge_id]);
  tasks.push(task.daily_task_id);
 }
 return{studentId:student.student_id,userId:user.user_id,tasks};
}
try{
 const fixture=await seed();
 runProcess(["../api/src/server.js"],{PORT:String(apiPort),DATABASE_URL:process.env.TEST_DATABASE_URL});
 await ready(`http://127.0.0.1:${apiPort}/health`);
 runProcess(["server.js"],{STUDENT_WEB_PORT:String(webPort),STUDENT_API_ORIGIN:`http://127.0.0.1:${apiPort}`});
 await ready(`http://127.0.0.1:${webPort}/`);
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${webPort}/?student=${fixture.studentId}&user=${fixture.userId}&date=${date}`);
 await page.getByText("待学习",{exact:true}).first().waitFor();
 await page.getByRole("button",{name:"开始今日学习"}).click();
 await page.getByRole("heading",{name:"My brother ___ football."}).waitFor();
 await page.locator(".option").nth(1).click();
 await page.getByText("答对了").waitFor();
 await page.getByRole("button",{name:"继续"}).click();
 await page.getByRole("heading",{name:"She ___ to school."}).waitFor();
 await page.locator(".option").nth(1).click();
 await page.getByText("答对了").waitFor();
 await page.getByRole("button",{name:"继续"}).click();
 await page.getByRole("heading",{name:"这一小段完成了"}).waitFor();
 const attempts=(await pool.query("SELECT daily_task_id,result,request_id FROM question_attempts WHERE student_id=$1 ORDER BY occurred_at",[fixture.studentId])).rows;
 assert.equal(attempts.length,2);
 assert.deepEqual(new Set(attempts.map(a=>a.daily_task_id)),new Set(fixture.tasks));
 assert.ok(attempts.every(a=>a.result==="Correct"));
 const tasks=(await pool.query("SELECT daily_task_id,status FROM daily_tasks WHERE daily_task_id=ANY($1::uuid[])",[fixture.tasks])).rows;
 assert.ok(tasks.every(t=>t.status==="Completed"));
 const eventCount=Number((await pool.query("SELECT count(*) AS n FROM outbox_events WHERE event_type='AttemptRecorded' AND aggregate_id=ANY($1::uuid[])",[(await pool.query("SELECT attempt_id FROM question_attempts WHERE student_id=$1",[fixture.studentId])).rows.map(x=>x.attempt_id)])).rows[0].n);
 assert.equal(eventCount,2);
 assert.deepEqual(errors,[]);
 console.log("PASS authenticated browser API: 2 approved questions -> 2 correct attempts -> 2 completed tasks -> 2 outbox events");
}finally{await browser?.close();for(const child of children)child.kill("SIGTERM");await pool.end()}
