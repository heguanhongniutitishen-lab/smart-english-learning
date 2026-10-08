const origin=(process.argv[2]||"https://smart-english-demo.vercel.app").replace(/\/$/,"");
const paths=["/","/app.js","/styles.css","/flow-state.js","/question-renderers.js","/answer-submission.js","/task-completion-recovery.js","/recovery-priority.js","/session-summary.js"];
let failed=0;
for(const path of paths){
 try{
  const response=await fetch(origin+path,{signal:AbortSignal.timeout(12000),redirect:"follow"});
  const body=await response.text();
  const mime=response.headers.get("content-type")||"";
  const valid=response.ok&&(path==="/"?/开始今日学习/.test(body):path.endsWith(".js")?/javascript/.test(mime)&&!/<html/i.test(body):/css/.test(mime));
  if(!valid)failed++;
  console.log(`${valid?"PASS":"FAIL"} ${path} HTTP ${response.status} ${mime}`);
  if(path==="/app.js"&&valid){
   for(const marker of ["recoveryPriority","showCompletionRecovery","pendingReplayRequest"]){const found=body.includes(marker);if(!found)failed++;console.log(`${found?"PASS":"FAIL"} live app marker ${marker}`)}
  }
 }catch(error){failed++;console.log(`FAIL ${path} ${error.message}`)}
}
if(failed){console.error(`Deployment verification failed: ${failed} checks. This is not evidence that the site is up to date.`);process.exitCode=1}
else console.log("Public static deployment checks passed. Real-account flows and exact Git commit still require separate verification.");
