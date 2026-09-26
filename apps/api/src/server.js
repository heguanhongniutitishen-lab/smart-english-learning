import http from "node:http";import {createHandler} from "./app.js";import {createPool} from "./db.js";import {PostgresStore} from "./repositories/postgres.js";import {PostgresIdempotencyStore} from "./idempotency-postgres.js";
const port=Number(process.env.PORT||3000),pool=createPool(),store=new PostgresStore(pool),idem=new PostgresIdempotencyStore(pool);
const server=http.createServer(createHandler(store,idem));
server.listen(port,()=>console.log(`smart-english-api listening on :${port}`));
async function shutdown(){server.close(async()=>{await pool.end();process.exit(0);});}
process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
