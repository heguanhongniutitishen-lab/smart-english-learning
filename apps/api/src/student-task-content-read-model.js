export class StudentTaskContentReadModel{
 constructor(pool){this.pool=pool;}
 async forTask(studentId,taskId){
  const task=(await this.pool.query(`SELECT t.daily_task_id,t.target_type,t.target_id,t.curriculum_position_id,t.status
   FROM daily_tasks t JOIN daily_plans p USING(daily_plan_id)
   WHERE t.daily_task_id=$1 AND p.student_id=$2 AND p.status='Active' LIMIT 1`,[taskId,studentId])).rows[0];
  if(!task)return null;
  const base=`SELECT cv.content_version_id,ci.content_type,cv.payload,
   cv.difficulty_label,cv.estimated_seconds
   FROM content_versions cv JOIN content_items ci ON ci.content_id=cv.content_id
   WHERE ci.current_version_id=cv.content_version_id AND ci.status='Published'
   AND cv.review_status='Approved' AND cv.reviewed_by IS NOT NULL AND cv.published_at IS NOT NULL`;
  let q,params;
  if(task.target_type==="Knowledge"){q=base+` AND EXISTS(SELECT 1 FROM content_knowledge ck WHERE ck.content_version_id=cv.content_version_id AND ck.knowledge_id=$1 AND ck.review_status='Approved' AND ck.role<>'ContextOnly') ORDER BY cv.published_at DESC LIMIT 1`;params=[task.target_id];}
  else if(task.target_type==="Ability"){q=base+` AND EXISTS(SELECT 1 FROM content_ability ca WHERE ca.content_version_id=cv.content_version_id AND ca.ability_id=$1) ORDER BY cv.published_at DESC LIMIT 1`;params=[task.target_id];}
  else return{task,content:null,reason:"TARGET_CONTENT_NOT_DIRECTLY_MAPPED"};
  const row=(await this.pool.query(q,params)).rows[0]??null;
  return{task,content:row,reason:row?null:"NO_APPROVED_PUBLISHED_CONTENT"};
 }
}
