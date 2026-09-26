import pg from "pg";
const {Pool}=pg;
export function createPool(connectionString=process.env.DATABASE_URL){
 if(!connectionString) throw Object.assign(new Error("DATABASE_URL is required"),{code:"SYS_DATABASE_CONFIG"});
 return new Pool({connectionString,max:Number(process.env.DB_POOL_MAX||10),idleTimeoutMillis:30000,connectionTimeoutMillis:5000});
}
export async function withTransaction(pool,fn){
 const client=await pool.connect();
 try{await client.query("BEGIN");const value=await fn(client);await client.query("COMMIT");return value;}
 catch(error){await client.query("ROLLBACK");throw error;}
 finally{client.release();}
}
