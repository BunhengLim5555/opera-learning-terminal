import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {slug,localDay} from './store.mjs';
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function lines(text,max=29) { const words=String(text).split(/\s+/),out=[];let line='';for(const word of words){if((line+' '+word).trim().length>max&&line){out.push(line);line='';}line+=(line?' ':'')+word;}if(line)out.push(line);return out.slice(0,3).map(s=>s.length>max+5?s.slice(0,max+3)+'…':s); }
export function validateVisual(v) {
 if(!v||!v.title||!['map','steps','compare'].includes(v.mode)||!Array.isArray(v.nodes)||v.nodes.length<1||v.nodes.length>12)throw Error('Visual needs a title, map/steps/compare mode, and 1–12 nodes.');
 const ids=new Set();for(const n of v.nodes){if(!/^[a-zA-Z][\w-]{0,39}$/.test(n.id)||ids.has(n.id)||!n.label||n.label.length>100||typeof n.detail!=='string'||n.detail.length>3000)throw Error('Use unique short node IDs, labels, and concise details.');ids.add(n.id);}
 for(const e of v.edges||[])if(!ids.has(e.from)||!ids.has(e.to))throw Error('An edge refers to a missing node.');
 if((v.edges||[]).length>24)throw Error('Keep the map to at most 24 connections.');
 return v;
}
export function renderVisual(input) {
 const v=validateVisual(input),e=escapeHTML,nonce=randomUUID(),positions={};
 const indegree=Object.fromEntries(v.nodes.map(n=>[n.id,0])),levels=Object.fromEntries(v.nodes.map(n=>[n.id,0]));
 for(const edge of v.edges||[])indegree[edge.to]++;
 const queue=v.nodes.filter(n=>indegree[n.id]===0).map(n=>n.id);let visited=0;
 while(queue.length){const id=queue.shift();visited++;for(const edge of v.edges||[])if(edge.from===id){levels[edge.to]=Math.max(levels[edge.to],levels[id]+1);if(--indegree[edge.to]===0)queue.push(edge.to);}}
 if(visited<v.nodes.length) v.nodes.forEach((n,i)=>levels[n.id]=Math.floor(i/3));
 if(v.mode==='compare')v.nodes.forEach((n,i)=>levels[n.id]=Math.floor(i/3));
 if(v.mode==='steps')v.nodes.forEach((n,i)=>levels[n.id]=Math.floor(i/3));
 const groups=new Map();for(const n of v.nodes){const rank=levels[n.id];if(!groups.has(rank))groups.set(rank,[]);groups.get(rank).push(n);}
 let y=50;
 for(const [_,group] of [...groups].sort((a,b)=>a[0]-b[0])) {
  group.forEach((n,i)=>{const inRow=Math.min(3,group.length-Math.floor(i/3)*3);positions[n.id]={x:500-inRow*310/2+(i%3)*310+15,y:y+Math.floor(i/3)*160};});
  y+=Math.ceil(group.length/3)*160;
 }
 const height=Math.max(240,y+20);
 const edges=(v.edges||[]).map(edge=>{
  const a=positions[edge.from],b=positions[edge.to];const x1=a.x+140,y1=a.y+100,x2=b.x+140,y2=b.y;
  if(b.y-a.y>160){
   const right=x1>=500,lane=right?980:20,start=right?a.x+280:a.x,end=right?b.x+280:b.x;
   return `<path d="M ${start} ${a.y+50} H ${lane} V ${b.y+50} H ${end}" fill="none" stroke="#91a4b5" stroke-width="2" marker-end="url(#arrow)"/><text x="${lane+(right?-8:8)}" y="${(a.y+b.y)/2+45}" text-anchor="${right?'end':'start'}" fill="#40556b" font-size="12">${e((edge.label||'').slice(0,35))}</text>`;
  }
  return `<path d="M ${x1} ${y1} C ${x1} ${y1+35}, ${x2} ${y2-35}, ${x2} ${y2}" fill="none" stroke="#91a4b5" stroke-width="2" marker-end="url(#arrow)"/><text x="${(x1+x2)/2}" y="${(y1+y2)/2-5}" text-anchor="middle" fill="#40556b" font-size="12">${e((edge.label||'').slice(0,35))}</text>`;
 }).join('');
 const nodes=v.nodes.map((n,i)=>{const p=positions[n.id];return `<g class="node" data-id="${e(n.id)}" tabindex="0" role="button" aria-label="${e(n.label)}"><rect x="${p.x}" y="${p.y}" width="280" height="100" rx="16" fill="#fff" stroke="#c8d4de"/><circle cx="${p.x+27}" cy="${p.y+29}" r="13" fill="#fce4cc"/><text x="${p.x+27}" y="${p.y+34}" text-anchor="middle" font-size="12" fill="#a04a18">${i+1}</text>${lines(n.label).map((t,j)=>`<text x="${p.x+50}" y="${p.y+34+j*21}" font-size="16" fill="#132d42">${e(t)}</text>`).join('')}<title>${e(n.detail)}</title></g>`;}).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${height}" font-family="system-ui, sans-serif" role="img" aria-label="${e(v.title)}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#91a4b5"/></marker></defs><rect width="1000" height="${height}" fill="#f3f7fa"/>${edges}${nodes}</svg>`;
 const data=JSON.stringify(v.nodes).replace(/</g,'\\u003c');
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>${e(v.title)} · OPERA</title><style>
*{box-sizing:border-box}body{margin:0;background:#f6f4ef;color:#152e43;font-family:system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:44px 28px}.brand{font-size:12px;font-weight:800;letter-spacing:3px;color:#a74b1d}header{border-bottom:1px solid #d7ddd9;padding-bottom:24px}h1{font-size:clamp(28px,4vw,44px);margin:14px 0 8px;line-height:1.1}header p{color:#5c6b74;max-width:72ch;line-height:1.6}.bar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:22px 0}.pill{background:#e7ece7;border-radius:30px;padding:8px 14px;font-size:12px}button{background:#173c52;color:white;border:0;border-radius:8px;padding:10px 18px;cursor:pointer;font:inherit}button:disabled{opacity:.4;cursor:default}.map{border:1px solid #d7e1e6;border-radius:20px;overflow:auto;background:#f3f7fa}.map svg{display:block;width:100%;min-width:560px}.node{cursor:pointer}.node:focus rect,.node.active rect{stroke:#cc713c;stroke-width:3}.detail{background:white;border-left:4px solid #cd7946;margin-top:20px;padding:20px 24px;border-radius:0 12px 12px 0;min-height:150px}.detail h2{font-size:20px;margin:0 0 12px}.detail p{line-height:1.7;white-space:pre-wrap;margin:0}footer{font-size:12px;color:#697d87;line-height:1.6;margin-top:24px}.nav{display:flex;gap:8px}.count{font-size:13px;color:#697d87}@media print{button{display:none}main{padding:0}.map svg{min-width:0}.detail{break-inside:avoid}}</style></head><body><main><header><div class="brand">OPERA / CONNECTED LEARNING</div><h1>${e(v.title)}</h1><p>${e(v.summary||'Explore the relationship, then explain it in your own words.')}</p></header><div class="bar"><span class="pill">${e(v.mode.toUpperCase())} · ${v.nodes.length} ideas</span><div class="nav"><button id="prev">← Previous</button><button id="next">Next →</button></div></div><div class="map">${svg}</div><section class="detail" aria-live="polite"><div class="count" id="count"></div><h2 id="title"></h2><p id="detail"></p></section><footer>${e(v.source?'Source: '+v.source:'Coach-created explanation; verify domain claims against your source.')}<br>Click a node or use Previous / Next. This visual does not record quiz progress.</footer></main><script nonce="${nonce}">const nodes=${data};let current=0;function select(i){current=Math.max(0,Math.min(nodes.length-1,i));const n=nodes[current];document.getElementById('title').textContent=n.label;document.getElementById('detail').textContent=n.detail;document.getElementById('count').textContent=(current+1)+' / '+nodes.length;document.querySelectorAll('.node').forEach(x=>x.classList.toggle('active',x.dataset.id===n.id));document.getElementById('prev').disabled=current===0;document.getElementById('next').disabled=current===nodes.length-1;}document.querySelectorAll('.node').forEach(x=>{const go=()=>select(nodes.findIndex(n=>n.id===x.dataset.id));x.addEventListener('click',go);x.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();go();}})});document.getElementById('prev').onclick=()=>select(current-1);document.getElementById('next').onclick=()=>select(current+1);select(0);</script></body></html>`;
 const mermaid=['flowchart TD',...v.nodes.map(n=>`  ${n.id}["${String(n.label).replace(/["<>\n\r]/g,' ')}"]`),...(v.edges||[]).map(edge=>`  ${edge.from} --> ${edge.to}`)].join('\n');
 return {svg,html,mermaid};
}
export function saveVisual(root,v) {
 const rendered=renderVisual(v),dir=path.join(root,'Learning','Visuals');fs.mkdirSync(dir,{recursive:true});
 const stem=`${localDay()}-${slug(v.title)}-${randomUUID().slice(0,8)}`;
 for(const ext of ['svg','html'])fs.writeFileSync(path.join(dir,stem+'.'+ext),rendered[ext],{flag:'wx'});
 const note=`# ${v.title}\n\n${v.summary||''}\n\n![[${stem}.svg]]\n\n[Open interactive visual](${stem}.html)\n\n\x60\x60\x60mermaid\n${rendered.mermaid}\n\x60\x60\x60\n\n${v.nodes.map(n=>`## ${n.label}\n${n.detail}`).join('\n\n')}\n\nSource: ${v.source||'Coach-created example'}\n`;
 fs.writeFileSync(path.join(dir,stem+'.md'),note,{flag:'wx'});
 return {html:path.join(dir,stem+'.html'),svg:path.join(dir,stem+'.svg'),note:path.join(dir,stem+'.md')};
}
