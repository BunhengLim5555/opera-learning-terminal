import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import {startActivity,publicActivity,validateActivity} from '../.pi/extensions/opera/lib/activity.mjs';
import {Store} from '../.pi/extensions/opera/lib/store.mjs';
import {recommendations,evidenceRows,renderDashboard,reviewPrompt} from '../.pi/extensions/opera/lib/insights.mjs';
const prediction={mode:'prediction',question:'Predict the output and explain.',scenarios:[{id:'a',label:'One iteration',setup:'x=1; x+=1',outcome:'PRIVATE_OUTCOME: x is 2'},{id:'b',label:'Two iterations',setup:'x=1; repeat twice: x+=1',outcome:'PRIVATE_SECOND: x is 3'}],hint:'Track each update.'};
function temp(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'opera-activity-'));t.after(()=>fs.rmSync(root,{force:true,recursive:true}));return root;}
async function launch(t,p=prediction,options={}){const activity=await startActivity(p,{root:temp(t),...options});t.after(()=>activity.close());return activity;}
async function post(activity,route,body={},headers={}){return fetch(activity.url+route,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});}
function capture(store,extra={}){return store.capture({topic:'Programming',concept:'updates',dimension:'application',question:'Fix this function',response:'my solution',sessionId:'s1',...extra});}
test('prediction key stays server-side, requires a commit, and records both stages',async t=>{
 const a=await launch(t);const response=await fetch(a.url),html=await response.text();assert.equal(response.status,200);assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.doesNotMatch(html,/PRIVATE_OUTCOME|PRIVATE_SECOND/);
 assert.equal((await post(a,'/submit',{response:'guess'})).status,400);
 const result=await post(a,'/predict',{scenarioId:'b',response:'I predict 3 because it updates twice.'});assert.match((await result.json()).outcome,/PRIVATE_SECOND/);
 assert.equal((await post(a,'/predict',{scenarioId:'a',response:'changed'})).status,409);
 assert.equal((await post(a,'/submit',{response:'The initial value is incremented twice.'})).status,200);
 const saved=await a.result;assert.equal(saved.activity.scenarioId,'b');assert.match(saved.activity.prediction,/predict 3/);assert.equal(saved.activity.predictionAssistance,'none');assert.equal(saved.assistance,'outcome_observed');
});
test('browser rejects other origins, missing token, and non-JSON posts',async t=>{
 const a=await launch(t);assert.equal((await fetch(new URL('/wrong',a.url))).status,404);
 assert.equal((await post(a,'/predict',{}, {Origin:'https://attacker.test'})).status,403);
 assert.equal((await fetch(a.url+'/submit',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'})).status,415);
 assert.equal((await post(a,'/cancel')).status,200);assert.equal((await a.result).status,'cancelled');
});
test('hint and outside help remain assisted; cancel, abort and timeout create no answer',async t=>{
 const a=await launch(t,{mode:'recall',question:'Explain',hint:'Think about state.'});await post(a,'/hint');await post(a,'/submit',{response:'State changes.',help:true});assert.equal((await a.result).assistance,'hint');
 const controller=new AbortController(),b=await launch(t,prediction,{signal:controller.signal});controller.abort();assert.equal((await b.result).status,'cancelled');
 const c=await launch(t,prediction,{timeoutMs:20});assert.equal((await c.result).status,'cancelled');
 const d=await launch(t,{mode:'recall',question:'Explain'});await post(d,'/submit',{response:'A solution',help:true});assert.equal((await d.result).assistance,'tool_assisted');
});
test('choice browser never sends keys in public question and uses stable IDs',async t=>{
 const p={mode:'choice',question:'Which?',options:[{id:'a',label:'Alpha'},{id:'b',label:'Beta'}],correctId:'b',explanation:'PRIVATE_EXPLANATION'};
 const a=await launch(t,p),html=await (await fetch(a.url)).text();assert.doesNotMatch(html,/PRIVATE_EXPLANATION|correctId/);assert.equal((await post(a,'/submit',{selected:'unknown'})).status,400);await post(a,'/submit',{selected:'b'});assert.equal((await a.result).response,'Beta');
});
test('audio keeps reference hidden, tracks reveal, and requires consent to persist a recording',async t=>{
 const root=temp(t),a=await launch(t,{mode:'audio',question:'Write what you hear.',audio:{text:'PRIVATE_JAPANESE_REFERENCE',language:'ja-JP',goal:'listen'}},{root});
 assert.doesNotMatch(await (await fetch(a.url)).text(),/PRIVATE_JAPANESE_REFERENCE/);
 assert.equal((await (await post(a,'/listen')).json()).text,'PRIVATE_JAPANESE_REFERENCE');
 await post(a,'/reference');
 assert.equal((await post(a,'/submit',{response:'Answer',recording:{type:'audio/webm',data:'YWJj'}})).status,400);
 await post(a,'/submit',{response:'Answer',recordingConsent:true,recording:{type:'audio/webm',data:'YWJj'}});
 const saved=await a.result;assert.equal(saved.assistance,'answer_shown');assert.equal(saved.activity.playRequests,1);assert.equal(saved.activity.referenceRevealed,true);assert.equal(fs.readFileSync(saved.activity.recording,'utf8'),'abc');
});
test('fragmented UTF-8 submissions preserve Japanese responses exactly',async t=>{
 const a=await launch(t,{mode:'recall',question:'Write your sentence.'}),response='締切は明日です。',bytes=Buffer.from(JSON.stringify({response})),cut=bytes.indexOf(Buffer.from('締'))+1;
 await new Promise((resolve,reject)=>{const req=http.request(a.url+'/submit',{method:'POST',headers:{'Content-Type':'application/json'}},res=>{res.resume();res.on('end',resolve);});req.on('error',reject);req.write(bytes.subarray(0,cut));setTimeout(()=>req.end(bytes.subarray(cut)),10);});assert.equal((await a.result).response,response);
});
test('audio skips and browser cancellations do not upload recordings',async t=>{
 const root=temp(t),a=await launch(t,{mode:'audio',question:'Speak then reflect.',audio:{text:'Hello',language:'en-US',goal:'speak'}},{root});await post(a,'/submit',{action:'skip',recordingConsent:true,recording:{type:'audio/webm',data:'YWJj'}});assert.equal((await a.result).activity.recording,null);assert.equal(fs.existsSync(path.join(root,'Learning','Audio')),false);
});
test('task rubric is mandatory and assessment rejects unsupported correct verdicts',t=>{
 assert.throws(()=>validateActivity({mode:'task',question:'Fix it'}),/rubric/);
 const s=new Store(temp(t)),a=capture(s,{activity:{mode:'task',rubric:['Handles empty input','Explains the fix']}});
 assert.throws(()=>s.assess(a.id,'correct','Fine'),/every task rubric/);
 const criteria=[{criterion:'Handles empty input',result:'not_observed',reason:'No test run yet.'},{criterion:'Explains the fix',result:'met',reason:'Explains the branch.'}];
 assert.throws(()=>s.assess(a.id,'correct','Fine',new Date(),{criteria}),/all rubric criteria/);
 s.assess(a.id,'partial','Explanation works; execution is unverified.',new Date(),{criteria,mistake:'The empty-input behavior is not yet demonstrated.',followUp:'Try an empty input in a fresh example.'});assert.equal(s.read().attempts[0].mistake.status,'open');
});
test('speaking recordings cannot be graded from text; unassessed does not create a due target',t=>{
 const s=new Store(temp(t)),a=capture(s,{dimension:'speaking',activity:{mode:'audio',recording:'local.webm'}});
 assert.throws(()=>s.assess(a.id,'correct','Transcript looks good.'),/qualified audio assessment/);s.assess(a.id,'not_assessed','No qualified audio evaluation.');assert.equal(s.read().attempts[0].evidence,'unassessed');assert.equal(s.due('2099-01-01').length,0);
});
test('mistakes are grounded, disputable, and do not overwrite original grades',t=>{
 const s=new Store(temp(t)),a=capture(s);s.assess(a.id,'incorrect','Counted the initial value twice.');s.recordMistake(a.id,'Counts the starting value as an update.','Use a different starting value.');s.annotateMistake(a.id,'disputed','I meant something different.');assert.equal(s.read().attempts[0].verdict,'incorrect');assert.equal(s.read().attempts[0].mistake.history.length,1);assert.equal(recommendations(s).mistakes.length,0);
 assert.throws(()=>s.recordMistake('fabricated','wrong'),/actual assessed/);
});
test('home reasons and dashboard preserve evidence dimensions, unknowns and literal responses',t=>{
 const s=new Store(temp(t));assert.equal(recommendations(s).continue.reason,'Choose one small learning objective.');
 const a=capture(s,{dimension:'recognition',response:'<script>bad()</script>'});assert.match(recommendations(s).continue.reason,/awaiting feedback/);s.assess(a.id,'correct','Identified it.');
 const b=capture(s,{dimension:'recognition',assistance:'hint'});s.assess(b.id,'correct','With help.');
 const rows=evidenceRows(s.read());assert.equal(rows.length,1);assert.equal(rows[0].independent,1);assert.equal(rows[0].assisted,1);assert.match(recommendations(s).apply.reason,/recognized/);
 const html=renderDashboard(s);assert.doesNotMatch(html,/<script>bad/);assert.match(html,/&lt;script&gt;/);assert.match(html,/application/);assert.match(html,/not a mastery score/);assert.match(reviewPrompt(s.read(),a),/preserve the target dimension/);
});
test('legacy v1 records survive additive fields and unrelated settings are preserved',t=>{
 const s=new Store(temp(t)),a=capture(s);s.mutate(state=>{delete state.attempts[0].activity;state.customSetting={keep:true};});s.assess(a.id,'partial','One gap.',new Date(),{mistake:'One precise gap.'});assert.deepEqual(s.read().customSetting,{keep:true});assert.equal(s.read().version,1);
});
test('a later hint cannot retroactively change prediction assistance; refresh can recover the commit',async t=>{
 const a=await launch(t);assert.equal((await (await post(a,'/state')).json()).outcome,null);
 await post(a,'/predict',{scenarioId:'a',response:'2'});await post(a,'/hint');
 const restored=await (await post(a,'/state')).json();assert.equal(restored.prediction,'2');assert.match(restored.outcome,/PRIVATE_OUTCOME/);
 await post(a,'/submit',{response:'It increments once.'});const saved=await a.result;assert.equal(saved.activity.predictionAssistance,'none');assert.equal(saved.assistance,'hint');assert.deepEqual(saved.activity.supportEvents,['hint','outcome_observed']);
 const b=await launch(t);await post(b,'/predict',{scenarioId:'a',response:'2',help:true});await post(b,'/submit',{response:'A tool helped.'});assert.equal((await b.result).activity.predictionAssistance,'tool_assisted');
});
test('no playback cannot be treated as listening competence',t=>{
 const s=new Store(temp(t)),a=capture(s,{dimension:'listening',activity:{mode:'audio',playRequests:0}});assert.throws(()=>s.assess(a.id,'correct','Looks correct'),/No reference playback/);s.assess(a.id,'not_assessed','No audio playback was available.');assert.equal(s.due('2099-01-01').length,0);
});
test('crossing midnight alone does not establish delayed recall',t=>{
 const s=new Store(temp(t)),base={topic:'Math',concept:'addition',dimension:'application',question:'Sum',response:'2'};
 const a=s.capture({...base,sessionId:'s1'},new Date('2026-01-01T23:59:00'));s.assess(a.id,'correct','Correct',new Date('2026-01-01T23:59:00'));
 const b=s.capture({...base,sessionId:'s2'},new Date('2026-01-02T00:01:00'));s.assess(b.id,'correct','Correct',new Date('2026-01-02T00:01:00'));assert.equal(s.read().attempts[1].evidence,'independently_correct');
});
