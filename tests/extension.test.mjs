import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadExtensions} from '../node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/loader.js';
const project=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
async function harness(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'opera-extension-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.cpSync(path.join(project,'.pi/extensions'),path.join(root,'.pi/extensions'),{recursive:true});fs.cpSync(path.join(project,'.pi/skills/learning-system'),path.join(root,'.pi/skills/learning-system'),{recursive:true});fs.symlinkSync(path.join(project,'node_modules'),path.join(root,'node_modules'),process.platform==='win32'?'junction':'dir');
 const loaded=await loadExtensions([path.join(root,'.pi/extensions/opera/index.ts')],root);assert.deepEqual(loaded.errors,[]);
 const ext=loaded.extensions[0],notifications=[],queue=[],edits=[],messages=[],headers=[],titles=[];
 loaded.runtime.sendUserMessage=(message)=>messages.push(message);
 const ctx={cwd:root,mode:'tui',hasUI:true,isIdle:()=>true,sessionManager:{getSessionId:()=> 'session-test'},ui:{notify:(...x)=>notifications.push(x),setStatus:()=>{},setHeader:factory=>headers.push(factory),setTitle:title=>titles.push(title),input:async()=>edits.shift(),editor:async()=>edits.shift(),select:async(title,options)=>{const choice=queue.shift();return typeof choice==='function'?choice(options):choice;}}};
 const emit=async(name,event={})=>{for(const h of ext.handlers.get(name)||[])await h(event,ctx);};
 await emit('session_start');
 const tool=(name,p)=>ext.tools.get(name).definition.execute('call',p,undefined,undefined,ctx);
 const reset=()=>emit('before_agent_start',{messageType:'user',prompt:'next'});
 return {root,ext,ctx,queue,edits,messages,notifications,headers,titles,tool,reset,emit,state:()=>JSON.parse(fs.readFileSync(path.join(root,'.opera/state.json'),'utf8'))};
}
const choice={mode:'choice',topic:'security',concept:'authorization',dimension:'recognition',question:'Which controls permission?',options:[{id:'a',label:'Authentication'},{id:'b',label:'Authorization'}],correctId:'b',explanation:'Authorization decides permitted actions.'};
test('real Pi loader registers three commands and core tools',async t=>{const h=await harness(t);assert.deepEqual([...h.ext.commands.keys()].sort(),['learn','opera','review']);assert.equal(h.ext.tools.size,5);});
test('OPERA branding replaces header only in terminal mode without more commands',async t=>{
 const h=await harness(t);assert.equal(h.headers.length,1);assert.equal(h.titles[0],'OPERA');
 const theme={appearance:'dark',style:text=>text,fg:(_role,text)=>text};
 const header=h.headers[0]({requestRender(){}},theme);try{assert.ok(header.render(120).length>0);assert.equal(typeof header.handleMouse,'function');assert.doesNotMatch(header.render(120).join('\n'),/THE STOIC STUDY|Marcus Aurelius-inspired/);}finally{header.dispose();}
 h.ctx.mode='rpc';await h.emit('session_start');assert.equal(h.headers.length,1);assert.equal(h.ext.commands.size,3);
});
test('interactive choice captures the actual selection, grades it, and enforces a pause',async t=>{
 const h=await harness(t);await h.reset();h.queue.push(options=>options.find(x=>x.endsWith('. Authorization')));const result=await h.tool('opera_quiz',choice);assert.equal(result.details.attempt.verdict,'correct');assert.equal(h.state().attempts.length,1);
 await assert.rejects(h.tool('opera_quiz',choice),/One question/);
 assert.equal(fs.existsSync(path.join(h.root,'Learning/Sessions')),false);
});
test('written recall requires actual input before assessment and survives reload',async t=>{
 const h=await harness(t);await h.reset();h.edits.push('It checks what this identity may do.');const result=await h.tool('opera_quiz',{...choice,mode:'recall',dimension:'explanation'});assert.equal(result.details.status,'awaiting_feedback');assert.equal(h.state().attempts[0].verdict,'pending');
 await h.tool('opera_progress',{action:'assess',attemptId:result.details.attemptId,verdict:'correct',feedback:'Explains the identity/permission distinction.'});assert.equal(h.state().attempts[0].evidence,'independently_correct');
 await h.emit('session_start');assert.equal(h.state().attempts.length,1);
});
test('hint assistance and cancelled prompts do not become independent success',async t=>{
 const h=await harness(t);await h.reset();h.queue.push('Hint',options=>options.find(x=>x.endsWith('. Authorization')));await h.tool('opera_quiz',{...choice,hint:'Focus on permitted actions.'});assert.equal(h.state().attempts[0].assistance,'hint');assert.equal(h.state().attempts[0].evidence,'improving');
 await h.reset();h.queue.push(undefined);const result=await h.tool('opera_quiz',choice);assert.equal(result.details.status,'cancelled');assert.equal(h.state().attempts.length,1);
});
test('noninteractive quiz leaks no key and creates no pretend answer',async t=>{
 const h=await harness(t);h.ctx.hasUI=false;const result=await h.tool('opera_quiz',choice);assert.equal(result.details.status,'unavailable');assert.doesNotMatch(JSON.stringify(result),/Authorization decides|correctId/);assert.equal(fs.existsSync(path.join(h.root,'.opera/state.json')),false);
});
test('source command registers a folder and sends one selected source, not the whole vault',async t=>{
 const h=await harness(t),vault=path.join(h.root,'example vault');fs.mkdirSync(vault);fs.writeFileSync(path.join(vault,'one.md'),'one');fs.writeFileSync(path.join(vault,'two.md'),'two');h.edits.push('one');h.queue.push('one.md');const selected=await h.tool('opera_source',{action:'select',path:vault});assert.equal(selected.details.file,'one.md');assert.equal(h.messages.length,0);assert.equal(h.state().activeSource.file,'one.md');
});
async function activityURL(h){for(let i=0;i<200;i++){const found=h.notifications.find(([text])=>text.startsWith('Activity: http'));if(found)return found[0].match(/http:\/\/[^\s]+/)[0];await new Promise(r=>setTimeout(r,10));}throw Error('No activity URL emitted.');}
async function submitURL(url,body){return fetch(url+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
test('task browser integrates capture, rubric assessment, issue annotation and dashboard',async t=>{
 const h=await harness(t);h.ctx.mode='rpc';await h.reset();
 const pending=h.tool('opera_quiz',{mode:'task',topic:'coding',concept:'boundary',dimension:'application',question:'Handle an empty array.',rubric:['Handles empty input','Explains why']});
 const url=await activityURL(h);await submitURL(url,{response:'if (items.length === 0) return 0; This avoids accessing the first item.'});const result=await pending;assert.equal(result.details.status,'awaiting_feedback');
 await assert.rejects(h.tool('opera_progress',{action:'assess',attemptId:result.details.attemptId,verdict:'correct',feedback:'Good.'}),/rubric/);
 const criteria=[{criterion:'Handles empty input',result:'met',reason:'The branch checks length zero.'},{criterion:'Explains why',result:'met',reason:'Explains invalid indexing.'}];
 await h.tool('opera_progress',{action:'assess',attemptId:result.details.attemptId,verdict:'correct',feedback:'Meets this code-inspection rubric; no execution claimed.',criteria});
 const dashboard=await h.tool('opera_progress',{action:'dashboard'});assert.ok(fs.existsSync(dashboard.details.saved));assert.equal(h.state().attempts.length,1);
 await assert.rejects(h.tool('opera_quiz',choice),/One question/);
});
test('session shutdown closes waiting browser activity without creating an attempt',async t=>{
 const h=await harness(t);h.ctx.mode='rpc';await h.reset();const pending=h.tool('opera_quiz',{mode:'recall',presentation:'browser',topic:'math',concept:'addition',dimension:'explanation',question:'Explain addition.'});await activityURL(h);await h.emit('session_shutdown');assert.equal((await pending).details.status,'cancelled');assert.equal(fs.existsSync(path.join(h.root,'.opera/state.json')),false);
});
test('browser preference persists without another command; option text skip is still a real answer',async t=>{
 const h=await harness(t);h.ctx.mode='rpc';h.queue.push('Practice interface','Browser (HTML)');await h.ext.commands.get('opera').handler('',h.ctx);assert.equal(h.state().practicePresentation,'browser');await h.reset();
 const pending=h.tool('opera_quiz',{...choice,question:'Choose the literal word skip.',options:[{id:'a',label:'skip'},{id:'b',label:'other'}],correctId:'a'});const url=await activityURL(h);await submitURL(url,{selected:'a'});const result=await pending;assert.equal(result.details.attempt.verdict,'correct');assert.equal(h.ext.commands.size,3);
});
test('text-only prompts cannot establish listening or speaking evidence',async t=>{
 const h=await harness(t);await h.reset();await assert.rejects(h.tool('opera_quiz',{...choice,dimension:'listening'}),/requires an audio activity/);
});
test('resume and natural issue updates preserve the original grade',async t=>{
 const h=await harness(t);await h.reset();h.queue.push(options=>options.find(x=>x.endsWith('. Authentication')));const result=await h.tool('opera_quiz',choice);
 await h.tool('opera_progress',{action:'annotate',attemptId:result.details.attempt.id,mistake:'Confuses identity verification with permission checks.',followUp:'Use a new access-control scenario.'});
 h.queue.push('Resume');await h.ext.commands.get('opera').handler('',h.ctx);assert.ok(h.messages.length);
 await h.tool('opera_progress',{action:'issue',attemptId:result.details.attempt.id,status:'disputed',reason:'I clicked the wrong option.'});assert.equal(h.state().attempts[0].mistake.status,'disputed');assert.equal(h.state().attempts[0].verdict,'incorrect');
});

test('source menu offers native file and folder pickers without requiring a path',async t=>{
 const h=await harness(t);h.queue.push(options=>{assert.ok(options.includes('Browse files…'));assert.ok(options.includes('Browse folder…'));return undefined;});
 await h.tool('opera_source',{action:'select'});assert.equal(h.messages.length,0);assert.equal(fs.existsSync(path.join(h.root,'.opera/state.json')),false);
});
test('source selection is single-instance and session shutdown cancels it without a source write',async t=>{
 const h=await harness(t);let release;h.ctx.ui.select=()=>new Promise(resolve=>{release=resolve;});
 const pending=h.tool('opera_source',{action:'select'});await h.tool('opera_source',{action:'select'});
 assert.ok(h.notifications.some(([text])=>text.includes('source picker is already open')));
 await h.emit('session_shutdown');release('Browse files…');await pending;
 assert.equal(h.messages.length,0);assert.equal(fs.existsSync(path.join(h.root,'.opera/state.json')),false);
});

test('learn and opera select a source, and bare learn resumes without another intake',async t=>{
 const h=await harness(t),source=path.join(h.root,'lesson.md');fs.writeFileSync(source,'# A source\nA focused section.');
 h.queue.push('Select source','Enter a path');h.edits.push(source);
 await h.ext.commands.get('opera').handler('',h.ctx);
 assert.match(h.messages.at(-1),/lesson.md/);assert.equal(h.state().activeSource.file,'');
 await h.ext.commands.get('learn').handler('Mechanisms',h.ctx);
 await h.tool('opera_progress',{action:'checkpoint',summary:'Distinguish the cause from the symptom.',objective:'Explain the mechanism',pendingQuestion:'Why does this change?',section:'A focused section',next:'Answer the pending why question.'});
 const count=h.edits.length;await h.ext.commands.get('learn').handler('',h.ctx);
 assert.equal(h.edits.length,count);assert.match(h.messages.at(-1),/Why does this change/);
 assert.equal(h.state().topics[h.state().activeTopic].checkpoint.section,'A focused section');
});
test('bare learn offers source selection when no objective exists',async t=>{
 const h=await harness(t);h.queue.push(options=>{assert.ok(options.includes('Browse files…'));return undefined;});
 await h.ext.commands.get('learn').handler('',h.ctx);assert.equal(h.messages.length,0);
});
test('show-answer exposure creates no achievement and survives a later hint and checkpoint',async t=>{
 const h=await harness(t);await h.reset();h.queue.push('Show the answer');
 const exposed=await h.tool('opera_quiz',choice);
 assert.equal(exposed.details.status,'answer_requested');assert.equal(h.state().attempts.length,0);
 assert.equal(h.state().answerExposure[0].assistance,'answer_shown');
 await h.reset();h.queue.push('Hint',options=>options.find(x=>x.endsWith('. Authorization')));
 const answer=await h.tool('opera_quiz',{...choice,hint:'Think about permission.'});
 assert.equal(answer.details.attempt.assistance,'answer_shown');
 assert.notEqual(answer.details.attempt.evidence,'independently_correct');
 await h.tool('opera_progress',{action:'checkpoint',summary:'Saw answer, then repeated with help.',next:'Try a different example later.'});
 const cp=h.state().topics[h.state().activeTopic].checkpoint;
 assert.equal(cp.assistance,'answer_shown');assert.equal(cp.answerExposure.question,choice.question);
});
test('natural style and exposure updates use existing tools and do not fabricate answers',async t=>{
 const h=await harness(t);await h.ext.commands.get('learn').handler('math',h.ctx);
 await h.tool('opera_progress',{action:'style',style:'explain'});
 await h.tool('opera_progress',{action:'expose',pendingQuestion:'Explain a derivative.'});
 assert.equal(h.state().style,'explain');assert.equal(h.state().attempts.length,0);
});
test('startup never logs or rewrites existing learner notes even if legacy logging is true',async t=>{
 const h=await harness(t);
 const state={version:1,style:'balanced',logging:true,roots:[],topics:{},attempts:[],custom:{keep:true}};
 fs.mkdirSync(path.join(h.root,'.opera'),{recursive:true});fs.writeFileSync(path.join(h.root,'.opera/state.json'),JSON.stringify(state));
 fs.mkdirSync(path.join(h.root,'Learning/Sessions'),{recursive:true});
 const log=path.join(h.root,'Learning/Sessions/old.md');fs.writeFileSync(log,'existing personal log');
 const before=fs.readFileSync(path.join(h.root,'.opera/state.json'));
 await h.emit('session_start');await h.emit('message_end',{message:{role:'user',content:'Do not duplicate me.'}});
 assert.equal(fs.readFileSync(log,'utf8'),'existing personal log');
 assert.deepEqual(fs.readFileSync(path.join(h.root,'.opera/state.json')),before);
 assert.deepEqual(fs.readdirSync(path.join(h.root,'Learning/Sessions')),['old.md']);
 assert.equal(h.ext.handlers.has('message_end'),false);
});
test('per-turn payload contains compact relevant state and no duplicated teaching contract',async t=>{
 const h=await harness(t);await h.ext.commands.get('learn').handler('A concept',h.ctx);
 const handler=h.ext.handlers.get('before_agent_start')[0];
 const result=await handler({prompt:'next'},h.ctx),content=result.message.content;
 assert.match(content,/A concept/);assert.doesNotMatch(content,/## Teaching|# Shared learning core|Orient|game/i);
 assert.ok(content.length<1000);
 assert.equal(h.ext.handlers.get('before_agent_start').length,1);
});

test('browser answer requests record exposure without a submitted answer',async t=>{
 const h=await harness(t);h.ctx.mode='rpc';await h.reset();
 const pending=h.tool('opera_quiz',{...choice,presentation:'browser'}),url=await activityURL(h);
 const response=await fetch(url+'/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 assert.equal(response.status,200);
 const result=await pending;assert.equal(result.details.status,'answer_requested');
 assert.equal(result.details.answer,'Authorization');assert.equal(h.state().attempts.length,0);
 assert.equal(h.state().answerExposure[0].question,choice.question);
});

test('model context keeps one fresh snapshot and preserves saved conversation entries',async t=>{
 const h=await harness(t);
 const messages=[{role:'custom',customType:'opera-context',content:'OLD CORE GAME INSTRUCTIONS',display:false,timestamp:1},{role:'user',content:'My actual question',timestamp:2},{role:'custom',customType:'another-plugin',content:'Keep this',display:false,timestamp:3},{role:'custom',customType:'opera-context',content:'STALE SNAPSHOT',display:false,timestamp:4}];
 const original=JSON.stringify(messages),result=await h.ext.handlers.get('context')[0]({messages},h.ctx);
 assert.equal(JSON.stringify(messages),original);
 assert.equal(result.messages.filter(m=>m.customType==='opera-context').length,1);
 assert.equal(result.messages[0].content,'My actual question');
 assert.ok(result.messages.some(m=>m.customType==='another-plugin'));
 assert.doesNotMatch(JSON.stringify(result.messages),/OLD CORE GAME|STALE SNAPSHOT/);
});
test('focused notes and visuals still save without a session transcript',async t=>{
 const h=await harness(t);h.ctx.mode='rpc';
 const note=await h.tool('opera_note',{title:'Rates',body:'Purpose: describe change.\nMechanism: a limit.\nExample: distance/time.\nLimit: local rate.\nSource: chapter.md\n\nRecall: what changes?\n\nAnswers: the dependent quantity.'});
 assert.match(fs.readFileSync(note.details.saved,'utf8'),/Source: chapter.md/);
 const visual=await h.tool('opera_visual',{title:'Rate relationship',mode:'map',source:'chapter.md',nodes:[{id:'change',label:'Change',detail:'Difference over an interval.'}]});
 assert.equal(visual.details.browserOpenRequested,false);
 for(const field of ['html','svg','note'])assert.ok(fs.existsSync(visual.details[field]));
 assert.equal(fs.existsSync(path.join(h.root,'Learning/Sessions')),false);
});
