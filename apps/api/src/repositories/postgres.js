import {randomUUID} from "node:crypto";import {withTransaction} from "../db.js";
export class PostgresStore{
 constructor(pool){this.pool=pool;}
 async health(){await this.pool.query("SELECT 1");return true;}
 async loginWechat(openId){
  const q=`INSERT INTO users(user_id,wechat_open_id,status,last_login_at) VALUES($1,$2,'Active',now())
  ON CONFLICT(wechat_open_id) DO UPDATE SET last_login_at=now()
  RETURNING user_id,wechat_open_id,status,created_at`;
  return (await this.pool.query(q,[randomUUID(),openId])).rows[0];
 }
 async createStudent(userId,i){return withTransaction(this.pool,async c=>{
  const s=(await c.query(`INSERT INTO students(student_id,display_name,current_stage,current_grade,region_code,timezone,status)
   VALUES($1,$2,$3,$4,$5,$6,'Active') RETURNING *`,
   [randomUUID(),i.display_name,i.current_stage,i.current_grade,i.region_code??null,i.timezone??"Asia/Shanghai"])).rows[0];
  await c.query(`INSERT INTO student_user_bindings(binding_id,student_id,user_id,role,status) VALUES($1,$2,$3,'Student','Active')`,[randomUUID(),s.student_id,userId]);
  return s;
 });}
 async owns(userId,studentId){const r=await this.pool.query(`SELECT 1 FROM student_user_bindings WHERE user_id=$1 AND student_id=$2 AND status='Active' LIMIT 1`,[userId,studentId]);return r.rowCount>0;}
 async addConfig(studentId,i){return (await this.pool.query(`INSERT INTO student_config_history(config_id,student_id,primary_goal,secondary_goal,daily_minutes,exam_date,exam_target,source)
 VALUES($1,$2,$3,$4,$5,$6,$7,'Student') RETURNING *`,[randomUUID(),studentId,i.primary_goal,i.secondary_goal??null,i.daily_minutes,i.exam_date??null,i.exam_target??null])).rows[0];}
 async addAcademic(studentId,i){return (await this.pool.query(`INSERT INTO student_academic_history(history_id,student_id,stage,grade,semester,effective_from,effective_to,source)
 VALUES($1,$2,$3,$4,$5,$6,$7,'Student') RETURNING *`,[randomUUID(),studentId,i.stage,i.grade,i.semester??null,i.effective_from,i.effective_to??null])).rows[0];}
 async setPosition(studentId,i){return withTransaction(this.pool,async c=>{
  await c.query(`SELECT pg_advisory_xact_lock(hashtext($1))`,[studentId]);
  await c.query(`UPDATE curriculum_positions SET is_current=false WHERE student_id=$1 AND is_current=true`,[studentId]);
  return (await c.query(`INSERT INTO curriculum_positions(position_id,student_id,textbook_id,unit_id,section_id,progress_note,source,is_current)
   VALUES($1,$2,$3,$4,$5,$6,'Student',true) RETURNING *`,[randomUUID(),studentId,i.textbook_id??null,i.unit_id??null,i.section_id??null,i.progress_note??null])).rows[0];
 });}
 async listTextbooks(q={}){const values=[],where=["status='Active'"];for(const [field,value] of [["stage",q.stage],["grade",q.grade],["publisher",q.publisher]])if(value){values.push(value);where.push(`${field}=$${values.length}`);}return (await this.pool.query(`SELECT * FROM textbooks WHERE ${where.join(" AND ")} ORDER BY stage,grade,publisher,volume`,values)).rows;}
 async getStructure(id){const b=(await this.pool.query("SELECT * FROM textbooks WHERE textbook_id=$1 AND status='Active'",[id])).rows[0];if(!b)return null;const u=(await this.pool.query("SELECT * FROM units WHERE textbook_id=$1 ORDER BY sort_order",[id])).rows;const ids=u.map(x=>x.unit_id);const ss=ids.length?(await this.pool.query("SELECT * FROM sections WHERE unit_id=ANY($1::uuid[]) ORDER BY sort_order",[ids])).rows:[];return {...b,units:u.map(x=>({...x,sections:ss.filter(s=>s.unit_id===x.unit_id)}))};}
}
