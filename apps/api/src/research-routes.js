import {readJson,ok,fail} from "./http.js";import {requireResearchRole} from "./authz.js";import {ResearchAdminService} from "./research-admin.js";import {CurriculumMappingService} from "./curriculum-mapping.js";
export function createResearchHandler(repo,{studentState=null}={}){
 const imports=new ResearchAdminService(repo),maps=new CurriculumMappingService(repo);
 return async function research(req,res,u,id){
  const actor=String(req.headers["x-user-id"]||"");const reviewPath=/\/(approve|publish)$/.test(u.pathname)||/\/review$/.test(u.pathname);await requireResearchRole(repo,actor,{review:reviewPath});
  let studentMatch=u.pathname.match(/^\/api\/v1\/research\/students\/([^/]+)\/state$/);if(req.method==="GET"&&studentMatch&&studentState){const z=await studentState.get(studentMatch[1]);return z?ok(res,z,id):fail(res,404,"RESEARCH_STUDENT_NOT_FOUND","student not found",id);}
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
