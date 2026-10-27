import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readVideo,mediaTools,parseCaptions,timestamp} from '../.pi/extensions/opera/lib/video.mjs';
import {registerSource,listSources,readSource,searchSource} from '../.pi/extensions/opera/lib/sources.mjs';
import {Store} from '../.pi/extensions/opera/lib/store.mjs';
import {pickerScript,chooseSource} from '../.pi/extensions/opera/lib/source-picker.mjs';
const tools=mediaTools(),execute=promisify(execFile);
function fixture(t,{embedded=false}={}) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'opera-video-test-'));
 t.after(()=>{assert.ok(path.basename(root).startsWith('opera-video-test-'));fs.rmSync(root,{recursive:true,force:true});});
 const file=path.join(root,"lecture's $[1].mp4");
 const args=['-nostdin','-v','error','-f','lavfi','-i','testsrc=size=320x180:rate=4','-f','lavfi','-i','sine=frequency=440:sample_rate=16000'];
 const captions='1\n00:00:00,000 --> 00:00:01,200\nA source mechanism.\n\n2\n00:00:01,500 --> 00:00:03,000\nThe changed condition.\n';
 if(embedded){const srt=path.join(root,'embedded.srt');fs.writeFileSync(srt,captions);args.push('-i',srt);}
 args.push('-t','3','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac');
 if(embedded)args.push('-c:s','mov_text');
 args.push('-movflags','+faststart','-y',file);
 execFileSync(tools.ffmpeg,args,{windowsHide:true,timeout:20000});
 return {root,file,captions,source:registerSource(new Store(root),file)};
}
test('real MP4 codecs produce bounded, timestamped JPEG frames with honest audio limits',async t=>{
 const h=fixture(t),result=await readSource(h.source,'',1,160,{startSeconds:0.5,seconds:1,frameCount:2});
 assert.ok(result.durationSeconds>=2.9);assert.equal(result.hasAudio,true);assert.equal(result.frames.length,2);
 assert.equal(result.frames[0].seconds,0.5);assert.equal(result.window.end,1.5);assert.equal(result.nextSeconds,1.5);
 for(const f of result.frames){assert.equal(f.image.mimeType,'image/jpeg');assert.equal(Buffer.from(f.image.data,'base64')[0],0xff);}
 assert.equal(result.transcript.status,'unavailable');assert.match(result.transcript.note,/No accessible captions/);assert.match(result.note,/not continuous/);
 assert.match(pickerScript('files'),/\*\.mp4/);
});
test('embedded MP4 captions are read without granting access to sibling files',async t=>{
 const h=fixture(t,{embedded:true}),result=await readSource(h.source,'',1,160,{seconds:1.3,frameCount:1});
 assert.equal(result.transcript.kind,'embedded-subtitles');assert.match(result.text,/00:00:00.000.*mechanism/);assert.doesNotMatch(result.text,/changed condition/);
});
test('folder-selected MP4 sidecar subtitles are bounded, searchable and source-attributed',async t=>{
 const h=fixture(t);fs.writeFileSync(h.file.slice(0,-4)+'.srt',h.captions);
 const source=registerSource(new Store(h.root),h.root),file=path.basename(h.file);
 assert.ok(listSources(source).items.includes(file));
 const result=await readSource(source,file,1,160,{startSeconds:1.4,seconds:1,frameCount:1});
 assert.equal(result.transcript.kind,'sidecar-subtitles');assert.match(result.text,/changed condition/);assert.doesNotMatch(result.text,/source mechanism/);
 const hit=searchSource(source,'mechanism').hits.find(h=>h.file===file);assert.equal(hit.startSeconds,0);assert.equal(hit.cue,1);
 const single=await readSource(h.source,'',1,160,{frameCount:1});assert.equal(single.transcript.status,'unavailable');
});
test('MP4 metadata access bypasses the text-file size cap without reading the whole video',async t=>{
 const h=fixture(t);
 const fd=fs.openSync(h.file,'r+');fs.ftruncateSync(fd,21*1024*1024);fs.closeSync(fd);
 const result=await readSource(h.source,'',1,160,{frameCount:1});assert.equal(result.frames.length,1);assert.ok(result.fingerprint.bytes>20*1024*1024);
});
test('caption parser handles WebVTT markup, Unicode, notes and SRT timestamps',()=>{
 const cues=parseCaptions('WEBVTT\n\nNOTE ignored\nnot a cue\n\nid\n00:01.000 --> 00:02.500 align:start\n<b>Meaning</b> &amp; mechanism\n');
 assert.deepEqual(cues,[{start:1,end:2.5,text:'Meaning & mechanism'}]);
 assert.equal(timestamp(3661.125),'01:01:01.125');
 assert.throws(()=>parseCaptions('x'.repeat(2*1024*1024+1)),/2 MB/);
});
test('MP4 rejects invalid windows, damaged files and unavailable tools clearly',async t=>{
 const h=fixture(t);
 for(const opts of [{startSeconds:-1},{seconds:301},{seconds:0},{frameCount:7},{frameCount:-1}])await assert.rejects(readVideo(h.file,opts),/MP4 read requires/);
 await assert.rejects(readVideo(h.file,{startSeconds:100}),/before the end/);
 const bad=path.join(h.root,'bad.mp4');fs.writeFileSync(bad,'not a video');await assert.rejects(readVideo(bad),/metadata/);
 await assert.rejects(readVideo(h.file,{runner:async()=>{throw Object.assign(Error('missing'),{code:'ENOENT'});}}),/npm ci/);
});
test('optional speech reports unavailable Whisper rather than inventing audio content',async t=>{
 const h=fixture(t);
 const result=await readVideo(h.file,{transcribe:true,frameCount:1,runner:async(program,args,options)=>{
  if(program==='whisper')throw Object.assign(Error('missing'),{code:'ENOENT'});
  return execute(program,args,options);
 }});
 assert.equal(result.transcript.status,'unavailable');assert.match(result.transcript.note,/no audio transcription/i);assert.equal(result.text,'');assert.equal(result.frames.length,1);
});
test('local speech command receives only the requested audio clip and restores absolute timestamps',async t=>{
 const h=fixture(t);let speechDir;
 const result=await readVideo(h.file,{startSeconds:1,seconds:1,transcribe:true,frameCount:1,runner:async(program,args,options)=>{
  assert.equal(options.shell,false);
  if(program==='whisper'){
   if(args[0]==='--help')return {stdout:Buffer.from('Available'),stderr:Buffer.alloc(0)};
   speechDir=args[args.indexOf('--output_dir')+1];
   assert.ok(fs.statSync(args[0]).size>100);assert.ok(args.includes('--fp16'));assert.ok(args.includes('False'));
   fs.writeFileSync(path.join(speechDir,'clip.srt'),'1\n00:00:00,000 --> 00:00:00,500\nSIMULATED ASR OUTPUT\n');
   return {stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)};
  }
  return execute(program,args,options);
 }});
 assert.equal(result.transcript.kind,'machine-transcript');assert.match(result.text,/00:00:01.000/);assert.match(result.text,/SIMULATED/);
 assert.equal(fs.existsSync(speechDir),false);
});
test('MP4 cancellation reaches subprocesses without a learner-state write',async t=>{
 const h=fixture(t),controller=new AbortController();controller.abort();
 await assert.rejects(readVideo(h.file,{signal:controller.signal}),e=>e.name==='AbortError');
});
test('source picker accepts MP4 directly and keeps the original source file',async t=>{
 const h=fixture(t),store=new Store(h.root);
 const selected=await chooseSource(store,'',{ui:{select:async(_title,items)=>items.find(i=>i.startsWith('Browse files')),notify(){}}},{pick:async()=>[h.file]});
 assert.equal(selected.entry.path,fs.realpathSync(h.file));assert.ok(fs.existsSync(h.file));
});

test('MP4 sidecar discovery cannot escape the selected source via symlinks',async t=>{
 const h=fixture(t),outside=fs.mkdtempSync(path.join(os.tmpdir(),'opera-caption-outside-'));
 t.after(()=>{assert.ok(path.basename(outside).startsWith('opera-caption-outside-'));fs.rmSync(outside,{recursive:true,force:true});});
 const secret=path.join(outside,'private.srt');fs.writeFileSync(secret,h.captions);
 try{fs.symlinkSync(secret,h.file.slice(0,-4)+'.srt');}catch(e){if(e.code==='EPERM'){t.skip('File symlink privilege unavailable.');return;}throw e;}
 const source=registerSource(new Store(h.root),h.root);
 const result=await readSource(source,path.basename(h.file),1,160,{frameCount:0});
 assert.equal(result.transcript.status,'unavailable');assert.equal(result.frames.length,0);
});
