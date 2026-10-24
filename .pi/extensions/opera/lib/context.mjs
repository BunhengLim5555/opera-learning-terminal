// Bound relevant state, never inject full attempt history or teaching instructions.
const clip=(value,max=320)=>value==null?null:String(value).slice(0,max);
export function compactContext(s) {
 const topic=s.topics[s.activeTopic];
 const attempts=s.attempts.filter(a=>a.topicId===s.activeTopic);
 const short=a=>a?{id:a.id,concept:clip(a.concept,120),dimension:a.dimension,question:clip(a.question),response:clip(a.response),truncated:['question','response','feedback'].some(k=>String(a[k]||'').length>320),verdict:a.verdict,assistance:a.assistance,evidence:a.evidence||null,feedback:clip(a.feedback),review:a.nextReview}:null;
 const cp=topic?.checkpoint;
 return {
  style:s.style,interface:s.practicePresentation||'terminal',
  topic:topic?{id:topic.id,title:clip(topic.title,160),objective:clip(topic.goal)}:null,
  source:s.activeSource||null,
  checkpoint:cp?{source:cp.source||null,weakTarget:cp.weakTarget?{concept:clip(cp.weakTarget.concept,120),feedback:clip(cp.weakTarget.feedback)}:null,evidence:(cp.evidence||[]).slice(-3),summary:clip(cp.summary,500),objective:clip(cp.objective),section:clip(cp.section),pendingQuestion:clip(cp.pendingQuestion),assistance:cp.assistance||null,next:clip(cp.next),reviewDate:cp.reviewDate||null}:null,
  pending:short(attempts.findLast(a=>a.verdict==='pending')),
  recent:attempts.slice(-3).map(short),
  exposure:(s.answerExposure||[]).filter(a=>a.topic===topic?.title).slice(-1).map(a=>({question:clip(a.question),assistance:'answer_shown'}))
 };
}
