import test from "node:test";import assert from "node:assert/strict";import {createResearchHandler} from "../src/research-routes.js";
function response(){return {statusCode:0,headers:{},writeHead(status,headers={}){this.statusCode=status;Object.assign(this.headers,headers);},end(v){this.body=v;}};}
const roles={listUserRoles:async()=>["ResearchAdmin"]};
test("research routes reject missing actor",async()=>{const h=createResearchHandler({...roles});const res=response();await assert.rejects(()=>h({method:"POST",headers:{},url:""},res,new URL("http://x/api/v1/research/knowledge-points"),"r1"),x=>x.code==="AUTH_REQUIRED");});
test("knowledge creation validates required fields",async()=>{const h=createResearchHandler({...roles,createKnowledge:async x=>x});const req={method:"POST",headers:{"x-user-id":"u1"},[Symbol.asyncIterator]:async function*(){yield Buffer.from('{"code":"K1"}');}};const res=response();await h(req,res,new URL("http://x/api/v1/research/knowledge-points"),"r1");assert.equal(res.statusCode,400);assert.equal(JSON.parse(res.body).error.code,"KNOWLEDGE_INVALID");});
test("valid knowledge reaches repository",async()=>{let saved=null;const h=createResearchHandler({...roles,createKnowledge:async x=>(saved=x,{knowledge_point_id:"k1",...x})});const req={method:"POST",headers:{"x-user-id":"u1"},[Symbol.asyncIterator]:async function*(){yield Buffer.from('{"code":"K1","name":"be verb","domain":"Grammar","stage":"Primary"}');}};const res=response();await h(req,res,new URL("http://x/api/v1/research/knowledge-points"),"r2");assert.equal(res.statusCode,201);assert.equal(saved.code,"K1");});


test("reliability ops route requires student-state role and returns operational snapshot",async()=>{
 const repo={listUserRoles:async()=>["ResearchAdmin","ResearchStudentState"]};
 const reliabilityOps={get:async()=>({outbox:{ready:2,delayed:1,dead_letter:0},recalculation:{ready:1}})};
 const h=createResearchHandler(repo,{reliabilityOps});
 const req={method:"GET",headers:{"x-user-id":"u1"}},res=response();
 await h(req,res,new URL("http://x/api/v1/research/ops/reliability"),"ops-1");
 assert.equal(res.statusCode,200);
 const body=JSON.parse(res.body);
 assert.equal(body.data.outbox.ready,2);
 assert.equal(body.data.recalculation.ready,1);
});

test("reliability ops route rejects research actor without student-state permission",async()=>{
 const repo={listUserRoles:async()=>["ResearchEditor"]};
 const h=createResearchHandler(repo,{reliabilityOps:{get:async()=>({})}});
 const req={method:"GET",headers:{"x-user-id":"u1"}},res=response();
 await assert.rejects(()=>h(req,res,new URL("http://x/api/v1/research/ops/reliability"),"ops-2"),x=>x.code==="AUTH_STUDENT_STATE_FORBIDDEN");
});


test("recovery readiness route returns integrity verdict for authorized ops actor",async()=>{
 const repo={listUserRoles:async()=>["ResearchAdmin"]};
 const recoveryIntegrity={check:async()=>({ok:false,blockers:2,details:{mastery:{missing_projection:2}}})};
 const h=createResearchHandler(repo,{recoveryIntegrity});
 const req={method:"GET",headers:{"x-user-id":"u1"}},res=response();
 await h(req,res,new URL("http://x/api/v1/research/ops/recovery-readiness"),"rec-1");
 assert.equal(res.statusCode,200);
 const body=JSON.parse(res.body);
 assert.equal(body.data.ready,false);assert.equal(body.data.blockers,2);
});

test("recovery readiness route rejects actor without student-state permission",async()=>{
 const repo={listUserRoles:async()=>["ResearchEditor"]};
 const h=createResearchHandler(repo,{recoveryIntegrity:{check:async()=>({ok:true,blockers:0,details:{}})}});
 const req={method:"GET",headers:{"x-user-id":"u1"}},res=response();
 await assert.rejects(()=>h(req,res,new URL("http://x/api/v1/research/ops/recovery-readiness"),"rec-2"),x=>x.code==="AUTH_STUDENT_STATE_FORBIDDEN");
});


function jsonReq(method,path,body,role="ResearchAdmin"){return {req:{method,headers:{"x-user-id":"u1"},[Symbol.asyncIterator]:async function*(){if(body!==undefined)yield Buffer.from(JSON.stringify(body));}},url:new URL("http://x"+path),repo:{listUserRoles:async()=>[role]}};}

test("Pilot cohort API is restricted to Pilot admins and supports lifecycle",async()=>{
 const calls=[];const pilotCohorts={
  create:async(b,a)=>(calls.push(["create",b,a]),{cohort_id:"c1",...b}),
  enroll:async(c,s,a)=>(calls.push(["enroll",c,s,a]),{cohort_id:c,student_id:s,status:"Enrolled"}),
  listMembers:async(c,q)=>(calls.push(["list",c,q]),[{student_id:"s1",status:"Enrolled"}]),
  endMembership:async(c,s,status)=>(calls.push(["end",c,s,status]),{cohort_id:c,student_id:s,status})
 };
 let x=jsonReq("POST","/api/v1/research/pilot/cohorts",{cohort_code:"P0",name:"Pilot 0"});let h=createResearchHandler(x.repo,{pilotCohorts}),res=response();await h(x.req,res,x.url,"p1");assert.equal(res.statusCode,201);
 x=jsonReq("POST","/api/v1/research/pilot/cohorts/c1/members",{student_id:"s1"});h=createResearchHandler(x.repo,{pilotCohorts});res=response();await h(x.req,res,x.url,"p2");assert.equal(res.statusCode,201);
 x=jsonReq("GET","/api/v1/research/pilot/cohorts/c1/members?limit=20&offset=0");h=createResearchHandler(x.repo,{pilotCohorts});res=response();await h(x.req,res,x.url,"p3");assert.equal(JSON.parse(res.body).data[0].student_id,"s1");
 x=jsonReq("POST","/api/v1/research/pilot/cohorts/c1/members/s1/end",{status:"Completed"});h=createResearchHandler(x.repo,{pilotCohorts});res=response();await h(x.req,res,x.url,"p4");assert.equal(JSON.parse(res.body).data.status,"Completed");
 assert.equal(calls.length,4);
});

test("Pilot cohort API rejects ResearchEditor",async()=>{
 const x=jsonReq("GET","/api/v1/research/pilot/cohorts/c1/members",undefined,"ResearchEditor"),h=createResearchHandler(x.repo,{pilotCohorts:{listMembers:async()=>[]}});
 await assert.rejects(()=>h(x.req,response(),x.url,"p5"),e=>e.code==="AUTH_PILOT_ADMIN_FORBIDDEN");
});


test("Pilot measurement API forwards explicit period and remains Pilot-admin only",async()=>{
 let seen=null;const pilotMeasurement={baseline:async(c,q)=>(seen={c,q},{semantics:{measurement:"operational_baseline_not_validated_learning_impact"},data_completeness:{complete:true}})};
 let x=jsonReq("GET","/api/v1/research/pilot/cohorts/c1/measurement?from=2026-10-01&to=2026-10-07");let h=createResearchHandler(x.repo,{pilotMeasurement}),res=response();
 await h(x.req,res,x.url,"pm1");assert.equal(res.statusCode,200);assert.deepEqual(seen,{c:"c1",q:{from:"2026-10-01",to:"2026-10-07"}});
 x=jsonReq("GET","/api/v1/research/pilot/cohorts/c1/measurement?from=2026-10-01&to=2026-10-07",undefined,"ResearchEditor");h=createResearchHandler(x.repo,{pilotMeasurement});
 await assert.rejects(()=>h(x.req,response(),x.url,"pm2"),e=>e.code==="AUTH_PILOT_ADMIN_FORBIDDEN");
});
