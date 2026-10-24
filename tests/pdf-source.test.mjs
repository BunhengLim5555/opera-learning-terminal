import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {extractPdfText} from '../.pi/extensions/opera/lib/sources.mjs';

test('PDF extraction uses a file argument and UTF-8, without a shell or stdin',()=>{
 const text=extractPdfText('/source/a file.pdf',{platform:'linux',run:(exe,args,options)=>{
  assert.equal(exe,'pdftotext');
  assert.deepEqual(args,['-layout','-enc','UTF-8','/source/a file.pdf','-']);
  assert.equal(options.input,undefined);
  assert.equal(options.shell,undefined);
  assert.equal(options.timeout,15000);
  return Buffer.from('Computer vision');
 }});
 assert.equal(text,'Computer vision');
});

test('Windows falls back to Git when pdftotext is absent from PATH',()=>{
 const calls=[];
 const text=extractPdfText('intro.pdf',{platform:'win32',env:{ProgramFiles:'C:/Program Files'},run:(exe)=>{
  calls.push(exe);
  if(exe==='pdftotext')throw Object.assign(new Error('not found'),{code:'ENOENT'});
  return Buffer.from('Extracted');
 }});
 assert.equal(text,'Extracted');
 assert.deepEqual(calls,['pdftotext',path.join('C:/Program Files','Git','mingw64','bin','pdftotext.exe')]);
});

test('Missing extractor gives actionable feedback',()=>{
 assert.throws(()=>extractPdfText('intro.pdf',{platform:'linux',run:()=>{
  throw Object.assign(new Error('not found'),{code:'ENOENT'});
 }}),/requires pdftotext/);
});

test('Extraction errors are not misreported as a missing dependency',()=>{
 assert.throws(()=>extractPdfText('bad.pdf',{platform:'win32',run:()=>{
  throw Object.assign(new Error('invalid PDF'),{status:1});
 }}),/Could not extract PDF text/);
});
