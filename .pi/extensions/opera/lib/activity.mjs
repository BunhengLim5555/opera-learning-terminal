import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {escapeHTML as e,renderVisual} from './visual.mjs';
import {prepareQuestion} from './quiz.mjs';

const client=fs.readFileSync(fileURLToPath(new URL('./activity-client.js',import.meta.url)),'utf8');
export function validateActivity(p) {
 if(!p.question?.trim()||p.question.length>3000)throw Error('Supply one question of at most 3000 characters.');
 if(!['choice','recall','prediction','task','audio'].includes(p.mode))throw Error('Unknown activity mode.');
 if(['choice','recall'].includes(p.mode))prepareQuestion(p);
 if(p.mode==='task'&&(!Array.isArray(p.rubric)||p.rubric.length<1||p.rubric.length>6||p.rubric.some(x=>typeof x!=='string'||!x.trim()||x.length>500)||new Set(p.rubric).size!==p.rubric.length))throw Error('A task requires 1–6 unique, observable rubric criteria.');
 if(p.mode==='prediction'&&(!Array.isArray(p.scenarios)||!p.scenarios.length||p.scenarios.length>6||new Set(p.scenarios.map(s=>s.id)).size!==p.scenarios.length||p.scenarios.some(s=>!s.id||!s.label||!s.setup||!s.outcome)))throw Error('Prediction needs 1–6 scenarios with unique IDs, labels, setup and an outcome. Outcomes are coach-authored, not executed simulations.');
 if(p.mode==='audio'&&(!p.audio?.text?.trim()||p.audio.text.length>3000||!p.audio.language||!['listen','speak'].includes(p.audio.goal)))throw Error('Audio requires reference text, a language tag, and listen/speak goal.');
 if(p.visual)renderVisual(p.visual);
 return p;
}
export function publicActivity(p,options=[]) {
 return {mode:p.mode,question:p.question,hintAvailable:!!p.hint,rubric:p.rubric||[],source:p.source||null,options:options.map(o=>({id:o.id,label:o.label})),scenarios:(p.scenarios||[]).map(({id,label,setup})=>({id,label,setup})),audio:p.audio?{language:p.audio.language,goal:p.audio.goal}:null};
}
export function activityPage(p,base,options=[]) {
 const safe=JSON.stringify(publicActivity(p,options)).replace(/</g,'\\u003c');
 const visual=p.visual?`<div class="visual">${renderVisual(p.visual).svg}</div>`:'';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OPERA · Learning activity</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f4ef;color:#183248;font:17px/1.6 system-ui}main{max-width:900px;padding:28px;margin:auto}h1{font-size:30px;line-height:1.25}section{background:white;padding:22px;border-radius:14px;border:1px solid #c9d6dd;margin:16px 0}textarea{width:100%;min-height:160px;font:inherit;padding:12px}button,select,input{font:inherit}button{padding:10px 16px;background:#18445b;color:white;border:0;border-radius:8px;cursor:pointer;margin:5px}button:disabled{opacity:.5;cursor:default}label{display:block;margin:10px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}.muted{color:#526572}.visual{overflow:auto}.visual svg{width:100%;min-width:480px}.row{display:flex;flex-wrap:wrap;align-items:center;gap:10px}[hidden]{display:none!important}:focus-visible{outline:3px solid #b75a20;outline-offset:3px}audio{max-width:100%}@media(max-width:600px){main{padding:14px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}</style></head><body><main><p>OPERA / <span id="mode"></span></p><h1 id="question"></h1><p class="muted">One activity. Submit, return to the terminal for feedback, then pause. This page works only while this activity is open in OPERA.</p>${visual}<section id="scenario-panel" hidden><label for="scenario">Change the condition before predicting</label><select id="scenario"></select><pre id="setup"></pre><p class="muted">Outcomes are coach-authored examples, not executed simulations.</p></section><section id="rubric-panel" hidden><h2>Success criteria</h2><ul id="rubric"></ul><p>Submit your work or paste your artifact and test output below. Claimed test output is learner-reported until independently verified. Nothing on this page executes code.</p></section><section id="audio-panel" hidden><h2>Listen / record</h2><p>Uses your browser's speech voices. Voice quality and availability vary; this is not a native-speaker reference. Recording stays in this page until you explicitly submit it to local OPERA. Model providers may receive your written response, not the audio automatically.</p><div class="row"><label for="voice">Voice <select id="voice"></select></label><label for="rate">Speed <input id="rate" type="range" min="0.5" max="1.2" step="0.1" value="0.9"></label></div><button id="play" type="button">Play reference</button><button id="transcript" type="button">Reveal transcript (counts as help)</button><pre id="reference" hidden></pre><p id="audio-status" role="status"></p><button id="record" type="button">Record my voice (permission required)</button><button id="stop" type="button" disabled>Stop recording</button><audio id="recording" controls hidden></audio><a id="download" hidden>Download my recording</a><label><input id="audio-consent" type="checkbox"> Save this recording locally with my submitted attempt</label><details><summary>Optional speech-to-text</summary><p>Your browser's recognition service may send audio to its provider. This is separate from local recording. Transcription is editable and is NOT pronunciation assessment.</p><label><input id="recognition-consent" type="checkbox"> I consent to my browser's speech-recognition service</label><button id="recognize" type="button">Dictate an editable response</button></details></section><section><div id="options"></div><label for="response" id="response-label">Your response</label><textarea id="response" maxlength="40000" placeholder="Write your answer, reasoning, or practical work here."></textarea><label id="help-label"><input id="help" type="checkbox"> I used outside help or a tool-generated solution</label><button id="predict" type="button" hidden>Commit prediction → reveal outcome</button><section id="outcome-panel" hidden><h2>Observed outcome</h2><pre id="outcome"></pre><p>Now explain why it matches or differs from your committed prediction. This explanation is assisted by the outcome; the original prediction is preserved separately.</p></section><button id="hint" type="button" hidden>Hint</button><p id="hint-text"></p><div class="row"><button id="submit" type="button">Submit attempt</button><button id="answer" type="button" ${['choice','recall'].includes(p.mode)?'':'hidden'}>Show the answer</button><button id="idk" type="button">I don't know</button><button id="skip" type="button">Skip</button><button id="cancel" type="button">Cancel (no attempt)</button></div><p id="status" role="status" aria-live="polite"></p></section><footer>Source: ${e(p.source||'Coach-created activity; verify claims against your material.')}<br>No mastery score. Audio playback requests and page clicks are not proof of learning.</footer></main><script id="activity-data" type="application/json">${safe}</script><script src="${base}/app.js" defer></script></body></html>`;
}

// A short-lived loopback server, random capability URL, no CORS, no shell/code execution.
// Hidden outcomes remain in this process until an actual prediction is committed.
/** @param {any} p @param {{root?:string,signal?:AbortSignal,timeoutMs?:number,onClose?:()=>void}} options */
export async function startActivity(p,{root=process.cwd(),signal,timeoutMs=30*60*1000,onClose=()=>{}}={}) {
 validateActivity(p);
 const options=p.mode==='choice'?prepareQuestion(p):[];
 const token=randomBytes(24).toString('hex'),base='/'+token;
 let settled=false,origin='',prediction=null,predictionAssistance=null,scenarioId=null,assistance=p.recently_taught?'recent_explanation':'none',referenceRevealed=false,playRequests=0,resolveResult,timer;
 const supportEvents=p.recently_taught?['recent_explanation']:[];
 const support=kind=>{if(!supportEvents.includes(kind))supportEvents.push(kind);};
 const result=new Promise(resolve=>{resolveResult=resolve;});
 const sockets=new Set();
 const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);server.close();for(const s of sockets){s.end();const cleanup=setTimeout(()=>s.destroy(),250);cleanup.unref();}resolveResult(value);onClose();};
 const abort=()=>finish({status:'cancelled',reason:'Activity interrupted; no final answer captured.'});
 const reply=(res,status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; media-src blob:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"});res.end(type==='application/json'?JSON.stringify(body):body);};
 const server=http.createServer(async(req,res)=>{
  try {
   if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin))return reply(res,403,{error:'Origin not allowed.'});
   if(req.url===base&&req.method==='GET')return reply(res,200,activityPage(p,base,options),'text/html');
   if(req.url===base+'/app.js'&&req.method==='GET')return reply(res,200,client,'text/javascript');
   if(req.method!=='POST'||!req.url?.startsWith(base+'/'))return reply(res,404,{error:'Not found.'});
   if(!req.headers['content-type']?.startsWith('application/json'))return reply(res,415,{error:'JSON required.'});
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4.25*1024*1024){reply(res,413,{error:'Submission too large (4.25 MB request limit).'});return;}chunks.push(chunk);}
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'),route=req.url.slice(base.length);
   if(settled)return reply(res,409,{error:'Activity closed.'});
   if(route==='/state')return reply(res,200,{prediction,scenarioId,predictionAssistance,outcome:prediction!==null?p.scenarios.find(s=>s.id===scenarioId).outcome:null});
   if(route==='/hint'){if(!p.hint)return reply(res,400,{error:'No hint supplied.'});if(assistance!=='answer_shown')assistance='hint';support('hint');return reply(res,200,{hint:p.hint});}
   if(route==='/predict') {
    if(p.mode!=='prediction'||prediction!==null)return reply(res,409,{error:'Prediction unavailable or already committed.'});
    const selected=p.scenarios.find(s=>s.id===body.scenarioId);
    if(!selected||typeof body.response!=='string'||!body.response.trim()||body.response.length>40000)return reply(res,400,{error:'Choose a condition and write a prediction.'});
    if(body.help===true){support('tool_assisted');if(assistance==='none')assistance='tool_assisted';}
    prediction=body.response;scenarioId=selected.id;predictionAssistance=assistance;
    return reply(res,200,{outcome:selected.outcome});
   }
   if(route==='/listen'||route==='/reference') {
    if(p.mode!=='audio')return reply(res,400,{error:'Not an audio task.'});
    if(route==='/reference'){referenceRevealed=true;assistance='answer_shown';support('answer_shown');}else playRequests++;
    return reply(res,200,{text:p.audio.text,language:p.audio.language});
   }
   if(route==='/answer'){if(!['choice','recall'].includes(p.mode))return reply(res,400,{error:'Use the activity reference controls.'});reply(res,200,{status:'answer_requested',message:'Return to OPERA for the requested solution. No answer submitted.'});finish({status:'answer_requested'});return;}
   if(route==='/cancel'){reply(res,200,{status:'cancelled'});finish({status:'cancelled',reason:'Learner cancelled; no answer recorded.'});return;}
   if(route!=='/submit')return reply(res,404,{error:'Not found.'});
   const skip=body.action==='skip',idk=body.action==='idk';
   if(!skip&&!idk&&p.mode==='prediction'&&prediction===null)return reply(res,400,{error:'Commit your prediction first.'});
   if(!skip&&!idk&&p.mode==='choice'&&!options.some(o=>o.id===body.selected))return reply(res,400,{error:'Choose an option.'});
   if(!skip&&!idk&&p.mode!=='choice'&&(typeof body.response!=='string'||!body.response.trim()||body.response.length>40000))return reply(res,400,{error:'Write a response first (maximum 40,000 characters).'});
   let recording=null;
   if(body.recording&&!skip&&!idk) {
    if(p.mode!=='audio'||body.recordingConsent!==true||typeof body.recording.data!=='string'||!/^audio\/(webm|ogg|mp4)(;codecs=[\w,.-]+)?$/.test(body.recording.type)||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.recording.data))return reply(res,400,{error:'Invalid recording or missing consent.'});
    const data=Buffer.from(body.recording.data,'base64');if(!data.length||data.length>3*1024*1024)return reply(res,400,{error:'Recording must be between 1 byte and 3 MB.'});
    const ext=body.recording.type.match(/^audio\/(\w+)/)[1],dir=path.join(root,'Learning','Audio');fs.mkdirSync(dir,{recursive:true});recording=path.join(dir,randomUUID()+'.'+ext);fs.writeFileSync(recording,data,{flag:'wx',mode:0o600});
   }
   if(body.help===true){support('tool_assisted');if(assistance==='none')assistance='tool_assisted';}
   if(prediction!==null){support('outcome_observed');if(assistance==='none')assistance='outcome_observed';}
   const response=skip?'skip':idk?'idk':p.mode==='choice'?options.find(o=>o.id===body.selected).label:body.response;
   const submission={status:'submitted',response,selected:skip?'__skip':idk?'__idk':body.selected,assistance,activity:{mode:p.mode,rubric:p.rubric||[],prediction,scenarioId,predictionAssistance,supportEvents,outcome:prediction!==null?p.scenarios.find(s=>s.id===scenarioId).outcome:null,recording,audioGoal:p.audio?.goal||null,referenceRevealed,playRequests,transcriptionUsed:body.transcriptionUsed===true,verification:'Learner-supplied work; no code was executed by this page.'}};
   reply(res,200,{status:'submitted',message:'Submitted. Return to OPERA for feedback. You can close this tab.'});finish(submission);
  }catch(error){if(!res.headersSent)reply(res,400,{error:error instanceof SyntaxError?'Invalid JSON.':error.message});else res.end();}
 });
 server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
 server.requestTimeout=30000;server.headersTimeout=10000;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 origin=`http://127.0.0.1:${server.address().port}`;
 timer=setTimeout(()=>finish({status:'cancelled',reason:'Activity exceeded its time limit; no final answer recorded.'}),timeoutMs);timer.unref();
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 return {url:origin+base,result,close:()=>finish({status:'cancelled',reason:'Session closed; no answer recorded.'})};
}
