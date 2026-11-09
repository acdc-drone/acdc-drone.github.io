import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'.preview');
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const args=['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--hide-scrollbars',`--user-data-dir=${path.join(out,'chrome-render')}`];
const run=extra=>execFileSync(chrome,[...args,...extra],{windowsHide:true,encoding:'utf8',maxBuffer:20*1024*1024,timeout:90000,stdio:['ignore','pipe','pipe']});
const dom=run(['--dump-dom','--virtual-time-budget=7000','http://127.0.0.1:8000/.preview/qa.html']);
fs.writeFileSync(path.join(out,'browser-qa.html'),dom);
const match=dom.match(/<pre id="result">([\s\S]*?)<\/pre>/);
console.log('Browser QA:',match?.[1]||'No output');
for(const [name,size,url] of [['desktop-new','1440,1100',''],['comparison','1440,1900','.preview/frame.html?width=1440&height=1900&section=compare'],['mobile-comparison-wide','500,1500','.preview/frame.html?width=390&height=1500&section=compare'],['mobile-new','500,1100','.preview/frame.html?width=390&height=1100'],['full-page-new','1440,8500','']]){
 run([`--screenshot=${path.join(out,name+'.png')}`,`--window-size=${size}`,'--virtual-time-budget=3500','http://127.0.0.1:8000/'+url]);console.log('Rendered '+name);
}
execFileSync('C:/Program Files/Jellyfin/Server/ffmpeg.exe',['-v','error','-y','-i',path.join(out,'mobile-new.png'),'-vf','crop=390:1100:0:0',path.join(out,'mobile-preview.png')],{windowsHide:true});
execFileSync('C:/Program Files/Jellyfin/Server/ffmpeg.exe',['-v','error','-y','-i',path.join(out,'mobile-comparison-wide.png'),'-vf','crop=390:1500:0:0',path.join(out,'mobile-comparison.png')],{windowsHide:true});
