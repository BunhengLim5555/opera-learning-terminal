import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const project=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const manifest=JSON.parse(fs.readFileSync(path.join(project,'application-manifest.json'),'utf8'));

test('application manifest hashes match every shipped file',()=>{
 for(const entry of manifest.files){
  const file=path.join(project,entry.path);
  assert.ok(fs.existsSync(file),`Missing application file: ${entry.path}`);
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),entry.sha256,`Stale hash: ${entry.path}`);
 }
});

test('updater preserves learner and provider files in a disposable installation',{skip:process.platform!=='win32'},t=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'opera-update-test-'));
 t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
 const target=path.join(parent,'installed');
 fs.mkdirSync(path.join(target,'.opera'),{recursive:true});
 fs.mkdirSync(path.join(target,'Learning'),{recursive:true});
 fs.mkdirSync(path.join(target,'.pi'),{recursive:true});
 fs.writeFileSync(path.join(target,'opera.mjs'),'old launcher');
 fs.writeFileSync(path.join(target,'package.json'),'old package');
 const state='{"learner":"keep"}\n',notes='Private note',provider='private provider setting';
 fs.writeFileSync(path.join(target,'.opera','state.json'),state);
 fs.writeFileSync(path.join(target,'Learning','note.md'),notes);
 fs.writeFileSync(path.join(target,'.pi','settings.json'),provider);
 execFileSync('powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(project,'Update-Opera.ps1'),'-Target',target],{timeout:30000,windowsHide:true});
 assert.equal(fs.readFileSync(path.join(target,'.opera','state.json'),'utf8'),state);
 assert.equal(fs.readFileSync(path.join(target,'Learning','note.md'),'utf8'),notes);
 assert.equal(fs.readFileSync(path.join(target,'.pi','settings.json'),'utf8'),provider);
 assert.deepEqual(fs.readFileSync(path.join(target,'opera.mjs')),fs.readFileSync(path.join(project,'opera.mjs')));
 assert.ok(fs.readdirSync(parent).some(name=>name.startsWith('opera-application-backup-')));
});
