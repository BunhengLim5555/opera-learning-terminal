import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store,localDay,addDays} from '../.pi/extensions/opera/lib/store.mjs';
import {registerSource,listSources,readSource,searchSource,fetchText} from '../.pi/extensions/opera/lib/sources.mjs';
import {prepareQuestion,gradeChoice,publicPrompt} from '../.pi/extensions/opera/lib/quiz.mjs';
import {renderVisual,saveVisual} from '../.pi/extensions/opera/lib/visual.mjs';
function temp(t){const p=fs.mkdtempSync(path.join(os.tmpdir(),'opera-test-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;}
function attempt(store,extra={},day='2026-10-22'){return store.capture({topic:'ML',concept:'gradient',dimension:'application',question:'Predict direction',response:'opposite slope',sessionId:'s1',...extra},new Date(day+'T12:00:00'));}
test('captured attempts persist, grading is idempotent, and fabricated IDs fail',t=>{
 const root=temp(t),store=new Store(root),a=attempt(store);assert.equal(store.read().attempts[0].verdict,'pending');
 store.assess(a.id,'correct','Valid local step',new Date('2026-10-22T12:00:00'));
 store.assess(a.id,'correct','Valid local step');assert.equal(store.read().attempts.length,1);
 assert.throws(()=>store.assess('invented','correct','fake'),/never captured/);
 assert.throws(()=>store.assess(a.id,'incorrect','changed'),/already graded/);
 assert.equal(new Store(root).read().attempts[0].evidence,'independently_correct');
});
test('hints, same-day repeats and later sessions have different evidence',t=>{
 const s=new Store(temp(t));const a=attempt(s,{assistance:'hint'});s.assess(a.id,'correct','cue helped',new Date('2026-10-22T12:00:00'));assert.equal(s.read().attempts[0].evidence,'improving');
 const b=attempt(s);s.assess(b.id,'correct','independent',new Date('2026-10-22T12:00:00'));assert.equal(s.read().attempts[1].interval,1);
 const c=attempt(s,{sessionId:'s2',context:'new_context'},'2026-10-23');s.assess(c.id,'correct','later application',new Date('2026-10-23T12:00:00'));assert.equal(s.read().attempts[2].evidence,'delayed_correct');assert.equal(s.read().attempts[2].interval,3);
});
test('due queue uses latest evidence and skips do not erase weaknesses',t=>{
 const s=new Store(temp(t));const a=attempt(s);s.assess(a.id,'incorrect','sign reversed',new Date('2026-10-22T12:00:00'));
 const b=attempt(s);s.assess(b.id,'skipped','skip',new Date('2026-10-22T12:00:00'));
 assert.equal(s.due('2026-10-22').length,0);assert.equal(s.due('2026-10-23').length,1);assert.equal(s.due('2026-10-23')[0].id,a.id);
});
test('corrupt state is not reset and an active file lock prevents lost writes',t=>{
 const root=temp(t),s=new Store(root);s.setTopic('Networking');const previous=fs.readFileSync(s.file);fs.writeFileSync(path.join(s.dir,'write.lock'),'active');assert.throws(()=>s.setTopic('ML'),/write is active/);assert.deepEqual(fs.readFileSync(s.file),previous);fs.unlinkSync(path.join(s.dir,'write.lock'));
 fs.writeFileSync(s.file,'{bad json');assert.throws(()=>s.setTopic('new'));assert.equal(fs.readFileSync(s.file,'utf8'),'{bad json');
});
test('dates work across month and year boundaries',()=>{assert.equal(addDays('2026-12-31',1),'2027-01-01');assert.equal(addDays('2028-02-28',1),'2028-02-29');});
test('source listing/search/excerpts work for spaces and nested files',async t=>{
 const root=temp(t),vault=path.join(root,'My Vault');fs.mkdirSync(path.join(vault,'Course'),{recursive:true});fs.writeFileSync(path.join(vault,'Course','My note.md'),'# Topic\nGradient descent\nthird line');fs.mkdirSync(path.join(vault,'.pi'));fs.writeFileSync(path.join(vault,'.pi','hidden.md'),'secret');
 const store=new Store(root),source=registerSource(store,vault);assert.deepEqual(listSources(source).items,[path.join('Course','My note.md')]);assert.equal(searchSource(source,'gradient').hits[0].line,2);
 const read=await readSource(source,path.join('Course','My note.md'),2,1);assert.equal(read.text,'2: Gradient descent');assert.equal(read.nextLine,3);assert.equal(registerSource(store,vault).id,source.id);
});
test('sources reject traversal and escaping symlinks',async t=>{
 const root=temp(t),vault=path.join(root,'vault'),outside=path.join(root,'outside');fs.mkdirSync(vault);fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'private.md'),'private');fs.symlinkSync(outside,path.join(vault,'link'),process.platform==='win32'?'junction':'dir');
 const source=registerSource(new Store(root),vault);await assert.rejects(readSource(source,'../outside/private.md'),/leaves/);await assert.rejects(readSource(source,'link/private.md'),/leaves/);assert.equal(listSources(source).items.length,0);
});
test('a selected single file does not grant access to sibling files',async t=>{
 const root=temp(t);fs.writeFileSync(path.join(root,'a.md'),'A');fs.writeFileSync(path.join(root,'b.md'),'B');const source=registerSource(new Store(root),path.join(root,'a.md'));await assert.rejects(readSource(source,'b.md'),/one file/);
});
test('notebook extraction preserves code without executing it',async t=>{
 const root=temp(t),p=path.join(root,'test.ipynb');fs.writeFileSync(p,JSON.stringify({cells:[{cell_type:'code',source:['print("hello")'],outputs:[{text:'unverified output'}]}]}));const result=await readSource(registerSource(new Store(root),p));assert.match(result.text,/print/);assert.doesNotMatch(result.text,/unverified/);
});
test('public-page extraction excludes scripts and rejects errors or nontext',async()=>{
 const result=await fetchText('https://example.test/',async()=>new Response('<h1>A &amp; B</h1><script>secret()</script><p>Content</p>',{headers:{'content-type':'text/html'}}));assert.match(result.text,/A & B/);assert.doesNotMatch(result.text,/secret/);
 await assert.rejects(fetchText('https://example.test/',async()=>new Response('blocked',{status:403})),/403/);
 await assert.rejects(fetchText('https://example.test/',async()=>new Response('binary',{headers:{'content-type':'video/mp4'}})),/must return/);
});
test('option shuffling keeps stable answer IDs; public prompt hides keys',()=>{
 const p={mode:'choice',question:'Which?',options:[{id:'a',label:'Alpha'},{id:'b',label:'Beta'}],correctId:'a',explanation:'Private key'};const options=prepareQuestion(p,()=>0);assert.equal(options[0].id,'b');assert.equal(gradeChoice('a',p.correctId),'correct');assert.equal(gradeChoice('__skip','a'),'skipped');assert.equal(gradeChoice('__idk','a'),'idk');assert.doesNotMatch(JSON.stringify(publicPrompt(p,options)),/Private key|correctId/);
 assert.throws(()=>prepareQuestion({...p,correctId:'bad'}),/matching/);
});
test('visual renders escaped data, local assets, matching SVG and Markdown',t=>{
 const v={title:'<script>alert(1)</script>',mode:'map',nodes:[{id:'a',label:'Input',detail:'</script><img src=x onerror=alert(1)>'},{id:'b',label:'Output',detail:'Consequence'}],edges:[{from:'a',to:'b'}]};
 const r=renderVisual(v);assert.match(r.html,/&lt;script&gt;/);assert.doesNotMatch(r.html,/<img src=x/);assert.match(r.html,/Content-Security-Policy/);assert.doesNotMatch(r.html,/https:\/\/cdn/);
 const saved=saveVisual(temp(t),v);for(const p of Object.values(saved))assert.ok(fs.existsSync(p));assert.match(fs.readFileSync(saved.note,'utf8'),/```mermaid/);
 assert.throws(()=>renderVisual({...v,edges:[{from:'a',to:'missing'}]}),/missing node/);
});

test('visual controls select nodes and clamp navigation without executing detail text',async()=>{
 const {runInNewContext}=await import('node:vm');
 const v={title:'Walkthrough',mode:'steps',nodes:[{id:'a',label:'First',detail:'<b>literal text</b>'},{id:'b',label:'Second',detail:'Second detail'}]};
 const html=renderVisual(v).html,script=html.match(/<script nonce="[^"]+">([\s\S]*)<\/script>/)[1];
 const elements=Object.fromEntries(['title','detail','count','prev','next'].map(id=>[id,{textContent:'',disabled:false}]));
 const nodes=v.nodes.map(n=>({dataset:{id:n.id},events:{},classList:{toggle(name,on){this[name]=on;}},addEventListener(name,fn){this.events[name]=fn;}}));
 runInNewContext(script,{document:{getElementById:id=>elements[id],querySelectorAll:()=>nodes}});
 assert.equal(elements.title.textContent,'First');assert.equal(elements.detail.textContent,'<b>literal text</b>');assert.equal(elements.prev.disabled,true);
 elements.next.onclick();assert.equal(elements.title.textContent,'Second');assert.equal(elements.next.disabled,true);
 elements.next.onclick();assert.equal(elements.count.textContent,'2 / 2');
 nodes[0].events.click();assert.equal(elements.title.textContent,'First');
 let prevented=false;nodes[1].events.keydown({key:'Enter',preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(elements.title.textContent,'Second');assert.equal(nodes[1].classList.active,true);
});
