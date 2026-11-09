import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const site=path.resolve(import.meta.dirname,'..'), root=path.resolve(site,'..');
const ffmpeg='C:/Program Files/Jellyfin/Server/ffmpeg.exe';
const models=[['astra6','GPT-6 Astra'],['sol6','GPT-6 Sol'],['opus5.5','Claude Opus 5.5'],['sonnet5.5','Claude Sonnet 5.5']];
const tasks=[['restaurant_food_inspector','Restaurant','Food inspection','restaurant_kitchen.txt'],['restaurant_customer_tour','Restaurant','Welcoming atmosphere','restaurant_eat.txt'],['cottage_cozy','Cottage','A cozy home','classic_cozy.txt'],['cottage_step_by_step','Cottage','Room by room','classic_instruct.txt'],['luxury_show_off','Luxury','Show off the house','luxury.txt'],['luxury_room_by_room','Luxury','A detailed itinerary','luxury_instuctfollow.txt']];
const audit=JSON.parse(fs.readFileSync(path.join(root,'poster/merged-70-30-42x36/reference/four-model-speed-audit.json'),'utf8'));
const data={models:models.map(([id,label])=>({id,label})),tasks:tasks.map(([id,scene,label,prompt])=>({id,scene,label,prompt:fs.readFileSync(path.join(root,'deep_drone_cinematography/video_process/trajectories',prompt),'utf8').trim()})),runs:[],method:'Speed = norm of the nonuniform three-point finite difference of CSV world position at saved timestamps (one-sided endpoints). Episodes are contiguous samples strictly above 1 m/s. No smoothing or minimum duration. Sampled diagnostics, not continuous-time or collision certification.'};
const mkdir=p=>fs.mkdirSync(p,{recursive:true});
mkdir(path.join(site,'static/data'));
let bytes=0;
for(const [model] of models) for(const workflow of ['structured','dynamic']) {
 const summary=fs.readFileSync(path.join(root,`results-full/${workflow}-${model}/SUMMARY.md`),'utf8');
 for(const [task] of tasks){
  const source=`results-full/${workflow}-${model}/runs/${task}/final`, dir=path.join(root,source), outRel=`static/results/${workflow}-${model}/${task}`, out=path.join(site,outRel);mkdir(out);
  const csv=fs.readFileSync(path.join(dir,`${task}_optimized_path.csv`));
  const sha256=crypto.createHash('sha256').update(csv).digest('hex');
  const rows=csv.toString().trim().split(/\r?\n/).slice(1).map(l=>l.split(',').map(Number));
  const speed=rows.map((r,i)=>{
   if(i===0||i===rows.length-1){const a=rows[i===0?0:i-1],b=rows[i===0?1:i];return Math.hypot(...[1,2,3].map(j=>(b[j]-a[j])/(b[0]-a[0])));}
   const a=rows[i-1],b=rows[i+1],h1=r[0]-a[0],h2=b[0]-r[0];
   return Math.hypot(...[1,2,3].map(j=>-h2/(h1*(h1+h2))*a[j]+(h2-h1)/(h1*h2)*r[j]+h1/(h2*(h1+h2))*b[j]));
  });
  const episodes=speed.filter((s,i)=>s>1&&(i===0||speed[i-1]<=1)).length;
  const prior=audit.rows.find(r=>r.model===model&&r.workflow===workflow&&r.task===task);
  if(!prior||prior.sha256!==sha256||prior.episodes!==episodes)throw Error(`Audit mismatch: ${source}`);
  const reportName=fs.readdirSync(dir).find(n=>n.toLowerCase()==='report.md');
  const report=reportName?fs.readFileSync(path.join(dir,reportName),'utf8'):summary;
  fs.writeFileSync(path.join(out,'report.txt'),report);
  fs.writeFileSync(path.join(out,'trajectory.csv'),csv);
  const input=path.join(dir,`${task}_flythrough.mp4`),video=path.join(out,'tour.mp4');
  // Preserve the exact supplied render, including every frame and original timing.
  if(!fs.existsSync(video)||fs.statSync(video).size!==fs.statSync(input).size)fs.copyFileSync(input,video);
  bytes+=fs.statSync(video).size;
  const posterTime=task==='restaurant_food_inspector'&&model==='astra6'?(workflow==='dynamic'?25:5):Math.min(15,rows.at(-1)[0]*.25);
  if(!fs.existsSync(path.join(out,'poster.jpg')))execFileSync(ffmpeg,['-v','error','-y','-ss',String(posterTime),'-i',input,'-frames:v','1','-q:v','3',path.join(out,'poster.jpg')],{windowsHide:true});
  const stride=Math.max(1,Math.floor(rows.length/260));
  const indices=new Set([0,rows.length-1]);
  for(let i=0;i<rows.length;i+=stride)indices.add(i);
  // Preserve local extrema so downsampling cannot hide speed peaks.
  for(let i=0;i<rows.length;i+=stride){let hi=i,lo=i;for(let j=i;j<Math.min(rows.length,i+stride);j++){if(speed[j]>speed[hi])hi=j;if(speed[j]<speed[lo])lo=j;}indices.add(hi);indices.add(lo);}
  const trace=[...indices].sort((a,b)=>a-b).map(i=>[rows[i][0],speed[i],rows[i][1],rows[i][2],rows[i][3]].map(v=>+v.toFixed(5)));
  const summaryRow=summary.split(/\r?\n/).find(l=>l.startsWith('|')&&l.includes(task))||'';
  data.runs.push({model,workflow,task,source,sha256,video:`${outRel}/tour.mp4`,poster:`${outRel}/poster.jpg`,posterTime,report:`${outRel}/report.txt`,csv:`${outRel}/trajectory.csv`,duration:rows.at(-1)[0],peak:Math.max(...speed),episodes,trace,summaryRow});
  console.log(`${workflow}-${model} / ${task}: ${episodes} episodes`);
 }
}
fs.writeFileSync(path.join(site,'static/data/results.js'),'window.ACDC_RESULTS='+JSON.stringify(data)+';\n');
fs.writeFileSync(path.join(site,'static/data/provenance.json'),JSON.stringify({method:data.method,videoPolicy:'Byte-for-byte copies of current final renders. JPEG thumbnails extracted at recorded posterTime. No synthetic or illustrative footage.',runs:data.runs.map(({trace,summaryRow,...r})=>r)},null,2));
const manuscript=['corl26_v2/main.pdf','corl_v2/main.pdf'].map(p=>path.join(root,p)).find(p=>fs.existsSync(p));
if(!manuscript)throw Error('Manuscript PDF not found in corl26_v2 or corl_v2');
fs.copyFileSync(manuscript,path.join(site,'static/pdfs/acdc-paper.pdf'));
console.log(JSON.stringify({runs:data.runs.length,videoBytes:bytes,structuredEpisodes:data.runs.filter(r=>r.workflow==='structured').reduce((s,r)=>s+r.episodes,0),dynamicEpisodes:data.runs.filter(r=>r.workflow==='dynamic').reduce((s,r)=>s+r.episodes,0)}));
