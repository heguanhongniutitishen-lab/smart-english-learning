export function recoveryPriority(pendingAnswer,pendingCompletion,currentTaskId){
 if(pendingAnswer)return pendingAnswer.taskId===currentTaskId?"answer-current":"answer-previous";
 if(pendingCompletion)return "completion";
 return "none";
}
export function canBeginTaskCompletion(pendingAnswer,pendingCompletion){return !pendingAnswer&&!pendingCompletion}
