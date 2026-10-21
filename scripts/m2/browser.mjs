import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const uiPhase=process.env.UI_PHASE;
const artifactDir=process.env.M2_ARTIFACT_DIR||'artifacts/m2';
await mkdir(artifactDir,{recursive:true});
const metrics={};
const dir=await mkdtemp(join(tmpdir(),'banguseok-m2-chrome-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check',`--user-data-dir=${dir}`,'--remote-debugging-port=0','about:blank'],{stdio:['ignore','ignore','pipe']});
let socket,diagnostics;const results=[];
try{
 const endpoint=await new Promise((resolve,reject)=>{let buffer='';const timer=setTimeout(()=>reject(Error('CHROME_START_TIMEOUT')),15000);chrome.stderr.on('data',data=>{buffer+=data;const m=buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}});chrome.once('error',reject);});
 socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let sequence=0,interceptMode=null;const waiting=new Map();const events=[];
 socket.onmessage=e=>{const message=JSON.parse(e.data);if(message.id){const waiter=waiting.get(message.id);if(waiter){waiting.delete(message.id);if(message.error)waiter.reject(Error(`CDP_COMMAND_FAILED_${message.error.code}`));else waiter.resolve(message.result);}}else {events.push(message);if(message.method==='Fetch.requestPaused'){
  const paused=message.params;let action;try{action=JSON.parse(paused.request.postData||'{}').action;}catch{}
  if(interceptMode&&action==='search'){
   const error=interceptMode==='error';const body=error?{code:'TEST_RATE_LIMIT',message:'요청이 많아요. 잠시 후 다시 시도해 주세요.',retryable:true}:{items:[],page:1,has_more:false};
   void send('Fetch.fulfillRequest',{requestId:paused.requestId,responseCode:error?429:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(body)).toString('base64')},message.sessionId).catch(()=>{});
  }else void send('Fetch.continueRequest',{requestId:paused.requestId},message.sessionId).catch(()=>{});
 }}};
 function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++sequence;waiting.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}));setTimeout(()=>{if(waiting.has(id)){waiting.delete(id);reject(Error(`CDP_TIMEOUT_${method}`));}},10000).unref();});}
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const cdp=(method,params={})=>send(method,params,sessionId);
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');
 if(uiPhase)await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{let n=42;Math.random=()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};})()`});
 await cdp('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
 await cdp('Emulation.setTouchEmulationEnabled',{enabled:true});
 async function evaluate(expression){const data=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(data.exceptionDetails)throw Error('BROWSER_EVALUATION_FAILED');return data.result.value;}
 async function wait(expression,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){try{if(await evaluate(`Boolean(${expression})`))return;}catch(e){if(!e.message.startsWith('CDP_COMMAND_FAILED'))throw e;}await new Promise(r=>setTimeout(r,100));}throw Error('BROWSER_WAIT_TIMEOUT');}
 diagnostics=()=>evaluate(`({path:location.pathname,enabledCards:document.querySelectorAll('.poster-card:not(:disabled)').length,alerts:Array.from(document.querySelectorAll('[role=alert]')).map(e=>e.textContent),selection:document.querySelector('.selection-bar')?.innerText})`);
 const text=()=>evaluate('document.body.innerText');
 async function click(label){await wait(`Array.from(document.querySelectorAll('button,a')).some(e=>(e.textContent.trim()===${JSON.stringify(label)}||e.getAttribute('aria-label')===${JSON.stringify(label)})&&!e.disabled)`);await evaluate(`Array.from(document.querySelectorAll('button,a')).find(e=>(e.textContent.trim()===${JSON.stringify(label)}||e.getAttribute('aria-label')===${JSON.stringify(label)})&&!e.disabled).click()`);}
 const draft=()=>evaluate(`JSON.parse(localStorage.getItem('banguseok:m1-draft:v1.1'))`);
 async function screenshot(name){await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);const {data}=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`${artifactDir}/${name}.png`,Buffer.from(data,'base64'));}
 function pass(name){results.push({name,result:'PASS'});console.log(`PASS: ${name}`);}
 await cdp('Page.navigate',{url:'http://127.0.0.1:3000/'});
 if(uiPhase){await wait(`document.querySelector('.entry-actions button:not(:disabled)')`);await screenshot('landing-360');}
 await click('내 영화제 개최하기 ↗');
 if(uiPhase){
  await wait(`document.querySelectorAll('.survey-option').length===5`);
  await evaluate(`document.querySelector('.survey-option input').focus()`);
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
  await wait(`document.querySelectorAll('.survey-option input')[1].checked`);await screenshot('survey-focus-360');
  metrics.survey=await evaluate(`({minTouchHeight:Math.min(...Array.from(document.querySelectorAll('.survey-option')).map(e=>e.getBoundingClientRect().height)),focusVisible:document.activeElement.matches(':focus-visible'),actionsPosition:getComputedStyle(document.querySelector('.survey-actions')).position})`);
  if(uiPhase==='after'){
   assert.ok(metrics.survey.minTouchHeight>=56);assert.ok(metrics.survey.focusVisible);assert.equal(metrics.survey.actionsPosition,'static');
   await evaluate(`document.querySelector('.survey-option:last-child').scrollIntoView({block:'center'})`);
   assert.ok(await evaluate(`(()=>{const e=document.querySelector('.survey-option:last-child'),r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.survey-option')===e;})()`));
   pass('Survey keyboard selection has visible focus, 56px targets and an unobscured final option');
   await click('다음→');await wait(`document.querySelector('progress')?.value===2`);await click('← 이전');await wait(`document.querySelector('progress')?.value===1`);
   assert.ok(await evaluate(`document.querySelectorAll('.survey-option input')[1].checked`));
   await cdp('Page.reload');await wait(`document.querySelectorAll('.survey-option input')[1]?.checked`);pass('Survey previous/next and reload preserve the chosen answer');
  }
 }

 for(let i=0;i<6;i++){await wait(`document.querySelector('progress')?.value===${i+1}`);await click('이 질문 건너뛰기');}
 await wait(`location.pathname==='/create/awards' && document.querySelectorAll('.category-list li').length===6`);
 assert.ok((await text()).includes('3개 부문만 정하면'));pass('M1 survey to M2 list; six categories and minimum-three guidance');
 await evaluate(`document.querySelector('.category-list a').click()`);
 await wait(`document.querySelectorAll('.poster-card:not(:disabled)').length===6`,25000);
 const original=await draft(),firstIds=await evaluate(`Array.from(document.querySelectorAll('.poster-card')).map(e=>e.getAttribute('aria-label'))`);
 assert.equal(original.candidate_order.grand.length,12);await wait(`Array.from(document.querySelectorAll('.poster-card img')).slice(0,2).length===2&&Array.from(document.querySelectorAll('.poster-card img')).slice(0,2).every(i=>i.complete&&i.naturalWidth>0)`,15000);await screenshot('grand-candidates-360');
 if(uiPhase){
  metrics.picker=await evaluate(`({firstPosterTop:Math.round(document.querySelector('.poster-card .movie-poster').getBoundingClientRect().top+scrollY),posterWidth:document.querySelector('.movie-poster').getBoundingClientRect().width,searchTop:Math.round(document.querySelector('.search-toggle').getBoundingClientRect().top+scrollY),footerHeight:document.querySelector('.selection-bar').getBoundingClientRect().height,footerPosition:getComputedStyle(document.querySelector('.selection-bar')).position})`);
  if(uiPhase==='after'){
   assert.ok(metrics.picker.firstPosterTop<350);assert.equal(metrics.picker.footerPosition,'static');
   await evaluate(`document.querySelector('.poster-card').focus()`);await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
   assert.ok(await evaluate(`document.activeElement.matches('.poster-card:focus-visible')`));
   await evaluate(`document.querySelector('.poster-card:last-child').scrollIntoView({block:'center'})`);
   assert.ok(await evaluate(`(()=>{const e=document.querySelector('.poster-card:last-child'),r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.poster-card')===e;})()`));
   await screenshot('last-candidate-360');await evaluate(`window.scrollTo(0,0)`);pass('Candidates start above 350px; keyboard focus and last card remain unobscured');
  }
 }
 pass('Six live TMDB poster candidates load first');
 assert.ok(await evaluate(`document.documentElement.scrollWidth<=360`));
 const posterHeightBefore=await evaluate(`document.querySelector('.movie-poster').getBoundingClientRect().height`);
 await evaluate(`document.querySelector('.poster-card img').dispatchEvent(new Event('error'))`);
 if(uiPhase==='after')assert.equal(await evaluate(`document.querySelector('.movie-poster').getBoundingClientRect().height`),posterHeightBefore);
 assert.ok(await evaluate(`document.querySelector('.poster-card').innerText.includes('포스터 없음')`));pass('360px candidate grid has no horizontal overflow; simulated image failure falls back to title');
 await click('다른 후보 보기');await wait(`document.querySelectorAll('.poster-card:not(:disabled)').length===6 && document.body.innerText.includes('후보 2/2')`);
 const second=await draft();assert.equal(second.candidate_page.grand,1);assert.ok(second.candidate_order.grand.slice(0,6).every(id=>!second.candidate_order.grand.slice(6).includes(id)));
 await cdp('Page.reload');await wait(`document.querySelectorAll('.poster-card:not(:disabled)').length===6`);assert.deepEqual((await draft()).candidate_order,original.candidate_order);assert.equal((await draft()).candidate_page.grand,1);pass('Second page is disjoint and order/page survive reload');
 await click('처음 후보 다시 보기');await wait(`document.body.innerText.includes('후보 1/2')&&document.querySelectorAll('.poster-card:not(:disabled)').length===6`);
 assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.poster-card')).map(e=>e.getAttribute('aria-label'))`),firstIds);
 await evaluate(`document.querySelector('.poster-card').click()`);await wait(`document.querySelector('.selection-bar button:not(:disabled)')`);
 const pending=(await draft()).pending_selection.grand;assert.ok(pending);assert.equal((await draft()).selections.grand,null);
 await cdp('Page.reload');await wait(`document.querySelector('.selection-bar button:not(:disabled)')`);assert.equal((await draft()).pending_selection.grand.tmdb_id,pending.tmdb_id);pass('Card is pending until confirmation; pending survives reload');
 await screenshot('pending-selection-360');
 if(uiPhase==='after'){
  await evaluate(`document.querySelector('.poster-card:last-child').scrollIntoView({block:'center'})`);
  assert.ok(await evaluate(`(()=>{const card=document.querySelector('.poster-card:last-child').getBoundingClientRect(),bar=document.querySelector('.selection-bar').getBoundingClientRect();return card.top>=0&&card.bottom<=bar.top;})()`));
  await screenshot('pending-last-card-360');pass('Pending confirmation bar leaves the fully scrolled last poster unobscured');
 }
 await click('이 작품에 수여');await wait(`location.pathname==='/create/awards/lifetime'`);assert.equal((await draft()).selections.grand.tmdb_id,pending.tmdb_id);pass('Explicit award confirmation moves to next category');
 await click('이 부문 건너뛰기');await wait(`location.pathname==='/create/awards'`);assert.ok((await draft()).skipped_categories.includes('lifetime'));assert.ok(!(await draft()).skipped_categories.includes('sorry'));pass('Skipped and unvisited categories are distinct');
 await evaluate(`Array.from(document.querySelectorAll('.category-list a')).find(e=>e.getAttribute('href').endsWith('/sorry')).click()`);
 await click('영화 제목으로 직접 검색');await wait(`document.querySelector('#movie-query')`);
 if(uiPhase==='after'){
  assert.ok(await evaluate(`document.activeElement.id==='movie-query'`));
  metrics.search=await evaluate(`({inputTop:Math.round(document.querySelector('#movie-query').getBoundingClientRect().top),inputHeight:document.querySelector('#movie-query').getBoundingClientRect().height})`);
  assert.ok(metrics.search.inputTop<450);pass('Search opens with input focus and room for results');
 }
 // Real Chrome IME events; ensure composing input does not start a search.
 const before=events.filter(e=>e.method==='Network.requestWillBeSent'&&e.params.request.url.endsWith('/api/catalog/movies')).length;
 await evaluate(`(()=>{const input=document.querySelector('#movie-query');input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'기생충');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await new Promise(r=>setTimeout(r,500));
 const after=events.filter(e=>e.method==='Network.requestWillBeSent'&&e.params.request.url.endsWith('/api/catalog/movies')).length;assert.equal(after,before);
 await evaluate(`document.querySelector('#movie-query').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'기생충'}))`);
 // Use the browser input protocol to update React's tracked input state.
 await evaluate(`document.querySelector('#movie-query').focus();document.querySelector('#movie-query').select()`);await cdp('Input.insertText',{text:'기생충'});
 await wait(`document.querySelectorAll('.search-movie').length>0`,20000);
 await evaluate(`Array.from(document.querySelectorAll('.search-movie')).find(e=>e.innerText.includes('2019')).click()`);await wait(`document.querySelector('.selection-bar button:not(:disabled)')`);
 assert.equal((await draft()).pending_selection.sorry.tmdb_id,496243);await screenshot('search-360');pass('Korean IME search, title/year/original and actual search-result selection');
 if(uiPhase==='after'){
  await evaluate(`document.querySelector('.search-movie:last-child').scrollIntoView({block:'center'})`);
  assert.ok(await evaluate(`(()=>{const r=document.querySelector('.search-movie:last-child').getBoundingClientRect(),bar=document.querySelector('.selection-bar').getBoundingClientRect();return r.top>=0&&r.bottom<=bar.top;})()`));
  pass('Last search result remains fully reachable above the pending confirmation bar');
 }
 await click('검색 닫기');if(uiPhase==='after'){await wait(`document.activeElement===document.querySelector('.search-toggle')`);pass('Closing search restores focus to its trigger');}assert.equal((await draft()).pending_selection.sorry.tmdb_id,496243);await click('이 작품에 수여');await wait(`location.pathname==='/create/awards/once'`);
 await wait(`document.querySelectorAll('.poster-card:not(:disabled)').length===6`,20000);await evaluate(`document.querySelector('.poster-card').click()`);await wait(`document.querySelector('.selection-bar button:not(:disabled)')`);await click('이 작품에 수여');await wait(`location.pathname==='/create/awards/dissent'`);
 await wait(`Array.from(document.querySelectorAll('a')).some(e=>e.textContent.includes('3개 선정됨'))`);await click('3개 선정됨 · 시상식 열기');await wait(`location.pathname==='/create/review'&&document.body.innerText.includes('수상작 선정 완료.')`);
 await cdp('Page.reload');await wait(`document.querySelectorAll('.review-list li').length===3`);pass('Finish immediately after three categories; confirmed winners survive reload');
 await screenshot('review-360');
 // Revisit a winner; changing an existing award returns to the list.
 await evaluate(`document.querySelector('.review-list a').click()`);await wait(`document.querySelectorAll('.poster-card:not(:disabled)').length===6`);
 await evaluate(`document.querySelectorAll('.poster-card')[1].click()`);await wait(`document.querySelector('.selection-bar button:not(:disabled)')`);
 const changedWinner=(await draft()).pending_selection.grand.tmdb_id;await click('이 작품에 수여');await wait(`location.pathname==='/create/awards'`);
 assert.equal((await draft()).selections.grand.tmdb_id,changedWinner);pass('Changing an existing winner returns to list and persists the new ID');
 await evaluate(`document.querySelector('.category-list a').click()`);await wait(`document.querySelectorAll('.poster-card:not(:disabled)').length===6`);
 // Cancel skip is inline, avoiding native dialog automation dependencies.
 await click('이 부문 건너뛰기');await wait(`document.querySelector('.skip-confirm')`);await click('취소');assert.equal((await draft()).selections.grand.tmdb_id,changedWinner);pass('Skipping a confirmed winner requires removal confirmation; cancel preserves it');
 // Explicit list cancels only pending; browser reload above preserved it.
 await evaluate(`document.querySelectorAll('.poster-card')[1].click()`);await wait(`document.querySelector('.selection-bar button:not(:disabled)')`);await click('← 목록으로');await wait(`location.pathname==='/create/awards'`);assert.equal((await draft()).pending_selection.grand,null);assert.equal((await draft()).selections.grand.tmdb_id,changedWinner);pass('Explicit list return cancels pending, retaining the confirmed winner');
 // Inject HTTP faults only for the following two checks; earlier searches used real TMDB.
 await evaluate(`document.querySelector('.category-list a').click()`);await wait(`document.querySelectorAll('.poster-card:not(:disabled)').length===6`);
 const preserved=await draft();await click('영화 제목으로 직접 검색');await wait(`document.querySelector('#movie-query')`);
 interceptMode='error';await cdp('Fetch.enable',{patterns:[{urlPattern:'*/api/catalog/movies',requestStage:'Request'}]});
 await evaluate(`document.querySelector('#movie-query').focus()`);await cdp('Input.insertText',{text:'오프라인오류검사'});
 await wait(`document.querySelector('[role=alert]')?.innerText.includes('요청이 많아요')`);
 assert.deepEqual((await draft()).selections,preserved.selections);assert.deepEqual((await draft()).candidate_page,preserved.candidate_page);pass('Simulated 429 search error preserves confirmed winners and candidate page');
 await screenshot('search-error-360');interceptMode='empty';await evaluate(`document.querySelector('#movie-query').select()`);await cdp('Input.insertText',{text:'오프라인빈검색검사'});
 await wait(`document.body.innerText.includes('검색 결과가 없어요.')`);pass('Simulated zero-result UI remains usable');
 interceptMode=null;await cdp('Fetch.disable');await click('검색 닫기');await click('← 목록으로');await wait(`location.pathname==='/create/awards'`);
 const geometry=await evaluate(`({width:innerWidth,documentWidth:document.documentElement.scrollWidth})`);assert.equal(geometry.width,360);assert.ok(geometry.documentWidth<=360);pass('360px list has no horizontal overflow');
 if(uiPhase){
  await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await cdp('Emulation.setTouchEmulationEnabled',{enabled:false});
  for(const [name,path,selector] of [['landing','/','.entry-actions button:not(:disabled)'],['survey','/create/survey','.survey-options'],['candidates','/create/awards/grand','.poster-card:not(:disabled)'],['review','/create/review','.review-list li']]){
   await cdp('Page.navigate',{url:`http://127.0.0.1:3000${path}`});await wait(`document.querySelector(${JSON.stringify(selector)})`);
   await evaluate(`window.scrollTo(0,0)`);
   assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`));
   if(name==='candidates')await wait(`Array.from(document.querySelectorAll('.poster-card img')).slice(0,2).length===2&&Array.from(document.querySelectorAll('.poster-card img')).slice(0,2).every(i=>i.complete&&i.naturalWidth>0)`);
   await screenshot(`${name}-1280`);
  }
  pass('Desktop 1280x900 landing, survey, candidates and completion have no horizontal overflow');
  await writeFile(`${artifactDir}/ui-measurements.json`,JSON.stringify(metrics,null,2)+'\n');
 }
 await writeFile(`${artifactDir}/browser-checks.json`,JSON.stringify({browser:'Google Chrome headless, isolated temporary profile',viewport:{width:360,height:800},results},null,2)+'\n');
 await send('Target.closeTarget',{targetId});console.log(`Browser PASS: ${results.length} groups`);
}catch(error){if(diagnostics)console.log(JSON.stringify(await diagnostics().catch(()=>({diagnostic:'unavailable'}))));console.error(`FAIL: browser check ${results.length+1} (${error.message.startsWith('BROWSER_')||error.message.startsWith('CDP_')||error.message==='CHROME_START_TIMEOUT'?error.message:'ASSERTION_OR_RUNNER_ERROR'}); no page data or secrets printed.`);process.exitCode=1;}
finally{socket?.close();chrome.kill('SIGTERM');await new Promise(r=>setTimeout(r,500));await rm(dir,{recursive:true,force:true}).catch(()=>{});}
