import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {qaCases} from './fixtures.mjs';
import {newSurveyDraft,DRAFT_KEY} from '../../src/lib/survey-draft.ts';
const profile=await mkdtemp(join(tmpdir(),'banguseok-m3-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-port=0','about:blank'],{stdio:['ignore','ignore','pipe']});
let socket,diagnose;const results=[];
try{
 const endpoint=await new Promise((resolve,reject)=>{let buffer='';const timer=setTimeout(()=>reject(Error('CHROME_TIMEOUT')),15000);chrome.stderr.on('data',data=>{buffer+=data;const m=buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}});chrome.once('error',reject);});
 socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let sequence=0;const waiting=new Map(),requests=[];
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const pending=waiting.get(m.id);if(pending){waiting.delete(m.id);if(m.error)pending.reject(Error('CDP_COMMAND_FAILED'));else pending.resolve(m.result);}}else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);};
 function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++sequence;waiting.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}));setTimeout(()=>{if(waiting.has(id)){waiting.delete(id);reject(Error(`CDP_TIMEOUT_${method}`));}},10000).unref();});}
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});const cdp=(method,params={})=>send(method,params,sessionId);
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
 async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('BROWSER_EVALUATION_FAILED');return r.result.value;}
 async function wait(expression,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){try{if(await evaluate(`Boolean(${expression})`))return;}catch(e){if(e.message!=='CDP_COMMAND_FAILED')throw e;}await new Promise(r=>setTimeout(r,100));}throw Error('BROWSER_WAIT_TIMEOUT');}
 async function click(label){await wait(`Array.from(document.querySelectorAll('button,a')).some(e=>e.textContent.trim()===${JSON.stringify(label)}&&!e.disabled)`);await evaluate(`Array.from(document.querySelectorAll('button,a')).find(e=>e.textContent.trim()===${JSON.stringify(label)}&&!e.disabled).click()`);}
 async function navigate(path){await cdp('Page.navigate',{url:`http://127.0.0.1:3000${path}`});}
 async function screenshot(name,full=false){await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);const clip=full?(await cdp('Page.getLayoutMetrics')).cssContentSize:null;
  const {data}=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:full,...(clip?{clip:{x:0,y:0,width:clip.width,height:clip.height,scale:1}}:{})});await writeFile(`artifacts/m3/${name}.png`,Buffer.from(data,'base64'));}
 const readDraft=()=>evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(DRAFT_KEY)}))`);
 function fixture(c){const draft={...newSurveyDraft(),current_question:5,current_screen:'review',nickname:c.nickname,survey:c.survey};for(const movie of c.selections)draft.selections[movie.category_id]=movie;return draft;}
 async function show(draft){await evaluate(`localStorage.setItem(${JSON.stringify(DRAFT_KEY)},${JSON.stringify(JSON.stringify(draft))})`);await navigate('/create/result');await wait(`document.querySelector('.result-citation')`);}
 function pass(name){results.push({name,result:'PASS'});console.log(`PASS: ${name}`);}
 diagnose=()=>evaluate(`({path:location.pathname,heading:document.querySelector('main h1')?.textContent,filmCount:document.querySelectorAll('.result-film').length})`);
 await navigate('/create/result');await wait(`document.querySelector('.result-empty')`);assert.ok(await evaluate(`document.body.innerText.includes('작성 중인 초안이 없어요.')`));pass('Direct result URL with no local draft has a recovery path');
 const cases=await qaCases();const notEnough=fixture(cases[0]);notEnough.selections.rescue=null;notEnough.pending_selection.rescue=cases[0].selections[2];
 await evaluate(`localStorage.setItem(${JSON.stringify(DRAFT_KEY)},${JSON.stringify(JSON.stringify(notEnough))})`);await navigate('/create/result');await wait(`document.querySelector('.result-empty')`);assert.ok(await evaluate(`document.body.innerText.includes('3개 부문을 선정해 주세요.')`));pass('Two confirmed plus one pending cannot generate a result');
 const apiBefore=requests.filter(url=>new URL(url).pathname.startsWith('/api/')).length;
 for(const c of cases){
  await show(fixture(c));
  assert.equal(await evaluate(`document.querySelector('.result-citation h3').textContent`),c.expected.title,c.id);
  assert.equal(await evaluate(`document.querySelector('.award-sentence').textContent`),c.expected.award_sentence,c.id);
  assert.equal(await evaluate(`document.querySelector('.selection-sentence').textContent`),c.expected.selection_sentence,c.id);
  assert.equal(await evaluate(`document.querySelectorAll('.result-film').length`),3,c.id);
  assert.equal(await evaluate(`document.querySelector('.volume-sentence')?.textContent??null`),c.expected.volume_sentence,c.id);
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=360`));
  if(['Q01','Q08','Q10'].includes(c.id)){
   await wait(`Array.from(document.querySelectorAll('.result-film img')).every(i=>i.complete&&i.naturalWidth>0)`,20000);
   await screenshot(`${c.id.toLowerCase()}-mobile-full`,true);
   if(c.id==='Q01'){await evaluate(`window.scrollTo(0,0)`);await screenshot('result-360');await evaluate(`document.querySelector('.result-special').scrollIntoView()`);await screenshot('special-360');}
  }
 }
 assert.equal(requests.filter(url=>new URL(url).pathname.startsWith('/api/')).length,apiBefore);pass('All 12 synthetic QA outputs match exact Korean text in Chrome, without result/API requests');
 await show(fixture(cases[3]));const before=await evaluate(`document.querySelector('.award-sentence').textContent`);await cdp('Page.reload');await wait(`document.querySelector('.award-sentence')`);assert.equal(await evaluate(`document.querySelector('.award-sentence').textContent`),before);assert.equal((await readDraft()).current_screen,'result');pass('Result reload and result-stage draft restoration are stable');
 await click('설문 고치기');await wait(`document.querySelector('progress')?.value===1`);await click('다음→');await wait(`document.querySelector('progress')?.value===2`);
 await evaluate(`document.querySelectorAll('.survey-option input')[2].click()`);for(let i=1;i<6;i++){await wait(`document.querySelector('progress')?.value===${i+1}`);await click(i===5?'설문 마치기→':'다음→');}
 await wait(`location.pathname==='/create/awards'`);await click('3개 선정됨 · 시상식 열기');await wait(`location.pathname==='/create/review'`);await click('공식 결과지 미리보기 →');await wait(`document.querySelector('.result-citation h3')?.textContent==='단독 개최 공로상'`);assert.equal((await readDraft()).survey.q2,2);pass('Editing survey through actual M1 screens changes the visible special award');
 await click('수상작 고치기 →');await wait(`document.querySelector('.category-list')`);await evaluate(`document.querySelector('.category-list a').click()`);await wait(`document.querySelectorAll('.poster-card:not(:disabled)').length===6`,20000);
 await evaluate(`Array.from(document.querySelectorAll('.poster-card')).find(e=>!e.getAttribute('aria-label').startsWith('기생충 ·')).click()`);await wait(`document.querySelector('.selection-bar button:not(:disabled)')`);await click('이 작품에 수여');await wait(`location.pathname==='/create/awards'`);
 const edited=(await readDraft()).selections.grand;assert.notEqual(edited.tmdb_id,496243);await click('3개 선정됨 · 시상식 열기');await wait(`location.pathname==='/create/review'`);await click('공식 결과지 미리보기 →');await wait(`document.querySelector('.selection-sentence')`);assert.ok(await evaluate(`document.querySelector('.selection-sentence').textContent.includes(${JSON.stringify(edited.title)})`));pass('Editing a confirmed winner through M2 updates result titles and selection sentence');
 const posterHeight=await evaluate(`document.querySelector('.result-film .movie-poster').getBoundingClientRect().height`);await evaluate(`document.querySelector('.result-film img')?.dispatchEvent(new Event('error'))`);assert.equal(await evaluate(`document.querySelector('.result-film .movie-poster').getBoundingClientRect().height`),posterHeight);assert.equal(await evaluate(`document.querySelectorAll('.result-film').length`),3);pass('Poster failure preserves result layout, text and edit actions');
 const weird=fixture(cases[0]);weird.selections.grand={...weird.selections.grand,title:'아주 긴 영화 제목 · '.repeat(20)+'<img src=x onerror=alert(1)>',poster_path:null,release_year:null};await show(weird);
 assert.ok(await evaluate(`document.documentElement.scrollWidth<=360`));assert.equal(await evaluate(`document.querySelectorAll('.result-film img[src="x"]').length`),0);assert.ok(await evaluate(`document.querySelector('.result-film-title').textContent.includes('<img')`));pass('Long literal title, missing poster/year and HTML-like text remain safe and readable');
 const six=fixture(cases[0]);const movies=[...new Map(cases.flatMap(c=>c.selections).map(m=>[m.tmdb_id,m])).values()];
 for(const [i,id] of ['grand','lifetime','sorry','once','dissent','rescue'].entries())six.selections[id]={...movies[i],category_id:id};
 await show(six);assert.equal(await evaluate(`document.querySelectorAll('.result-film').length`),6);assert.ok(await evaluate(`document.documentElement.scrollWidth<=360`));pass('Six confirmed categories render without dropping awards or overflowing on mobile');
 await show(fixture(cases[0]));await wait(`Array.from(document.querySelectorAll('.result-film img')).every(i=>i.complete&&i.naturalWidth>0)`);await evaluate(`window.scrollTo(0,0)`);await screenshot('result-360');await screenshot('q01-mobile-full',true);
 await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await evaluate(`window.scrollTo(0,0)`);await wait(`Array.from(document.querySelectorAll('.result-film img')).every(i=>i.complete&&i.naturalWidth>0)`,15000);
 assert.ok(await evaluate(`document.documentElement.scrollWidth<=1280`));await screenshot('result-1280');await screenshot('result-1280-full',true);await evaluate(`document.querySelector('.result-special').scrollIntoView()`);await screenshot('special-1280');pass('Desktop 1280x900 renders clear posters, complete titles and the special citation');
 await writeFile('artifacts/m3/browser-checks.json',JSON.stringify({browser:'Google Chrome headless, isolated temporary profile',viewports:[{width:360,height:800},{width:1280,height:900}],results},null,2)+'\n');
 await send('Target.closeTarget',{targetId});console.log(`M3 Browser PASS: ${results.length} groups`);
}catch(e){if(diagnose)console.log(JSON.stringify(await diagnose().catch(()=>({diagnostic:'unavailable'}))));console.error(`FAIL: M3 browser group ${results.length+1} (${e.message.startsWith('BROWSER_')||e.message.startsWith('CDP_')?e.message:'ASSERTION_OR_RUNNER_ERROR'}); no secrets printed.`);process.exitCode=1;}
finally{socket?.close();chrome.kill('SIGTERM');await new Promise(r=>setTimeout(r,500));await rm(profile,{recursive:true,force:true}).catch(()=>{});}
