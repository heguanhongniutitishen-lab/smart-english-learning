const names={SchoolSync:"跟校巩固",Review:"复习",Diagnostic:"诊断",Repair:"错题修复",Expansion:"拓展"};
const themes={Primary:["今天也要进步一点点","一步一步，轻松完成今日任务","#2b8af3"],Middle:["专注当下，稳步提升","跟上进度，巩固每一步","#2d81f2"],High:["保持节奏，持续积累","把时间用在今天最重要的学习上","#244f83"],Unspecified:["今天开始，稳步向前","按照自己的节奏完成学习计划","#287cf0"]};
function safeNumber(value){return typeof value==="number"&&Number.isFinite(value)&&value>=0?value:null;}
Page({
 data:{stage:"Unspecified",greeting:themes.Unspecified[0],subtitle:themes.Unspecified[1],primary:themes.Unspecified[2],authorized:false,loggingIn:false,error:"",heroTitle:"等待读取今日计划",heroDescription:"请先完成学生身份认证",progressText:"--",progressPercent:0,completedText:"--",minutesText:"--",pendingText:"--",tasks:[],focusText:"暂无经过独立证据审查的薄弱点结论。",growthText:"登录后读取真实学习记录。",goalText:"登录后展示今日学习任务。",canStart:false,startLabel:"答题模块尚未接入"},
 onShow(){this.load();},
 async login(){
  this.setData({loggingIn:true,error:""});
  try{
   const auth=await getApp().loginWithWechat();
   const base=getApp().globalData.apiBase;
   const result=await new Promise((resolve,reject)=>wx.request({url:base.replace(/\\/$/,"")+"/api/v1/students/me/bindings",header:{Authorization:"Bearer "+auth.token},success:r=>r.statusCode>=200&&r.statusCode<300?resolve(r.data?.data??r.data):reject(Error("无法验证学生绑定关系")),fail:()=>reject(Error("学生绑定查询失败"))}));
   const students=result?.students;
   if(!Array.isArray(students))throw Error("绑定查询响应无效");
   if(students.length!==1){
    this.setData({error:students.length?"此账号绑定多个学生，需完成学生选择功能后才能进入学习。":"当前微信账号尚未绑定有效学生，请联系管理员。"});
    return;
   }
   const selected=students[0];
   if(typeof selected.student_id!=="string"||!["Primary","Middle","High"].includes(selected.current_stage))throw Error("学生绑定资料不完整");
   getApp().globalData.auth={...auth,studentId:selected.student_id,stage:selected.current_stage};
   await this.load();
  }catch(e){this.setData({error:e?.message||"登录未完成"});}
  finally{this.setData({loggingIn:false});}
 },
 request(path){const {apiBase,auth}=getApp().globalData;if(!apiBase||!auth?.token||!auth?.studentId||Date.now()>=auth.expiresAt)return Promise.reject(Error("尚未接入正式登录会话"));return new Promise((resolve,reject)=>wx.request({url:apiBase+path,header:{Authorization:"Bearer "+auth.token},success:r=>r.statusCode>=200&&r.statusCode<300?resolve(r.data?.data??r.data):reject(Error("服务器未返回可用记录")),fail:()=>reject(Error("网络不可用"))}));},
 async load(){const {apiBase,auth}=getApp().globalData;if(!apiBase||!auth?.token||!auth?.studentId||Date.now()>=auth.expiresAt){this.setData({authorized:false,error:"",canStart:false});return;}this.setData({authorized:true,error:"",canStart:false});const now=new Date(),date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-"),id=encodeURIComponent(auth.studentId);
 try{const plan=await this.request("/api/v1/students/"+id+"/active-learning/today?date="+date),s=plan.summary||{},tasks=Array.isArray(plan.tasks)?plan.tasks:[],stage=["Primary","Middle","High"].includes(auth.stage)?auth.stage:"Unspecified",theme=themes[stage],ratio=safeNumber(s.progress_ratio),p=ratio!==null&&ratio<=1?Math.round(ratio*100):null,completed=safeNumber(s.completed_tasks),pending=safeNumber(s.pending_tasks),minutes=safeNumber(s.estimated_total_minutes);
 this.setData({stage,greeting:theme[0],subtitle:theme[1],primary:theme[2],heroTitle:plan.current_task?"今天的学习已准备好":tasks.length?"今天的任务完成啦":"今天还没有安排任务",heroDescription:"今日计划数据来自服务器",progressText:p===null?"--":p+"%",progressPercent:p??0,completedText:completed??"--",pendingText:pending??"--",minutesText:minutes??"--",goalText:tasks.length?"今日计划 "+tasks.length+" 项任务，已完成 "+(completed??"--")+" 项。":"今天暂无已安排的学习任务。",tasks:tasks.map((t,i)=>({task_id:t.task_id||"display-"+i,name:names[t.source_type]||"学习任务",state:t.status==="Completed"?"已完成":t.status==="InProgress"?"进行中":"待学习"}))});this.loadGrowth(id);
 }catch(e){this.setData({error:e.message,canStart:false,growthText:"成长记录暂不可用。",focusText:"缺少可信数据，不能推断薄弱点。"});}},
 async loadGrowth(id){try{const v=await this.request("/api/v1/students/"+id+"/growth"),completed=safeNumber(v.tasks?.completed),seconds=safeNumber(v.learning?.effective_seconds),sessions=safeNumber(v.learning?.session_count),due=safeNumber(v.review?.due_count);if([completed,seconds,sessions,due].includes(null))throw Error("无效记录");
 this.setData({growthText:"最近记录：完成 "+completed+" 项任务，有效学习 "+Math.floor(seconds/60)+" 分钟（"+sessions+" 次已结束会话）。不代表成绩提升。",focusText:due>0?"有 "+due+" 项到期复习。这不是已确认的错因。":"暂无审核证据确认的薄弱点结论。"});
 }catch{this.setData({growthText:"成长记录暂不可用。",focusText:"缺少可信数据，不能推断薄弱点。"});}},
 startLearning(){wx.showToast({title:"尚未接入安全答题及进度恢复",icon:"none"});}
});
