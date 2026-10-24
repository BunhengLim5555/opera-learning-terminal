import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleWidth,colorToHex,styleText} from '@earendil-works/pi-tui';
import {renderStoicHeader,applyOperaBranding,createAnimatedHeader,operaWordmark} from '../.pi/extensions/opera/lib/branding.mjs';
const theme={appearance:'dark',style:(text,options)=>{assert.equal(options.fg.kind,'rgb');if(options.bg)assert.equal(options.bg.kind,'rgb');return styleText(text,options);},fg:(_role,text)=>text};
test('animated and settled headers fit both appearances and terminal widths',()=>{
 for(const appearance of ['light','dark'])for(const width of [0,1,12,30,31,40,67,69,70,80,100,111,112,120,200])for(const effect of ['scan','dissolve','sweep'])for(const progress of [0,.25,.5,.75,1]){
  const lines=renderStoicHeader(width,{...theme,appearance},{effect,progress});
  assert.ok(lines.every(line=>visibleWidth(line)<=width),'overflow at '+width);
  assert.doesNotMatch(lines.join('\n'),/THE STOIC STUDY|Marcus Aurelius-inspired|original text portrait/i);
 }
});
test('portrait exterior uses unstyled spaces rather than a black rectangular background',()=>{
 for(const width of [80,120]){
  const rows=renderStoicHeader(width,theme);
  assert.ok(rows[1].startsWith(' '));
  assert.ok(rows[2].startsWith(' '));
  assert.ok(rows.join('').includes('▀'));
 }
 assert.equal(operaWordmark.length,5);assert.ok(operaWordmark.every(row=>visibleWidth(row)===29));
});
test('wordmark palette follows light and dark themes',()=>{
 const colors=[];const capture={...theme,style:(text,options)=>{colors.push(colorToHex(options.fg));return theme.style(text,options);}};
 renderStoicHeader(120,capture);assert.ok(colors.includes('#d0ad78'));colors.length=0;
 renderStoicHeader(120,{...capture,appearance:'light'});assert.ok(colors.includes('#76532b'));assert.ok(!colors.includes('#d0ad78'));
});
test('animation ends, replays on logo clicks, cancels repeated timers and disposes',()=>{
 let time=0,id=0,redraws=0;const timers=new Map();
 const clock={now:()=>time,repeat:fn=>{timers.set(++id,fn);return id;},cancel:key=>timers.delete(key)};
 const header=createAnimatedHeader({requestRender:()=>redraws++},theme,clock);
 header.render(120);assert.equal(timers.size,1);
 const initial=header.render(120).join('\n');time=800;for(const fn of [...timers.values()])fn();assert.notEqual(header.render(120).join('\n'),initial);
 time=1600;for(const fn of [...timers.values()])fn();assert.equal(timers.size,0);assert.deepEqual(header.render(120),renderStoicHeader(120,theme));
 assert.equal(header.handleMouse({type:'click',button:'left',x:110,y:20,width:120}),undefined);
 assert.ok(header.handleMouse({type:'click',button:'left',x:50,y:3,width:120}).handled);assert.equal(timers.size,1);
 header.handleMouse({type:'click',button:'left',x:15,y:8,width:120});assert.equal(timers.size,1);
 header.dispose();assert.equal(timers.size,0);assert.ok(redraws>0);
});
test('branding installs OPERA only in interactive terminals',()=>{
 for(const mode of ['rpc','print','json'])applyOperaBranding({mode,hasUI:true,ui:{}});
 applyOperaBranding({mode:'tui',hasUI:false,ui:{}});
 let title,factory;applyOperaBranding({mode:'tui',hasUI:true,ui:{setTitle:t=>title=t,setHeader:f=>factory=f}});
 assert.equal(title,'OPERA');const header=factory({requestRender(){}},theme);try{assert.ok(header.render(120).length);}finally{header.dispose();}
});
