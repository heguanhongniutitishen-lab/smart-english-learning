import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
test("unapproved verification schema is not in auto-applied migrations",async()=>{
 const names=(await fs.readdir(path.join(root,"db/migrations"))).filter(n=>n.endsWith(".sql"));
 assert.equal(names.some(n=>/verification.question|verification.answer|verification.assignment/i.test(n)),false,
  "verification persistence requires schema review before auto-application");
});
test("verification answer isolation and approval gate are documented",async()=>{
 const adr=await fs.readFile(path.join(root,"docs/adr-sprint-11-isolated-verification-answers.md"),"utf8");
 assert.match(adr,/Proposed, not approved/);
 assert.match(adr,/No `AttemptRecorded` outbox event/);
 assert.match(adr,/Schema\/migration review/);
});
