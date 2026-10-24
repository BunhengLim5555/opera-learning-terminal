import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

export const styles = ['balanced', 'explain', 'socratic', 'hands-on', 'visual'];
export const verdicts = ['correct', 'partial', 'minor_slip', 'incorrect', 'idk', 'skipped', 'not_assessed'];
export const dimensions = ['recognition', 'explanation', 'application', 'diagnosis', 'transfer', 'listening', 'speaking'];
export const assistanceTypes = ['none','hint','recent_explanation','tool_assisted','answer_shown','outcome_observed'];
export function slug(s) { return String(s).normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0,70) || 'topic'; }
export function localDay(d = new Date()) { const p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
export function addDays(day, n) { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate()+n); return localDay(d); }
export function keyFor(topic) { return slug(topic).toLowerCase()+'-'+createHash('sha256').update(topic.trim().toLowerCase()).digest('hex').slice(0,8); }
export function emptyState() { return {version:1, style:'balanced', activeTopic:null, logging:false, roots:[], topics:{}, attempts:[]}; }
export function checkState(s) {
 if (!s || s.version!==1 || !styles.includes(s.style) || !Array.isArray(s.roots) || !Array.isArray(s.attempts) || typeof s.topics!=='object' || !s.topics || Array.isArray(s.topics)) throw Error('Invalid OPERA state; restore .opera/state.json.bak instead of overwriting your record.');
 if(s.practicePresentation!==undefined&&!['browser','terminal'].includes(s.practicePresentation))throw Error('Invalid practice interface in OPERA state.');
 const ids=new Set();
 for (const a of s.attempts) {
  if (!a.id || ids.has(a.id) || !s.topics[a.topicId] || !['pending', ...verdicts].includes(a.verdict) || !dimensions.includes(a.dimension) || !assistanceTypes.includes(a.assistance)) throw Error('Invalid or duplicate attempt in OPERA state.');
  ids.add(a.id);
 }
 return s;
}
function markdownText(s) { return String(s).replace(/[|\r\n]/g,' '); }
export class Store {
 constructor(root) { this.root=path.resolve(root); this.dir=path.join(this.root,'.opera'); this.file=path.join(this.dir,'state.json'); }
 read() { if (!fs.existsSync(this.file)) return emptyState(); return checkState(JSON.parse(fs.readFileSync(this.file,'utf8'))); }
 mutate(fn) {
  fs.mkdirSync(this.dir,{recursive:true});
  const lock=path.join(this.dir,'write.lock'); let fd;
  try { fd=fs.openSync(lock,'wx'); } catch(e) { if(e.code==='EEXIST') throw Error('Another OPERA write is active. Retry; if a process crashed, remove .opera/write.lock only after it has stopped.'); throw e; }
  try {
   fs.writeFileSync(fd,JSON.stringify({pid:process.pid}));
   const state=this.read(), result=fn(state); checkState(state);
   const tmp=this.file+'.'+randomUUID()+'.tmp';
   fs.writeFileSync(tmp,JSON.stringify(state,null,2)+'\n',{mode:0o600});
   if(fs.existsSync(this.file)) fs.copyFileSync(this.file,this.file+'.bak');
   fs.renameSync(tmp,this.file); return result;
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
 }
 setTopic(topic, goal) {
  if(typeof topic!=='string'||!topic.trim()||topic.length>160) throw Error('Use a topic of 1–160 characters.');
  const id=keyFor(topic);
  this.mutate(s=>{s.activeTopic=id;s.topics[id]??={id,title:topic.trim(),goal:goal||topic.trim(),checkpoint:null};if(goal)s.topics[id].goal=goal;});
  return id;
 }
 capture({topic,concept,dimension='recognition',question,response,assistance='none',source=null,context='initial',sessionId='local',activity=null}, now=new Date()) {
  if(!dimensions.includes(dimension)||!assistanceTypes.includes(assistance)) throw Error('Invalid evidence classification.');
  if(typeof response!=='string'||!response.trim())throw Error('Capture requires a real nonempty response.');
  const topicId=this.setTopic(topic), a={id:randomUUID(),topicId,concept:concept||topic,dimension,question,response,assistance,source,context,sessionId,activity,date:localDay(now),timestamp:now.toISOString(),verdict:'pending',feedback:null,nextReview:null,interval:0};
  this.mutate(s=>s.attempts.push(a));return a;
 }
 assess(id,verdict,feedback,now=new Date(),details={}) {
  if(!verdicts.includes(verdict)) throw Error('Invalid assessment verdict.');
  return this.mutate(s=>{
   const a=s.attempts.find(x=>x.id===id);if(!a)throw Error('Cannot grade an answer that was never captured.');
   if(a.verdict!=='pending') { if(a.verdict===verdict&&a.feedback===feedback)return a;throw Error('This attempt was already graded; preserve the original evidence.'); }
   if(a.activity?.mode==='audio'&&a.dimension==='listening'&&a.activity.playRequests===0&&!['not_assessed','skipped'].includes(verdict))throw Error('No reference playback was requested. Use not_assessed, not a listening grade.');
   if(a.activity?.mode==='audio'&&a.dimension==='speaking'&&!['not_assessed','skipped'].includes(verdict))throw Error('Recorded speech needs qualified audio assessment; a transcript cannot establish speaking ability. Use not_assessed.');
   if(a.activity?.mode==='task'&&!['not_assessed','skipped','idk'].includes(verdict)) {
    const criteria=a.activity.rubric||[];
    if(!Array.isArray(details.criteria)||details.criteria.length!==criteria.length||criteria.some(c=>!details.criteria.some(r=>r.criterion===c&&['met','partial','not_met','not_observed'].includes(r.result)&&r.reason?.trim())))throw Error('Assess every task rubric criterion with a result and specific reason.');
    if(verdict==='correct'&&details.criteria.some(r=>r.result!=='met'))throw Error('A correct task verdict requires all rubric criteria met; use partial or not_assessed for unobserved criteria.');
   }
   a.verdict=verdict;a.feedback=feedback;
   a.assessment={criteria:details.criteria||[],verification:details.verification||null};
   if(details.mistake?.trim()&&!['correct','skipped','not_assessed'].includes(verdict))a.mistake={description:details.mistake.trim(),followUp:details.followUp||'Vary the context and test the same underlying reasoning.',status:'open',history:[]};
   const prior=s.attempts.filter(x=>x.id!==id&&x.topicId===a.topicId&&x.concept===a.concept&&x.dimension===a.dimension&&!['pending','skipped','not_assessed'].includes(x.verdict)).at(-1);
   const independent=verdict==='correct'&&a.assistance==='none';
   const delayed=independent&&prior&&a.date>prior.date&&a.sessionId!==prior.sessionId&&Date.parse(a.timestamp)-Date.parse(prior.timestamp)>=20*60*60*1000;
   const unassessed=['skipped','not_assessed'].includes(verdict);
   // Same-day repeats never increase the spacing interval.
   a.interval=unassessed?0:independent?(delayed?Math.min(30,Math.max(3,(prior.interval||1)*2)):1):1;
   a.evidence=unassessed?'unassessed':independent?(delayed?'delayed_correct':'independently_correct'):(['incorrect','idk'].includes(verdict)?'needs_review':'improving');
   a.nextReview=unassessed?null:addDays(localDay(now),a.interval);return a;
  });
 }
 due(today=localDay(),topicId=null) {
  const latest=new Map();
  for(const a of this.read().attempts) if(!['pending','skipped','not_assessed'].includes(a.verdict))latest.set([a.topicId,a.concept,a.dimension].join('\0'),a);
  return [...latest.values()].filter(a=>(!topicId||a.topicId===topicId)&&a.nextReview&&a.nextReview<=today).sort((a,b)=>(a.evidence==='needs_review'?0:1)-(b.evidence==='needs_review'?0:1)||a.nextReview.localeCompare(b.nextReview));
 }
 reviewTargets(today=localDay()) {
  const due=this.due(today);if(due.length)return due;
  const s=this.read(),latest=new Map();
  for(const a of s.attempts)if(a.topicId===s.activeTopic&&!['pending','skipped','not_assessed'].includes(a.verdict))latest.set(JSON.stringify([a.concept,a.dimension]),a);
  return [...latest.values()].filter(a=>['partial','minor_slip','incorrect','idk'].includes(a.verdict)&&a.mistake?.status!=='resolved');
 }

 progress() {
  const s=this.read(); const rows=Object.values(s.topics).map(t=>{
   const a=s.attempts.filter(a=>a.topicId===t.id), graded=a.filter(x=>!['pending','skipped','not_assessed'].includes(x.verdict));
   return `| ${markdownText(t.title)} | ${graded.length} | ${graded.filter(x=>x.assistance==='none'&&x.verdict==='correct').length} | ${a.filter(x=>x.verdict==='pending').length} | ${this.due(localDay(),t.id).length} |`;
  });
  return `# OPERA progress\n\nUpdated: ${localDay()} · Style: ${s.style}\n\nCounts describe attempts, not mastery. Independent recognition is not independent application.\n\n| Topic | Assessed attempts | Independent correct | Awaiting feedback | Due targets |\n|---|---:|---:|---:|---:|\n${rows.join('\n')||'| No attempts yet | 0 | 0 | 0 | 0 |'}\n\n${Object.values(s.topics).filter(t=>t.checkpoint).map(t=>`## ${t.title}\n${t.checkpoint.summary}\n\nNext: ${t.checkpoint.next}\n`).join('\n')}`;
 }
 recordMistake(id,description,followUp) {
  if(!description?.trim())throw Error('Describe one issue grounded in the actual response.');
  return this.mutate(s=>{const a=s.attempts.find(a=>a.id===id);if(!a||!['partial','minor_slip','incorrect','idk'].includes(a.verdict))throw Error('A reasoning issue requires an actual assessed difficulty.');if(a.mistake)throw Error('A reasoning issue is already recorded; preserve its history.');a.mistake={description:description.trim(),followUp:followUp||'Change the context; test the same reasoning.',status:'open',history:[]};return a.mistake;});
 }
 annotateMistake(id,status,reason) {
  if(!['open','resolved','disputed'].includes(status)||!reason?.trim())throw Error('Provide a mistake status and reason.');
  return this.mutate(s=>{const a=s.attempts.find(a=>a.id===id);if(!a?.mistake)throw Error('No recorded mistake on that attempt.');a.mistake.history.push({at:new Date().toISOString(),from:a.mistake.status,to:status,reason});a.mistake.status=status;return a.mistake;});
 }

 questionAssistance(p,fallback='none') {
  return (this.read().answerExposure||[]).some(a=>a.topic===p.topic&&a.question===p.question)?'answer_shown':fallback;
 }
 exposeAnswer(p) {
  if(!p.topic?.trim()||!p.question?.trim())throw Error('Answer exposure requires topic and question.');
  this.mutate(s=>{s.answerExposure??=[];s.answerExposure.push({topic:p.topic,concept:p.concept||p.topic,question:p.question,at:new Date().toISOString(),assistance:'answer_shown'});});
 }
 checkpoint(p) {
  if(!p.summary?.trim()||!p.next?.trim())throw Error('Checkpoint requires summary and one next action.');
  if(p.reviewDate!==undefined&&(!/^\d{4}-\d{2}-\d{2}$/.test(p.reviewDate)||!Number.isFinite(Date.parse(p.reviewDate+'T12:00:00Z'))||new Date(p.reviewDate+'T12:00:00Z').toISOString().slice(0,10)!==p.reviewDate))throw Error('Use a valid review date (YYYY-MM-DD).');
  if(p.assistance!==undefined&&!assistanceTypes.includes(p.assistance))throw Error('Invalid checkpoint assistance.');
  return this.mutate(s=>{
   const t=s.topics[s.activeTopic];if(!t)throw Error('Set a topic using /learn, or supply checkpoint topic.');
   const attempts=s.attempts.filter(a=>a.topicId===s.activeTopic);
   const pending=attempts.findLast(a=>a.verdict==='pending');
   const latest=attempts.at(-1),weak=attempts.findLast(a=>['partial','minor_slip','incorrect','idk'].includes(a.verdict));
   const question=p.pendingQuestion??pending?.question??latest?.question;
   const exposed=(s.answerExposure||[]).findLast(a=>a.topic===t.title&&(!question||a.question===question));
   t.checkpoint={...t.checkpoint,summary:p.summary,next:p.next,objective:p.objective||t.goal,source:s.activeSource||null,section:p.section||t.checkpoint?.section||null,
    evidence:attempts.filter(a=>!['pending','skipped','not_assessed'].includes(a.verdict)).slice(-3).map(a=>({attemptId:a.id,concept:a.concept,verdict:a.verdict,assistance:a.assistance,evidence:a.evidence})),
    weakTarget:weak?{concept:weak.concept,feedback:weak.feedback}:null,
    pendingQuestion:p.pendingQuestion??pending?.question??null,pendingAttemptId:pending?.id||null,
    assistance:exposed?'answer_shown':(p.assistance||pending?.assistance||latest?.assistance||'none'),
    answerExposure:exposed?{question:exposed.question,at:exposed.at}:null,
    reviewDate:p.reviewDate||latest?.nextReview||null,at:new Date().toISOString()};
   return t.checkpoint;
  });
 }

 writeProgress() { const dest=path.join(this.root,'Learning','Progress.md');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,this.progress());return dest; }
 note(title,body,folder='Notes') {
  if(!['Notes','Sessions','Visuals'].includes(folder))throw Error('Invalid output folder');
  const p=path.join(this.root,'Learning',folder,`${localDay()}-${slug(title)}-${randomUUID().slice(0,8)}.md`);
  fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body,{flag:'wx'});return p;
 }
}
