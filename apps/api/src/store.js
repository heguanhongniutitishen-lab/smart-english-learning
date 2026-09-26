import {randomUUID} from "node:crypto";
export class MemoryStore{
 constructor(){this.users=new Map();this.students=new Map();this.bindings=[];this.configs=[];this.positions=[];this.academic=[];this.textbooks=new Map();this.units=[];this.sections=[];}
 loginWechat(openId){let u=[...this.users.values()].find(x=>x.wechat_open_id===openId);if(!u){u={user_id:randomUUID(),wechat_open_id:openId,status:"Active",created_at:new Date().toISOString()};this.users.set(u.user_id,u);}return u;}
 createStudent(userId,i){const s={student_id:randomUUID(),display_name:i.display_name,current_stage:i.current_stage,current_grade:i.current_grade,region_code:i.region_code??null,timezone:i.timezone??"Asia/Shanghai",status:"Active",created_at:new Date().toISOString()};this.students.set(s.student_id,s);this.bindings.push({binding_id:randomUUID(),student_id:s.student_id,user_id:userId,role:"Student",status:"Active"});return s;}
 owns(userId,studentId){return this.bindings.some(x=>x.user_id===userId&&x.student_id===studentId&&x.status==="Active");}
 addConfig(studentId,i){const x={config_id:randomUUID(),student_id:studentId,...i,effective_at:new Date().toISOString(),source:"Student"};this.configs.push(x);return x;}
 addAcademic(studentId,i){const x={history_id:randomUUID(),student_id:studentId,...i,source:"Student"};this.academic.push(x);return x;}
 setPosition(studentId,i){for(const x of this.positions)if(x.student_id===studentId&&x.is_current)x.is_current=false;const x={position_id:randomUUID(),student_id:studentId,...i,effective_at:new Date().toISOString(),source:"Student",is_current:true};this.positions.push(x);return x;}
 listTextbooks(q={}){return [...this.textbooks.values()].filter(x=>(!q.stage||x.stage===q.stage)&&(!q.grade||x.grade===Number(q.grade))&&(!q.publisher||x.publisher===q.publisher)&&x.status==="Active");}
 getStructure(id){const book=this.textbooks.get(id);if(!book)return null;return {...book,units:this.units.filter(u=>u.textbook_id===id).sort((a,b)=>a.sort_order-b.sort_order).map(u=>({...u,sections:this.sections.filter(s=>s.unit_id===u.unit_id).sort((a,b)=>a.sort_order-b.sort_order)}))};}
}
