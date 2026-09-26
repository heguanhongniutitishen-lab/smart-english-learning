import test from "node:test";import assert from "node:assert/strict";import {requireResearchRole} from "../src/authz.js";import {assertImportTransition} from "../src/import-state.js";
test("research authorization rejects ordinary users",async()=>{await assert.rejects(()=>requireResearchRole({listUserRoles:async()=>["Student"]},"u1"),x=>x.code==="AUTH_RESEARCH_FORBIDDEN");});
test("editor cannot approve publication",async()=>{await assert.rejects(()=>requireResearchRole({listUserRoles:async()=>["ResearchEditor"]},"u1",{review:true}),x=>x.code==="AUTH_REVIEW_FORBIDDEN");});
test("reviewer may review",async()=>{assert.deepEqual(await requireResearchRole({listUserRoles:async()=>["ResearchReviewer"]},"u1",{review:true}),["ResearchReviewer"]);});
test("import workflow cannot jump draft to published",()=>{assert.throws(()=>assertImportTransition("Draft","Published"),x=>x.code==="IMPORT_INVALID_TRANSITION");assert.equal(assertImportTransition("Reviewed","Published"),true);});
