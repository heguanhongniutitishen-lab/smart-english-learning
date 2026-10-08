const KEY="sel:pending-verification:v1";
const MAX_AGE_MS=30*60*1000;
export function savePendingVerification(storage,identity,pending,now=Date.now()){
 if(!storage||!identity?.student||!identity?.user||!identity?.date||!pending?.key||!pending?.causeId||!pending?.body?.content_version_id||!pending.body.answer_payload)return false;
 try{storage.setItem(KEY,JSON.stringify({identity,createdAt:now,pending}));return true}catch{return false}
}
export function readPendingVerification(storage,identity,now=Date.now()){
 if(!storage||!identity?.student||!identity?.user||!identity?.date)return null;
 try{
  const raw=storage.getItem(KEY);if(!raw)return null;
  const data=JSON.parse(raw),p=data?.pending;
  if(data?.identity?.student!==identity.student||data?.identity?.user!==identity.user||data?.identity?.date!==identity.date||
   !Number.isFinite(data.createdAt)||data.createdAt>now||now-data.createdAt>MAX_AGE_MS||
   typeof p?.key!=="string"||!p.key||typeof p.causeId!=="string"||!p.causeId||
   typeof p.body?.content_version_id!=="string"||!p.body.content_version_id||!p.body.answer_payload){
   storage.removeItem(KEY);return null;
  }
  return p;
 }catch{try{storage.removeItem(KEY)}catch{}return null}
}
export function clearPendingVerification(storage){try{storage?.removeItem(KEY)}catch{}}
export function verificationReplayRequest(pending){
 if(!pending?.key||!pending?.causeId||!pending?.body?.content_version_id||!pending.body.answer_payload)throw Error("missing independent verification submission");
 return{causeId:pending.causeId,key:pending.key,body:pending.body};
}
