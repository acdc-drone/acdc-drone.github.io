(() => {
'use strict';
const data=window.ACDC_REFINEMENT,root=document.getElementById('paper-evidence');
if(!data||!root)return;
const $=id=>document.getElementById(id),svg=$('refinement-plot'),slider=$('refinement-progress');
const play=$('refinement-play'),reveal=$('refinement-reveal'),cursor=$('refinement-cursor');
const paths=[...root.querySelectorAll('.refinement-curve')],markers=[...root.querySelectorAll('.refinement-marker')];
let selected=0,comparison=100,frame=0,playing=false,startTime=0,startComparison=0,plotWidth=900;
let introObserver=null,introPending=false;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const x=i=>70+i*plotWidth/100,y=value=>300-(value-.75)/.255*270;
function render(){
 slider.value=String(comparison);$('refinement-position').value=`${comparison} / 100`;
 reveal.setAttribute('width',String(comparison*plotWidth/100+1));
 cursor.setAttribute('x1',x(comparison));cursor.setAttribute('x2',x(comparison));
 const runs=selected?[data.runs[selected-1]]:data.runs;
 const mean=runs.reduce((sum,r)=>sum+r.values[comparison],0)/runs.length;
 $('refinement-similarity').value=mean.toFixed(3);
 $('refinement-metric-label').textContent=selected?`Initialization ${selected} similarity`:'Mean similarity · seven runs';
 paths.forEach((p,i)=>{p.style.opacity=selected&&selected!==i+1?'.12':'1';});
 markers.forEach((m,i)=>{m.setAttribute('cx',x(comparison));m.setAttribute('cy',y(data.runs[i].values[comparison]));m.style.opacity=selected&&selected!==i+1?'0':'1';});
 svg.setAttribute('aria-label',`Cosine similarity to the reference over 100 VLM comparisons. Showing comparison ${comparison}. ${selected?'Initialization '+selected:'Mean of seven initializations'}: ${mean.toFixed(3)}.`);
 root.querySelectorAll('[data-refinement-trace]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.refinementTrace)===selected)));
}
function pause(){playing=false;cancelAnimationFrame(frame);play.textContent='▶ Play';play.setAttribute('aria-pressed','false');}
function cancelIntro(){introPending=false;introObserver?.disconnect();}
function tick(now){
 if(!playing)return;
 comparison=Math.min(100,Math.floor(startComparison+(now-startTime)/85));render();
 if(comparison===100){pause();play.textContent='↻ Replay';return;}
 frame=requestAnimationFrame(tick);
}
function startPlayback(){
 if(comparison===100)comparison=0;
 playing=true;startTime=performance.now();startComparison=comparison;
 play.textContent='Ⅱ Pause';play.setAttribute('aria-pressed','true');render();frame=requestAnimationFrame(tick);
}
play.addEventListener('click',()=>{
 cancelIntro();
 if(playing){pause();return;}
 if(reduced.matches){comparison=comparison===100?0:100;render();return;}
 startPlayback();
});
$('refinement-reset').addEventListener('click',()=>{cancelIntro();pause();comparison=0;render();});
slider.addEventListener('input',()=>{cancelIntro();pause();comparison=Number(slider.value);render();});
root.querySelectorAll('[data-refinement-trace]').forEach(b=>b.addEventListener('click',()=>{cancelIntro();pause();selected=Number(b.dataset.refinementTrace);render();}));
// Convert pointer coordinates through the SVG transform so scrubbing remains accurate at every viewport size.
function scrub(event){
 const matrix=svg.getScreenCTM();if(!matrix)return;
 const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
 cancelIntro();pause();comparison=Math.round(Math.max(0,Math.min(100,(point.x-70)/plotWidth*100)));render();
}
svg.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')return;svg.setPointerCapture(event.pointerId);scrub(event);});
svg.addEventListener('pointermove',event=>{if(svg.hasPointerCapture(event.pointerId))scrub(event);});
const dialog=$('refinement-dialog');let opener=null;
root.querySelectorAll('[data-refinement-image]').forEach(link=>link.addEventListener('click',event=>{
 if(typeof dialog.showModal!=='function'||event.metaKey||event.ctrlKey||event.shiftKey)return;
 event.preventDefault();opener=link;
 $('refinement-dialog-image').src=link.getAttribute('href');
 $('refinement-dialog-image').alt=link.querySelector('img').alt;
 $('refinement-dialog-title').textContent=link.dataset.refinementImage;
 dialog.showModal();
}));
$('refinement-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>opener?.focus());
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
reduced.addEventListener('change',()=>{cancelIntro();pause();if(reduced.matches)comparison=100;render();updateMotionNote();});
function layout(){
 const width=svg.clientWidth<640?600:1000;plotWidth=width-100;
 svg.setAttribute('viewBox',`0 0 ${width} 370`);
 paths.forEach((p,i)=>p.setAttribute('d',data.runs[i].values.map((v,n)=>`${n?'L':'M'}${x(n)},${y(v)}`).join(' ')));
 svg.querySelectorAll('.refinement-grid').forEach(line=>line.setAttribute('x2',x(100)));
 svg.querySelectorAll('[data-comparison]').forEach(label=>label.setAttribute('x',x(Number(label.dataset.comparison))));
 $('refinement-x-label').setAttribute('x',70+plotWidth/2);render();
}
new ResizeObserver(layout).observe(svg);
function updateMotionNote(){
 $('refinement-motion-note').textContent=reduced.matches?'Reduced motion is enabled. Play steps between the beginning and end; the slider selects any comparison.':'Plays once when the graph comes into view. Replay, drag the graph, or use the slider to explore. Choose an initialization to isolate its trace.';
}
updateMotionNote();
root.querySelectorAll('[data-refinement-interactive]').forEach(el=>el.hidden=false);
if(!reduced.matches&&'IntersectionObserver' in window){
 comparison=0;introPending=true;
 introObserver=new IntersectionObserver(entries=>{
  if(!introPending||document.hidden)return;
  if(entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.35)){
   cancelIntro();startPlayback();
  }
 },{threshold:.35,rootMargin:'0px 0px -5% 0px'});
 introObserver.observe(svg);
}
layout();
})();
