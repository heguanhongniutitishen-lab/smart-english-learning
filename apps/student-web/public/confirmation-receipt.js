const KEY="sel:verified-confirmation-receipt:v1";
const MAX_AGE_MS=24*60*60*1000;
export function saveConfirmationReceipt(storage,identity,causeId,now=Date.now()){
 if(!storage||!identity?.student||!identity?.user||!identity?.date||typeof causeId!=="string"||!causeId)return false;
 try{storage.setItem(KEY,JSON.stringify({identity:{student:identity.student,user:identity.user,date:identity.date},causeId,at:now}));return true}catch{return false}
}
export function readConfirmationReceipt(storage,identity,now=Date.now()){
 if(!storage||!identity?.student||!identity?.user||!identity?.date)return null;
 try{
  const raw=storage.getItem(KEY);if(!raw)return null;
  const d=JSON.parse(raw);
  if(d?.identity?.student!==identity.student||d?.identity?.user!==identity.user||d?.identity?.date!==identity.date||
   typeof d.causeId!=="string"||!d.causeId||!Number.isFinite(d.at)||d.at>now||now-d.at>MAX_AGE_MS){
   storage.removeItem(KEY);return null;
  }
  return{causeId:d.causeId};
 }catch{try{storage.removeItem(KEY)}catch{}return null}
}
export function clearConfirmationReceipt(storage){try{storage?.removeItem(KEY)}catch{}}
