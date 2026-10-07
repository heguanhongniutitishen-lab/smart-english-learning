export class IdempotencyStore{
 constructor(){this.items=new Map();}
 key(scope,requestId){return `${scope}:${requestId}`;}
 get(scope,requestId){return this.items.get(this.key(scope,requestId));}
 put(scope,requestId,value){const k=this.key(scope,requestId);if(this.items.has(k))return this.items.get(k);this.items.set(k,value);return value;}
 async run(scope,requestId,work){const cached=this.get(scope,requestId);if(cached!==undefined)return{value:cached,reused:true};const value=await work();this.put(scope,requestId,value);return{value,reused:false};}
}
