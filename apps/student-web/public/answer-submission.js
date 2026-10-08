export function prepareAnswerSubmission(existing,{taskId,contentVersion,chosen,answerPayload,responseTimeMs},makeId){
 if(existing){
  if(existing.taskId!==taskId||existing.contentVersion!==contentVersion||existing.chosen!==chosen)throw Object.assign(new Error("待确认的作答尚未完成，请重试原答案"),{code:"PENDING_ANSWER_CONFLICT"});
  return existing;
 }
 return{taskId,contentVersion,chosen,key:makeId(),body:{content_version_id:contentVersion,answer_payload:answerPayload,response_time_ms:responseTimeMs}};
}
export function shouldKeepPendingAnswer(pending,taskId){return Boolean(pending&&pending.taskId===taskId)}

const STORAGE_KEY="sel:pending-answer:v1";
const MAX_AGE_MS=30*60*1000;
export function savePendingAnswer(storage,identity,pending,now=Date.now()){
 if(!storage||!identity?.student||!identity?.user||!pending)return false;
 try{storage.setItem(STORAGE_KEY,JSON.stringify({identity:{student:identity.student,user:identity.user},createdAt:now,pending}));return true}catch{return false}
}
export function readPendingAnswer(storage,identity,now=Date.now()){
 if(!storage||!identity?.student||!identity?.user)return null;
 try{
  const raw=storage.getItem(STORAGE_KEY);if(!raw)return null;
  const data=JSON.parse(raw),p=data?.pending;
  if(data?.identity?.student!==identity.student||data?.identity?.user!==identity.user||!Number.isFinite(data.createdAt)||data.createdAt>now||now-data.createdAt>MAX_AGE_MS||!p||typeof p.key!=="string"||!p.key||typeof p.taskId!=="string"||typeof p.contentVersion!=="string"||!p.body||p.body.content_version_id!==p.contentVersion||!p.body.answer_payload||!("chosen" in p)){storage.removeItem(STORAGE_KEY);return null}
  return p;
 }catch{try{storage.removeItem(STORAGE_KEY)}catch{}return null}
}
export function clearPendingAnswer(storage){try{storage?.removeItem(STORAGE_KEY)}catch{}}
