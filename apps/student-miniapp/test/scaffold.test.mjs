import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");
test("native miniapp has valid entry and home page declarations",()=>{
 const app=JSON.parse(read("app.json"));
 const project=JSON.parse(read("project.config.json"));
 assert.ok(app.pages.includes("pages/home/index"));
 assert.equal(project.compileType,"miniprogram");
 JSON.parse(read("pages/home/index.json"));
 const markup=read("pages/home/index.wxml");
 for(const phrase of ["今日学习计划","今天学什么","学习成长","学习目标","你最近更需要关注"]){
  assert.ok(markup.includes(phrase),phrase);
 }
 for(const stage of ["Primary","Middle","High"]){
  assert.ok(read("pages/home/index.wxss").includes(".stage-"+stage),stage);
  assert.ok(read("pages/home/index.js").includes(stage),stage);
 }
});
test("miniapp does not claim playable learning before verified auth/recovery",()=>{
 const page=read("pages/home/index.js");
 assert.match(page,/canStart:false/);
 assert.match(page,/auth\?\.token/);
 assert.doesNotMatch(page,/x-user-id/i);
 assert.doesNotMatch(page,/mastery.*\d+%/i);
 assert.match(page,/startLearning\(\)/);
});

test("native WeChat authentication uses server code exchange and never client openid",()=>{
 const app=read("app.js");
 const home=read("pages/home/index.js");
 const markup=read("pages/home/index.wxml");
 assert.match(app,/wx\.login\(/);
 assert.match(app,/\/api\/v1\/auth\/wechat\/code-exchange/);
 assert.match(app,/expiresAt/);
 assert.match(app,/studentId:null/);
 assert.doesNotMatch(app,/x-user-id|open_id\s*:/);
 assert.match(markup,/bindtap="login"/);
 assert.match(home,/loginWithWechat\(\)/);
 assert.match(home,/Date\.now\(\)>=auth\.expiresAt/);
 assert.match(home,/canStart:false/);
});

test("student switch requires server roster and discards stale learner state",()=>{
 const home=read("pages/home/index.js");
 const markup=read("pages/home/index.wxml");
 assert.match(markup,/bindtap="chooseStudent"/);
 assert.match(markup,/bindtap="switchStudent"/);
 assert.match(home,/\/api\/v1\/students\/me\/bindings/);
 assert.match(home,/this\.data\.boundStudents\.find/);
 assert.match(home,/this\.data\.boundStudents\.some/);
 assert.match(home,/tasks:\[\],completedText:"--"/);
 assert.match(home,/getApp\(\)\.globalData\.auth\?\.studentId!==auth\.studentId/);
 assert.match(home,/getApp\(\)\.globalData\.auth\?\.studentId!==decodeURIComponent\(id\)/);
});
