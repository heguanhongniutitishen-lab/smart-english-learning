function dateRange(from,to){if(!from||!to)throw Object.assign(new Error("from and to are required"),{status:400,code:"PILOT_MEASUREMENT_PERIOD_REQUIRED"});return{from,to,time_zone:"Asia/Shanghai"};}
export class PilotMeasurementReadModel{
 constructor(pool){this.pool=pool;}
 async baseline(cohortId,{from,to}={}){
  const period=dateRange(from,to);
  const [members,sessions,tasks,attempts,reviews,errors,repairs,completeness]=await Promise.all([
   this.pool.query("SELECT count(*)::int total,count(*) FILTER(WHERE status='Enrolled')::int enrolled FROM pilot_cohort_memberships WHERE cohort_id=$1",[cohortId]),
   this.pool.query(`SELECT count(DISTINCT s.student_id)::int exposed_students,count(*)::int session_count,COALESCE(sum(s.effective_seconds),0)::bigint effective_seconds
    FROM pilot_cohort_memberships m JOIN learning_sessions s ON s.student_id=m.student_id
    WHERE m.cohort_id=$1 AND (s.started_at AT TIME ZONE 'Asia/Shanghai')::date BETWEEN $2::date AND $3::date AND s.status<>'Active'`,[cohortId,from,to]),
   this.pool.query(`SELECT count(*)::int total,count(*) FILTER(WHERE t.status='Completed')::int completed
    FROM pilot_cohort_memberships m JOIN daily_plans p ON p.student_id=m.student_id JOIN daily_tasks t USING(daily_plan_id)
    WHERE m.cohort_id=$1 AND p.plan_date BETWEEN $2::date AND $3::date`,[cohortId,from,to]),
   this.pool.query(`SELECT count(*)::int total,count(*) FILTER(WHERE a.technical_status='OK')::int technical_ok,
    count(*) FILTER(WHERE a.result='Correct' AND a.technical_status='OK')::int correct,
    count(*) FILTER(WHERE a.result='Wrong' AND a.technical_status='OK')::int wrong
    FROM pilot_cohort_memberships m JOIN question_attempts a ON a.student_id=m.student_id
    WHERE m.cohort_id=$1 AND (a.occurred_at AT TIME ZONE 'Asia/Shanghai')::date BETWEEN $2::date AND $3::date`,[cohortId,from,to]),
   this.pool.query(`SELECT count(*) FILTER(WHERE mr.next_review_at IS NOT NULL AND (mr.next_review_at AT TIME ZONE 'Asia/Shanghai')::date BETWEEN $2::date AND $3::date)::int due_current_snapshot,
    count(*) FILTER(WHERE mr.last_verified_at IS NOT NULL AND (mr.last_verified_at AT TIME ZONE 'Asia/Shanghai')::date BETWEEN $2::date AND $3::date)::int verified_in_period
    FROM pilot_cohort_memberships m JOIN mastery_records mr ON mr.student_id=m.student_id WHERE m.cohort_id=$1`,[cohortId,from,to]),
   this.pool.query(`SELECT count(*)::int observations,count(*) FILTER(WHERE o.observation_type='WrongAnswer')::int wrong_answer_observations
    FROM pilot_cohort_memberships m JOIN error_observations o ON o.student_id=m.student_id
    WHERE m.cohort_id=$1 AND (o.created_at AT TIME ZONE 'Asia/Shanghai')::date BETWEEN $2::date AND $3::date`,[cohortId,from,to]),
   this.pool.query(`SELECT count(*)::int total,count(*) FILTER(WHERE r.status='Completed')::int completed
    FROM pilot_cohort_memberships m JOIN micro_repair_tasks r ON r.student_id=m.student_id
    WHERE m.cohort_id=$1 AND (r.created_at AT TIME ZONE 'Asia/Shanghai')::date BETWEEN $2::date AND $3::date`,[cohortId,from,to]),
   this.pool.query(`SELECT count(*)::int attempts,
    count(*) FILTER(WHERE a.content_version_id IS NULL)::int attempts_missing_content_version,
    count(*) FILTER(WHERE a.daily_task_id IS NOT NULL AND t.daily_task_id IS NULL)::int attempts_broken_task_link,
    count(*) FILTER(WHERE a.technical_status='OK' AND e.attempt_id IS NULL)::int technical_ok_without_evidence
    FROM pilot_cohort_memberships m JOIN question_attempts a ON a.student_id=m.student_id
    LEFT JOIN daily_tasks t ON t.daily_task_id=a.daily_task_id
    LEFT JOIN (SELECT DISTINCT attempt_id FROM evidences WHERE attempt_id IS NOT NULL) e ON e.attempt_id=a.attempt_id
    WHERE m.cohort_id=$1 AND (a.occurred_at AT TIME ZONE 'Asia/Shanghai')::date BETWEEN $2::date AND $3::date`,[cohortId,from,to])
  ]);
  const M=members.rows[0],S=sessions.rows[0],T=tasks.rows[0],A=attempts.rows[0],R=reviews.rows[0],E=errors.rows[0],P=repairs.rows[0],C=completeness.rows[0];
  return{period,semantics:{measurement:"operational_baseline_not_validated_learning_impact",review:"due_current_snapshot_is_not_historical_due_count"},
   cohort:{members:Number(M.total),enrolled:Number(M.enrolled),exposed_students:Number(S.exposed_students)},
   exposure:{session_count:Number(S.session_count),effective_seconds:Number(S.effective_seconds)},
   completion:{tasks_total:Number(T.total),tasks_completed:Number(T.completed),task_completion_rate:Number(T.total)?Number(T.completed)/Number(T.total):null},
   attempts:{total:Number(A.total),technical_ok:Number(A.technical_ok),correct:Number(A.correct),wrong:Number(A.wrong)},
   review:{due_current_snapshot:Number(R.due_current_snapshot),verified_in_period:Number(R.verified_in_period)},
   error_repair:{observations:Number(E.observations),wrong_answer_observations:Number(E.wrong_answer_observations),repairs_total:Number(P.total),repairs_completed:Number(P.completed)},
   data_completeness:{attempts:Number(C.attempts),attempts_missing_content_version:Number(C.attempts_missing_content_version),attempts_broken_task_link:Number(C.attempts_broken_task_link),technical_ok_without_evidence:Number(C.technical_ok_without_evidence),
    complete:Number(C.attempts_missing_content_version)===0&&Number(C.attempts_broken_task_link)===0&&Number(C.technical_ok_without_evidence)===0}
  };
 }
}
