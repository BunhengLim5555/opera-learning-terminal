import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {extractPdfText,readPdfPages,readSource} from '../.pi/extensions/opera/lib/sources.mjs';

function writePdf(file,{text='OPERA page one',bytes}={}) {
 const content=text?`BT /F1 14 Tf 72 720 Td (${text}) Tj ET\n`:'';
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`
 ];
 let prefix='%PDF-1.4\n';const offsets=[];
 for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(prefix));prefix+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
 const tail=xref=>`xref\n0 6\n0000000000 65535 f \n${offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 let padding=0;
 if(bytes){padding=bytes-Buffer.byteLength(prefix)-2-Buffer.byteLength(tail(bytes));for(let i=0;i<5;i++)padding=bytes-Buffer.byteLength(prefix)-2-Buffer.byteLength(tail(Buffer.byteLength(prefix)+padding+2));if(padding<0)throw Error('PDF size too small');}
 const fd=fs.openSync(file,'w');
 try {
  fs.writeSync(fd,prefix);
  if(bytes){fs.writeSync(fd,'%');const chunk=Buffer.alloc(1024*1024,32);let remaining=padding;while(remaining){const size=Math.min(remaining,chunk.length);fs.writeSync(fd,chunk,0,size);remaining-=size;}fs.writeSync(fd,'\n');}
  fs.writeSync(fd,tail(Buffer.byteLength(prefix)+(bytes?padding+2:0)));
 }finally{fs.closeSync(fd);}
 if(bytes)assert.equal(fs.statSync(file).size,bytes);
}

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

test('PDF reads keep physical page numbers and render pages without text',()=>{
 const calls=[];
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
 const result=readPdfPages('lesson.pdf',2,2,{platform:'linux',run:(exe,args)=>{
  calls.push([exe,args]);
  if(exe==='pdfinfo')return Buffer.from('Pages: 4\n');
  if(exe==='pdftotext')return Buffer.from(args[1]==='2'?'日本語の文法\f':'\f');
  if(exe==='pdftoppm'){fs.writeFileSync(args.at(-1)+'.png',png);return Buffer.alloc(0);}
  throw Error(exe);
 }});
 assert.equal(result.totalPages,4);
 assert.equal(result.nextPage,4);
 assert.deepEqual(result.pages.map(p=>p.page),[2,3]);
 assert.equal(result.pages[0].text,'日本語の文法');
 assert.equal(result.pages[1].image.mimeType,'image/png');
 assert.deepEqual(Buffer.from(result.pages[1].image.data,'base64'),png);
 assert.deepEqual(calls.filter(([exe])=>exe==='pdftotext').map(([,args])=>args.slice(0,4)),[['-f','2','-l','2'],['-f','3','-l','3']]);
});

test('scanned page on a text-only model requests readable input without rendering',()=>{
 const calls=[];
 assert.throws(()=>readPdfPages('scan.pdf',1,1,{vision:false,platform:'linux',run:(exe)=>{
  calls.push(exe);
  if(exe==='pdfinfo')return Buffer.from('Pages: 1\n');
  if(exe==='pdftotext')return Buffer.from('\f');
  throw Error('Renderer must not run for text-only model');
 }}),/vision-capable model|OCR export|screenshot/i);
 assert.ok(!calls.includes('pdftoppm'));
});

test('page outside PDF range is clear when pdfinfo is unavailable',()=>{
 assert.throws(()=>readPdfPages('one-page.pdf',7,1,{platform:'linux',run:(exe)=>{
  if(exe==='pdfinfo')throw Object.assign(new Error('missing'),{code:'ENOENT'});
  if(exe==='pdftotext')throw Object.assign(new Error('Wrong page range given: the first page (7) can not be after the last page (1).'),{status:99});
  throw Error(exe);
 }}),/page 7.*(?:range|unavailable|pages)/i);
});
test('empty pdftotext output means requested page is unavailable',()=>{
 assert.throws(()=>readPdfPages('one-page.pdf',7,1,{platform:'linux',run:(exe)=>{
  if(exe==='pdfinfo')throw Object.assign(new Error('missing'),{code:'ENOENT'});
  if(exe==='pdftotext')return Buffer.alloc(0);
  throw Error('Renderer must not run for an unavailable page');
 }}),/PDF page 7 is outside the available pages/);
});

test('missing PDF renderer offers a screenshot or OCR export',()=>{
 assert.throws(()=>readPdfPages('scan.pdf',1,1,{platform:'linux',run:(exe)=>{
  if(exe==='pdfinfo')return Buffer.from('Pages: 1\n');
  if(exe==='pdftotext')return Buffer.from('\f');
  throw Object.assign(new Error('missing'),{code:'ENOENT'});
 }}),/pdftoppm.*OPERA_POPPLER_BIN.*(?:screenshot|OCR export)/i);
});

test('Windows renders with a configured Poppler bin path containing spaces',()=>{
 const bin='C:\\Program Files\\Poppler Release\\Library\\bin';
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
 const calls=[];
 const result=readPdfPages('scan.pdf',1,1,{platform:'win32',env:{OPERA_POPPLER_BIN:bin},run:(exe,args,options)=>{
  calls.push(exe);
  assert.equal(options.shell,undefined);
  if(exe===path.join(bin,'pdfinfo.exe'))return Buffer.from('Pages: 1\n');
  if(exe===path.join(bin,'pdftotext.exe'))return Buffer.from('\f');
  if(exe===path.join(bin,'pdftoppm.exe')){fs.writeFileSync(args.at(-1)+'.png',png);return Buffer.alloc(0);}
  throw Error(`Unexpected executable: ${exe}`);
 }});
 assert.deepEqual(calls,['pdfinfo','pdftotext','pdftoppm'].map(name=>path.join(bin,name+'.exe')));
 assert.deepEqual(Buffer.from(result.pages[0].image.data,'base64'),png);
});

test('missing configured Poppler and PATH binaries give setup guidance',()=>{
 const bin='C:\\Missing Poppler\\bin',calls=[];
 assert.throws(()=>readPdfPages('scan.pdf',1,1,{platform:'win32',env:{OPERA_POPPLER_BIN:bin},run:(exe)=>{
  calls.push(exe);
  if(exe===path.join(bin,'pdfinfo.exe')||exe==='pdfinfo')throw Object.assign(new Error('not found'),{code:'ENOENT'});
  if(exe===path.join(bin,'pdftotext.exe')||exe==='pdftotext')return Buffer.from('\f');
  throw Object.assign(new Error('not found'),{code:'ENOENT'});
 }}),/pdftoppm.*OPERA_POPPLER_BIN.*screenshot/i);
 assert.deepEqual(calls.slice(-2),[path.join(bin,'pdftoppm.exe'),'pdftoppm']);
});

test('renderer invocation errors preserve the underlying failure',()=>{
 assert.throws(()=>readPdfPages('scan.pdf',1,1,{platform:'linux',run:(exe)=>{
  if(exe==='pdfinfo')return Buffer.from('Pages: 1\n');
  if(exe==='pdftotext')return Buffer.from('\f');
  throw new Error('invalid PDF structure');
 }}),/Could not process PDF with pdftoppm: invalid PDF structure/);
});

test('PDF page count and scan image requests are bounded',()=>{
 assert.throws(()=>readPdfPages('any.pdf',1,4),/1–3 pages/);
 assert.throws(()=>readPdfPages('any.pdf',0,1),/page >= 1/);
});

test('local text sources above 20 MB are accepted up to 100 MB',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'opera-size-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'large.txt');
 const content=Buffer.alloc(21*1024*1024,32);
 content.write('Source line\n');
 fs.writeFileSync(file,content);
 const result=await readSource({kind:'file',path:file},'',1,1);
 assert.match(result.text,/Source line/);
});

test('real PDF at 100 MiB reads one page and rejects one byte above limit',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'opera-pdf-boundary-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'large.pdf');writePdf(file,{bytes:100*1024*1024});
 const root={kind:'file',path:file};
 const result=await readSource(root,'',1,10,{page:1,pages:1,vision:false});
 assert.equal(result.pages[0].text,'OPERA page one');
 assert.equal(result.pages[0].page,1);
 fs.appendFileSync(file,' ');
 await assert.rejects(readSource(root,'',1,10,{page:1,pages:1,vision:false}),/Source exceeds 100 MB/);
});

test('real blank PDF gives text-only guidance and unavailable-page feedback',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'opera-pdf-blank-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'blank.pdf');writePdf(file,{text:''});
 const root={kind:'file',path:file};
 await assert.rejects(readSource(root,'',1,10,{page:1,vision:false}),/vision-capable model|OCR export/);
 await assert.rejects(readSource(root,'',1,10,{page:7,vision:false}),/PDF page 7 is outside|PDF has 1 pages; choose a page within that range/);
});
