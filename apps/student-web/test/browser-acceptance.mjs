import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "playwright";

const port=4317;
const child=spawn(process.execPath,["server.js"],{cwd:new URL("../",import.meta.url),env:{...process.env,STUDENT_WEB_PORT:String(port)},stdio:"ignore"});
let browser;
async function start(){
 for(let i=0;i<60;i++){
  try{const r=await fetch(`http://127.0.0.1:${port}/`);if(r.ok)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 throw new Error("Student browser demo failed to start");
}
async function run(){
 await start();
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const pageErrors=[];
 page.on("pageerror",error=>pageErrors.push(error.message));
 await page.goto(`http://127.0.0.1:${port}/`);
 await page.locator("#start").waitFor();
 assert.match(await page.locator("#start").innerText(),/开始今日学习|继续今日学习/);
 await page.getByRole("heading",{name:"学习目标"}).waitFor();
 await page.locator("#start").click();
 await page.getByRole("heading",{name:/My brother/}).waitFor();
 await page.locator(".option").nth(0).click();
 await page.getByText("这里卡了一下").waitFor();
 await page.getByRole("button",{name:"做一道演示练习"}).click();
 await page.getByText("演示修复 · 不计入掌握度").waitFor();
 await page.locator("[data-repair-index]").nth(1).click();
 await page.getByText("请再试一次",{exact:false}).waitFor();
 await page.locator("[data-repair-index]").nth(0).click();
 await page.getByRole("button",{name:"返回主线"}).click();
 await page.getByRole("heading",{name:/Which word means/}).waitFor();
 await page.locator(".option").nth(0).click();
 await page.getByText("答对了").waitFor();
 await page.getByRole("button",{name:"继续"}).click();
 await page.getByRole("heading",{name:"这一小段完成了"}).waitFor();
 const summary=await page.locator(".lesson.success").innerText();
 assert.match(summary,/答题 2 道/);
 assert.match(summary,/答对 1 道/);
 assert.match(summary,/答错 1 道/);
 assert.match(summary,/1 次演示修复练习/);
 await page.getByRole("button",{name:"回到今日学习"}).click();
 await page.locator("#start").click();
 await page.locator(".option").nth(1).click();
 await page.getByText("答对了").waitFor();
 await page.getByRole("button",{name:"继续"}).click();
 await page.locator(".option").nth(0).click();
 await page.getByRole("button",{name:"继续"}).click();
 const cleanSummary=await page.locator(".lesson.success").innerText();
 assert.match(cleanSummary,/答对 2 道/);
 assert.match(cleanSummary,/未进行错题修复/);
 assert.equal(pageErrors.length,0,`Browser errors: ${pageErrors.join("; ")}`);
 console.log("PASS browser: wrong answer -> repair practice -> correct answer -> completion");
 console.log("PASS browser: all-correct flow does not claim repair");
}
try{await run()}finally{await browser?.close();child.kill("SIGTERM")}
