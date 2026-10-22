import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PREVIEW_ORIGIN,PREVIEW_PROBE,probeHeaders,probeMetadata} from '../../src/lib/m5-preview.ts';
import {createCaptchaTokens} from './preview-captcha.mjs';
import {G1Error} from '../g1/client.mjs';

export function cdpFailure(message){
 return Error(typeof message==='string'&&/Execution context was destroyed|Cannot find context with specified id/.test(message)?'CDP_NAVIGATION_CONTEXT':'CDP_COMMAND_FAILED');
}

export function checkPreviewWidget(state,expected){
 if(!state||state.config.challenge!==expected.challenge)return false;
 if(state.origin!==PREVIEW_ORIGIN||state.config.origin!==expected.origin)throw Error('PREVIEW_ORIGIN_MISMATCH');
 if(state.config.siteKey!==expected.siteKey)throw Error('PREVIEW_SITEKEY_MISMATCH');
 if(state.config.probeVersion!==2||!state.widget)throw Error('PREVIEW_PROBE_VERSION_MISMATCH');
 if(state.config.proof!==expected.proof||state.config.fingerprint!==expected.fingerprint)throw Error('PREVIEW_CONFIG_MISMATCH');
 if(state.widget.status==='expired')throw Error('PREVIEW_WIDGET_EXPIRED');
 if(state.widget.status==='error')throw Error({'network-error':'PREVIEW_WIDGET_NETWORK_ERROR','rate-limited':'PREVIEW_WIDGET_RATE_LIMITED','internal-error':'PREVIEW_WIDGET_PROVIDER_ERROR'}[state.widget.error]??'PREVIEW_WIDGET_ERROR');
 return state.widget.status==='verified';
}

export async function previewBrowser(env,signal){
 const profile=await mkdtemp(join(tmpdir(),'banguseok-m5-'));
 const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','about:blank'],{stdio:['ignore','ignore','pipe']});
 let socket,sequence=0,sessionId;const waiting=new Map();
 async function close(){
  socket?.close();chrome.kill();
  if(chrome.pid&&chrome.exitCode===null&&chrome.signalCode===null)await new Promise(resolve=>{const timer=setTimeout(()=>{chrome.kill('SIGKILL');resolve();},5000);chrome.once('exit',()=>{clearTimeout(timer);resolve();});});
  await rm(profile,{recursive:true,force:true});
 }
 try{
  const endpoint=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('CHROME_TIMEOUT')),15000);chrome.stderr.on('data',part=>{text+=part;const m=text.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}});chrome.once('error',()=>{clearTimeout(timer);reject(Error('CHROME_START_FAILED'));});});
  socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=()=>reject(Error('CDP_CONNECTION_FAILED'));});
  function send(method,params={},target){return new Promise((resolve,reject)=>{
   const id=++sequence,timer=setTimeout(()=>{waiting.delete(id);reject(Error('CDP_TIMEOUT'));},10000);timer.unref();waiting.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,sessionId:target}));
  });}
  let interceptionFailed=false,expectedMetadata,probeStatus=null,widgetFailure=null;
  const requests=new Map(),tokens=createCaptchaTokens();
  socket.onmessage=event=>{const message=JSON.parse(event.data);
   if(message.id){const pending=waiting.get(message.id);if(pending){waiting.delete(message.id);clearTimeout(pending.timer);if(message.error)pending.reject(cdpFailure(message.error.message));else pending.resolve(message.result);}}
   if(message.method==='Network.requestWillBeSent'){
    const u=new URL(message.params.request.url);if(u.hostname==='hcaptcha.com'||u.hostname.endsWith('.hcaptcha.com'))requests.set(message.params.requestId,true);
   }
   if(message.method==='Network.responseReceived'){
    const {response,requestId}=message.params,u=new URL(response.url);
    if(u.origin===PREVIEW_ORIGIN&&u.pathname===PREVIEW_PROBE)probeStatus=response.status;
    if(requests.has(requestId)&&response.status===429)widgetFailure='PREVIEW_WIDGET_RATE_LIMITED';
    else if(requests.has(requestId)&&response.status>=500)widgetFailure='PREVIEW_WIDGET_PROVIDER_ERROR';
   }
   if(message.method==='Network.loadingFailed'&&requests.has(message.params.requestId))widgetFailure='PREVIEW_WIDGET_NETWORK_ERROR';
   if(message.method==='Fetch.requestPaused'){
    const {requestId,request}=message.params,url=new URL(request.url);
    // Interception is restricted to the first-party origin; never send credentials to hCaptcha.
    if(url.origin!==PREVIEW_ORIGIN){interceptionFailed=true;void send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'},message.sessionId).catch(()=>{});return;}
    const auth=url.pathname===PREVIEW_PROBE?probeHeaders(env):{};
    if(auth['x-m5-nonce'])expectedMetadata=probeMetadata(env,auth['x-m5-nonce']);
    const headers=Object.entries({...request.headers,'x-vercel-protection-bypass':env.VERCEL_AUTOMATION_BYPASS_SECRET,...auth}).map(([name,value])=>({name,value}));
    send('Fetch.continueRequest',{requestId,headers},message.sessionId).catch(()=>{interceptionFailed=true;});
   }
  };
  const {browserContextId}=await send('Target.createBrowserContext');
  const {targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId});
  ({sessionId}=await send('Target.attachToTarget',{targetId,flatten:true}));
  await send('Fetch.enable',{patterns:[{urlPattern:PREVIEW_ORIGIN+'/*',requestStage:'Request'}]},sessionId);
  await send('Network.enable',{},sessionId);await send('Network.setCacheDisabled',{cacheDisabled:true},sessionId);
  async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error('PREVIEW_WIDGET_EVALUATION_FAILED');return r.result.value;}
  return {close,async token(){
   probeStatus=null;widgetFailure=null;requests.clear();
   signal?.throwIfAborted();await send('Page.navigate',{url:PREVIEW_ORIGIN+PREVIEW_PROBE},sessionId);
   console.log('ACTION: Complete the real hCaptcha in the dedicated Preview Chrome window; no token copy/paste.');
   const end=Date.now()+180000;let navigationErrors=0;
   while(Date.now()<end){
    signal?.throwIfAborted();assert.equal(interceptionFailed,false);
    if(probeStatus!==null&&probeStatus!==200)throw new G1Error(probeStatus,'PREVIEW_PROBE_ACCESS_REJECTED');
    if(widgetFailure)throw Error(widgetFailure);
    let state;
    try{state=await evaluate(`(()=>{const e=document.getElementById('m5-config');return e?{origin:location.origin,config:JSON.parse(e.textContent),widget:window.m5State,token:window.m5Token||''}:null;})()`);navigationErrors=0;}
    catch(error){if(error.message!=='CDP_NAVIGATION_CONTEXT'||++navigationErrors>=3)throw error;}
    if(expectedMetadata&&checkPreviewWidget(state,expectedMetadata)){
     assert.deepEqual(state.config,expectedMetadata);
     const lease=tokens.issue(state.token,{issuedAt:state.widget.issuedAt,challenge:state.config.challenge});
     await evaluate("window.m5Token='';window.m5State.status='consumed'");return lease;
    }
    await new Promise(resolve=>setTimeout(resolve,250));
   }
   throw Error('PREVIEW_WIDGET_TIMEOUT');
  }};
 }catch(error){await close();if(/^(CHROME_|CDP_)/.test(error.message))throw error;throw Error('PREVIEW_BROWSER_FAILED');}
}
