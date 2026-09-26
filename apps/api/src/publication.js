const TRANSITIONS={Draft:new Set(["InReview","Archived"]),InReview:new Set(["Draft","Approved"]),Approved:new Set(["Published","Draft"]),Published:new Set(["Archived"]),Archived:new Set([])};
export function canTransition(from,to){return Boolean(TRANSITIONS[from]?.has(to));}
export function transition(entity,to,{actor_user_id=null,reason=null}={}){
 const from=entity.lifecycle_status;
 if(!canTransition(from,to))throw Object.assign(new Error(`invalid publication transition ${from} -> ${to}`),{code:"CONTENT_INVALID_TRANSITION",status:409});
 return {entity:{...entity,lifecycle_status:to},event:{aggregate_id:entity.content_item_id??entity.textbook_id,from_status:from,to_status:to,actor_user_id,reason}};
}
export function assertHumanApproved(version){
 if(version.review_status!=="Approved"||!version.reviewed_by)throw Object.assign(new Error("human approval required"),{code:"CONTENT_HUMAN_APPROVAL_REQUIRED",status:409});
}
