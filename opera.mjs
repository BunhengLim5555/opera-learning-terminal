#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {registerSource} from './.pi/extensions/opera/lib/sources.mjs';
import {Store} from './.pi/extensions/opera/lib/store.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<19)){console.error('OPERA requires Node.js 22.19+; Node.js 24 LTS is suitable.');process.exit(1);}
const args=process.argv.slice(2);
if(args[0]==='--help'){
 console.log('OPERA learning terminal\n\n  npm start\n  npm start -- "/path/to/your vault"\n  npm start -- --resume\n\nThree learning commands: /learn /review /opera\nUse normal language for explanations, diagrams, debugging, next, hint, or pause.\nThe optional path registers a read source; OPERA output stays in this environment’s Learning folder.\nRemaining flags are passed to Pi.');process.exit(0);
}
if(args[0]&&!args[0].startsWith('-')){
 const source=args.shift();try{const r=registerSource(new Store(root),source);console.log(`Source available: ${r.label} (choose /opera ? Select source inside Pi)`);}catch(e){console.error('Cannot add source: '+e.message);process.exit(1);}
}
const cli=path.join(root,'node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js');
if(!fs.existsSync(cli)){console.error('Dependencies are missing. Run npm ci from the OPERA folder, then npm start.');process.exit(1);}
console.log('OPERA · Orient → Predict → Explain → Apply → Retrieve');
const child=spawn(process.execPath,[cli,...args],{cwd:root,stdio:'inherit',env:process.env});
child.on('error',e=>{console.error(e.message);process.exitCode=1;});
child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
// Pi receives Ctrl+C itself through the inherited terminal. Keep the launcher alive for its exit.
process.on('SIGINT',()=>{});
process.on('SIGTERM',()=>child.kill('SIGTERM'));
