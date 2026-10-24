/* Browser-only activity controller. No remote assets; no code evaluation. */
'use strict';
const activity=JSON.parse(document.getElementById('activity-data').textContent);
const el=id=>document.getElementById(id);
let busy=false,closed=false,recorder=null,stream=null,recordTimer=null,blob=null,blobURL=null,recognition=null,transcriptionUsed=false;
const status=text=>{el('status').textContent=text;};
async function post(route,body={}) {
 const response=await fetch(location.pathname+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Request failed.');return data;
}
function guarded(fn){return async()=>{if(busy||closed)return;busy=true;try{await fn();}catch(error){status(error.message+' If this activity expired, return to OPERA and request it again.');}finally{busy=false;}};}
function stopMedia(){clearTimeout(recordTimer);if(recorder&&recorder.state!=='inactive')recorder.stop();stream?.getTracks().forEach(t=>t.stop());recognition?.abort();if('speechSynthesis' in window)window.speechSynthesis.cancel();}
function end(text){closed=true;stopMedia();document.querySelectorAll('button,textarea,input,select').forEach(x=>{x.disabled=true;});status(text);}
el('question').textContent=activity.question;el('mode').textContent=activity.mode.toUpperCase();
el('hint').hidden=!activity.hintAvailable;
el('hint').onclick=guarded(async()=>{const data=await post('/hint');el('hint-text').textContent=data.hint;});
if(activity.mode==='choice') {
 el('response').hidden=true;el('response-label').hidden=true;
 for(const option of activity.options){const label=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name='choice';input.value=option.id;label.append(input,document.createTextNode(' '+option.label));el('options').append(label);}
}
if(activity.mode==='task') {
 el('rubric-panel').hidden=false;
 for(const criterion of activity.rubric){const item=document.createElement('li');item.textContent=criterion;el('rubric').append(item);}
 el('response-label').textContent='Your practical work, artifact contents, and any test output';
}
if(activity.mode==='prediction') {
 el('scenario-panel').hidden=false;el('predict').hidden=false;el('submit').disabled=true;el('response-label').textContent='Your prediction and short reason (before seeing the outcome)';
 for(const scenario of activity.scenarios){const option=document.createElement('option');option.value=scenario.id;option.textContent=scenario.label;el('scenario').append(option);}
 const setup=()=>{el('setup').textContent=activity.scenarios.find(s=>s.id===el('scenario').value).setup;};el('scenario').onchange=setup;setup();
 function showOutcome(prediction,outcome){
  el('scenario').disabled=true;el('predict').hidden=true;
  const saved=document.createElement('pre');saved.textContent='Committed prediction: '+prediction;el('outcome-panel').prepend(saved);
  el('outcome').textContent=outcome;el('outcome-panel').hidden=false;el('response').value='';el('response-label').textContent='Explain the result and compare it with your prediction';el('submit').disabled=false;
 }
 el('predict').disabled=true;
 post('/state').then(data=>{if(data.prediction!==null){el('scenario').value=data.scenarioId;setup();showOutcome(data.prediction,data.outcome);}el('predict').disabled=false;}).catch(error=>status('Cannot restore activity: '+error.message+'. Return to OPERA.'));
 el('predict').onclick=guarded(async()=>{
  const prediction=el('response').value;
  const data=await post('/predict',{scenarioId:el('scenario').value,response:prediction,help:el('help').checked});
  showOutcome(prediction,data.outcome);el('response').focus();
 });
}
async function audioBase64(){const buffer=await blob.arrayBuffer();let binary='';for(const n of new Uint8Array(buffer))binary+=String.fromCharCode(n);return btoa(binary);}
async function submit(action) {
 if(recorder&&recorder.state!=='inactive')throw Error('Stop recording before submitting.');
 const body={action,response:el('response').value,selected:document.querySelector('input[name="choice"]:checked')?.value,help:el('help').checked,transcriptionUsed};
 if(action==='answer'&&blob&&el('audio-consent').checked){body.recording={type:blob.type,data:await audioBase64()};body.recordingConsent=true;}
 const result=await post('/submit',body);end(result.message);
}
el('submit').onclick=guarded(()=>submit('answer'));el('skip').onclick=guarded(()=>submit('skip'));el('idk').onclick=guarded(()=>submit('idk'));
el('answer').onclick=guarded(async()=>{const data=await post('/answer');end(data.message);});
el('cancel').onclick=guarded(async()=>{await post('/cancel');end('Cancelled. No answer recorded. Return to OPERA.');});
if(activity.mode==='audio') {
 el('audio-panel').hidden=false;
 el('response-label').textContent=activity.audio.goal==='listen'?'What did you hear? Write your response without revealing the transcript.':'After recording, describe what you tried and what you noticed. OPERA cannot certify pronunciation from this text.';
 const synth=window.speechSynthesis;
 let voices=[];
 function loadVoices(){
  if(!synth)return;
  voices=synth.getVoices().filter(v=>v.lang.toLowerCase().split('-')[0]===activity.audio.language.toLowerCase().split('-')[0]);
  el('voice').replaceChildren();voices.forEach((v,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=v.name+' ('+v.lang+')'+(v.localService?' · local':' · may use network');el('voice').append(option);});
  el('play').disabled=!voices.length;
  el('audio-status').textContent=voices.length?'Select a voice and play. Replay is allowed; playback requests are recorded, not listening competence.':'No matching speech voice is available. Install a voice for this language in your OS/browser, or skip. No fallback to the wrong language.';
 }
 if(synth){loadVoices();synth.addEventListener('voiceschanged',loadVoices);}else{el('play').disabled=true;el('audio-status').textContent='Speech synthesis is not supported in this browser. You may skip without penalty.';}
 el('play').onclick=guarded(async()=>{
  if(!synth||!voices.length)throw Error('No matching voice available.');
  const data=await post('/listen'),utterance=new SpeechSynthesisUtterance(data.text);
  utterance.lang=data.language;utterance.voice=voices[Number(el('voice').value)||0];utterance.rate=Number(el('rate').value);
  utterance.onerror=event=>{el('audio-status').textContent='Playback failed: '+event.error+'. Try another voice or skip.';};synth.cancel();synth.speak(utterance);
 });
 el('transcript').onclick=guarded(async()=>{const data=await post('/reference');el('reference').textContent=data.text;el('reference').hidden=false;});
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){el('record').disabled=true;el('record').textContent='Recording unavailable in this browser';}
 el('record').onclick=guarded(async()=>{
  stopMedia();stream=await navigator.mediaDevices.getUserMedia({audio:true});if(closed){stream.getTracks().forEach(t=>t.stop());return;}
  const type=['audio/webm','audio/ogg','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
  if(!type){stream.getTracks().forEach(t=>t.stop());throw Error('No supported audio recording format.');}
  const chunks=[];blob=null;el('audio-consent').checked=false;
  try{recorder=new MediaRecorder(stream,{mimeType:type});}catch(error){stream.getTracks().forEach(t=>t.stop());throw error;}
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  recorder.onstop=()=>{stream?.getTracks().forEach(t=>t.stop());blob=new Blob(chunks,{type});if(blobURL)URL.revokeObjectURL(blobURL);blobURL=URL.createObjectURL(blob);el('recording').src=blobURL;el('recording').hidden=false;el('download').href=blobURL;el('download').download='opera-recording.'+type.split('/')[1];el('download').textContent='Download my recording';el('download').hidden=false;el('record').disabled=closed;el('stop').disabled=true;if(!closed)status('Recording stays in this tab unless you download it or check local-save consent and submit.');};
  recorder.start();el('record').disabled=true;el('stop').disabled=false;status('Recording… stops automatically after 90 seconds.');recordTimer=setTimeout(stopMedia,90000);
 });
 el('stop').onclick=()=>{stopMedia();};
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition){el('recognize').disabled=true;el('recognize').textContent='Speech-to-text unavailable; type your response instead';}
 el('recognize').onclick=guarded(async()=>{
  if(!el('recognition-consent').checked)throw Error('Consent to your browser recognition service first, or type instead.');
  if(!Recognition)throw Error('Speech recognition unavailable.');
  recognition?.abort();recognition=new Recognition();recognition.lang=activity.audio.language;recognition.interimResults=false;
  recognition.onresult=event=>{if(closed)return;el('response').value=event.results[0][0].transcript;transcriptionUsed=true;status('Editable transcription added. Correct transcription errors before submitting; this does not assess pronunciation.');};
  recognition.onerror=event=>status('Speech recognition failed: '+event.error+'. You can type instead.');recognition.start();
 });
}
window.addEventListener('pagehide',()=>{closed=true;stopMedia();if(blobURL)URL.revokeObjectURL(blobURL);});
