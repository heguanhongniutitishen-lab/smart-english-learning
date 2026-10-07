export class ResearchStudentStateReadModel{
 constructor(pool){this.pool=pool;}
 async get(studentId){const student=(await this.pool.query("SELECT student_id,display_name,current_stage,current_grade,status FROM students WHERE student_id=$1",[studentId])).rows[0];if(!student)return null;const [plan,mastery,ability,due,feedback,repairs]=await Promise.all([
 this.pool.query("SELECT plan_date,version,available_minutes,generated_at FROM daily_plans WHERE student_id=$1 AND status='Active' ORDER BY plan_date DESC,version DESC LIMIT 1",[studentId]),
 this.pool.query("SELECT mastery_state,count(*)::int n FROM mastery_records WHERE student_id=$1 GROUP BY mastery_state",[studentId]),
 this.pool.query("SELECT count(*)::int n,COALESCE(avg(level_score),0)::numeric avg_score,COALESCE(avg(confidence),0)::numeric avg_confidence FROM ability_states WHERE student_id=$1",[studentId]),
 this.pool.query("SELECT count(*)::int n FROM mastery_records WHERE student_id=$1 AND next_review_at IS NOT NULL AND next_review_at<=now()",[studentId]),
 this.pool.query("SELECT status,count(*)::int n FROM error_observations WHERE student_id=$1 GROUP BY status",[studentId]),
 this.pool.query("SELECT status,count(*)::int n FROM micro_repair_tasks WHERE student_id=$1 GROUP BY status",[studentId])
 ]);const ms={S0:0,S1:0,S2:0,S3:0,S4:0};for(const r of mastery.rows)ms[r.mastery_state]=Number(r.n);const fs={Open:0,UnderVerification:0,Resolved:0,Dismissed:0};for(const r of feedback.rows)fs[r.status]=Number(r.n);const rs={Pending:0,Active:0,Completed:0,Deferred:0,Cancelled:0};for(const r of repairs.rows)rs[r.status]=Number(r.n);const ab=ability.rows[0];return{student,latest_active_plan:plan.rows[0]??null,mastery:ms,ability:{state_count:Number(ab.n),average_level_score:Number(ab.avg_score),average_confidence:Number(ab.avg_confidence)},review:{due_count:Number(due.rows[0].n)},feedback:fs,repairs:rs};}
}
