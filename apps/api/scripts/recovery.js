import pg from "pg";
import {StateEngine} from "../src/state-engine.js";
import {StateReplayService} from "../src/state-replay.js";
import {ReviewPlanner} from "../src/review-planner.js";
import {RecoveryIntegrityService} from "../src/recovery-integrity.js";

const args=process.argv.slice(2);
const studentArg=args.find(x=>x.startsWith("--student="));
const apply=args.includes("--apply");
const studentId=studentArg?.slice("--student=".length)||null;
if(apply&&!studentId){console.error("--apply requires --student=<uuid>; full-database replay is intentionally disabled");process.exit(2);}
if(!process.env.DATABASE_URL){console.error("DATABASE_URL is required");process.exit(2);}

const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try{
 const integrity=new RecoveryIntegrityService(pool);
 const before=await integrity.check();
 console.log(JSON.stringify({phase:"before",...before},null,2));
 if(!apply){
  console.log(JSON.stringify({mode:"check-only",hint:"Use --student=<uuid> --apply to replay one student and verify again."}));
  process.exitCode=before.ok?0:1;
 }else{
  const engine=new StateEngine(pool,"state-rules-v1",{reviewPlanner:new ReviewPlanner(pool)});
  const replay=new StateReplayService(pool,engine);
  const rebuilt=await replay.rebuildStudent(studentId);
  const after=await integrity.check();
  console.log(JSON.stringify({phase:"after",student_id:studentId,rebuilt_targets:rebuilt.length,...after},null,2));
  process.exitCode=after.ok?0:1;
 }
}finally{await pool.end();}
