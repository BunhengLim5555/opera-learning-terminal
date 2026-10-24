import {compactContext} from './context.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {dimensions,localDay} from './store.mjs';
import {escapeHTML as e} from './visual.mjs';

export function evidenceRows(state) {
 const groups=new Map();
 for(const a of state.attempts) {
  const key=JSON.stringify([a.topicId,a.concept,a.dimension]);
  if(!groups.has(key))groups.set(key,{topicId:a.topicId,topic:state.topics[a.topicId].title,concept:a.concept,dimension:a.dimension,attempts:[]});
  groups.get(key).attempts.push(a);
 }
 return [...groups.values()].map(g=>({...g,independent:g.attempts.filter(a=>a.verdict==='correct'&&a.assistance==='none').length,delayed:g.attempts.filter(a=>a.evidence==='delayed_correct').length,assisted:g.attempts.filter(a=>a.assistance!=='none').length,latest:g.attempts.at(-1)}));
}
export function recommendations(store) {
 const s=store.read(),topic=s.topics[s.activeTopic],due=store.due(),pending=s.attempts.filter(a=>a.verdict==='pending'&&(!s.activeTopic||a.topicId===s.activeTopic));
 const mistakes=s.attempts.filter(a=>a.mistake?.status==='open'&&(!s.activeTopic||a.topicId===s.activeTopic));
 const known=s.attempts.filter(a=>a.topicId===s.activeTopic&&a.verdict==='correct');
 const recognition=known.findLast(a=>a.dimension==='recognition');
 return {
  continue:{label:'Continue',reason:pending.length?'A submitted answer is awaiting feedback.':topic?.checkpoint?topic.checkpoint.next:topic?`Choose one small objective in ${topic.title}.`:'Choose one small learning objective.',prompt:pending.length?`Finish feedback on this captured answer, without a new quiz: ${JSON.stringify(compactContext(s).pending)}`:topic?.checkpoint?`Resume this checkpoint using evidence, not assumed history: ${JSON.stringify(compactContext(s))}`:`Help me choose one small learning objective${topic?' in '+topic.title:''}.`},
  recall:{label:'Recall',reason:due.length?`${due.length} target(s) due; start with one. No backlog penalty.`:'No targets are due. Fresh practice is optional.',target:due[0]||null},
  apply:{label:'Apply',reason:recognition?`You recognized ${recognition.concept}; try using it without options.`:'Try one small realistic task with visible success criteria.',prompt:`Give me one small authentic task using opera_quiz mode task, with a concise rubric and observable verification where possible. Topic: ${topic?.title||'ask me for a topic'}. ${recognition?'Use this recognized concept in a new situation: '+recognition.concept:''} Do not implement the answer for me unless I ask.`},
  explore:{label:'Explore',reason:'Start something new; review is never a gate.'},
  mistakes:mistakes.map(a=>({attemptId:a.id,concept:a.concept,dimension:a.dimension,description:a.mistake.description,followUp:a.mistake.followUp,question:a.question,response:a.response,feedback:a.feedback})),
  pending:pending.length
 };
}
export function reviewPrompt(state,target) {
 return `Review one observed target with a fresh opera_quiz question. Change the scenario, preserve the target dimension, and do not reveal the old response or feedback before the attempt. Target (private planning context): ${JSON.stringify({topic:state.topics[target.topicId].title,concept:target.concept,dimension:target.dimension,previousResult:target.verdict,assistance:target.assistance,source:target.source,mistake:target.mistake?.status==='open'?target.mistake:null,feedback:target.feedback})}. Give feedback and pause.`;
}
function recordingLink(store,a) {
 const file=a.activity?.recording;
 if(!file||path.dirname(path.resolve(file))!==path.join(store.root,'Learning','Audio'))return '';
 return `<p><a href="Audio/${encodeURIComponent(path.basename(file))}">Open saved recording</a> — local artifact, not assessed pronunciation.</p>`;
}
export function renderDashboard(store) {
 const s=store.read(),home=recommendations(store),rows=evidenceRows(s);
 const cards=['continue','recall','apply','explore'].map(k=>`<section><h2>${e(home[k].label)}</h2><p>${e(home[k].reason)}</p><p class="muted">Use /learn or /review, or ask naturally.</p></section>`).join('');
 const table=rows.map(g=>`<tr><td>${e(g.topic)}</td><td>${e(g.concept)}</td><td>${e(g.dimension)}</td><td>${g.independent}</td><td>${g.delayed}</td><td>${g.assisted}</td><td>${e(g.latest.verdict)}</td></tr>`).join('');
 const unknown=Object.values(s.topics).map(t=>`<p><strong>${e(t.title)}</strong> — no independent correct evidence yet for: ${dimensions.filter(d=>!rows.some(r=>r.topicId===t.id&&r.dimension===d&&r.independent)).map(e).join(', ')||'all listed dimensions have at least one independent correct attempt (not broad mastery)'}</p>`).join('');
 const attempts=[...s.attempts].reverse().map(a=>`<details><summary>${e(s.topics[a.topicId].title)} · ${e(a.concept)} · ${e(a.dimension)} · ${e(a.verdict)} · ${e(a.date)}</summary><p>Attempt: ${e(a.id)}<br>Assistance: ${e(a.assistance)} · Context: ${e(a.context)}<br>Evidence: ${e(a.evidence||'awaiting feedback')} · Review: ${e(a.nextReview||'unscheduled')}</p><h3>Question</h3><pre>${e(a.question)}</pre><h3>Submitted response</h3><pre>${e(a.response)}</pre>${a.activity?.prediction?`<h3>Prediction (before outcome)</h3><pre>${e(a.activity.prediction)}</pre><p>Prediction assistance: ${e(a.activity.predictionAssistance||'unknown')}</p><h3>Revealed outcome</h3><pre>${e(a.activity.outcome)}</pre>`:''}${a.activity?`<p>Support events: ${e((a.activity.supportEvents||[]).join(', ')||a.assistance)}</p>`:''}${recordingLink(store,a)}<h3>Feedback</h3><pre>${e(a.feedback||'Not assessed')}</pre>${a.mistake?`<p>Reasoning issue (${e(a.mistake.status)}): ${e(a.mistake.description)}</p><p>Follow-up: ${e(a.mistake.followUp)}</p><pre>${e(JSON.stringify(a.mistake.history,null,2))}</pre>`:''}${a.assessment?.criteria?.length?`<h3>Rubric</h3><ul>${a.assessment.criteria.map(c=>`<li>${e(c.criterion)}: ${e(c.result)} — ${e(c.reason)}</li>`).join('')}</ul>`:''}<p>Verification: ${e(a.assessment?.verification||'No external execution verified.')}</p><p>Source: ${e(a.source||'Not supplied')}</p></details>`).join('');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'"><title>OPERA · Session home and evidence</title><style>body{font:17px/1.6 system-ui;margin:0;background:#f5f4ee;color:#173247}main{max-width:1150px;margin:auto;padding:24px}h1{line-height:1.2}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}section,details{background:white;padding:20px;border:1px solid #ccd6dc;border-radius:12px;margin:12px 0}.muted{color:#526471}table{border-collapse:collapse;width:100%;background:white}td,th{text-align:left;border-bottom:1px solid #ccd6dc;padding:12px}.scroll{overflow:auto}summary{cursor:pointer;font-weight:600}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}:focus-visible{outline:3px solid #ad4f13}</style><main><p>OPERA / SESSION HOME</p><h1>Evidence, not a mastery score</h1><p>Snapshot: ${e(localDay())}. Reopen from /opera to refresh. No background reminders.</p><div class="cards">${cards}</div><h2>Observed capabilities</h2><p>Counts describe attempts, not distinct skills. Recognition is not application. Delayed recall is recorded separately from transfer; assisted successes do not erase earlier independent evidence.</p><div class="scroll"><table><thead><tr><th>Topic</th><th>Target</th><th>Dimension</th><th>Independent correct</th><th>Delayed correct</th><th>Assisted attempts</th><th>Latest result</th></tr></thead><tbody>${table||'<tr><td colspan="7">No captured attempts. Abilities remain unknown.</td></tr>'}</tbody></table></div><h2>Still unknown or unsupported</h2>${unknown||'<p>Choose a topic to begin.</p>'}<h2>Attempt history and reasoning issues</h2><p>Open an attempt to inspect its evidence. Use /opera → Review a reasoning issue to practice, dispute, or mark an issue resolved. Marking an issue resolved does not change its original grade.</p>${attempts||'<p>No attempts yet.</p>'}</main></html>`;
}
export function saveDashboard(store) {
 const file=path.join(store.root,'Learning','Dashboard.html');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,renderDashboard(store));return file;
}
