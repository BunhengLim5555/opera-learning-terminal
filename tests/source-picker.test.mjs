import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {Store} from '../.pi/extensions/opera/lib/store.mjs';
import {registerSource,readSource} from '../.pi/extensions/opera/lib/sources.mjs';
import {pickSourcePaths,pickerScript,chooseSource,browseInTerminal} from '../.pi/extensions/opera/lib/source-picker.mjs';
function fixture(t){
 const base=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(base,'opera-picker-test-'));
 t.after(()=>{const target=fs.realpathSync(root);if(path.dirname(target)!==base||!path.basename(target).startsWith('opera-picker-test-'))throw Error('Unexpected cleanup target');fs.rmSync(target,{recursive:true,force:true});});
 const files=path.join(root,'Course materials');fs.mkdirSync(files);fs.mkdirSync(path.join(files,'Week 1'));fs.writeFileSync(path.join(files,'first.md'),'# First\nSource text');fs.writeFileSync(path.join(files,'second.txt'),'Second');fs.writeFileSync(path.join(files,'Week 1','nested.md'),'Nested');fs.writeFileSync(path.join(files,'unsupported.exe'),'binary');
 const queue=[],inputs=[],notices=[],menus=[],store=new Store(root);
 const ctx={ui:{notify:(...args)=>notices.push(args),input:async()=>inputs.shift(),select:async(title,options)=>{menus.push({title,options});const next=queue.shift();return typeof next==='function'?next(options):next;}}};
 return {root,files,store,queue,inputs,notices,menus,ctx};
}
test('Windows picker uses a hidden STA process and safely returns Unicode and punctuation paths',async()=>{
 const paths=["C:\\Course notes\\Sam's $project [1].md",'C:\\Sources\\ភាសាខ្មែរ.txt'];let invoked;
 const result=await pickSourcePaths('files',{platform:'win32',run:(program,args,options,callback)=>{invoked={program,args,options};callback(null,JSON.stringify({status:'selected',paths}));}});
 assert.deepEqual(result,paths);assert.equal(invoked.program,'powershell.exe');assert.equal(invoked.options.windowsHide,true);assert.ok(invoked.args.includes('-STA'));assert.ok(invoked.args.includes('-NonInteractive'));
 const script=Buffer.from(invoked.args.at(-1),'base64').toString('utf16le');assert.match(script,/OpenFileDialog/);assert.match(script,/Multiselect=\$true/);assert.ok(!script.includes(paths[0]));
});
test('native cancel, abort, malformed results and process errors are handled',async()=>{
 assert.deepEqual(await pickSourcePaths('folder',{platform:'win32',run:(_p,_a,_o,cb)=>cb(null,'{"status":"cancelled","paths":[]}')}),[]);
 const controller=new AbortController();controller.abort();let called=false;assert.deepEqual(await pickSourcePaths('files',{signal:controller.signal,run:()=>{called=true;}}),[]);assert.equal(called,false);
 await assert.rejects(pickSourcePaths('files',{platform:'win32',run:(_p,_a,_o,cb)=>cb(null,'broken')}),/picker result/);
 await assert.rejects(pickSourcePaths('folder',{platform:'win32',run:(_p,_a,_o,cb)=>cb(new Error('unavailable'))}),/Windows file picker/);
 assert.throws(()=>pickerScript('invalid'),/Choose files or folder/);
});
test('native dialog scripts parse in Windows PowerShell without opening any windows',{skip:process.platform!=='win32'},()=>{
 for(const kind of ['files','folder']){
  const encoded=Buffer.from(pickerScript(kind),'utf16le').toString('base64');
  const script="$text=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('"+encoded+"')); $tokens=$null; $errors=$null; [void][System.Management.Automation.Language.Parser]::ParseInput($text,[ref]$tokens,[ref]$errors); if($errors.Count){$errors | ForEach-Object {$_.ToString()}; exit 1}";
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:15000});
 }
});
test('Browse files registers originals, preserves edits and chooses only one active source',async t=>{
 const h=fixture(t),a=path.join(h.files,'first.md'),b=path.join(h.files,'second.txt');h.queue.push('Browse files…',options=>options.find(x=>x.endsWith('second.txt')));
 const result=await chooseSource(h.store,'',h.ctx,{pick:async kind=>{assert.equal(kind,'files');return [a,b,a];}});
 assert.equal(h.store.read().roots.length,2);assert.equal(result.entry.path,fs.realpathSync(b));assert.equal(h.store.read().activeSource.rootId,result.entry.id);assert.equal(result.file,'');
 fs.writeFileSync(b,'Changed later');assert.match((await readSource(result.entry)).text,/Changed later/);assert.equal(fs.readdirSync(h.files).length,4);
});
test('folder picker browses immediately and searches nested filenames without copying paths',async t=>{
 const h=fixture(t);h.queue.push('Browse folder…','Search filenames…',path.join('Week 1','nested.md'));h.inputs.push('nested');
 const result=await chooseSource(h.store,'',h.ctx,{pick:async()=>[h.files]});
 assert.equal(result.entry.kind,'folder');assert.equal(result.file,path.join('Week 1','nested.md'));assert.equal(h.inputs.length,0);assert.match((await readSource(result.entry,result.file)).text,/Nested/);
});
test('cancelling a native picker does not write state or change the active source',async t=>{
 const h=fixture(t);h.queue.push('Browse files…');assert.equal(await chooseSource(h.store,'',h.ctx,{pick:async()=>[]}),undefined);assert.equal(fs.existsSync(h.store.file),false);
});
test('multiple-file study cancellation keeps registered files and the previous active source',async t=>{
 const h=fixture(t),first=registerSource(h.store,path.join(h.files,'first.md'));h.store.mutate(s=>{s.activeSource={rootId:first.id,file:''};});
 h.queue.push('Browse files…',undefined);await chooseSource(h.store,'',h.ctx,{pick:async()=>[path.join(h.files,'first.md'),path.join(h.files,'second.txt')]});assert.equal(h.store.read().roots.length,2);assert.equal(h.store.read().activeSource.rootId,first.id);
});
test('saved roots, direct paths and HTTPS links remain available',async t=>{
 const h=fixture(t),first=registerSource(h.store,path.join(h.files,'first.md'));h.queue.push(options=>options.find(x=>x.startsWith(first.id+' · ')));assert.equal((await chooseSource(h.store,'',h.ctx)).entry.id,first.id);
 h.queue.push('Add an HTTPS link');h.inputs.push('https://example.com/course');assert.equal((await chooseSource(h.store,'',h.ctx)).entry.kind,'url');
 h.queue.push('Enter a path');h.inputs.push(path.join(h.files,'second.txt'));assert.equal((await chooseSource(h.store,'',h.ctx)).entry.label,'second.txt');
 h.queue.push('first.md');assert.equal((await chooseSource(h.store,h.files,h.ctx)).file,'first.md');
});
test('unsupported picked files are reported and do not become source roots',async t=>{
 const h=fixture(t);h.queue.push('Browse files…');assert.equal(await chooseSource(h.store,'',h.ctx,{pick:async()=>[path.join(h.files,'unsupported.exe')]}),undefined);assert.equal(h.store.read().roots.length,0);assert.ok(h.notices.some(x=>x[1]==='warning'));
});
test('shutdown aborts selection before registration',async t=>{
 const h=fixture(t),controller=new AbortController();h.queue.push('Browse files…');await chooseSource(h.store,'',h.ctx,{signal:controller.signal,pick:async()=>{controller.abort();return [path.join(h.files,'first.md')];}});assert.equal(fs.existsSync(h.store.file),false);
});
test('terminal browser provides a folder/file picker when desktop dialogs are unavailable',async t=>{
 const h=fixture(t);h.queue.push('[Folder] Week 1','[File] nested.md');assert.deepEqual(await browseInTerminal('files',h.ctx,h.files),[path.join(h.files,'Week 1','nested.md')]);
 h.queue.push('Use this folder');assert.deepEqual(await browseInTerminal('folder',h.ctx,h.files),[h.files]);
});
