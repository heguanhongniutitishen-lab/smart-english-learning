import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
test("unapproved verification schema is not in auto-applied migrations",async()=>{
 const names=(await fs.readdir(path.join(root,"db/migrations"))).filter(n=>n.endsWith(".sql"));
 const sql=await Promise.all(names.map(n=>fs.readFile(path.join(root,"db/migrations",n),"utf8")));
 assert.equal(sql.some(s=>/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:verification_question_assignments|verification_question_answers)\b/i.test(s)),false,
  "verification persistence requires schema review before auto-application");
});
test("verification answer isolation and approval gate are documented",async()=>{
 const adr=await fs.readFile(path.join(root,"docs/adr-sprint-11-isolated-verification-answers.md"),"utf8");
 assert.match(adr,/Proposed, not approved/);
 assert.match(adr,/No `AttemptRecorded` outbox event/);
 assert.match(adr,/Schema\/migration review/);
});
