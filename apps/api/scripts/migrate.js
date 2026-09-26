import fs from "node:fs/promises";import path from "node:path";import pg from "pg";import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../.."),dir=path.join(root,"db/migrations"),pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try{
 await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations(filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
 const files=(await fs.readdir(dir)).filter(x=>x.endsWith(".sql")).sort();
 for(const file of files){const seen=await pool.query("SELECT 1 FROM schema_migrations WHERE filename=$1",[file]);if(seen.rowCount)continue;const sql=await fs.readFile(path.join(dir,file),"utf8");const client=await pool.connect();try{await client.query("BEGIN");await client.query(sql);await client.query("INSERT INTO schema_migrations(filename) VALUES($1)",[file]);await client.query("COMMIT");console.log("applied",file);}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}}
}finally{await pool.end();}
