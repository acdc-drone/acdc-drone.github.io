import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const site=path.resolve(import.meta.dirname,'..'),root=path.resolve(site,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(site,'static/data/provenance.json'),'utf8'));
const run=args=>new Promise((resolve,reject)=>{const p=spawn('C:/Program Files/Jellyfin/Server/ffmpeg.exe',args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';p.stderr.on('data',x=>error+=x);p.on('error',reject);p.on('close',code=>code===0?resolve():reject(Error(error)));});
let cursor=0,total=0;
async function worker(){while(cursor<manifest.runs.length){const r=manifest.runs[cursor++],file=path.join(site,r.video),temp=file+'.web.mp4';
 await run(['-v','error','-y','-i',path.join(root,r.source,`${r.task}_flythrough.mp4`),'-map','0:v:0','-c:v','libx264','-preset','medium','-crf','27','-pix_fmt','yuv420p','-threads','2','-movflags','+faststart','-an',temp]);
 fs.renameSync(temp,file);total+=fs.statSync(file).size;console.log(`Web encode: ${r.workflow}/${r.model}/${r.task}`);
}}
await Promise.all([worker(),worker()]);
manifest.videoPolicy='Web encodes of the current final renders: H.264 CRF 27, preset medium, yuv420p, faststart; original resolution, frame rate, framing and timeline preserved. No synthetic or illustrative footage. JPEG thumbnails extracted from originals at recorded posterTime.';
manifest.webEncode={codec:'libx264',crf:27,preset:'medium',pixelFormat:'yuv420p',faststart:true,totalBytes:total};
fs.writeFileSync(path.join(site,'static/data/provenance.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({webVideoBytes:total}));
