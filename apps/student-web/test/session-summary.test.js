import test from "node:test";
import assert from "node:assert/strict";
import {createSessionStats,recordAnswer,recordRepairPractice,completionMessage} from "../public/session-summary.js";
test("all-correct session never claims a repair occurred",()=>{let s=createSessionStats();s=recordAnswer(s,true);s=recordAnswer(s,true);assert.match(completionMessage(s),/答题 2 道，答对 2 道/);assert.match(completionMessage(s),/未进行错题修复/);assert.doesNotMatch(completionMessage(s),/进行了 1 次/)});
test("wrong answer and finished demonstration repair are separately counted",()=>{let s=createSessionStats();s=recordAnswer(s,false);s=recordRepairPractice(s);s=recordAnswer(s,true);assert.match(completionMessage(s),/答错 1 道/);assert.match(completionMessage(s),/进行了 1 次演示修复练习/)});
test("unfinished session does not invent student outcomes",()=>{assert.equal(completionMessage(createSessionStats()),"本次尚未记录答题。")});
