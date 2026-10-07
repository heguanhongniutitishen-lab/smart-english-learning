import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {LearningPostgresRepository} from "../src/repositories/learning-postgres.js";
import {EvidenceBuilder} from "../src/evidence-builder.js";
import {OutboxWorker} from "../src/outbox-worker.js";
import {StateEngine} from "../src/state-engine.js";
import {ReviewPlanner} from "../src/review-planner.js";
import {ErrorObservationService} from "../src/error-observation-service.js";
import {ErrorCauseHypothesisService} from "../src/error-cause-hypothesis-service.js";
import {FeedbackOrchestrator} from "../src/feedback-orchestrator.js";

const it=process.env.TEST_DATABASE_URL?test:test.skip;

it("recovers Attempt -> Outbox -> Evidence -> State -> Review/Feedback after a mid-pipeline failure without duplicate facts",async()=>{
 const p=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,max:6});
 try{
  const student=(await p.query("INSERT INTO students(display_name,current_stage,current_grade) VALUES('s9-fault-loop','Primary',5) RETURNING student_id")).rows[0];
  const knowledge=(await p.query("INSERT INTO knowledge_points(level,domain,code,name) VALUES(1,'Vocabulary',$1,'S9 fault knowledge') RETURNING knowledge_id",["S9-F-"+crypto.randomUUID()])).rows[0];
  const item=(await p.query("INSERT INTO content_items(content_type,source_type,status) VALUES('Choice','Research','Draft') RETURNING content_id")).rows[0];
  const version=(await p.query("INSERT INTO content_versions(content_id,version_no,payload,review_status,published_at) VALUES($1,1,$2,'Approved',now()) RETURNING content_version_id",[item.content_id,{stem:"s9 fault"}])).rows[0];
  await p.query("UPDATE content_items SET current_version_id=$2,status='Published' WHERE content_id=$1",[item.content_id,version.content_version_id]);
  await p.query("INSERT INTO content_knowledge(content_version_id,knowledge_id,role,weight,purpose,review_status) VALUES($1,$2,'PrimaryTested',1,'Practice','Approved')",[version.content_version_id,knowledge.knowledge_id]);

  const repo=new LearningPostgresRepository(p);
  const attempt=await repo.createAttempt(student.student_id,{content_version_id:version.content_version_id,request_id:"s9-fault-"+crypto.randomUUID(),answer_payload:{choice:"B"},result:"Wrong",technical_status:"OK"});
  const builder=new EvidenceBuilder(p),planner=new ReviewPlanner(p),engine=new StateEngine(p,"state-rules-v1",{reviewPlanner:planner});
  const feedback=new FeedbackOrchestrator({observations:new ErrorObservationService(p),hypotheses:new ErrorCauseHypothesisService(p)});

  let injected=true;
  const flakyFeedback={observeAttempt:async attemptId=>{if(injected){injected=false;throw new Error("simulated feedback outage");}return feedback.observeAttempt(attemptId);}};
  const worker=new OutboxWorker(p,builder,{stateEngine:engine,feedback:flakyFeedback,maxAttempts:3,baseBackoffSeconds:0,maxBackoffSeconds:0});

  const first=await worker.processOne();
  assert.equal(first.status,"Retry");
  assert.match(first.error,/simulated feedback outage/);

  const afterFailure=(await p.query("SELECT processed_at,attempt_count,last_error FROM outbox_events WHERE aggregate_id=$1 AND event_type='AttemptRecorded'",[attempt.attempt_id])).rows[0];
  assert.equal(afterFailure.processed_at,null);
  assert.equal(Number(afterFailure.attempt_count),1);
  assert.match(afterFailure.last_error,/simulated feedback outage/);
  assert.equal(Number((await p.query("SELECT count(*) n FROM evidences WHERE attempt_id=$1",[attempt.attempt_id])).rows[0].n),1);
  const masteryAfterFailure=(await p.query("SELECT mastery_state,evidence_count,state_version,next_review_at FROM mastery_records WHERE student_id=$1 AND knowledge_id=$2",[student.student_id,knowledge.knowledge_id])).rows[0];
  assert.equal(masteryAfterFailure.mastery_state,"S1");
  assert.equal(Number(masteryAfterFailure.evidence_count),1);
  assert.ok(masteryAfterFailure.next_review_at);
  assert.equal(Number((await p.query("SELECT count(*) n FROM error_observations WHERE attempt_id=$1",[attempt.attempt_id])).rows[0].n),0);

  const second=await worker.processOne();
  assert.equal(second.status,"Processed");
  const finalEvent=(await p.query("SELECT processed_at,attempt_count,last_error FROM outbox_events WHERE aggregate_id=$1 AND event_type='AttemptRecorded'",[attempt.attempt_id])).rows[0];
  assert.ok(finalEvent.processed_at);
  assert.equal(Number(finalEvent.attempt_count),2);
  assert.equal(finalEvent.last_error,null);

  assert.equal(Number((await p.query("SELECT count(*) n FROM question_attempts WHERE attempt_id=$1",[attempt.attempt_id])).rows[0].n),1);
  assert.equal(Number((await p.query("SELECT count(*) n FROM evidences WHERE attempt_id=$1",[attempt.attempt_id])).rows[0].n),1);
  assert.equal(Number((await p.query("SELECT count(*) n FROM error_observations WHERE attempt_id=$1 AND observation_type='WrongAnswer'",[attempt.attempt_id])).rows[0].n),1);
  assert.equal(Number((await p.query("SELECT count(*) n FROM error_cause_hypotheses h JOIN error_observations o USING(error_observation_id) WHERE o.attempt_id=$1",[attempt.attempt_id])).rows[0].n),1);

  const finalMastery=(await p.query("SELECT mastery_state,evidence_count,state_version,next_review_at FROM mastery_records WHERE student_id=$1 AND knowledge_id=$2",[student.student_id,knowledge.knowledge_id])).rows[0];
  assert.equal(finalMastery.mastery_state,"S1");
  assert.equal(Number(finalMastery.evidence_count),1);
  assert.equal(Number(finalMastery.state_version),Number(masteryAfterFailure.state_version));
  assert.equal(new Date(finalMastery.next_review_at).getTime(),new Date(masteryAfterFailure.next_review_at).getTime());
 }finally{await p.end();}
});
