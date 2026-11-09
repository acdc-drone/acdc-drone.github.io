import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'static/data/results.js'),'utf8'),context);
const data=context.window.ACDC_RESULTS,html=fs.readFileSync(path.join(root,'index.html'),'utf8'),issues=[];
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)issues.push('Duplicate HTML IDs');
for(const [,url] of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)){
 if(/^(https?:|mailto:)/.test(url))continue;
 if(url.startsWith('#')){if(!ids.includes(url.slice(1)))issues.push('Missing anchor '+url);}
 else if(!fs.existsSync(path.join(root,url.split(/[?#]/,1)[0])))issues.push('Missing asset '+url);
}
if(data.runs.length!==48)issues.push('Expected 48 runs');
let videoBytes=0;
for(const r of data.runs){
 for(const key of ['video','poster','report','csv'])if(!fs.existsSync(path.join(root,r[key])))issues.push('Missing '+r[key]);
 const csv=fs.readFileSync(path.join(root,r.csv));if(crypto.createHash('sha256').update(csv).digest('hex')!==r.sha256)issues.push('CSV hash mismatch '+r.csv);
 const info=JSON.parse(execFileSync('C:/Program Files/Jellyfin/Server/ffprobe.exe',['-v','error','-show_entries','stream=codec_name,width,height,r_frame_rate','-show_entries','format=duration','-of','json',path.join(root,r.video)],{windowsHide:true}));
 const s=info.streams[0];if(s.codec_name!=='h264'||s.width!==960||s.height!==540||s.r_frame_rate!=='24/1')issues.push('Unexpected video format '+r.video);
 if(Math.abs(Number(info.format.duration)-r.duration)>.2)issues.push('Video/trajectory duration mismatch '+r.video);
 videoBytes+=fs.statSync(path.join(root,r.video)).size;
 if(r.trace.some(p=>p.some(n=>!Number.isFinite(n))))issues.push('Nonfinite trace '+r.csv);
}
const page=await fetch('http://127.0.0.1:8000');if(page.status!==200)issues.push('HTTP page failure');
const partial=await fetch('http://127.0.0.1:8000/'+data.runs[0].video,{headers:{Range:'bytes=0-99'}});if(partial.status!==206||(await partial.arrayBuffer()).byteLength!==100)issues.push('Video seeking range failure');
const result={status:issues.length?'FAIL':'PASS',runs:data.runs.length,videoBytes,checks:['all HTML local resources and anchors','48 source-matched CSV hashes','48 H.264/960x540/24fps videos','48 video and trajectory timing checks','finite plot coordinates','HTTP 200','HTTP range requests for video seeking'],issues};
fs.writeFileSync(path.join(root,'.preview/validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(issues.length)process.exitCode=1;
