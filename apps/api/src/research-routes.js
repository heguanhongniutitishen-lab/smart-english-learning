import {readJson,ok,fail} from "./http.js";
export function createResearchHandler(repo){
 return async function research(req,res,u,id){
  const actor=String(req.headers["x-user-id"]||"");if(!actor)return false;
  if(req.method==="POST"&&u.pathname==="/api/v1/research/knowledge-points"){const b=await readJson(req);if(!b.code||!b.name||!b.domain||!b.stage)return fail(res,400,"KNOWLEDGE_INVALID","code, name, domain and stage are required",id);return ok(res,await repo.createKnowledge(b),id,201);}
  if(req.method==="POST"&&u.pathname==="/api/v1/research/abilities"){const b=await readJson(req);if(!b.code||!b.name||!b.domain||!b.stage)return fail(res,400,"ABILITY_INVALID","code, name, domain and stage are required",id);return ok(res,await repo.createAbility(b),id,201);}
  if(req.method==="POST"&&u.pathname==="/api/v1/research/content"){const b=await readJson(req);if(!b.content_type||!b.payload)return fail(res,400,"CONTENT_INVALID","content_type and payload are required",id);return ok(res,await repo.createContent(b,actor),id,201);}
  let m=u.pathname.match(/^\/api\/v1\/research\/content\/([^/]+)\/versions$/);if(req.method==="POST"&&m){const b=await readJson(req);return ok(res,await repo.createRevision(m[1],b.payload,b.source_metadata),id,201);}
  m=u.pathname.match(/^\/api\/v1\/research\/content\/([^/]+)\/versions\/([^/]+)\/approve$/);if(req.method==="POST"&&m){const x=await repo.approveVersion(m[2],actor);return x?ok(res,x,id):fail(res,409,"CONTENT_NOT_APPROVABLE","version not approvable",id);}
  m=u.pathname.match(/^\/api\/v1\/research\/content\/([^/]+)\/versions\/([^/]+)\/publish$/);if(req.method==="POST"&&m)return ok(res,await repo.publishVersion(m[1],m[2],actor),id);
  return false;
 };
}
