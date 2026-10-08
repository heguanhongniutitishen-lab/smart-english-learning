import {createHmac,timingSafeEqual} from "node:crypto";
function authError(code,message){return Object.assign(new Error(message),{status:401,code})}
export function verifyStudentBearer(header,secret,{now=Math.floor(Date.now()/1000)}={}){
 if(typeof secret!=="string"||Buffer.byteLength(secret)<32)throw Object.assign(new Error("STUDENT_AUTH_SECRET must have at least 32 bytes"),{code:"AUTH_SERVER_NOT_CONFIGURED",status:503});
 const match=/^Bearer ([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/i.exec(String(header||""));
 if(!match)throw authError("AUTH_TOKEN_REQUIRED","signed Bearer token required");
 const [payloadB64,signatureB64]=match.slice(1);
 const expected=createHmac("sha256",secret).update(payloadB64).digest();
 const signature=Buffer.from(signatureB64,"base64url");
 if(signature.length!==expected.length||!timingSafeEqual(signature,expected))throw authError("AUTH_TOKEN_INVALID","invalid token signature");
 let claims;try{claims=JSON.parse(Buffer.from(payloadB64,"base64url").toString("utf8"))}catch{throw authError("AUTH_TOKEN_INVALID","invalid token claims")}
 if(claims.iss!=="sel-student-auth"||claims.aud!=="sel-student-api"||typeof claims.sub!=="string"||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(claims.sub)||!Number.isInteger(claims.exp)||claims.exp<=now||claims.exp>now+3600||!Number.isInteger(claims.iat)||claims.iat>now+60||claims.iat>claims.exp)
  throw authError("AUTH_TOKEN_INVALID","invalid or expired token claims");
 return claims.sub;
}
export function enforceStudentAuth(req,pathname,{mode="development",secret}={}){
 if(!pathname.startsWith("/api/v1/students")&&!pathname.startsWith("/api/v1/auth/wechat/login"))return;
 if(mode!=="signed")return;
 if(pathname==="/api/v1/auth/wechat/login")throw Object.assign(new Error("unverified open_id login disabled"),{status:403,code:"AUTH_WECHAT_EXCHANGE_DISABLED"});
 const userId=verifyStudentBearer(req.headers.authorization,secret);
 // Ignore untrusted client-supplied identity even if present.
 req.headers["x-user-id"]=userId;
}
export function issueStudentToken(userId,secret,{now=Math.floor(Date.now()/1000),ttl=900}={}){
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(userId)||!Number.isInteger(ttl)||ttl<1||ttl>3600)throw Error("invalid token issuance");
 if(typeof secret!=="string"||Buffer.byteLength(secret)<32)throw Error("secret too short");
 const payload=Buffer.from(JSON.stringify({iss:"sel-student-auth",aud:"sel-student-api",sub:userId,iat:now,exp:now+ttl})).toString("base64url");
 return payload+"."+createHmac("sha256",secret).update(payload).digest("base64url");
}
