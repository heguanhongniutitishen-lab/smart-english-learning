import {withTransaction} from "./db.js";
export class PostgresIdempotencyStore{
 constructor(pool){this.pool=pool;}
 async get(scope,requestId,client=this.pool){const r=await client.query("SELECT response_body FROM idempotency_keys WHERE scope=$1 AND request_id=$2 AND (expires_at IS NULL OR expires_at>now())",[scope,requestId]);return r.rows[0]?.response_body??null;}
 async put(scope,requestId,value,status=201,client=this.pool){await client.query(`INSERT INTO idempotency_keys(scope,request_id,response_status,response_body,expires_at) VALUES($1,$2,$3,$4,now()+interval '24 hours') ON CONFLICT(scope,request_id) DO NOTHING`,[scope,requestId,status,value]);return value;}
 async run(scope,requestId,work,status=201){return withTransaction(this.pool,async c=>{await c.query("SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))",[scope,requestId]);const cached=await this.get(scope,requestId,c);if(cached!==null)return{value:cached,reused:true};const value=await work(c);await this.put(scope,requestId,value,status,c);return{value,reused:false};});}
}