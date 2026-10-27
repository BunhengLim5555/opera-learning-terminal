import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {registerSource,listSources,supported} from './sources.mjs';
export function pickerScript(kind){
 if(!['files','folder'].includes(kind))throw Error('Choose files or folder.');
 const setup=kind==='files'?
  "$dialog=New-Object System.Windows.Forms.OpenFileDialog; $dialog.Title='Add source files to OPERA'; $dialog.Multiselect=$true; $dialog.CheckFileExists=$true; $dialog.RestoreDirectory=$true; $dialog.Filter='Supported sources|*.md;*.txt;*.rst;*.csv;*.tsv;*.json;*.jsonl;*.yaml;*.yml;*.py;*.js;*.mjs;*.ts;*.tsx;*.jsx;*.java;*.c;*.h;*.cpp;*.rs;*.go;*.sh;*.html;*.css;*.sql;*.xml;*.log;*.srt;*.vtt;*.ipynb;*.pdf;*.pptx;*.mp4;*.png;*.jpg;*.jpeg;*.webp|All files|*.*';":
  "$dialog=New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description='Choose a source folder for OPERA'; $dialog.ShowNewFolderButton=$false; $dialog.SelectedPath=[Environment]::GetFolderPath('MyDocuments');";
 const selection=kind==='files'?'@($dialog.FileNames)':'@($dialog.SelectedPath)';
 return [
  "$ErrorActionPreference='Stop'",
  '[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)',
  'Add-Type -AssemblyName System.Windows.Forms',
  '[System.Windows.Forms.Application]::EnableVisualStyles()',
  '$owner=New-Object System.Windows.Forms.Form',
  '$owner.TopMost=$true; $owner.ShowInTaskbar=$false; $owner.Opacity=0; $owner.Width=1; $owner.Height=1; $owner.StartPosition=\'CenterScreen\'',
  setup,
  'try {',
  ' $owner.Show(); [void]$owner.Activate()',
  " if($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK){",
  '  [pscustomobject]@{status=\'selected\';paths='+selection+'} | ConvertTo-Json -Compress',
  " }else{[pscustomobject]@{status='cancelled';paths=@()} | ConvertTo-Json -Compress}",
  '} finally {$dialog.Dispose(); $owner.Dispose()}'
 ].join('\n');
}
/** @param {any} kind @param {{platform?: string,run?: typeof execFile,signal?: AbortSignal}} [options] */
export async function pickSourcePaths(kind,options={}){
 const {platform=os.platform(),run=execFile,signal}=options;
 const script=pickerScript(kind);
 if(signal?.aborted)return [];
 if(platform!=='win32')throw Error('Use the terminal file browser on this platform.');
 const args=['-NoProfile','-NonInteractive','-STA','-WindowStyle','Hidden','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')];
 return new Promise((resolve,reject)=>{
  run('powershell.exe',args,{windowsHide:true,encoding:'utf8',maxBuffer:2*1024*1024,timeout:15*60*1000,signal},(error,stdout)=>{
   if(signal?.aborted||error?.name==='AbortError'){resolve([]);return;}
   if(error){reject(Error('Could not open the Windows file picker: '+error.message));return;}
   try{
    const result=JSON.parse(String(stdout).replace(/^\uFEFF/,'').trim());
    if(result.status==='cancelled'){resolve([]);return;}
    if(result.status!=='selected'||!Array.isArray(result.paths)||result.paths.length>1000||result.paths.some(p=>typeof p!=='string'||!p.trim()))throw Error('Invalid picker result.');
    resolve([...new Set(result.paths)]);
   }catch(error){reject(Error('Could not read the Windows picker result: '+error.message));}
  });
 });
}
export async function browseInTerminal(kind,ctx,start=os.homedir()){
 let current=path.resolve(start);
 while(true){
  let entries=[];try{entries=fs.readdirSync(current,{withFileTypes:true}).filter(e=>!e.name.startsWith('.')&&(e.isDirectory()||kind==='files'&&e.isFile()&&supported(e.name))).sort((a,b)=>Number(b.isDirectory())-Number(a.isDirectory())||a.name.localeCompare(b.name));}catch(error){ctx.ui.notify(error.message,'warning');}
  const actions=[...(kind==='folder'?['Use this folder']:[]),'Parent folder','Home folder','Cancel'];
  const labels=entries.map(e=>(e.isDirectory()?'[Folder] ':'[File] ')+e.name);
  const selected=await ctx.ui.select(current,[...actions,...labels]);
  if(!selected||selected==='Cancel')return [];
  if(selected==='Use this folder')return [current];
  if(selected==='Parent folder'){current=path.dirname(current);continue;}
  if(selected==='Home folder'){current=os.homedir();continue;}
  const entry=entries[labels.indexOf(selected)];if(!entry)continue;
  if(entry.isDirectory())current=path.join(current,entry.name);else return [path.join(current,entry.name)];
 }
}
/** @param {any} store @param {string} args @param {any} ctx @param {{pick?: typeof pickSourcePaths,signal?: AbortSignal}} [options] */
export async function chooseSource(store,args,ctx,options={}){
 const {pick=pickSourcePaths,signal}=options;
 if(signal?.aborted)return;
 let entry;
 if(args.trim()){entry=registerSource(store,args);ctx.ui.notify('Added source: '+entry.label,'info');}
 else{
  const roots=store.read().roots,labels=roots.map(r=>r.id+' · '+r.label);
  const actions=['Browse files…','Browse folder…','Add an HTTPS link','Enter a path'];
  const action=await ctx.ui.select('Sources · add files or a folder, or open a saved source',[...actions,...labels]);
  if(!action||signal?.aborted)return;
  if(action===actions[0]||action===actions[1]){
   const kind=action===actions[0]?'files':'folder';let paths;
   try{paths=await pick(kind,{signal});}
   catch(error){if(signal?.aborted)return;ctx.ui.notify('Opening the terminal file browser instead. '+error.message,'info');paths=await browseInTerminal(kind,ctx);}
   if(signal?.aborted||!paths?.length)return;
   const added=[];
   for(const filename of [...new Set(paths)]){
    try{
     const stat=fs.statSync(filename);
     if(kind==='files'&&(!stat.isFile()||!supported(filename)))throw Error('Use PPTX, MP4, PDF, Markdown, text, code, notebook or image files.');
     if(kind==='folder'&&!stat.isDirectory())throw Error('Choose a folder.');
     const registered=registerSource(store,filename);if(!added.some(r=>r.id===registered.id))added.push(registered);
    }catch(error){ctx.ui.notify(path.basename(filename)+': '+error.message,'warning');}
   }
   if(!added.length)return;
   ctx.ui.notify(added.length===1?'Source ready: '+added[0].label:added.length+' files added. Choose one to study.','info');
   if(added.length===1)entry=added[0];
   else{const options=added.map(r=>r.id+' · '+r.label),selected=await ctx.ui.select('Choose one file to study (all selections are saved)',options);entry=added[options.indexOf(selected)];}
  }else if(action===actions[2]){
   const url=await ctx.ui.input('Public HTTPS source link');if(!url?.trim()||signal?.aborted)return;
   if(!/^https:\/\//i.test(url.trim()))throw Error('Use a public HTTPS URL.');
   entry=registerSource(store,url);
  }else if(action===actions[3]){
   const filename=await ctx.ui.input('File or folder path');if(!filename?.trim()||signal?.aborted)return;entry=registerSource(store,filename);
  }else entry=roots[labels.indexOf(action)];
 }
 if(!entry||signal?.aborted)return;
 let selected='';
 if(entry.kind==='folder'){
  let filter='';
  while(true){
   const files=listSources(entry,filter,400);
   const search='Search filenames…';
   if(!files.items.length)ctx.ui.notify('No supported files match. The folder is saved; try another search or cancel.','info');
   const choice=await ctx.ui.select('Choose one file to study'+(filter?' · '+filter:'')+(files.truncated?' · first 400 matches':''),[...files.items,search]);
   if(!choice||signal?.aborted)return;
   if(choice===search){const query=await ctx.ui.input('Filter filenames (blank shows all)');if(query===undefined)return;filter=query;continue;}
   if(!files.items.includes(choice))return;selected=choice;break;
  }
 }
 if(signal?.aborted)return;
 store.mutate(s=>{s.activeSource={rootId:entry.id,file:selected};});
 return {entry,file:selected};
}
