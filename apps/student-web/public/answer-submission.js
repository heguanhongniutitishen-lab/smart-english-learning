export function prepareAnswerSubmission(existing,{taskId,contentVersion,chosen,answerPayload,responseTimeMs},makeId){
 if(existing){
  if(existing.taskId!==taskId||existing.contentVersion!==contentVersion||existing.chosen!==chosen)throw Object.assign(new Error("待确认的作答尚未完成，请重试原答案"),{code:"PENDING_ANSWER_CONFLICT"});
  return existing;
 }
 return{taskId,contentVersion,chosen,key:makeId(),body:{content_version_id:contentVersion,answer_payload:answerPayload,response_time_ms:responseTimeMs}};
}
export function shouldKeepPendingAnswer(pending,taskId){return Boolean(pending&&pending.taskId===taskId)}
