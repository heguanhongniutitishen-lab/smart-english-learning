import http from "node:http";import {createHandler} from "./app.js";import {createPool} from "./db.js";import {PostgresStore} from "./repositories/postgres.js";import {PostgresIdempotencyStore} from "./idempotency-postgres.js";import {ResearchPostgresRepository} from "./repositories/research-postgres.js";import {createResearchHandler} from "./research-routes.js";import {LearningPostgresRepository} from "./repositories/learning-postgres.js";
const port=Number(process.env.PORT||3000),pool=createPool(),store=new PostgresStore(pool),idem=new PostgresIdempotencyStore(pool),researchRepo=new ResearchPostgresRepository(pool),learningRepo=new LearningPostgresRepository(pool);
const server=http.createServer(createHandler(store,idem,createResearchHandler(researchRepo),learningRepo));
server.listen(port,()=>console.log(`smart-english-api listening on :${port}`));
async function shutdown(){server.close(async()=>{await pool.end();process.exit(0);});}
process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
