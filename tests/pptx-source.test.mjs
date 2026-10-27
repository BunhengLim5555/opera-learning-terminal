import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {zipSync,strToU8} from 'fflate';
import {extractPptx} from '../.pi/extensions/opera/lib/pptx.mjs';
import {registerSource,listSources,readSource,searchSource,supported} from '../.pi/extensions/opera/lib/sources.mjs';
import {Store} from '../.pi/extensions/opera/lib/store.mjs';
import {chooseSource,pickerScript} from '../.pi/extensions/opera/lib/source-picker.mjs';
const P='http://schemas.openxmlformats.org/presentationml/2006/main',A='http://schemas.openxmlformats.org/drawingml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',K='http://schemas.openxmlformats.org/package/2006/relationships';
const rel=(id,type,target,extra='')=>'<Relationship Id="'+id+'" Type="'+R+'/'+type+'" Target="'+target+'" '+extra+'/>';
const relationships=content=>'<Relationships xmlns="'+K+'">'+content+'</Relationships>';
const para=text=>'<a:p><a:r><a:t>'+text+'</a:t></a:r></a:p>';
const slide=(content,hidden=false)=>'<p:sld xmlns:p="'+P+'" xmlns:a="'+A+'" '+(hidden?'show="0"':'')+'><p:cSld><p:spTree><p:sp><p:txBody>'+content+'</p:txBody></p:sp></p:spTree></p:cSld></p:sld>';
function fixture(overrides={}) {
 const entries={
  'ppt/presentation.xml':'<p:presentation xmlns:p="'+P+'" xmlns:r="'+R+'"><p:sldIdLst><p:sldId id="256" r:id="second"/><p:sldId id="257" r:id="first"/></p:sldIdLst></p:presentation>',
  'ppt/_rels/presentation.xml.rels':relationships(rel('first','slide','slides/slide1.xml')+rel('second','slide','slides/slide2.xml')),
  'ppt/slides/slide1.xml':slide(para('Actual second slide'),true),
  'ppt/slides/slide2.xml':slide('<a:p><a:r><a:t>Rich</a:t></a:r><a:r><a:t> text &amp; entities &#x03B1;</a:t></a:r><a:br/><a:r><a:t>Next line</a:t></a:r></a:p>'+para('Table cell')),
  'ppt/slides/_rels/slide2.xml.rels':relationships(rel('notes','notesSlide','../notesSlides/notesSlide7.xml')),
  'ppt/notesSlides/notesSlide7.xml':'<p:notes xmlns:p="'+P+'" xmlns:a="'+A+'"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody>'+para('Speaker explanation')+'</p:txBody></p:sp><p:sp><p:nvSpPr><p:nvPr><p:ph type="slidenum"/></p:nvPr></p:nvSpPr><p:txBody>'+para('999')+'</p:txBody></p:sp></p:spTree></p:cSld></p:notes>',
  'ppt/media/image1.png':'ignored image content',
  ...overrides
 };
 return zipSync(Object.fromEntries(Object.entries(entries).filter(([,v])=>v!==null).map(([k,v])=>[k,strToU8(v)])));
}
function temp(t){const p=fs.mkdtempSync(path.join(os.tmpdir(),'opera-pptx-'));t.after(()=>{assert.ok(path.basename(p).startsWith('opera-pptx-'));fs.rmSync(p,{recursive:true,force:true});});return p;}
test('PPTX honors presentation slide order, rich text, notes, hidden slides and decoded entities',()=>{
 const result=extractPptx(fixture());
 assert.equal(result.totalSlides,2);
 assert.equal(result.lines[0].text,'Rich text & entities \u03b1');
 assert.equal(result.lines[1].text,'Next line');
 assert.deepEqual(result.lines.find(l=>l.text==='Speaker explanation'),{text:'Speaker explanation',slide:1,section:'notes',hidden:false});
 assert.equal(result.lines.at(-1).slide,2);assert.equal(result.lines.at(-1).hidden,true);
 assert.equal(result.lines.some(l=>l.text==='999'),false);
});
test('PPTX source listing, bounded read, search, pagination and changed-file cache work',async t=>{
 const root=temp(t),file=path.join(root,'class.PPTX');fs.writeFileSync(file,fixture());
 const source=registerSource(new Store(root),file);
 assert.ok(supported(file));assert.deepEqual(listSources(source).items,['class.PPTX']);
 const read=await readSource(source,'',2,2);
 assert.equal(read.start,2);assert.equal(read.totalSlides,2);assert.match(read.text,/2: \[Slide 1\] Next line/);assert.equal(read.nextLine,4);
 assert.doesNotMatch(read.text,/Actual second/);
 const hit=searchSource(source,'speaker').hits[0];assert.equal(hit.slide,1);assert.equal(hit.section,'notes');assert.equal(hit.line,4);
 const old=read.sha256;fs.writeFileSync(file,fixture({'ppt/slides/slide1.xml':slide(para('Updated slide'))}));
 const changed=await readSource(source);assert.notEqual(changed.sha256,old);assert.match(changed.text,/Updated slide/);
});
test('PPTX is available through native picker, folder browser and shared source workflow',async t=>{
 const root=temp(t),file=path.join(root,'lecture.pptx');fs.writeFileSync(file,fixture());
 const store=new Store(root),queue=['Browse files...'],source=registerSource(store,root);
 assert.deepEqual(listSources(source).items,['lecture.pptx']);
 assert.match(pickerScript('files'),/\*\.pptx/);
 const result=await chooseSource(store,'',{ui:{select:async(_title,options)=>options.find(x=>x.startsWith('Browse files')),notify(){}}},{pick:async()=>[file]});
 assert.equal(result.entry.path,fs.realpathSync(file));assert.equal(store.read().activeSource.rootId,result.entry.id);
});
test('PPTX image-only slides clearly identify missing text',()=>{
 const deck=extractPptx(fixture({'ppt/slides/slide2.xml':slide(''),'ppt/slides/_rels/slide2.xml.rels':null}));
 assert.match(deck.lines[0].text,/No extractable slide text/);
});
test('PPTX rejects invalid, encrypted/legacy, missing and malformed XML packages',()=>{
 assert.throws(()=>extractPptx(Buffer.from('not a zip')),/unencrypted/);
 assert.throws(()=>extractPptx(Buffer.from('PKbroken')),/Cannot unpack/);
 assert.throws(()=>extractPptx(fixture({'ppt/presentation.xml':null})),/missing/);
 assert.throws(()=>extractPptx(fixture({'ppt/slides/slide2.xml':'<broken><x></broken>'})),/Malformed/);
 assert.throws(()=>extractPptx(fixture({'ppt/slides/slide2.xml':'<!DOCTYPE root [<!ENTITY x "unsafe">]><root>&x;</root>'})),/DTD/);
});
test('PPTX will not follow external or escaping slide relationships',()=>{
 for(const target of ['../../outside.xml','https://example.test/private.xml','slides/%2e%2e/%2e%2e/outside.xml']){
  assert.throws(()=>extractPptx(fixture({'ppt/_rels/presentation.xml.rels':relationships(rel('second','slide',target))})),/relationship|supported presentation/);
 }
 assert.throws(()=>extractPptx(fixture({'ppt/_rels/presentation.xml.rels':relationships(rel('second','slide','slides/slide2.xml','TargetMode="External"'))})),/relationship/);
});
test('PPTX rejects excessive expansion and overlarge extracted text',()=>{
 assert.throws(()=>extractPptx(fixture({'ppt/slides/slide2.xml':'x'.repeat(8*1024*1024+1)})),/extraction limits/);
 assert.throws(()=>extractPptx(fixture({'ppt/slides/slide2.xml':slide(para('x'.repeat(4*1024*1024+1)))})),/text exceeds/);
});
test('PPTX strict OOXML namespace variants remain readable',()=>{
 const bytes=fixture(); // Rewrite all XML namespaces using an independent unzip round trip.
 // The canonical ordering/namespace path is exercised above; direct strict fixture below.
 const p='http://purl.oclc.org/ooxml/presentationml/main',a='http://purl.oclc.org/ooxml/drawingml/main',r='http://purl.oclc.org/ooxml/officeDocument/relationships';
 const deck=extractPptx(zipSync({
  'ppt/presentation.xml':strToU8('<p:presentation xmlns:p="'+p+'" xmlns:r="'+r+'"><p:sldIdLst><p:sldId id="1" r:id="s"/></p:sldIdLst></p:presentation>'),
  'ppt/_rels/presentation.xml.rels':strToU8(relationships('<Relationship Id="s" Type="'+r+'/slide" Target="slides/s.xml"/>')),
  'ppt/slides/s.xml':strToU8('<p:sld xmlns:p="'+p+'" xmlns:a="'+a+'"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Strict content</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>')
 }));
 assert.equal(deck.lines[0].text,'Strict content');
});
