export class FeedbackOrchestrator{
 constructor({observations,hypotheses,verifications,repairs,completion}){this.observations=observations;this.hypotheses=hypotheses;this.verifications=verifications;this.repairs=repairs;this.completion=completion;}
 async observeAttempt(attemptId){const observations=await this.observations.observeAttempt(attemptId);const out=[];for(const observation of observations){const hypotheses=await this.hypotheses.generateForObservation(observation.error_observation_id);out.push({observation,hypotheses});}return out;}
 async verifyAndPlan(hypothesisId,verification){const verified=await this.verifications.record(hypothesisId,verification);if(verified.hypothesis.status!=="Verified")return{verification:verified,repair:null};const repair=await this.repairs.plan(hypothesisId);return{verification:verified,repair};}
 async completeRepair(studentId,repairTaskId,input={}){return this.completion.complete(studentId,repairTaskId,input);}
}
