import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {nickname} from '../src/lib/festivals-server.ts';
import {preparePreviewFixture,validatePreviewFixture} from '../scripts/m5/preview-fixture.mjs';
import {createCaptchaTokens} from '../scripts/m5/preview-captcha.mjs';
import {checkPreviewWidget,cdpFailure} from '../scripts/m5/preview-browser.mjs';
import {authDiagnostic,createPreviewSteps} from '../scripts/m5/diagnostics.mjs';
import {createPreviewProbe,probeHeaders,probeMetadata,PREVIEW_ORIGIN,PREVIEW_PROBE} from '../src/lib/m5-preview.ts';
import {previewRequest,verifyPreviewFlow} from '../scripts/m5/preview-flow.mjs';
import {G1Error} from '../scripts/g1/client.mjs';
const qa={survey:{q1:null,q2:null,q3:null,q4:null,q5:null,q6:null},selections:['grand','lifetime','sorry'].map((category_id,i)=>({category_id,tmdb_id:i+1}))};
test('fixture uses actual nickname rules at 11/12/13 graphemes, Unicode normalization and blank fallback',async()=>{
 for(const unit of ['가','x','😀','e\u0301']){
  for(const count of [11,12]){const f=await preparePreviewFixture({qa,name:unit.repeat(count)});assert.equal(f.input.nickname,nickname(unit.repeat(count)));}
  await assert.rejects(()=>preparePreviewFixture({qa,name:unit.repeat(13)}),e=>e.code==='INVALID_NICKNAME');
 }
 assert.equal((await preparePreviewFixture({qa,name:' \t '})).input.nickname,'익명의 집행위원장');
 await assert.rejects(()=>preparePreviewFixture({qa,name:'M5 Preview 검증'}),e=>e.code==='INVALID_NICKNAME');
 await assert.rejects(()=>preparePreviewFixture({qa,updatedName:'가'.repeat(13)}));
 await assert.rejects(()=>preparePreviewFixture({qa,name:42}));
});
test('all positive save/update inputs are checked before browser/auth/provider actions',async()=>{
 const fixture=await preparePreviewFixture({qa});
 for(const changed of [{nickname:undefined},{rules_version:'bad'},{catalog_version:'bad'},{draft_id:'bad'},{survey:{...qa.survey,q6:undefined}},{selections:qa.selections.slice(0,2)},{selections:[qa.selections[0],qa.selections[0],qa.selections[2]]},{selections:[{category_id:'grand',tmdb_id:-1},...qa.selections.slice(1)]},{owner_id:'forged'}]){
  const invalid={...fixture,input:{...fixture.input,...changed}};let touched=0;
  await assert.rejects(()=>validatePreviewFixture(invalid));
  await assert.rejects(()=>verifyPreviewFlow({fixture:invalid,browser:{token:async()=>{touched++;}},call:async()=>{touched++;},core:{}}));assert.equal(touched,0);
 }
 await assert.rejects(()=>validatePreviewFixture({...fixture,input:{...fixture.input,survey:{...qa.survey,unexpected:'x'.repeat(17000)}}}));
});
test('single-use leases burn before sending, refuse stale/repeated challenges, permit only one explicit negative replay',async()=>{
 let now=1000;const tokens=createCaptchaTokens({now:()=>now,maxAge:90});let sends=0;
 const lease=tokens.issue('private-test-token',{issuedAt:now,challenge:'first'});
 assert.equal(JSON.stringify(lease),'{}');
 await lease.consume(async value=>{sends++;assert.equal(value,'private-test-token');});
 await assert.rejects(()=>lease.consume(async()=>sends++),/CAPTCHA_TOKEN_REUSED/);
 await lease.replay(async()=>sends++);await assert.rejects(()=>lease.replay(async()=>sends++),/CAPTCHA_REPLAY_NOT_ALLOWED/);assert.equal(sends,2);
 assert.throws(()=>tokens.issue('private-test-token',{issuedAt:now,challenge:'next'}),/CAPTCHA_TOKEN_REUSED/);
 assert.throws(()=>tokens.issue('different',{issuedAt:now,challenge:'first'}),/CAPTCHA_NEW_CHALLENGE_REQUIRED/);
 const failed=tokens.issue('failed',{issuedAt:now,challenge:'failed'});
 await assert.rejects(()=>failed.consume(async()=>{sends++;throw Error('transport');}));
 await assert.rejects(()=>failed.consume(async()=>sends++),/CAPTCHA_TOKEN_REUSED/);await assert.rejects(()=>failed.replay(async()=>sends++),/CAPTCHA_REPLAY_NOT_ALLOWED/);
 const expired=tokens.issue('expired',{issuedAt:now,challenge:'expired'});now+=91;
 await assert.rejects(()=>expired.consume(async()=>sends++),/CAPTCHA_TOKEN_EXPIRED/);
 assert.throws(()=>tokens.issue('already-old',{issuedAt:1000,challenge:'old'}),/CAPTCHA_TOKEN_EXPIRED/);
});
test('transport failures retain request phase, status and sanitized type, never retry or log payloads',async()=>{
 const events=[];let requests=0;
 const steps=createPreviewSteps({emit:e=>events.push(e),fetcher:async()=>{requests++;throw new DOMException('private-token','TimeoutError');}});
 await assert.rejects(()=>steps.run('provider-signup',()=>steps.fetch('https://private.invalid/secret',{body:'private-body'})));
 assert.equal(requests,1);assert.ok(events.some(e=>e.phase==='provider-signup'&&e.event==='request-start'));assert.ok(events.some(e=>e.event==='transport-failed'&&e.error_type==='TimeoutError'&&e.http_status===null));
 await assert.rejects(()=>steps.run('provider-cleanup',async()=>{throw Error('private-error');}));assert.equal(steps.failure.phase,'provider-signup');
 assert.ok(!JSON.stringify(events).includes('private'));
 const statuses=[];const http=createPreviewSteps({emit:e=>statuses.push(e),fetcher:async()=>new Response('{}',{status:429})});
 await assert.rejects(()=>http.run('provider-signup',async()=>{const r=await http.fetch('https://private.invalid');throw new G1Error(r.status,'over_request_rate_limit');}));
 assert.ok(statuses.some(e=>e.http_status===429));assert.equal(http.failure.reason,'AUTH_RATE_LIMITED');
 for(const code of ['captcha_failed','CAPTCHA_FAILED']){
  const d=authDiagnostic(new G1Error(400,code));assert.equal(d.reason,'CAPTCHA_REJECTED');
 }
});
test('widget observations separate config, expiry, callback errors and freshness without using tokens',()=>{
 assert.equal(cdpFailure('Execution context was destroyed.').message,'CDP_NAVIGATION_CONTEXT');
 assert.equal(cdpFailure('private connection details').message,'CDP_COMMAND_FAILED');
 const expected={probeVersion:2,challenge:'new',origin:PREVIEW_ORIGIN,siteKey:'expected',fingerprint:'expected',proof:'expected'};
 const state={origin:PREVIEW_ORIGIN,config:expected,widget:{status:'verified'}};
 assert.equal(checkPreviewWidget(state,expected),true);
 assert.equal(checkPreviewWidget({...state,config:{...expected,challenge:'old'}},expected),false);
 for(const [patch,code] of [[{origin:'https://other.invalid'},'PREVIEW_ORIGIN_MISMATCH'],[{siteKey:'other'},'PREVIEW_SITEKEY_MISMATCH'],[{probeVersion:1},'PREVIEW_PROBE_VERSION_MISMATCH'],[{fingerprint:'other'},'PREVIEW_CONFIG_MISMATCH']])assert.throws(()=>checkPreviewWidget({...state,config:{...expected,...patch}},expected),new RegExp(code));
 for(const [widget,code] of [[{status:'expired'},'PREVIEW_WIDGET_EXPIRED'],[{status:'error',error:'rate-limited'},'PREVIEW_WIDGET_RATE_LIMITED'],[{status:'error',error:'network-error'},'PREVIEW_WIDGET_NETWORK_ERROR'],[{status:'error',error:'internal-error'},'PREVIEW_WIDGET_PROVIDER_ERROR'],[{status:'error',error:'unknown-secret'},'PREVIEW_WIDGET_ERROR']])assert.throws(()=>checkPreviewWidget({...state,widget},expected),new RegExp(code));
});
test('probe callbacks keep expiry/error/issued-at apart and never persist raw callback text',async()=>{
 const env={VERCEL:'1',VERCEL_ENV:'preview',APP_ALLOWED_ORIGINS:PREVIEW_ORIGIN,PROTECTION_HMAC_KEY:'a'.repeat(64),NEXT_PUBLIC_HCAPTCHA_SITE_KEY:'11111111-2222-4333-8444-555555555555',NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'service-secret',TMDB_READ_ACCESS_TOKEN:'tmdb-secret'};
 const html=await createPreviewProbe(env)(new Request(PREVIEW_ORIGIN+PREVIEW_PROBE,{headers:{host:new URL(PREVIEW_ORIGIN).host,'x-vercel-forwarded-for':'203.0.113.10',...probeHeaders(env)}})).text();
 const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];const context={window:{},document:{getElementById:()=>({textContent:''})},Date:{now:()=>1234}};
 vm.runInNewContext(script,context);context.verified('private-token');assert.equal(context.window.m5State.issuedAt,1234);context.expired();assert.equal(context.window.m5Token,'');assert.equal(context.window.m5State.status,'expired');
 context.failed('private-provider-details');assert.equal(context.window.m5State.error,'unclassified');context.failed('network-error');assert.equal(context.window.m5State.error,'network-error');assert.ok(!JSON.stringify(context.window.m5State).includes('private'));
 assert.equal(probeMetadata(env,'challenge').probeVersion,2);
});
test('save transport rejects missing operator authentication and wrong Origin before fetch',async()=>{
 let requests=0;const fetcher=async()=>{requests++;throw Error('must not send');},signal=new AbortController().signal;
 await assert.rejects(()=>previewRequest({},signal,fetcher)('/api/session'),/PREVIEW_SESSION_MISSING/);
 await assert.rejects(()=>previewRequest({VERCEL_AUTOMATION_BYPASS_SECRET:'mock'},signal,fetcher)('/api/festivals',{method:'POST',origin:'https://other.invalid'}),/PREVIEW_ORIGIN_MISMATCH/);assert.equal(requests,0);
});
test('fresh A/B sessions, replay refusal and authenticated reads precede the first save; missing refresh stops early',async()=>{
 for(const missingRefresh of [false,true]){
  const fixture=await preparePreviewFixture({qa}),tokens=createCaptchaTokens(),events=[];let issued=0;
  const browser={token:async()=>tokens.issue('mock-token-'+(++issued),{issuedAt:Date.now(),challenge:'mock-'+issued})};
  const call=async(path,o={})=>{
   if(path==='/api/session'){
    if(o.status===400){events.push('replay');return {data:{code:'CAPTCHA_FAILED'}};}
    events.push('session');o.cookies.set('banguseok-access','mock-access-'+issued);if(!missingRefresh)o.cookies.set('banguseok-refresh','mock-refresh');return {data:{authenticated:true}};
   }
   if(path==='/api/festivals'&&o.method!=='POST'){assert.ok(o.cookies.get('banguseok-access'));events.push('session-read');return {data:{items:[]}};}
   events.push('save');throw Error('STOP_BEFORE_REMOTE_SAVE');
  };
  const core={user:async token=>token,request:async()=>{events.push('cleanup');}};
  await assert.rejects(()=>verifyPreviewFlow({fixture,browser,core,call}),missingRefresh?/PREVIEW_SESSION_MISSING/:/STOP_BEFORE_REMOTE_SAVE/);
  if(missingRefresh){assert.ok(!events.includes('save'));assert.equal(issued,1);}
  else{assert.deepEqual(events.slice(0,7),['session','replay','session','replay','session-read','session-read','save']);assert.equal(issued,2);}
  assert.ok(events.includes('cleanup'));
 }
});
