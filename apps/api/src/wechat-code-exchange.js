import {issueStudentToken} from "./student-auth-boundary.js";
function error(code,status,message){return Object.assign(new Error(message),{code,status})}
export async function exchangeWechatCode({code,store,secret,appId,appSecret,fetchImpl=fetch}){
 if(typeof code!=="string"||!/^[-_a-zA-Z0-9]{6,256}$/.test(code))throw error("AUTH_WECHAT_CODE_INVALID",400,"invalid WeChat login code");
 if(!appId||!appSecret||!secret)throw error("AUTH_WECHAT_NOT_CONFIGURED",503,"WeChat login is not configured");
 const endpoint=new URL("https://api.weixin.qq.com/sns/jscode2session");
 endpoint.searchParams.set("appid",appId);endpoint.searchParams.set("secret",appSecret);
 endpoint.searchParams.set("js_code",code);endpoint.searchParams.set("grant_type","authorization_code");
 let payload;
 try{
  const response=await fetchImpl(endpoint,{method:"GET",signal:AbortSignal.timeout(5000),redirect:"error"});
  if(!response.ok)throw Error("WeChat provider unavailable");
  payload=await response.json();
 }catch{throw error("AUTH_WECHAT_PROVIDER_UNAVAILABLE",502,"WeChat authentication temporarily unavailable")}
 // A code is validated by WeChat. Never accept an openid supplied by the client.
 if(payload?.errcode||typeof payload?.openid!=="string"||!payload.openid||
    typeof payload?.session_key!=="string"||!payload.session_key)
  throw error("AUTH_WECHAT_CODE_REJECTED",401,"WeChat code was not accepted");
 const user=await store.loginWechat(payload.openid);
 if(user?.status!=="Active"||!user?.user_id)throw error("AUTH_USER_INACTIVE",403,"account is not active");
 return{access_token:issueStudentToken(user.user_id,secret),token_type:"Bearer",expires_in:900,user_id:user.user_id};
}
