import {truncateToWidth,rgbColor} from '@earendil-works/pi-tui';

// null pixels leave the terminal background untouched. Dark carved shadows remain opaque.
const portraits={"compact":[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,29,null,36,69,53,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,81,130,99,157,133,93,167,109,111,93,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,125,150,107,126,97,139,135,57,89,117,106,148,126,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,56,77,135,168,75,169,92,58,127,134,111,125,167,113,138,148,82,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,22,96,69,110,184,122,142,156,57,67,63,84,116,83,48,111,136,94,19,null,null,null,null,null,null,null],[null,null,null,null,null,null,128,157,60,106,158,101,94,102,24,46,82,76,93,81,38,141,113,98,134,23,null,null,null,null,null,null],[null,null,null,null,null,27,73,122,112,52,61,93,26,83,23,28,77,49,50,38,38,72,50,123,123,null,null,null,null,null,null,null],[null,null,null,null,null,96,62,114,91,84,55,96,22,22,94,156,203,183,133,190,127,33,32,90,60,59,null,null,null,null,null,null],[null,null,null,null,null,59,35,26,78,156,50,54,58,122,181,197,213,212,210,213,198,100,28,55,106,95,null,null,null,null,null,null],[null,null,null,null,null,79,58,118,44,87,141,110,116,156,205,215,197,212,215,220,204,187,70,117,80,39,null,null,null,null,null,null],[null,null,null,null,38,65,55,79,49,19,79,61,102,162,173,132,117,129,170,145,153,171,80,46,107,108,null,null,null,null,null,null],[null,null,null,null,null,26,34,41,58,79,36,80,95,72,104,101,38,52,189,57,77,143,58,48,83,21,null,null,null,null,null,null],[null,null,null,null,null,58,30,27,44,77,69,130,135,87,101,151,87,100,208,92,121,71,48,59,64,null,null,null,null,null,null,null],[null,null,null,null,null,50,31,29,27,22,101,115,185,204,158,158,195,162,177,190,148,142,84,56,null,null,null,null,null,null,null,null],[null,null,null,null,null,18,18,39,14,61,128,97,133,175,199,211,189,147,184,207,191,196,82,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,42,38,63,54,106,126,104,124,186,206,142,117,104,137,206,163,75,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,22,18,65,65,119,148,131,147,163,183,176,89,31,109,185,146,92,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,45,13,59,65,108,158,142,148,172,97,62,41,99,161,149,93,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,23,24,49,101,128,100,151,133,61,46,87,94,53,82,159,62,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,24,50,39,56,121,120,87,95,138,120,112,122,83,127,59,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,47,51,77,54,82,101,173,197,189,186,202,118,126,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,27,80,50,38,122,138,158,169,127,122,185,155,78,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,92,68,35,76,79,130,141,104,105,153,114,98,68,97,103,43,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,91,95,50,41,64,128,117,78,121,126,125,153,103,55,126,187,109,105,127,67,null,null],[null,null,null,null,21,78,26,21,20,null,78,102,77,47,74,69,119,55,87,94,134,182,194,119,107,203,151,138,114,178,88,44],[null,null,null,80,90,55,41,24,20,48,71,98,89,63,54,59,79,42,70,76,154,192,194,133,124,183,196,163,165,180,185,132],[null,null,67,102,94,110,69,26,58,81,79,84,90,57,55,48,36,28,38,90,181,209,171,157,174,132,212,175,203,191,189,154],[57,86,62,119,143,151,51,61,65,85,89,81,93,55,44,42,36,39,50,144,208,203,135,194,207,107,205,180,211,185,178,180],[127,120,101,45,81,120,152,131,75,86,109,95,87,71,35,46,67,43,89,189,189,178,138,197,187,140,173,194,200,181,165,183],[150,163,168,70,150,136,133,181,165,136,151,155,130,111,62,93,122,145,194,194,201,208,143,201,188,169,154,212,198,160,196,184],[179,171,166,135,163,96,155,148,193,156,177,191,183,166,175,175,185,187,170,158,131,166,132,208,186,173,141,200,183,173,195,183],[178,201,161,142,171,124,73,145,181,164,159,136,152,128,108,96,88,121,149,168,157,203,144,185,188,166,169,174,147,189,193,181]],"wide":[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,24,42,18,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,94,20,43,120,135,50,84,148,161,145,35,37,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,47,33,83,143,173,139,167,125,154,94,120,130,75,139,175,140,32,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,88,148,162,108,143,96,78,156,142,114,61,46,133,117,76,160,121,157,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,63,52,90,163,172,57,145,141,92,68,64,119,176,103,134,112,169,155,102,133,141,125,34,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,83,61,110,169,190,130,135,169,132,61,82,131,47,97,108,113,145,78,75,141,158,142,72,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,81,134,95,79,119,182,122,83,158,141,85,31,70,98,66,79,130,110,42,53,121,133,93,108,54,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,95,165,152,57,69,129,168,133,71,103,102,31,51,34,62,83,94,104,69,49,47,138,161,97,119,152,80,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,89,79,163,104,111,56,117,139,35,44,118,46,15,25,51,50,60,37,49,32,60,84,61,80,101,149,54,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,71,46,65,163,115,41,11,55,68,55,15,37,31,42,78,121,140,57,48,84,78,48,67,53,82,105,87,34,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,21,116,31,84,115,102,118,72,49,102,75,15,24,84,143,173,203,212,186,163,202,205,102,23,19,41,96,43,125,31,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,76,26,47,28,81,157,123,15,29,37,46,109,167,188,197,210,212,202,203,205,206,178,86,21,46,46,75,141,75,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,39,56,36,69,50,71,173,159,120,121,126,145,190,202,203,207,227,226,221,229,226,208,184,54,54,127,113,71,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,50,103,99,78,147,45,27,61,125,100,89,112,157,202,215,219,198,189,200,212,204,200,197,202,113,80,81,71,87,25,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,60,66,37,73,62,69,9,37,70,65,64,121,168,165,162,98,91,116,127,176,138,157,151,168,127,50,50,121,111,80,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,30,32,8,57,42,25,55,76,25,39,102,99,83,105,148,116,37,48,84,181,88,48,66,142,109,32,68,72,66,17,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,30,44,41,33,53,112,101,53,95,131,73,51,61,102,88,43,32,97,220,61,49,115,99,62,34,26,94,29,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,21,66,48,16,25,33,42,59,68,120,153,155,117,110,131,160,125,113,137,216,148,125,153,85,69,47,83,52,19,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,17,52,37,32,30,26,20,44,95,104,148,203,209,172,141,165,203,181,140,184,202,168,123,129,132,46,56,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,24,20,30,33,16,27,105,140,96,120,166,197,208,193,201,208,166,153,184,209,190,175,188,148,28,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,21,16,56,19,30,40,142,111,92,117,143,175,210,218,196,143,151,186,223,197,206,189,128,30,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,42,32,39,81,59,66,103,148,104,110,117,168,200,202,145,108,69,79,101,166,206,161,116,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,21,29,13,74,83,83,126,151,133,130,147,156,177,182,193,93,46,35,55,177,192,147,121,31,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,36,30,12,25,84,91,91,163,149,146,147,158,192,175,136,82,19,98,186,170,152,141,33,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,33,40,20,20,51,73,122,113,152,148,144,157,137,47,38,32,43,51,92,157,150,127,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,26,29,20,85,100,144,103,107,154,146,99,46,37,88,108,120,81,33,103,164,121,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,34,28,56,49,62,83,120,112,106,91,62,116,93,76,81,122,46,126,121,132,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,24,74,39,38,102,95,133,87,65,172,189,197,188,185,191,124,88,133,60,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,74,53,63,71,50,55,108,151,180,192,182,175,178,197,189,116,122,47,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,62,82,41,58,32,134,126,166,148,169,145,113,128,189,175,153,85,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,46,91,64,37,40,96,109,79,153,132,134,70,96,159,131,113,85,48,66,83,59,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,32,98,98,60,36,55,41,133,112,157,159,63,142,125,149,127,123,68,64,84,131,165,76,27,28,44,null,null,null,null,null],[null,null,null,null,null,null,null,null,22,20,22,17,null,36,93,105,71,46,40,39,122,128,112,85,49,123,148,139,97,161,152,66,51,95,194,187,109,103,117,169,103,null,null,null],[null,null,null,null,null,null,20,80,37,32,18,24,null,23,83,103,87,73,43,63,92,60,132,115,32,78,127,90,142,178,194,170,107,93,182,204,134,139,78,156,184,84,51,null],[null,null,null,null,18,61,104,77,18,29,26,21,null,45,71,100,97,75,58,47,70,54,84,87,32,109,87,77,173,185,207,164,132,134,136,214,183,138,178,115,184,158,181,137],[null,null,null,41,100,87,68,56,41,55,15,20,52,72,72,85,106,84,64,57,51,64,65,42,30,56,67,112,180,195,215,122,164,172,85,213,204,146,208,186,191,179,193,99],[null,null,null,64,87,100,97,131,94,26,30,53,84,82,78,79,97,81,55,57,52,45,32,28,29,34,66,155,189,211,200,115,193,206,77,190,213,166,210,197,199,183,153,175],[null,59,66,49,132,170,165,167,80,50,41,57,86,86,85,83,82,91,53,47,50,43,33,35,38,44,109,182,209,213,164,121,213,214,122,144,213,180,202,206,196,185,168,175],[123,117,93,84,43,58,101,100,107,117,60,71,77,85,103,94,72,102,60,32,39,38,43,49,36,63,157,194,210,194,155,116,215,217,112,133,208,201,178,209,182,164,191,172],[125,104,163,104,78,59,94,161,125,177,153,99,64,93,113,103,87,94,84,33,48,50,81,60,47,116,185,198,168,180,192,122,212,206,113,165,183,216,172,209,177,146,200,179],[140,186,137,177,83,108,136,127,149,147,188,181,127,139,150,156,150,123,117,54,64,88,117,138,158,199,191,188,213,210,197,113,212,190,138,203,142,216,201,199,155,182,207,175],[176,170,176,169,127,157,146,86,171,125,157,203,158,180,191,188,180,165,158,150,165,158,163,185,209,205,209,208,183,167,195,115,218,188,143,218,120,209,211,177,169,190,201,176],[184,166,201,149,126,184,137,122,77,168,169,173,188,152,148,184,178,164,147,141,148,160,162,156,130,113,86,88,102,184,175,128,205,189,138,214,127,163,196,147,189,196,193,176],[176,196,203,150,124,188,148,151,57,89,140,181,196,129,175,118,145,160,137,118,108,91,78,104,141,170,205,186,148,212,179,157,167,203,128,206,180,147,194,125,194,194,187,177]]};
export const stoicPortrait=portraits.compact.filter((_,i)=>i%2===0).map(row=>'▀'.repeat(row.length));
const letters={
 O:[' ███ ','█   █','█   █','█   █',' ███ '],
 P:['████ ','█   █','████ ','█    ','█    '],
 E:['█████','█    ','████ ','█    ','█████'],
 R:['████ ','█   █','████ ','█  █ ','█   █'],
 A:[' ███ ','█   █','█████','█   █','█   █']
};
export const operaWordmark=Array.from({length:5},(_,row)=>[...'OPERA'].map(c=>letters[c][row]).join(' '));
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
function pixel(value,x,y,width,height,animation){
 if(value===null||!animation||animation.progress>=1)return value;
 const p=animation.progress;
 if(animation.effect==='scan'&&y/height>p)return null;
 if(animation.effect==='dissolve'&&((x*37+y*71+x*y*13)%101)/101>p)return null;
 if(animation.effect==='sweep'){
  const distance=x/width-(-0.25+1.5*p);
  return clamp(value+75*Math.exp(-distance*distance/0.009));
 }
 return value;
}
function portraitRows(theme,pixels,animation){
 const lines=[];
 for(let y=0;y<pixels.length;y+=2){
  let line='';
  for(let x=0;x<pixels[y].length;x++){
   const top=pixel(pixels[y][x],x,y,pixels[y].length,pixels.length,animation);
   const bottom=pixel(pixels[y+1][x],x,y+1,pixels[y].length,pixels.length,animation);
   const color=v=>rgbColor(v,v,v);
   if(top===null&&bottom===null)line+=' ';
   else if(bottom===null)line+=theme.style('▀',{fg:color(top)});
   else if(top===null)line+=theme.style('▄',{fg:color(bottom)});
   else line+=theme.style('▀',{fg:color(top),bg:color(bottom)});
  }
  lines.push(line);
 }
 return lines;
}
function wordmarkRows(theme,animation){
 const base=theme.appearance==='light'?[118,83,43]:[208,173,120];
 return operaWordmark.map((row,y)=>[...row].map((c,x)=>{
  if(c===' ')return ' ';
  const brightness=pixel(150,x,y,29,5,animation);
  if(brightness===null)return ' ';
  const lift=brightness-150;
  return theme.style(c,{fg:rgbColor(...base.map(v=>clamp(v+lift))),bold:true});
 }).join(''));
}
export function renderStoicHeader(width,theme,animation){
 const w=Math.max(0,Math.floor(width)),clip=lines=>lines.map(line=>truncateToWidth(line,w));
 const muted=text=>theme.fg('muted',text),dim=text=>theme.fg('dim',text);
 const logo=wordmarkRows(theme,animation);
 if(w<70)return clip(['',...(w>=31?logo.map(line=>' '+line):[theme.fg('accent',' OPERA')]),'',muted(' Observe. Reason. Practice. Reflect.'),dim(' /opera · session home'),'']);
 const pixels=w>=112?portraits.wide:portraits.compact;
 const art=portraitRows(theme,pixels,animation),available=w-pixels[0].length-3;
 const commands=['/learn   /review   /opera'];
 const copy=['',...logo,'',muted('A quiet place to think clearly.'),dim('Observe. Reason. Practice. Reflect.'),'',...(available>=47?[muted('Orient → Predict → Explain → Apply → Retrieve')]:[muted('Orient → Predict → Explain'),muted('Apply → Retrieve')]),'',...commands.map(dim)];
 const count=Math.max(art.length,copy.length);
 const lines=Array.from({length:count},(_,i)=>(art[i]||' '.repeat(pixels[0].length))+'   '+(copy[i]||''));
 return clip(['',...lines,'']);
}
export function createAnimatedHeader(tui,theme,options={}){
 const now=options.now||Date.now,repeat=options.repeat||setInterval,cancel=options.cancel||clearInterval;
 const effects=['scan','dissolve','sweep'];
 let timer=null,animation=null,started=0,next=0,lastWidth=0,disposed=false,cache=null;
 function stop(){if(timer!==null){cancel(timer);timer=null;}}
 function start(){
  if(disposed)return;
  stop();started=now();animation={effect:effects[next++%effects.length],progress:0};cache=null;
  timer=repeat(()=>{
   const progress=Math.min(1,Math.max(0,(now()-started)/1600));
   animation=progress>=1?null:{...animation,progress};cache=null;
   if(progress>=1)stop();
   tui.requestRender();
  },40);
  timer?.unref?.();
  tui.requestRender();
 }
 const component={
  render(width){lastWidth=width;if(cache?.width===width)return cache.lines;const lines=renderStoicHeader(width,theme,animation);cache={width,lines};return lines;},
  invalidate(){cache=null;},
  handleMouse(event){
   if(disposed||event.button!=='left')return;
   const w=lastWidth||event.width;
   const size=w>=112?44:32;
   const portrait=w>=70&&event.x>=0&&event.x<size&&event.y>=1&&event.y<=size/2;
   const left=w>=70?size+3:1,top=w>=70?2:1;
   const wordmark=w>=31&&event.x>=left&&event.x<left+29&&event.y>=top&&event.y<top+5;
   if(!portrait&&!wordmark)return;
   if(event.type==='press')return {handled:true,render:false};
   if(event.type==='click'){if(options.onOpen){stop();animation=null;cache=null;options.onOpen(portrait?'portrait':'wordmark');}else start();return {handled:true,render:true};}
  },
  dispose(){disposed=true;stop();cache=null;}
 };
 start();return component;
}
export function applyOperaBranding(ctx){
 if(ctx.mode!=='tui'||!ctx.hasUI)return;
 ctx.ui.setHeader((tui,theme)=>createAnimatedHeader(tui,theme));
 ctx.ui.setTitle('OPERA');
}
