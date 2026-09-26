export class IdempotencyStore{
 constructor(){this.items=new Map();}
 key(scope,requestId){return `${scope}:${requestId}`;}
 get(scope,requestId){return this.items.get(this.key(scope,requestId));}
 put(scope,requestId,value){const k=this.key(scope,requestId);if(this.items.has(k))return this.items.get(k);this.items.set(k,value);return value;}
}
