import { randomUUID } from "node:crypto";
export class MemoryStore {
  constructor(){ this.users=new Map(); this.students=new Map(); this.bindings=[]; this.configs=[]; this.positions=[]; }
  loginWechat(openId){
    let user=[...this.users.values()].find(x=>x.wechat_open_id===openId);
    if(!user){ user={user_id:randomUUID(),wechat_open_id:openId,status:"Active",created_at:new Date().toISOString()}; this.users.set(user.user_id,user); }
    return user;
  }
  createStudent(userId,input){
    const s={student_id:randomUUID(),display_name:input.display_name,current_stage:input.current_stage,current_grade:input.current_grade,region_code:input.region_code??null,timezone:input.timezone??"Asia/Shanghai",status:"Active",created_at:new Date().toISOString()};
    this.students.set(s.student_id,s);
    this.bindings.push({binding_id:randomUUID(),student_id:s.student_id,user_id:userId,role:"Student",status:"Active"});
    return s;
  }
  owns(userId,studentId){ return this.bindings.some(x=>x.user_id===userId&&x.student_id===studentId&&x.status==="Active"); }
  addConfig(studentId,input){ const x={config_id:randomUUID(),student_id:studentId,...input,effective_at:new Date().toISOString(),source:"Student"}; this.configs.push(x); return x; }
  setPosition(studentId,input){
    for(const x of this.positions) if(x.student_id===studentId&&x.is_current) x.is_current=false;
    const x={position_id:randomUUID(),student_id:studentId,...input,effective_at:new Date().toISOString(),source:"Student",is_current:true}; this.positions.push(x); return x;
  }
}
