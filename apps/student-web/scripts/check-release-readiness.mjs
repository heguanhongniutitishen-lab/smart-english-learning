import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";

const root=new URL("../",import.meta.url);
const files={
 web:await readFile(new URL("public/app.js",root),"utf8"),
 api:await readFile(new URL("../api/src/app.js",root),"utf8"),
 owned:await readFile(new URL("../api/src/repositories/postgres.js",root),"utf8")
};
export function assessReleaseAuth(sources){
 const blockers=[];
 if(/q\.get\("user"\)/.test(sources.web)||/q\.get\("student"\)/.test(sources.web))
  blockers.push("IDENTITY_FROM_QUERY_PARAMETERS");
 if(/req\.headers\["x-user-id"\]/.test(sources.api)||/req\.headers\["x-user-id"\]/.test(sources.web))
  blockers.push("TRUSTS_UNVERIFIED_CLIENT_USER_HEADER");
 if(/async owns\(userId,studentId\)/.test(sources.owned)&&/WHERE user_id=\$1 AND student_id=\$2/.test(sources.owned))
  blockers.push("STUDENT_BINDING_CHECK_IS_NOT_AUTHENTICATION");
 return{ready:blockers.length===0,blockers};
}
const result=assessReleaseAuth(files);
const expectation=process.argv.includes("--expect-blocked");
if(expectation){
 if(result.ready){console.error("FAIL: expected development identity blockers but found none. Reevaluate release gate before use.");process.exitCode=1}
 else console.log("PASS: release blocked for development identity contract:",result.blockers.join(", "));
}else if(!result.ready){
 console.error("RELEASE BLOCKED: developer identity contract is not a secure login:",result.blockers.join(", "));
 process.exitCode=1;
}else{
 console.error("AUTH SOURCE SCAN PASSED ONLY: independent security review and actual identity integration remain required.");
 process.exitCode=1;
}
