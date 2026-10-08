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
 const tasks=[],knowledgeIds=[];
 for(let i=0;i<2;i++){
  const knowledge=(await pool.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Grammar',$1,$2) RETURNING knowledge_id",["S11B-"+randomUUID(),"browser grammar "+i])).rows[0];
  knowledgeIds.push(knowledge.knowledge_id);
  const task=(await pool.query("INSERT INTO daily_tasks(daily_plan_id,source_type,target_type,target_id,estimated_seconds,priority,sort_order,reason_code,status) VALUES($1,'Review','Knowledge',$2,180,90,$3,'DUE_REVIEW','Pending') RETURNING daily_task_id",[plan.daily_plan_id,knowledge.knowledge_id,i+1])).rows[0];
  const item=(await pool.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Published') RETURNING content_id")).rows[0];
  const version=(await pool.query("INSERT INTO content_versions(content_id,version_no,payload,answer_payload,explanation_payload,review_status,reviewed_by,reviewed_at,published_at) VALUES($1,1,$2,$3,$4,'Approved',$5,now(),now()) RETURNING content_version_id",[item.content_id,{stem:i===0?"My brother ___ football.":"She ___ to school.",options:i===0?["play","plays"]:["go","goes"]},{correct_index:1},{text:"Use third-person singular."},user.user_id])).rows[0];
  await pool.query("UPDATE content_items SET current_version_id=$2 WHERE content_id=$1",[item.content_id,version.content_version_id]);
  await pool.query("INSERT INTO content_knowledge(content_version_id,knowledge_id,role,weight,purpose,review_status) VALUES($1,$2,'PrimaryTested',1,'Learn','Approved')",[version.content_version_id,knowledge.knowledge_id]);
  tasks.push(task.daily_task_id);
 }
 return{studentId:student.student_id,userId:user.user_id,tasks,knowledgeIds};
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
 await page.getByText("开发联调身份模式",{exact:false}).waitFor();
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
 // A separate synthetic student verifies the real wrong-answer feedback boundary.
 const wrongFixture=await seed();
 const independentItem=(await pool.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Published') RETURNING content_id")).rows[0];
 const independent=(await pool.query("INSERT INTO content_versions(content_id,version_no,payload,answer_payload,explanation_payload,review_status,reviewed_by,reviewed_at,published_at) VALUES($1,1,$2,$3,$4,'Approved',$5,now(),now()) RETURNING content_version_id",[independentItem.content_id,{stem:"Tom ___ every day.",options:["walk","walks"]},{correct_index:1},{text:"third person -s"},wrongFixture.userId])).rows[0];
 await pool.query("UPDATE content_items SET current_version_id=$2 WHERE content_id=$1",[independentItem.content_id,independent.content_version_id]);
 await pool.query("UPDATE content_versions SET published_at=now()-interval '1 day' WHERE content_version_id=$1",[independent.content_version_id]);
 await pool.query("INSERT INTO content_knowledge(content_version_id,knowledge_id,role,weight,purpose,review_status) VALUES($1,$2,'PrimaryTested',1,'Learn','Approved')",[independent.content_version_id,wrongFixture.knowledgeIds[0]]);
 const wrongPage=await browser.newPage();
 const wrongErrors=[];wrongPage.on("pageerror",e=>wrongErrors.push(e.message));
 await wrongPage.goto(`http://127.0.0.1:${webPort}/?student=${wrongFixture.studentId}&user=${wrongFixture.userId}&date=${date}`);
 await wrongPage.getByRole("button",{name:"开始今日学习"}).click();
 await wrongPage.getByRole("heading",{name:"My brother ___ football."}).waitFor();
 await wrongPage.locator(".option").nth(0).click();
 await wrongPage.getByText("这里卡了一下").waitFor();
 await wrongPage.getByRole("button",{name:"回顾错题解析"}).click();
 await wrongPage.getByText("当前没有经过审核的独立确认题").waitFor();
 await wrongPage.getByRole("button",{name:"做一道独立确认练习"}).click();
 await wrongPage.getByRole("heading",{name:"Tom ___ every day."}).waitFor();
 await wrongPage.locator("[data-v-index]").nth(0).click();
 await wrongPage.getByText("这次作答已记录").waitFor();
 await wrongPage.getByText("错因待审查").waitFor();
 await wrongPage.getByText("已核验 1 条独立作答证据").waitFor();
 await wrongPage.getByText("尚不足以确认具体错因或判定掌握").waitFor();
 const graded=(await pool.query("SELECT result,exposure_type,content_version_id FROM question_attempts WHERE student_id=$1 AND exposure_type='Verification'",[wrongFixture.studentId])).rows;
 assert.equal(graded.length,1);assert.equal(graded[0].result,"Wrong");assert.equal(graded[0].content_version_id,independent.content_version_id);
 const linkedEvidence=(await pool.query("SELECT v.result,v.content_version_id,v.attempt_id FROM error_cause_verifications v JOIN question_attempts a ON a.attempt_id=v.attempt_id WHERE a.student_id=$1 AND a.exposure_type='Verification'",[wrongFixture.studentId])).rows;
 assert.equal(linkedEvidence.length,1);
 assert.equal(linkedEvidence[0].content_version_id,independent.content_version_id);
 assert.equal(linkedEvidence[0].result,null);
 const candidate=(await pool.query("SELECT h.error_cause_hypothesis_id FROM error_cause_hypotheses h JOIN error_observations o USING(error_observation_id) WHERE o.student_id=$1 ORDER BY h.created_at LIMIT 1",[wrongFixture.studentId])).rows[0];
 const statusResponse=await wrongPage.request.get(`http://127.0.0.1:${webPort}/api/v1/students/${wrongFixture.studentId}/feedback/causes/${candidate.error_cause_hypothesis_id}/evidence-status`,{headers:{"x-user-id":wrongFixture.userId}});
 assert.equal(statusResponse.status(),200);
 const statusBody=(await statusResponse.json()).data;
 assert.equal(statusBody.state,"PendingReview");
 assert.equal(statusBody.eligible_attempt_count,1);
 assert.equal(statusBody.wrong_count,1);
 assert.ok(statusBody.reasons.includes("CAUSE_ADJUDICATION_POLICY_NOT_APPROVED"));


 let feedbackRows=[];
 for(let i=0;i<40;i++){
  feedbackRows=(await pool.query("SELECT o.observation_type,h.status AS cause_status FROM error_observations o JOIN error_cause_hypotheses h USING(error_observation_id) WHERE o.student_id=$1",[wrongFixture.studentId])).rows;
  if(feedbackRows.length)break;
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.equal(feedbackRows.length,1,"wrong attempt must create one observation and one candidate hypothesis");
 assert.equal(feedbackRows[0].observation_type,"WrongAnswer");
 assert.equal(feedbackRows[0].cause_status,"Candidate");
 assert.equal(Number((await pool.query("SELECT count(*) AS n FROM micro_repair_tasks WHERE student_id=$1",[wrongFixture.studentId])).rows[0].n),0,"no repair without independently verified error cause");
 await wrongPage.getByRole("button",{name:"返回学习主线"}).click();
 await wrongPage.getByRole("heading",{name:"She ___ to school."}).waitFor();
 await wrongPage.locator(".option").nth(1).click();
 await wrongPage.getByText("答对了").waitFor();
 await wrongPage.getByRole("button",{name:"继续"}).click();
 await wrongPage.getByRole("heading",{name:"这一小段完成了"}).waitFor();
 const wrongAttempts=(await pool.query("SELECT result FROM question_attempts WHERE student_id=$1 AND daily_task_id IS NOT NULL ORDER BY occurred_at",[wrongFixture.studentId])).rows;
 assert.deepEqual(wrongAttempts.map(x=>x.result),["Wrong","Correct"]);
 await wrongPage.reload();
 await wrongPage.getByText("上次确认练习已保存 · 错因待审查").waitFor();
 await wrongPage.getByText("无需重复作答，继续今日学习即可。").waitFor();
 assert.equal(Number((await pool.query("SELECT count(*) n FROM question_attempts WHERE student_id=$1 AND exposure_type='Verification'",[wrongFixture.studentId])).rows[0].n),1);
 assert.equal(Number((await pool.query("SELECT count(*) AS n FROM daily_tasks t JOIN daily_plans p USING(daily_plan_id) WHERE p.student_id=$1 AND t.status='Completed'",[wrongFixture.studentId])).rows[0].n),2);
 assert.deepEqual(wrongErrors,[]);
 console.log("PASS real wrong answer: independent graded question saved; cause stays Candidate; no unverified repair; return to mainline");
 // Simulate the server persisting the answer while the browser loses the response.
 const recoveryFixture=await seed();
 const recoveryItem=(await pool.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Published') RETURNING content_id")).rows[0];
 const recoveryVersion=(await pool.query("INSERT INTO content_versions(content_id,version_no,payload,answer_payload,explanation_payload,review_status,reviewed_by,reviewed_at,published_at) VALUES($1,1,$2,$3,$4,'Approved',$5,now(),now()-interval '1 day') RETURNING content_version_id",[recoveryItem.content_id,{stem:"They ___ English.",options:["studies","study"]},{correct_index:1},{text:"plural verb"},recoveryFixture.userId])).rows[0];
 await pool.query("UPDATE content_items SET current_version_id=$2 WHERE content_id=$1",[recoveryItem.content_id,recoveryVersion.content_version_id]);
 await pool.query("INSERT INTO content_knowledge(content_version_id,knowledge_id,role,weight,purpose,review_status) VALUES($1,$2,'PrimaryTested',1,'Learn','Approved')",[recoveryVersion.content_version_id,recoveryFixture.knowledgeIds[0]]);
 const recoveryPage=await browser.newPage();
 const recoveryErrors=[];recoveryPage.on("pageerror",e=>recoveryErrors.push(e.message));
 await recoveryPage.goto(`http://127.0.0.1:${webPort}/?student=${recoveryFixture.studentId}&user=${recoveryFixture.userId}&date=${date}`);
 await recoveryPage.getByRole("button",{name:"开始今日学习"}).click();
 await recoveryPage.getByRole("heading",{name:"My brother ___ football."}).waitFor();
 await recoveryPage.locator(".option").nth(0).click();
 await recoveryPage.getByText("这里卡了一下").waitFor();
 await recoveryPage.getByRole("button",{name:"回顾错题解析"}).click();
 await recoveryPage.getByRole("button",{name:"做一道独立确认练习"}).click();
 await recoveryPage.getByRole("heading",{name:"They ___ English."}).waitFor();
 let intercepted=0;
 await recoveryPage.route("**/feedback/causes/*/question/answer",async(route)=>{
  if(intercepted++===0){const response=await route.fetch();assert.equal(response.status(),201);await route.abort("failed");return}
  await route.continue();
 });
 await recoveryPage.locator("[data-v-index]").nth(1).click();
 await recoveryPage.getByText("提交结果尚未确认").waitFor();
 const beforeReload=(await pool.query("SELECT attempt_id,request_id FROM question_attempts WHERE student_id=$1 AND exposure_type='Verification'",[recoveryFixture.studentId])).rows;
 assert.equal(beforeReload.length,1);
 await recoveryPage.reload();
 await recoveryPage.getByRole("button",{name:"开始今日学习"}).click();
 await recoveryPage.getByRole("heading",{name:"恢复确认练习"}).waitFor();
 await recoveryPage.getByRole("button",{name:"重试原确认题答案"}).click();
 await recoveryPage.getByRole("heading",{name:"确认练习已恢复"}).waitFor();
 const afterReload=(await pool.query("SELECT attempt_id,request_id FROM question_attempts WHERE student_id=$1 AND exposure_type='Verification'",[recoveryFixture.studentId])).rows;
 assert.deepEqual(afterReload,beforeReload);
 assert.equal(Number((await pool.query("SELECT count(*) AS n FROM error_cause_verifications v JOIN question_attempts a ON a.attempt_id=v.attempt_id WHERE a.student_id=$1",[recoveryFixture.studentId])).rows[0].n),1);
 assert.deepEqual(recoveryErrors,[]);
 console.log("PASS confirmation recovery: lost HTTP acknowledgement -> reload -> same-key replay -> one attempt and one evidence");


}finally{await browser?.close();for(const child of children)child.kill("SIGTERM");await pool.end()}
