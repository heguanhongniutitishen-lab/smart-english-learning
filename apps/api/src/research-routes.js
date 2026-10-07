import {readJson,ok,fail} from "./http.js";import {requireResearchRole,requireStudentStateRole,requirePilotAdminRole} from "./authz.js";import {ResearchAdminService} from "./research-admin.js";import {CurriculumMappingService} from "./curriculum-mapping.js";
export function createResearchHandler(repo,{studentState=null,reliabilityOps=null,recoveryIntegrity=null,pilotCohorts=null,pilotReadiness=null,pilotExport=null}={}){
 const imports=new ResearchAdminService(repo),maps=new CurriculumMappingService(repo);
 return async function research(req,res,u,id){
  const actor=String(req.headers["x-user-id"]||"");const reviewPath=/\/(approve|publish)$/.test(u.pathname)||/\/review$/.test(u.pathname);await requireResearchRole(repo,actor,{review:reviewPath});
  if(req.method==="GET"&&u.pathname==="/api/v1/research/ops/reliability"&&reliabilityOps){await requireStudentStateRole(repo,actor);return ok(res,await reliabilityOps.get(),id);}
  if(req.method==="GET"&&u.pathname==="/api/v1/research/ops/recovery-readiness"&&recoveryIntegrity){await requireStudentStateRole(repo,actor);const z=await recoveryIntegrity.check();return ok(res,{ready:z.ok,...z},id);}
  let exportMatch=u.pathname.match(/^\/api\/v1\/research\/pilot\/cohorts\/([^/]+)\/export\/(attempts|state)$/);if(req.method==="GET"&&exportMatch&&pilotExport){await requirePilotAdminRole(repo,actor);const z=exportMatch[2]==="attempts"?await pilotExport.attempts(exportMatch[1],{limit:u.searchParams.get("limit"),after:u.searchParams.get("after")}):await pilotExport.state(exportMatch[1],{limit:u.searchParams.get("limit"),afterStudent:u.searchParams.get("after_student")});return ok(res,z,id);}
  let readinessMatch=u.pathname.match(/^\/api\/v1\/research\/pilot\/cohorts\/([^/]+)\/readiness$/);if(req.method==="GET"&&readinessMatch&&pilotReadiness){await requirePilotAdminRole(repo,actor);const z=await pilotReadiness.get(readinessMatch[1]);return z?ok(res,z,id):fail(res,404,"PILOT_COHORT_NOT_FOUND","cohort not found",id);}\n  if(pilotCohorts){
   let pm;
   if(req.method==="POST"&&u.pathname==="/api/v1/research/pilot/cohorts"){await requirePilotAdminRole(repo,actor);const b=await readJson(req);if(!b.cohort_code||!b.name)return fail(res,400,"PILOT_COHORT_INVALID","cohort_code and name are required",id);return ok(res,await pilotCohorts.create(b,actor),id,201);}
   pm=u.pathname.match(/^\/api\/v1\/research\/pilot\/cohorts\/([^/]+)\/members$/);if(req.method==="POST"&&pm){await requirePilotAdminRole(repo,actor);const b=await readJson(req);if(!b.student_id)return fail(res,400,"PILOT_MEMBER_INVALID","student_id is required",id);return ok(res,await pilotCohorts.enroll(pm[1],b.student_id,actor),id,201);}
   if(req.method==="GET"&&pm){await requirePilotAdminRole(repo,actor);return ok(res,await pilotCohorts.listMembers(pm[1],{limit:u.searchParams.get("limit"),offset:u.searchParams.get("offset")}),id);}
   pm=u.pathname.match(/^\/api\/v1\/research\/pilot\/cohorts\/([^/]+)\/members\/([^/]+)\/end$/);if(req.method==="POST"&&pm){await requirePilotAdminRole(repo,actor);const b=await readJson(req);const z=await pilotCohorts.endMembership(pm[1],pm[2],b.status);return z?ok(res,z,id):fail(res,409,"PILOT_MEMBERSHIP_NOT_ACTIVE","membership is not active",id);}
  }
  let studentMatch=u.pathname.match(/^\/api\/v1\/research\/students\/([^/]+)\/state$/);if(req.method==="GET"&&studentMatch&&studentState){await requireStudentStateRole(repo,actor);const z=await studentState.get(studentMatch[1]);return z?ok(res,z,id):fail(res,404,"RESEARCH_STUDENT_NOT_FOUND","student not found",id);}
  if(req.method==="POST"&&u.pathname==="/api/v1/research/knowledge-points"){const b=await readJson(req);if(!b.code||!b.name||!b.domain||!b.stage)return fail(res,400,"KNOWLEDGE_INVALID","code, name, domain and stage are required",id);return ok(res,await repo.createKnowledge(b),id,201);}
  if(req.method==="POST"&&u.pathname==="/api/v1/research/abilities"){const b=await readJson(req);if(!b.code||!b.name||!b.domain||!b.stage)return fail(res,400,"ABILITY_INVALID","code, name, domain and stage are required",id);return ok(res,await repo.createAbility(b),id,201);}
  if(req.method==="POST"&&u.pathname==="/api/v1/research/content"){const b=await readJson(req);if(!b.content_type||!b.payload)return fail(res,400,"CONTENT_INVALID","content_type and payload are required",id);return ok(res,await repo.createContent(b,actor),id,201);}
  if(req.method==="POST"&&u.pathname==="/api/v1/research/curriculum/mappings/knowledge")return ok(res,await maps.mapKnowledge(await readJson(req),actor),id,201);
  if(req.method==="POST"&&u.pathname==="/api/v1/research/curriculum/mappings/ability")return ok(res,await maps.mapAbility(await readJson(req),actor),id,201);
  if(req.method==="POST"&&u.pathname==="/api/v1/research/import-jobs")return ok(res,await imports.createImportJob(await readJson(req),actor),id,201);
  let m=u.pathname.match(/^\/api\/v1\/research\/import-jobs\/([^/]+)\/rows$/);if(req.method==="POST"&&m)return ok(res,await imports.stageRows(m[1],(await readJson(req)).rows||[]),id,201);
  m=u.pathname.match(/^\/api\/v1\/research\/import-rows\/([^/]+)\/review$/);if(req.method==="POST"&&m){const b=await readJson(req);return ok(res,await imports.reviewRow(m[1],Boolean(b.approved),actor),id);}
  m=u.pathname.match(/^\/api\/v1\/research\/import-jobs\/([^/]+)\/publish$/);if(req.method==="POST"&&m)return ok(res,await imports.publishImport(m[1],actor),id);
  m=u.pathname.match(/^\/api\/v1\/research\/content\/([^/]+)\/versions$/);if(req.method==="POST"&&m){const b=await readJson(req);return ok(res,await repo.createRevision(m[1],b.payload,b.source_metadata),id,201);}
  m=u.pathname.match(/^\/api\/v1\/research\/content\/([^/]+)\/versions\/([^/]+)\/approve$/);if(req.method==="POST"&&m){const z=await repo.approveVersion(m[2],actor);return z?ok(res,z,id):fail(res,409,"CONTENT_NOT_APPROVABLE","version not approvable",id);}
  m=u.pathname.match(/^\/api\/v1\/research\/content\/([^/]+)\/versions\/([^/]+)\/publish$/);if(req.method==="POST"&&m)return ok(res,await repo.publishVersion(m[1],m[2],actor),id);
  return false;
 };
}
