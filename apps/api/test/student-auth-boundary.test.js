import test from "node:test";import assert from "node:assert/strict";
import {verifyStudentBearer,issueStudentToken,enforceStudentAuth} from "../src/student-auth-boundary.js";
const secret="this-is-an-isolated-test-secret-longer-than-32-bytes";
const user="00000000-0000-4000-8000-000000000011";
test("signed short-lived bearer binds identity and ignores forged x-user-id",()=>{
 const token=issueStudentToken(user,secret,{now:1000,ttl:900});
 assert.equal(verifyStudentBearer("Bearer "+token,secret,{now:1100}),user);
 const req={headers:{authorization:"Bearer "+token,"x-user-id":"attacker"}};
 enforceStudentAuth(req,"/api/v1/students/111/active-learning/today",{mode:"signed",secret});
 assert.equal(req.headers["x-user-id"],user);
});
test("missing forged expired or wrong-audience tokens are rejected",()=>{
 const good=issueStudentToken(user,secret,{now:1000,ttl:100});
 for(const h of ["", "Bearer bogus", "Bearer "+good.slice(0,-2)+"zz"]){
  assert.throws(()=>verifyStudentBearer(h,secret,{now:1001}),e=>e.status===401);
 }
 assert.throws(()=>verifyStudentBearer("Bearer "+good,secret,{now:1100}),e=>e.code==="AUTH_TOKEN_INVALID");
 assert.throws(()=>verifyStudentBearer("Bearer "+good,secret+"different",{now:1001}),e=>e.code==="AUTH_TOKEN_INVALID");
});
test("signed mode disables unverified open_id login and development remains separate",()=>{
 const req={headers:{"x-user-id":"fixture"}};
 assert.throws(()=>enforceStudentAuth(req,"/api/v1/auth/wechat/login",{mode:"signed",secret}),e=>e.code==="AUTH_WECHAT_EXCHANGE_DISABLED");
 assert.throws(()=>enforceStudentAuth(req,"/api/v1/students",{mode:"signed",secret}),e=>e.code==="AUTH_TOKEN_REQUIRED");
 const dev={headers:{"x-user-id":"fixture"}};
 enforceStudentAuth(dev,"/api/v1/students",{mode:"development",secret});
 assert.equal(dev.headers["x-user-id"],"fixture");
});
