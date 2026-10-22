import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createG1Client,G1Error} from '../g1/client.mjs';
import {authDiagnostic,requireCaptchaReplayRejection,createPreviewSteps} from './diagnostics.mjs';
import {PREVIEW_ORIGIN,PREVIEW_PROBE,previewConfiguration,probeHeaders,probeMetadata} from '../../src/lib/m5-preview.ts';
import {previewBrowser} from './preview-browser.mjs';
import {previewRequest,verifyPreviewFlow} from './preview-flow.mjs';
import {withPreviewEvidence} from './preview-evidence.mjs';
import {preparePreviewFixture,validatePreviewFixture} from './preview-fixture.mjs';

const env=process.env,args=process.argv.slice(2),activate=args.includes('--activate-preview'),provider=activate||args.includes('--provider');
if(args.some(arg=>!['--preflight','--provider','--activate-preview'].includes(arg))||(activate&&args.includes('--preflight'))||env.M5_VERIFY_ENV!=='preview'||!env.VERCEL_AUTOMATION_BYPASS_SECRET||(provider&&env.G1_ALLOW_TEST_WRITES!=='yes')||(activate&&env.M5_ALLOW_PREVIEW_EVIDENCE!=='yes')){
 console.error('NOT RUN: preview environment, in-memory Vercel automation credential and explicit disposable-write/evidence consent required.');process.exit(2);
}
const controller=new AbortController(),signal=controller.signal;
const interrupt=()=>controller.abort(Error('OPERATOR_INTERRUPTED'));
process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
let browser,config,core,second,call,fixture,stage='configuration';
const steps=createPreviewSteps();
const budget=(client,key=randomBytes(32).toString('hex'),seconds=60,proof=false)=>client.request('/rest/v1/rpc/consume_request_budget',{admin:true,method:'POST',body:{p_buckets:[{key,seconds,limit:1,cost:1}],...(proof?{p_environment:'preview',p_fingerprint:config.fingerprint}:{})}});
async function preflight(blocked){
 const headers=probeHeaders(env);
 const response=await steps.fetch(PREVIEW_ORIGIN+PREVIEW_PROBE,{redirect:'manual',signal:AbortSignal.any([signal,AbortSignal.timeout(15000)]),headers:{...headers,accept:'application/json','x-vercel-protection-bypass':env.VERCEL_AUTOMATION_BYPASS_SECRET}});
 if(response.status!==200)throw new G1Error(response.status,'PREVIEW_PROBE_ACCESS_REJECTED');
 assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('set-cookie'),null);
 const actual=await response.json(),expected=probeMetadata(env,headers['x-m5-nonce']);
 if(actual.probeVersion!==2)throw Error('PREVIEW_PROBE_VERSION_MISMATCH');
 if(actual.origin!==expected.origin||actual.hostname!==expected.hostname)throw Error('PREVIEW_ORIGIN_MISMATCH');
 if(actual.siteKey!==expected.siteKey)throw Error('PREVIEW_SITEKEY_MISMATCH');
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('PREVIEW_CONFIG_MISMATCH');
 const outside=await steps.fetch(PREVIEW_ORIGIN+PREVIEW_PROBE,{redirect:'manual',signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});assert.equal(outside.status,302);await outside.body?.cancel();
 const denied=await call(PREVIEW_PROBE,{status:404});assert.equal(denied.response.headers.get('set-cookie'),null);
 if(blocked){const r=await call('/api/session',{method:'POST',body:{},status:503});assert.equal(r.data.code,'PROTECTION_REQUIRED');}
 console.log('PASS: exact remote Preview origin, hostname, Sitekey, fingerprint and challenge-bound credential equality; Authentication maintained.');
}
try{
 fixture=await steps.run('fixture',()=>preparePreviewFixture());
 config=previewConfiguration(env);core=createG1Client(env,steps.fetch);second=createG1Client(env,steps.fetch);call=previewRequest(env,signal,steps.fetch);
 await steps.run('preflight',()=>preflight(true));
 if(provider){
  stage='provider';browser=await steps.run('browser-start',()=>previewBrowser(env,signal));
  await steps.run('budget-shared',async()=>{const key=randomBytes(32).toString('hex');assert.equal((await budget(core,key)).allowed,true);const denied=await budget(second,key);assert.equal(denied.allowed,false);assert.ok(denied.retry_after>0);assert.equal((await budget(second)).allowed,true);});
  await steps.run('budget-window',async()=>{const recovery=randomBytes(32).toString('hex');await budget(core,recovery,1);await new Promise(resolve=>setTimeout(resolve,1200));assert.equal((await budget(second,recovery,1)).allowed,true);});
  await steps.run('public-rpc-denial',()=>assert.rejects(()=>core.request('/rest/v1/rpc/consume_request_budget',{method:'POST',body:{p_buckets:[]}}),e=>e instanceof G1Error&&[401,403].includes(e.status)));
  const owners=[];
  try{
   await steps.run('invalid-captcha',async()=>{let invalidError;try{const s=await core.signIn('m5a-intentionally-invalid-captcha');owners.push(s.user.id);}catch(e){invalidError=e;}requireCaptchaReplayRejection(invalidError);});
   const token=await steps.run('provider-challenge',()=>browser.token());
   const session=await steps.run('provider-signup',()=>token.consume(value=>core.signIn(value)));owners.push(session.user.id);
   await steps.run('provider-session',async()=>{if(!session.refresh_token)throw Error('PREVIEW_SESSION_MISSING');assert.equal(await core.user(session.access_token),session.user.id);});
   await steps.run('provider-replay',async()=>{let replayError;try{const repeated=await token.replay(value=>second.signIn(value));owners.push(repeated.user.id);}catch(e){replayError=e;}requireCaptchaReplayRejection(replayError);});
  }finally{
   await steps.run('provider-cleanup',async()=>{let failed=false;for(const owner of new Set(owners)){try{await core.request(`/auth/v1/admin/users/${encodeURIComponent(owner)}`,{admin:true,method:'DELETE'});}catch{failed=true;}}
   if(failed)throw Error('PROVIDER_CLEANUP_FAILED');});
  }
  console.log('PASS: shared provider budgets, invalid/fresh/replayed real Preview-widget CAPTCHA, disposable identities removed.');
 }
 if(activate){
  stage='activation';signal.throwIfAborted();
  await steps.run('fixture',()=>validatePreviewFixture(fixture));
  await steps.run('preflight',()=>preflight(true));
  await steps.run('activation',()=>withPreviewEvidence(core,config.fingerprint,async()=>{
   assert.equal((await budget(core,undefined,1,true)).allowed,true);
   assert.equal((await call('/api/session',{method:'POST',body:{},status:428})).data.code,'CAPTCHA_REQUIRED');
   await steps.run('flow',()=>verifyPreviewFlow({call,browser,core,fixture,steps}));await steps.run('final-checks',()=>preflight(false));
   let limited=false;
   for(let i=0;i<11;i++){
    const r=await call('/api/session',{method:'POST',body:{},status:[428,429]});
    assert.equal(r.response.headers.get('set-cookie'),null);
    if(r.response.status===429){assert.equal(r.data.code,'RATE_LIMITED');const wait=Number(r.response.headers.get('retry-after'));assert.ok(Number.isInteger(wait)&&wait>=1&&wait<=60);limited=true;break;}
   }
   assert.ok(limited,'Actual Vercel ingress must share the session budget');
   // Browser cleanup is part of success: its failure must revoke this run's evidence too.
   await browser.close();browser=null;signal.throwIfAborted();
  }));
  console.log('PASS: Preview evidence retained after HTTPS session/ownership/CRUD/revision/share/cache checks and cleanup.');
 }else console.log('PASS: no evidence registered; provider checks require --provider and separate disposable-write consent.');
}catch(error){
 const revokeFailed=error?.message==='PREVIEW_REVOCATION_FAILED_MANUAL_RECOVERY_REQUIRED';
 console.error('DIAGNOSTIC: '+JSON.stringify(steps.failure??authDiagnostic(error)));
 console.error(`FAIL: ${stage}; ${revokeFailed?'AUTOMATIC REVOCATION FAILED: revoke only this run Preview row after provider recovery.':'raw errors, credentials, tokens, fingerprints and identities suppressed.'}`);process.exitCode=1;
}finally{
 try{if(browser)await browser.close();}catch{console.error('Preview browser cleanup failed; no raw error printed.');process.exitCode=1;}
 process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);
}
