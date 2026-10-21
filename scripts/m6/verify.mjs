import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {generateFestivalResult} from '../../src/lib/festival-result.ts';
const base='http://127.0.0.1:3196',tokens=['a','b','c','d'].map(c=>c.repeat(43));
const selections=['grand','lifetime','sorry','once','dissent','rescue'].map((category_id,i)=>({category_id,tmdb_id:i+1,title:['기생충','에브리씽 에브리웨어 올 앳 원스','인셉션','괴물','시네마 천국','벌새'][i],original_title:null,release_year:2026,poster_path:i===0?'/jjHccoFjbqlfr4VGLVLT7yek0Xn.jpg':null}));
function snapshot(count,long=false){const movies=structuredClone(selections.slice(0,count));if(long){for(const movie of movies){movie.title='아주 긴 영화 제목과 한국어 '.repeat(40).slice(0,500);movie.poster_path=null;}}
 const result=generateFestivalResult({rules_version:'result-v1.1',survey:{q1:4,q2:0,q3:0,q4:0,q5:0,q6:'zero'},selections:movies});return {nickname:'테스트 위원장',...result.result,selections:movies,awarded_count:count,brand_version:'1.1',created_year:2026};}
const snapshots=[snapshot(3),snapshot(6),snapshot(6,true),snapshot(3,true)];
let revoked=false,app,chrome,socket;const profile=await mkdtemp(join(tmpdir(),'banguseok-m6-')),report={checks:[],images:[]};
const pass=name=>{report.checks.push(name);console.log(`PASS: ${name}`);};
const mock=createServer((req,res)=>{const token=new URL(req.url,'http://localhost').searchParams.get('token')?.slice(3),index=tokens.indexOf(token);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(index>=0&&!revoked?[{public_snapshot:snapshots[index]}]:[]));});
await mkdir('artifacts/m6',{recursive:true});
try {
 await new Promise((resolve,reject)=>{mock.once('error',reject);mock.listen(3197,'127.0.0.1',resolve);});
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3196'],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3197',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-only',SUPABASE_SERVICE_ROLE_KEY:'fixture-only'},stdio:['ignore','ignore','pipe']});
 let logs='';app.stderr.on('data',d=>{logs+=d;});
 for(let i=0;;i++){try{if((await fetch(`${base}/api/share-image/bad`)).status===404)break;}catch{}if(i>120)throw Error(`APP_START_FAILED ${logs.slice(-800)}`);await new Promise(r=>setTimeout(r,500));}
 for(const [i,name] of ['three','six','six-long','three-long'].entries()){
  const started=performance.now(),response=await fetch(`${base}/api/share-image/${tokens[i]}`);assert.equal(response.status,200,await response.clone().text().then(t=>t.slice(0,150)));assert.equal(response.headers.get('content-type'),'image/png');assert.match(response.headers.get('cache-control'),/no-store/);
  const png=Buffer.from(await response.arrayBuffer());assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1920);await writeFile(`artifacts/m6/${name}.png`,png);report.images.push({name,bytes:png.length,milliseconds:Math.round(performance.now()-started)});
 }
 pass('Actual Next route renders 3/6 awards, missing posters and max-length Korean titles at 1080×1920');
 assert.equal((await fetch(`${base}/api/share-image/${tokens[0]}`,{method:'HEAD'})).status,405);
 assert.equal((await fetch(`${base}/api/share-image/${tokens[0]}`,{method:'POST'})).status,405);pass('HEAD/POST do not render');
 chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-port=0','about:blank'],{stdio:['ignore','ignore','pipe']});
 const endpoint=await new Promise((resolve,reject)=>{let buffer='';const timer=setTimeout(()=>reject(Error('CHROME_TIMEOUT')),15000);chrome.stderr.on('data',d=>{buffer+=d;const m=buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}});chrome.once('error',reject);});
 socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let sequence=0;const waiting=new Map();socket.onmessage=e=>{const m=JSON.parse(e.data),p=waiting.get(m.id);if(p){waiting.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
 function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++sequence;waiting.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}));setTimeout(()=>{if(waiting.has(id)){waiting.delete(id);reject(Error(`TIMEOUT ${method}`));}},15000).unref();});}
 const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});const cdp=(method,params={})=>send(method,params,sessionId);
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
 async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('BROWSER_EVALUATION_FAILED');return r.result.value;}
 async function wait(expression){for(let i=0;i<200;i++){try{if(await evaluate(`Boolean(${expression})`))return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error(`WAIT ${expression}: ${await evaluate(`document.querySelector('.share-image-actions')?.innerText`)}`);}
 async function click(text){await evaluate(`Array.from(document.querySelectorAll('button,a')).find(e=>e.textContent===${JSON.stringify(text)}).click()`);}
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'canShare',{value:()=>true});Object.defineProperty(navigator,'share',{value:async data=>{window.shared={name:data.files[0].name,type:data.files[0].type,size:data.files[0].size};if(window.cancelShare)throw new DOMException('cancel','AbortError');}});`});
 await cdp('Page.navigate',{url:`${base}/f/${tokens[1]}`});await wait(`document.querySelector('.share-image-actions button') && Object.keys(document.querySelector('.share-image-actions button')).some(k=>k.startsWith('__reactProps'))`);
 assert.equal(await evaluate(`document.querySelectorAll('.result-film').length`),6);assert.ok(await evaluate(`document.documentElement.scrollWidth<=360`));await click('공유 이미지 만들기');await wait(`document.querySelector('a[download]')`);
 assert.deepEqual(await evaluate(`(async()=>{const b=await(await fetch(document.querySelector('a[download]').href)).blob();const i=await createImageBitmap(b);return [i.width,i.height]})()`),[1080,1920]);pass('Chrome mobile viewport: public result intact, actual PNG blob decoded and download link ready');
 await cdp('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:resolve('artifacts/m6/downloads')});await click('PNG 다운로드');for(let i=0;i<100;i++){try{assert.ok((await stat('artifacts/m6/downloads/banguseok-festival.png')).size>1000);break;}catch{if(i===99)throw Error('DOWNLOAD_FAILED');await new Promise(r=>setTimeout(r,100));}}pass('Chrome writes actual PNG download');
 await click('이미지 공유');await wait(`document.querySelector('.share-image-actions [role=status]').textContent.includes('공유를 마쳤어요')`);assert.equal((await evaluate('window.shared')).type,'image/png');
 await evaluate('window.cancelShare=true');await click('이미지 공유');await wait(`document.querySelector('.share-image-actions [role=status]').textContent.includes('취소')`);assert.ok(await evaluate(`Boolean(document.querySelector('a[download]'))`));pass('Mocked Web Share receives PNG File; cancellation keeps download');
 await evaluate(`document.querySelector('.share-image-actions').scrollIntoView()`);const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('artifacts/m6/mobile-actions.png',Buffer.from(shot.data,'base64'));
 revoked=true;assert.equal((await fetch(`${base}/api/share-image/${tokens[1]}`)).status,404);await click('PNG 다시 만들기');await wait(`document.querySelector('.share-image-actions [role=status]').textContent.includes('찾을 수 없어요')`);assert.equal(await evaluate(`document.querySelectorAll('.result-film').length`),6);assert.equal(await evaluate(`document.querySelector('a[download]')===null`),true);pass('Revocation returns 404, clears stale download, preserves existing HTML');
 // Both the packaged font and the renderer WASM must survive output tracing.
 const tracePath='.next/server/app/api/share-image/[token]/route.js.nft.json';
 try{const trace=JSON.parse(await readFile(tracePath,'utf8'));report.trace={font:trace.files.filter(f=>f.endsWith('NanumGothic-Regular.ttf')),wasm:trace.files.filter(f=>f.endsWith('.wasm'))};}catch{/* Dev does not emit production traces; inspect build separately. */}
 await writeFile('artifacts/m6/report.json',JSON.stringify(report,null,2)+'\n');
} finally {socket?.close();chrome?.kill();app?.kill();mock.closeAllConnections();await new Promise(resolve=>mock.close(resolve));await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:100});}
