App({
 globalData:{apiBase:"",auth:null},
 async loginWithWechat(){
  const base=this.globalData.apiBase;
  if(typeof base!=="string"||!/^https:\/\//.test(base))throw new Error("请先配置 HTTPS API 地址");
  const code=await new Promise((resolve,reject)=>wx.login({success:r=>r.code?resolve(r.code):reject(new Error("微信登录未返回临时代码")),fail:()=>reject(new Error("微信登录暂不可用"))}));
  const data=await new Promise((resolve,reject)=>wx.request({
   url:base.replace(/\/$/,"")+"/api/v1/auth/wechat/code-exchange",
   method:"POST",header:{"content-type":"application/json"},data:{code},
   success:r=>r.statusCode>=200&&r.statusCode<300?resolve(r.data?.data??r.data):reject(new Error("身份验证失败，请稍后再试")),
   fail:()=>reject(new Error("无法连接身份验证服务"))
  }));
  if(typeof data?.access_token!=="string"||data.token_type!=="Bearer"||!Number.isInteger(data.expires_in)||data.expires_in<=0)throw new Error("登录响应格式不正确");
  // Only keep the short-lived token in memory. Never infer a bound student ID from user input.
  this.globalData.auth={token:data.access_token,expiresAt:Date.now()+data.expires_in*1000,studentId:null};
  return this.globalData.auth;
 },
 logout(){this.globalData.auth=null;}
});
