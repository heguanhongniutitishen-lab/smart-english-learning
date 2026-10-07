const RESEARCH_ROLES=new Set(["PlatformAdmin","ResearchAdmin","ResearchEditor","ResearchReviewer"]);
export async function requireResearchRole(repo,userId,{review=false}={}){
 if(!userId)throw Object.assign(new Error("authentication required"),{status:401,code:"AUTH_REQUIRED"});
 const roles=await repo.listUserRoles(userId);
 const allowed=roles.some(r=>RESEARCH_ROLES.has(r));
 if(!allowed)throw Object.assign(new Error("research permission required"),{status:403,code:"AUTH_RESEARCH_FORBIDDEN"});
 if(review&&!roles.some(r=>["PlatformAdmin","ResearchAdmin","ResearchReviewer"].includes(r)))throw Object.assign(new Error("review permission required"),{status:403,code:"AUTH_REVIEW_FORBIDDEN"});
 return roles;
}

export async function requireStudentStateRole(repo,userId){if(!userId)throw Object.assign(new Error("authentication required"),{status:401,code:"AUTH_REQUIRED"});const roles=await repo.listUserRoles(userId);if(!roles.some(r=>["PlatformAdmin","ResearchAdmin"].includes(r)))throw Object.assign(new Error("student state permission required"),{status:403,code:"AUTH_STUDENT_STATE_FORBIDDEN"});return roles;}
