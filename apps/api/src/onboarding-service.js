import {withTransaction} from "./db.js";
export class OnboardingService{
 constructor(pool){this.pool=pool;}
 async complete(studentId,input){return withTransaction(this.pool,async c=>{const s=(await c.query("SELECT * FROM students WHERE student_id=$1 FOR UPDATE",[studentId])).rows[0];if(!s)throw Object.assign(new Error("STUDENT_NOT_FOUND"),{code:"STUDENT_NOT_FOUND",status:404});const minutes=Number(input.daily_minutes);if(!Number.isInteger(minutes)||minutes<5||minutes>180)throw Object.assign(new Error("ONBOARDING_INVALID_DAILY_MINUTES"),{code:"ONBOARDING_INVALID_DAILY_MINUTES",status:400});if(!input.primary_goal)throw Object.assign(new Error("ONBOARDING_PRIMARY_GOAL_REQUIRED"),{code:"ONBOARDING_PRIMARY_GOAL_REQUIRED",status:400});
 const version=Number((await c.query("SELECT COALESCE(max(version),0)+1 v FROM onboarding_profiles WHERE student_id=$1",[studentId])).rows[0].v);
 const profile=(await c.query(`INSERT INTO onboarding_profiles(student_id,version,region_code,textbook_id,curriculum_position_id,recent_score_range,primary_goal,secondary_goal,daily_minutes,self_reported_weaknesses,source,completed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Student',now()) RETURNING *`,[studentId,version,input.region_code??s.region_code,input.textbook_id??null,input.curriculum_position_id??null,input.recent_score_range??null,input.primary_goal,input.secondary_goal??null,minutes,input.self_reported_weaknesses??[]])).rows[0];
 const config=(await c.query(`INSERT INTO student_config_history(student_id,primary_goal,secondary_goal,daily_minutes,exam_date,exam_target,source) VALUES($1,$2,$3,$4,$5,$6,'Student') RETURNING *`,[studentId,input.primary_goal,input.secondary_goal??null,minutes,input.exam_date??null,input.exam_target??null])).rows[0];
 if(input.region_code!==undefined)await c.query("UPDATE students SET region_code=$2 WHERE student_id=$1",[studentId,input.region_code]);
 return{profile,config};});}
}
