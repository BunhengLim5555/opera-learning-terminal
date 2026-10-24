import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {Store,emptyState} from '../.pi/extensions/opera/lib/store.mjs';
import {compactContext} from '../.pi/extensions/opera/lib/context.mjs';
import {loadProjectContextFiles} from '../node_modules/@earendil-works/pi-coding-agent/dist/core/resource-loader.js';
import {loadSkillsFromDir} from '../node_modules/@earendil-works/pi-coding-agent/dist/core/skills.js';
const project=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function temp(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'opera-lean-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
test('Pi discovers the single teaching contract and one reference skill',t=>{
 const root=temp(t);fs.copyFileSync(path.join(project,'AGENTS.md'),path.join(root,'AGENTS.md'));
 fs.cpSync(path.join(project,'.pi/skills'),path.join(root,'.pi/skills'),{recursive:true});
 const context=loadProjectContextFiles({cwd:root,agentDir:path.join(root,'no-global-agent')});
 assert.equal(context.filter(c=>c.path===path.join(root,'AGENTS.md')).length,1);
 assert.match(context.find(c=>c.path===path.join(root,'AGENTS.md')).content,/authoritative teaching contract/);
 const skills=loadSkillsFromDir({dir:path.join(root,'.pi/skills'),source:'project'});
 assert.equal(skills.skills.length,1);assert.equal(skills.skills[0].name,'learning-system');
 assert.equal(skills.diagnostics.length,0);
});
test('checkpoint preserves pending actual response, source, old optional data and independent evidence',t=>{
 const store=new Store(temp(t));store.setTopic('calculus','Explain a derivative');
 store.mutate(s=>{s.activeSource={rootId:'saved',file:'chapter.md'};s.custom={keep:true};s.topics[s.activeTopic].checkpoint={summary:'Legacy',next:'Legacy next',unknown:'keep'};});
 const first=store.capture({topic:'calculus',concept:'rate',dimension:'explanation',question:'Explain rate',response:'Change per unit',assistance:'none'},new Date('2026-01-01T12:00:00'));
 store.assess(first.id,'correct','Accurate',new Date('2026-01-01T12:00:00'));
 const pending=store.capture({topic:'calculus',concept:'rate',dimension:'application',question:'Why is the tangent local?',response:'I think it is a limit',assistance:'hint'});
 const cp=store.checkpoint({summary:'Working on local change',section:'Limits',next:'Finish feedback'});
 assert.equal(cp.pendingAttemptId,pending.id);assert.equal(cp.assistance,'hint');assert.equal(cp.pendingQuestion,'Why is the tangent local?');
 assert.equal(cp.evidence[0].evidence,'independently_correct');assert.equal(cp.unknown,'keep');assert.deepEqual(cp.source,{rootId:'saved',file:'chapter.md'});
 const reloaded=new Store(store.root);assert.equal(reloaded.read().attempts[0].evidence,'independently_correct');assert.equal(reloaded.read().custom.keep,true);
 assert.throws(()=>store.checkpoint({summary:'Bad date',next:'Continue',reviewDate:'2026-02-30'}),/valid review date/);
 assert.equal(reloaded.read().topics[reloaded.read().activeTopic].checkpoint.summary,'Working on local change');
});
test('compact context omits unrelated history and bounds long current submissions',()=>{
 const s=emptyState();s.activeTopic='active';s.topics={active:{id:'active',title:'A',goal:'G'},other:{id:'other',title:'OTHER'}};
 s.attempts=Array.from({length:1000},(_,i)=>({id:String(i),topicId:'other',response:'PRIVATE_OTHER_HISTORY'}));
 s.attempts.push({id:'pending',topicId:'active',concept:'A',question:'Q',response:'x'.repeat(100000),verdict:'pending',assistance:'hint'});
 const payload=JSON.stringify(compactContext(s));assert.doesNotMatch(payload,/PRIVATE_OTHER_HISTORY/);assert.ok(payload.length<2500);assert.match(payload,/pending/);
});
test('review selects actual latest weak evidence, ignores skips and respects later correction',t=>{
 const store=new Store(temp(t)),base={topic:'math',concept:'sign',question:'Which sign?',response:'minus'};
 const a=store.capture(base);store.assess(a.id,'incorrect','Check the direction.');
 assert.equal(store.reviewTargets('2000-01-01')[0].id,a.id);
 const skip=store.capture(base);store.assess(skip.id,'skipped','Skip');assert.equal(store.reviewTargets('2000-01-01')[0].id,a.id);
 const b=store.capture(base);store.assess(b.id,'correct','Correct');assert.equal(store.reviewTargets('2000-01-01').length,0);
});
test('active app has no game modules, world render path, logger, or role prompts',()=>{
 const lib=path.join(project,'.pi/extensions/opera/lib'),names=fs.readdirSync(lib);
 assert.equal(names.some(n=>/^(game|world|session|space)/.test(n)),false);
 const visual=fs.readFileSync(path.join(lib,'visual.mjs'),'utf8');assert.doesNotMatch(visual,/validateWorld|renderWorld/);
 assert.equal(fs.existsSync(path.join(project,'.pi/skills/learning-system/agents')),false);
});
