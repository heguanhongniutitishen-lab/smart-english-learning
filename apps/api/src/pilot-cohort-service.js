export class PilotCohortService{
 constructor(pool){this.pool=pool;}
 async create({cohort_code,name,starts_on=null,ends_on=null},actor){
  const r=await this.pool.query("INSERT INTO pilot_cohorts(cohort_code,name,starts_on,ends_on,created_by) VALUES($1,$2,$3,$4,$5) RETURNING cohort_id,cohort_code,name,status,starts_on,ends_on,created_at",[cohort_code,name,starts_on,ends_on,actor||null]);return r.rows[0];
 }
 async enroll(cohortId,studentId,actor){
  const r=await this.pool.query(`INSERT INTO pilot_cohort_memberships(cohort_id,student_id,created_by)
   VALUES($1,$2,$3) ON CONFLICT(cohort_id,student_id) DO UPDATE SET status='Enrolled',ended_at=NULL
   RETURNING membership_id,cohort_id,student_id,status,enrolled_at,ended_at`,[cohortId,studentId,actor||null]);return r.rows[0];
 }
 async listMembers(cohortId,{limit=100,offset=0}={}){
  const n=Math.min(Math.max(Number(limit)||100,1),500),o=Math.max(Number(offset)||0,0);
  const r=await this.pool.query(`SELECT m.membership_id,m.student_id,m.status,m.enrolled_at,m.ended_at,
   s.current_stage,s.current_grade,s.status student_status
   FROM pilot_cohort_memberships m JOIN students s USING(student_id)
   WHERE m.cohort_id=$1 ORDER BY m.enrolled_at,m.membership_id LIMIT $2 OFFSET $3`,[cohortId,n,o]);return r.rows;
 }
}
