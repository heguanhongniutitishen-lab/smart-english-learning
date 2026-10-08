// Runtime-independent session adapter for a trusted WeChat Mini Program host.
// No URL, localStorage or sessionStorage token persistence, and no openid shortcut.
export function createWechatStudentSession({getCode,request,now=()=>Date.now()}){
 if(typeof getCode!=="function"||typeof request!=="function")throw Error("trusted code provider and request transport required");
 let session=null;
 return{
  async login(){
   session=null;
   const code=await getCode();
   if(typeof code!=="string"||!code)throw Error("missing WeChat login code");
   const reply=await request("/api/v1/auth/wechat/code-exchange",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});
   if(!reply?.ok)throw Error("trusted login exchange failed");
   const json=await reply.json(),data=json?.data??json;
   if(typeof data?.access_token!=="string"||data.token_type!=="Bearer"||
      !Number.isInteger(data.expires_in)||data.expires_in<1||data.expires_in>3600||
      typeof data.user_id!=="string"||!data.user_id)throw Error("invalid signed login response");
   session={token:data.access_token,userId:data.user_id,expiry:now()+data.expires_in*1000};
   return{user_id:session.userId,expires_in:data.expires_in};
  },
  headers(){if(!session||now()>=session.expiry-5000){session=null;throw Error("student signed session absent or expired")}
   return{authorization:"Bearer "+session.token};
  },
  currentUser(){if(!session||now()>=session.expiry-5000){session=null;return null}return session.userId},
  logout(){session=null}
 };
}
