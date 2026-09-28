export class DiagnosticCompletionOrchestrator{
 constructor({pool,selector,sessionService,calibrationService,dailyPlanOrchestrator}){this.pool=pool;this.selector=selector;this.sessionService=sessionService;this.calibrationService=calibrationService;this.dailyPlanOrchestrator=dailyPlanOrchestrator;}
 async finalizeIfReady(sessionId,{now=new Date(),planDate=null}={}){const session=(await this.pool.query("SELECT * FROM diagnostic_sessions WHERE diagnostic_session_id=$1",[sessionId])).rows[0];if(!session)throw Object.assign(new Error("DIAGNOSTIC_SESSION_NOT_FOUND"),{code:"DIAGNOSTIC_SESSION_NOT_FOUND",status:404});
 if(session.status==="Abandoned")return{completed:false,reason:"SESSION_ABANDONED",session};
 if(session.status==="Completed"){const calibration=await this.calibrationService.calibrate(sessionId);const date=planDate??this.localPlanDate(now);const plan=await this.dailyPlanOrchestrator.build(session.student_id,date,{at:now});return{completed:true,reused:true,session,calibration,daily_plan:plan};}
 const pending=(await this.pool.query("SELECT diagnostic_item_id FROM diagnostic_items WHERE diagnostic_session_id=$1 AND answered_attempt_id IS NULL ORDER BY sequence_no LIMIT 1",[sessionId])).rows[0];if(pending)return{completed:false,reason:"PENDING_ITEM",session};
 const stop=await this.selector.shouldStop(sessionId,now);if(!stop.stop)return{completed:false,reason:"CONTINUE",stop,session};
 const completed=await this.sessionService.complete(sessionId,stop.reason);if(!completed)throw Object.assign(new Error("DIAGNOSTIC_COMPLETION_CONFLICT"),{code:"DIAGNOSTIC_COMPLETION_CONFLICT",status:409});
 const calibration=await this.calibrationService.calibrate(sessionId),date=planDate??this.localPlanDate(now),plan=await this.dailyPlanOrchestrator.build(completed.student_id,date,{at:now});return{completed:true,reused:false,stop,session:completed,calibration,daily_plan:plan};}
 localPlanDate(now){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);}
}
