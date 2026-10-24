import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {chromium} from 'playwright-core';
import {startActivity} from '../.pi/extensions/opera/lib/activity.mjs';
import {Store} from '../.pi/extensions/opera/lib/store.mjs';
import {saveDashboard} from '../.pi/extensions/opera/lib/insights.mjs';
import {pathToFileURL} from 'node:url';
const executable=[process.env.OPERA_BROWSER,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&fs.existsSync(p));
test('real Chromium browser: activities, audio fallback/recording and dashboard',{skip:!executable,timeout:60000},async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'opera-browser-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const browser=await chromium.launch({executablePath:executable,headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});t.after(()=>browser.close());
 const context=await browser.newContext({permissions:['microphone'],viewport:{width:390,height:844}});t.after(()=>context.close());
 async function setup(p){const a=await startActivity(p,{root});t.after(()=>a.close());const page=await context.newPage();t.after(()=>page.close());const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(a.url);await page.waitForFunction(()=>document.getElementById('mode').textContent.length>0);return {a,page,errors};}
 await t.test('choice uses browser selection, feedback waits in terminal',async()=>{
  const {a,page,errors}=await setup({mode:'choice',question:'Choose beta.',options:[{id:'a',label:'Alpha'},{id:'b',label:'Beta'}],correctId:'b',explanation:'HIDDEN_ANSWER'});
  assert.equal((await page.content()).includes('HIDDEN_ANSWER'),false);await page.getByLabel('Beta',{exact:true}).check();await page.locator('#submit').click();const result=await a.result;assert.equal(result.selected,'b');await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Submitted'));assert.deepEqual(errors,[]);
 });
 await t.test('prediction commits one condition, reveals outcome, then captures reflection',async()=>{
  const {a,page,errors}=await setup({mode:'prediction',question:'Predict the update.',scenarios:[{id:'a',label:'One update',setup:'Start at 1, add 2.',outcome:'SECRET_RESULT = 3'},{id:'b',label:'Two updates',setup:'Start at 1, add 2 twice.',outcome:'SECRET_RESULT = 5'}],visual:{title:'State change',mode:'steps',nodes:[{id:'input',label:'Initial value',detail:'Start at 1'},{id:'operation',label:'Update',detail:'Add 2 each time'}]}});
  assert.equal(await page.locator('#submit').isDisabled(),true);assert.equal((await page.content()).includes('SECRET_RESULT'),false);
  await page.locator('#scenario').selectOption('b');await page.locator('#response').fill('5 because two additions.');await page.locator('#predict').click();await page.locator('#outcome-panel').waitFor({state:'visible'});assert.equal(await page.locator('#outcome').textContent(),'SECRET_RESULT = 5');assert.equal(await page.locator('#scenario').isDisabled(),true);
  await page.reload();await page.locator('#outcome-panel').waitFor({state:'visible'});assert.equal(await page.locator('#outcome').textContent(),'SECRET_RESULT = 5');
  await page.locator('#response').fill('Each addition changes state by 2.');await page.locator('#submit').click();const result=await a.result;assert.equal(result.activity.prediction,'5 because two additions.');assert.equal(result.assistance,'outcome_observed');assert.deepEqual(errors,[]);
 });
 await t.test('practical task shows rubric and captures actual work with assistance',async()=>{
  const {a,page,errors}=await setup({mode:'task',question:'Fix the boundary case.',rubric:['Handles empty input','Explains the change']});assert.equal(await page.locator('#rubric li').count(),2);
  await page.locator('#response').fill('if (!items.length) return 0;');await page.locator('#help').check();await page.locator('#submit').click();assert.equal((await a.result).assistance,'tool_assisted');assert.deepEqual(errors,[]);
 });
 await t.test('missing language voice degrades honestly, transcript is assistance',async()=>{
  const {a,page,errors}=await setup({mode:'audio',question:'Write what you hear.',audio:{text:'音声の例',language:'zz-ZZ',goal:'listen'}});assert.equal(await page.locator('#play').isDisabled(),true);assert.equal(await page.locator('#reference').isVisible(),false);assert.equal((await page.content()).includes('音声の例'),false);
  await page.locator('#transcript').click();await page.locator('#reference').waitFor({state:'visible'});await page.locator('#response').fill('音声の例');await page.locator('#submit').click();assert.equal((await a.result).assistance,'answer_shown');assert.deepEqual(errors,[]);
 });
 await t.test('fake microphone recording requires explicit local-save consent',async()=>{
  const {a,page,errors}=await setup({mode:'audio',question:'Record and describe your attempt.',audio:{text:'Hello',language:'en-US',goal:'speak'}});
  await page.locator('#record').click();await page.waitForFunction(()=>!document.getElementById('stop').disabled);await page.waitForTimeout(300);await page.locator('#stop').click();await page.locator('#recording').waitFor({state:'visible'});assert.equal(await page.locator('#audio-consent').isChecked(),false);
  await page.locator('#response').fill('I recorded the greeting.');await page.locator('#audio-consent').check();await page.locator('#submit').click();const result=await a.result;assert.ok(fs.statSync(result.activity.recording).size>0);assert.deepEqual(errors,[]);
 });
 await t.test('blank response is rejected and cancel captures no attempt',async()=>{
  const {a,page}=await setup({mode:'recall',question:'Explain the rule.'});await page.locator('#submit').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Write a response'));await page.locator('#cancel').click();assert.equal((await a.result).status,'cancelled');
 });
 await t.test('dashboard opens as local HTML at phone width',async()=>{
  const page=await context.newPage();const file=saveDashboard(new Store(root));await page.goto(pathToFileURL(file).href);assert.equal(await page.locator('h1').textContent(),'Evidence, not a mastery score');assert.equal(await page.locator('.cards section').count(),4);await page.close();
 });
});
