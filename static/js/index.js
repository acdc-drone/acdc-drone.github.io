(() => {
'use strict';
const data=window.ACDC_RESULTS;
if(!data)return;
const $=id=>document.getElementById(id), workflows=['structured','dynamic'];
const videos=workflows.map(w=>$(w+'-video'));
const colors=['#b2634e','#287562'];
let pair=[],chartMode='speed',pendingSeek=new Map(),selection=0;
const intentNotes={
 cottage_cozy:'A complete tour with a cozy atmosphere.',
 cottage_step_by_step:'Visit the rooms in the requested order.',
 restaurant_customer_tour:'Highlight the guest dining experience.',
 restaurant_food_inspector:'Show preparation, cleaning, and storage areas.',
 luxury_show_off:'Showcase the house with an open itinerary.',
 luxury_room_by_room:'Follow specified rooms and camera movements.'
};
const rememberedTasks={Restaurant:'restaurant_food_inspector',Cottage:'cottage_cozy',Luxury:'luxury_show_off'};
function updateChoices(task){
 rememberedTasks[task.scene]=task.id;
 document.querySelectorAll('[data-model]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.model===$('model').value))); 
 document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===task.scene)));
 const container=$('prompt-choices');
 // Keep the current buttons in place so keyboard focus survives prompt changes.
 if(container.dataset.scene!==task.scene){
  container.replaceChildren();container.dataset.scene=task.scene;
  data.tasks.filter(t=>t.scene===task.scene).forEach(t=>{
   const button=document.createElement('button');button.type='button';button.dataset.prompt=t.id;
   const title=document.createElement('strong');title.textContent=t.label;
   const description=document.createElement('span');description.textContent=intentNotes[t.id];
   button.append(title,description);button.addEventListener('click',()=>{$('task').value=t.id;loadPair();});container.append(button);
  });
 }
 container.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.prompt===task.id)));
 $('selection-summary').textContent=task.scene+' · '+task.label+' · '+data.models.find(m=>m.id===$('model').value).label;
}
document.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>{$('task').value=rememberedTasks[b.dataset.scene];loadPair();}));
document.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>{$('model').value=b.dataset.model;loadPair();}));
const structuredNotes={astra6:'20 of 100 refinement comparisons per shot; visual retrieval fallback and reduced render samples. Several runs have occupied-voxel or clearance failures. The inspection run also drops below the scene floor.',sol6:'3 of 100 refinement comparisons per shot; manual visual seed retrieval and reduced render settings. All six runs report insufficient clearance. Several tours omit requested rooms or contain weakly framed anchors.','opus5.5':'Reports the full 100-comparison refinement budget. All six final runs report speed and clearance failures. Fixed yaw interpolation can face nearby walls during transitions.','sonnet5.5':'20–21 of 100 refinement comparisons per shot. All six report insufficient clearance and camera roll/pitch violations. Final visual review was limited to contact sheets.'};
const dynamicNotes={astra6:'Reports all prescribed checks passing, using conservative voxel-volume bounds and a revised planner. Rendering uses EEVEE with texture limits. Scan defects remain, and some named luxury rooms do not exist in the mapped scene.',sol6:'Revises routes for speed, camera stability, and clearance, measured to voxel centres. Coverage can be sacrificed: the cottage bedroom and baths are not convincingly covered. See each report for task-specific omissions.','opus5.5':'Uses a custom spline planner and voxel-volume checks. Safer routes omit inaccessible rooms: kitchen interiors in the restaurant and bedrooms/baths in the luxury scene are not reached.','sonnet5.5':'Uses a custom spline planner and maintains lower speeds with level camera roll. Five runs still fall below the requested 0.3 m voxel-centre clearance. Some requested luxury rooms are replaced by available spaces.'};
function pauseAll(){videos.forEach(v=>v.pause());$('play-pair').textContent='Play both';}
function updateButton(){$('play-pair').textContent=videos.some(v=>!v.paused&&!v.ended)?'Pause both':'Play both';}
function loadPair(){
 selection++;pauseAll();pendingSeek.clear();$('player-status').textContent='';
 const model=$('model').value,task=$('task').value;
 updateChoices(data.tasks.find(t=>t.id===task));
 pair=workflows.map(workflow=>data.runs.find(r=>r.model===model&&r.task===task&&r.workflow===workflow));
 $('request').textContent='“'+data.tasks.find(t=>t.id===task).prompt+'”';
 pair.forEach((run,i)=>{const w=run.workflow,v=videos[i];v.poster=run.poster;v.src=run.video;v.load();
  const cells=run.summaryRow.split('|').map(s=>s.trim()).filter(Boolean);
  const limitation=(cells.at(-1)||'See the run report for coverage and limitations.').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[*`]/g,'');
  const firstSentence=limitation.split(/(?<=\.)\s+/)[0];
  const excerpt=firstSentence.length>320?firstSentence.slice(0,317).replace(/\s+\S*$/,'')+'…':firstSentence;
  $(w+'-outcome').textContent='Limitation: '+excerpt;
 });
 $('run-statistics').innerHTML=[
  ['Duration',r=>r.duration.toFixed(1)+' s'],
  ['Peak sampled speed',r=>r.peak.toFixed(3)+' m/s'],
  ['Speed-limit episodes',r=>String(r.episodes)]
 ].map(([label,format])=>`<tr><th scope="row">${label}</th>${pair.map(r=>`<td>${format(r)}</td>`).join('')}</tr>`).join('');
 $('structured-caveat').textContent=structuredNotes[model];$('dynamic-caveat').textContent=dynamicNotes[model];
 $('progress').value=0;$('progress-value').textContent='0%';drawChart();
}
function seek(frac){
 pauseAll();
 videos.forEach((v,i)=>{const time=frac*(Number.isFinite(v.duration)?v.duration:pair[i].duration);if(v.readyState>=1)v.currentTime=Math.min(time,v.duration);else{pendingSeek.set(v,frac);v.preload='metadata';v.load();}});
 $('progress').value=frac*1000;$('progress-value').textContent=Math.round(frac*100)+'%';updateMarkers(frac);
}
videos.forEach((v,i)=>{
 v.addEventListener('loadedmetadata',()=>{if(pendingSeek.has(v)){v.currentTime=pendingSeek.get(v)*v.duration;pendingSeek.delete(v);}});
 for(const event of ['play','pause','ended'])v.addEventListener(event,updateButton);
 v.addEventListener('error',()=>{$('player-status').textContent='This video could not load. Try reloading the page.';});
 v.addEventListener('timeupdate',()=>{const fraction=v.currentTime/(v.duration||pair[i].duration);if(i===0||videos[0].paused){$('progress').value=fraction*1000;$('progress-value').textContent=Math.round(fraction*100)+'%';}updateMarkers();});
});
for(const id of ['model','task'])$(id).addEventListener('change',loadPair);
$('play-pair').addEventListener('click',async()=>{
 if(videos.some(v=>!v.paused&&!v.ended)){pauseAll();return;}
 const version=selection;$('player-status').textContent='';
 videos.forEach(v=>{if(v.ended)v.currentTime=0;});
 const results=await Promise.allSettled(videos.map(v=>v.play()));
 if(version!==selection)return;
 if(results.some(r=>r.status==='rejected')){pauseAll();$('player-status').textContent='Playback was interrupted. Try Play both again, or use either video’s controls.';}
 updateButton();
});
$('restart').addEventListener('click',()=>seek(0));
$('progress').addEventListener('input',()=>seek(Number($('progress').value)/1000));
document.querySelectorAll('[data-chart]').forEach(b=>b.addEventListener('click',()=>{chartMode=b.dataset.chart;document.querySelectorAll('[data-chart]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));drawChart();}));
let plotPoint;
function drawChart(){
 const svg=$('trace-chart');let content='';
 const line=(x1,y1,x2,y2,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#dce2df" ${extra}/>`;
 const text=(x,y,t,extra='')=>`<text x="${x}" y="${y}" ${extra}>${t}</text>`;
 const maxSpeed=Math.max(1.2,...pair.map(r=>r.peak*1.08));
 if(chartMode==='speed'){
  plotPoint=(p,r)=>[55+900*p[0]/r.duration,210-175*p[1]/maxSpeed];
  for(const speed of [0,.5,1]){const y=210-175*speed/maxSpeed;content+=line(55,y,955,y,speed===1?'stroke-dasharray="6 5"':'')+text(43,y+4,speed.toFixed(1),'text-anchor="end"');}
  content+=text(55,19,'Speed · m/s')+text(955,238,'Tour progress (%)','text-anchor="end"');
  for(const percent of [0,25,50,75,100])content+=text(55+900*percent/100,229,String(percent),'text-anchor="middle"');
  svg.setAttribute('aria-label','Sampled speed traces for both workflows over normalized tour progress. Dashed line is the 1 metre per second limit.');
  $('chart-caption').textContent='Speed from the actual CSVs; dashed line: 1 m/s limit. Horizontal axis normalizes each tour’s duration. Colors match the two workflows.';
 }else{
  const points=pair.flatMap(r=>r.trace),xs=points.map(p=>p[2]),ys=points.map(p=>p[3]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(850/Math.max(maxX-minX,1),170/Math.max(maxY-minY,1));
  plotPoint=p=>[500+(p[2]-(minX+maxX)/2)*scale,125-(p[3]-(minY+maxY)/2)*scale];
  content+=text(55,19,'World XY · top-down projection')+line(65,210,65+scale,210,'stroke-width="2"')+text(65,232,'1 m');
  svg.setAttribute('aria-label','Top-down flight paths from actual world coordinates, with equal scale on both axes. No scene geometry is shown.');
  $('chart-caption').textContent='Actual world XY coordinates, equal scale on both axes. Dots follow the video positions. This top-down projection omits height and obstacles; it is not a clearance map.';
 }
 pair.forEach((r,i)=>{const d=r.trace.map((p,j)=>{const [x,y]=plotPoint(p,r);return `${j?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;}).join(' ');content+=`<path d="${d}" fill="none" stroke="${colors[i]}" stroke-width="2.2" opacity=".9"/><circle id="marker-${i}" r="5" fill="${colors[i]}" stroke="white" stroke-width="2"/>`;});
 content+=text(650,19,'● Defined','style="fill:'+colors[0]+'"')+text(790,19,'● Agent-directed','style="fill:'+colors[1]+'"');
 svg.innerHTML=content;updateMarkers();
}
function updateMarkers(forced){
 if(!plotPoint)return;
 pair.forEach((r,i)=>{const time=forced===undefined?videos[i].currentTime:forced*r.duration;let point=r.trace[0];for(const p of r.trace){if(Math.abs(p[0]-time)<Math.abs(point[0]-time))point=p;}
 const [x,y]=plotPoint(point,r),marker=$('marker-'+i);if(marker){marker.setAttribute('cx',x);marker.setAttribute('cy',y);}
 });
}
$('results-table').innerHTML=data.models.map(m=>`<tr><th scope="row">${m.label}</th>${workflows.map(w=>`<td>${(data.runs.filter(r=>r.model===m.id&&r.workflow===w).reduce((s,r)=>s+r.episodes,0)/6).toFixed(2)}</td>`).join('')}</tr>`).join('');
// Count each result up once when it becomes visible, including the model rows.
function initResultCounters(){
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 if(reducedMotion.matches||!('IntersectionObserver' in window))return;
 const counters=new Map(),frames=new Set();
 const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
   if(!entry.isIntersecting)return;
   observer.unobserve(entry.target);
   const counter=counters.get(entry.target);
   if(counter.value===0){counter.display.textContent=counter.final;return;}
   let start;
   function tick(now){
    if(reducedMotion.matches){counter.display.textContent=counter.final;return;}
    start??=now;
    const progress=Math.min((now-start)/1200,1);
    const eased=1-Math.pow(1-progress,3);
    counter.display.textContent=progress===1?counter.final:(counter.value*eased).toFixed(2);
    if(progress<1){const id=requestAnimationFrame(t=>{frames.delete(id);tick(t);});frames.add(id);}
   }
   const id=requestAnimationFrame(t=>{frames.delete(id);tick(t);});frames.add(id);
  });
 },{threshold:0.6});
 document.querySelectorAll('#results .headline-metric>strong, #results-table td').forEach(node=>{
  const final=node.textContent.trim(),value=Number(final);
  if(!Number.isFinite(value))return;
  // Assistive technology reads the final result, never intermediate counts.
  const accessible=document.createElement('span');accessible.className='sr-only';accessible.textContent=final;
  const display=document.createElement('span');display.setAttribute('aria-hidden','true');display.textContent='0.00';
  node.replaceChildren(accessible,display);counters.set(node,{display,final,value});observer.observe(node);
 });
 reducedMotion.addEventListener('change',event=>{
  if(!event.matches)return;
  observer.disconnect();frames.forEach(cancelAnimationFrame);frames.clear();
  counters.forEach(counter=>{counter.display.textContent=counter.final;});
 });
}
initResultCounters();
$('copy-citation').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('bibtex-code').textContent);$('copy-status').textContent='BibTeX copied.';}catch{const range=document.createRange();range.selectNodeContents($('bibtex-code'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);$('copy-status').textContent='Citation selected. Press Ctrl+C (or Command+C) to copy.';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAll();});
loadPair();
})();
