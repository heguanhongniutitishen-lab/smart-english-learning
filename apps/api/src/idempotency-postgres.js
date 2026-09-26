export class PostgresIdempotencyStore{
 constructor(pool){this.pool=pool;}
 async get(scope,requestId){const r=await this.pool.query("SELECT response_body FROM idempotency_keys WHERE scope=$1 AND request_id=$2 AND (expires_at IS NULL OR expires_at>now())",[scope,requestId]);return r.rows[0]?.response_body??null;}
 async put(scope,requestId,value,status=201){await this.pool.query(`INSERT INTO idempotency_keys(scope,request_id,response_status,response_body,expires_at) VALUES($1,$2,$3,$4,now()+interval '24 hours') ON CONFLICT(scope,request_id) DO NOTHING`,[scope,requestId,status,value]);return value;}
}
