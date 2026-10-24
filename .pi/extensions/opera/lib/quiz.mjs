export function prepareQuestion(p,random=Math.random) {
 if(!p.question?.trim()||p.question.length>3000)throw Error('Supply one concise question.');
 if(!['choice','recall'].includes(p.mode))throw Error('Use choice or recall.');
 if(p.mode==='recall')return [];
 if(!Array.isArray(p.options)||p.options.length<2||p.options.length>6)throw Error('Supply 2–6 answer options.');
 const ids=new Set(),labels=new Set();
 for(const o of p.options){if(!o.id||ids.has(o.id)||!o.label?.trim()||labels.has(o.label.trim()))throw Error('Options require unique IDs and labels.');ids.add(o.id);labels.add(o.label.trim());}
 if(!ids.has(p.correctId)||!p.explanation?.trim())throw Error('Choice questions require a matching correctId and explanation.');
 const options=p.options.map(o=>({...o}));
 for(let i=options.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
 return options;
}
export function gradeChoice(selected,correctId) { return selected==='__skip'?'skipped':selected==='__idk'?'idk':selected===correctId?'correct':'incorrect'; }
export function publicPrompt(p,options=[]) { return {question:p.question,options:options.map(o=>({id:o.id,label:o.label}))}; }
