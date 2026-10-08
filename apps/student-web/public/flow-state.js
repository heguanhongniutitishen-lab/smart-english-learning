export const Flow=Object.freeze({HOME:"Home",ANSWERING:"Answering",FEEDBACK:"Feedback",REPAIRING:"Repairing",COMPLETING:"Completing",LOADING_NEXT:"LoadingNext",TODAY_COMPLETE:"TodayComplete"});
const allowed=new Map([[Flow.HOME,new Set([Flow.ANSWERING])],[Flow.ANSWERING,new Set([Flow.HOME,Flow.FEEDBACK,Flow.TODAY_COMPLETE])],[Flow.FEEDBACK,new Set([Flow.HOME,Flow.ANSWERING,Flow.REPAIRING,Flow.COMPLETING])],[Flow.REPAIRING,new Set([Flow.HOME,Flow.ANSWERING,Flow.COMPLETING])],[Flow.COMPLETING,new Set([Flow.HOME,Flow.LOADING_NEXT])],[Flow.LOADING_NEXT,new Set([Flow.ANSWERING,Flow.TODAY_COMPLETE,Flow.HOME])],[Flow.TODAY_COMPLETE,new Set([Flow.HOME])]]);
export function canTransition(from,to){return from===to||allowed.get(from)?.has(to)===true}
export function transition(from,to){if(!canTransition(from,to))throw Object.assign(new Error(`invalid student flow transition: ${from} -> ${to}`),{code:"INVALID_STUDENT_FLOW_TRANSITION"});return to}
export function canSubmitAnswer(state){return state===Flow.ANSWERING}
export function canCompleteTask(state){return state!==Flow.COMPLETING&&state!==Flow.LOADING_NEXT}
