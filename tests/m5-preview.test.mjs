import assert from 'node:assert/strict';
import test from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {PREVIEW_ORIGIN,PREVIEW_PROBE,createPreviewProbe,previewConfiguration,probeHeaders,probeMetadata} from '../src/lib/m5-preview.ts';
import {withPreviewEvidence,revokePreviewRun} from '../scripts/m5/preview-evidence.mjs';
import {previewRequest,verifyPreviewFlow} from '../scripts/m5/preview-flow.mjs';
import {preparePreviewFixture} from '../scripts/m5/preview-fixture.mjs';
import {createCaptchaTokens} from '../scripts/m5/preview-captcha.mjs';
const env={VERCEL:'1',VERCEL_ENV:'preview',APP_ALLOWED_ORIGINS:PREVIEW_ORIGIN,PROTECTION_HMAC_KEY:'a'.repeat(64),NEXT_PUBLIC_HCAPTCHA_SITE_KEY:'11111111-2222-4333-8444-555555555555',NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'service-secret',TMDB_READ_ACCESS_TOKEN:'tmdb-secret'};
const request=(headers={},url=PREVIEW_ORIGIN+PREVIEW_PROBE)=>new Request(url,{headers:{host:new URL(PREVIEW_ORIGIN).host,'x-vercel-forwarded-for':'203.0.113.10',...probeHeaders(env),...headers}});
test('manual revocation defaults to exact-row read only and rejects missing/broad selectors',async()=>{
 const calls=[],at='2026-10-22T04:00:00.123456Z',fp='a'.repeat(64);let rows=[{verified_at:at}];
 const core={request:async(path,o)=>{calls.push({path,method:o?.method??'GET'});if(o?.method==='DELETE')rows=[];return rows;}};
 assert.deepEqual(await revokePreviewRun(core,fp,at),{matched:1,executed:false});assert.equal(calls.length,1);
 assert.deepEqual(await revokePreviewRun(core,fp,at,true),{matched:1,executed:true});assert.equal(calls.filter(c=>c.method==='DELETE').length,1);
 for(const c of calls){assert.match(c.path,/environment=eq.preview&fingerprint=eq.a{64}&verified_at=eq./);assert.ok(!c.path.includes('production'));}
 for(const invalid of ['',at+'*','2026-10-22'])await assert.rejects(()=>revokePreviewRun(core,fp,invalid,true));
 await assert.rejects(()=>revokePreviewRun(core,'*',at,true));
});
test('read-only Preview probe requires exact platform/host and operator proof; Production and foreign requests stay closed',async()=>{
 const get=createPreviewProbe(env);
 for(const headers of [{authorization:''},{authorization:'Bearer wrong'},{host:'other.vercel.app'},{origin:'https://other.invalid'},{'sec-fetch-site':'cross-site'},{'x-vercel-forwarded-for':''},{'x-m5-time':String(Date.now()-120000)}])assert.equal(get(request(headers)).status,404);
 for(const extra of [{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},{VERCEL:'0'},{APP_ALLOWED_ORIGINS:PREVIEW_ORIGIN+',https://other.example'}])assert.equal(createPreviewProbe({...env,...extra})(request()).status,404);
 assert.equal(get(request({},PREVIEW_ORIGIN+PREVIEW_PROBE+'?token=no')).status,404);
 assert.equal(createPreviewProbe(env,'66666666-7777-4888-8999-aaaaaaaaaaaa')(request()).status,404);
 const r=get(request({accept:'application/json'}));assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),null);assert.match(r.headers.get('cache-control'),/no-store/);
 const html=await get(request()).text();assert.match(html,/js.hcaptcha.com/);assert.match(html,/window.m5Token/);assert.doesNotMatch(html,/fetch\(|localStorage|sessionStorage|service-secret|tmdb-secret|signIn|request_protection_checks/);
});
test('challenge attests exact Sitekey/fingerprint and deployed credentials; local hostname and drift are rejected',()=>{
 const headers=probeHeaders(env),nonce=headers['x-m5-nonce'],base=probeMetadata(env,nonce);
 for(const extra of [{SUPABASE_SERVICE_ROLE_KEY:'different'},{NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'different'},{TMDB_READ_ACCESS_TOKEN:'different'},{NEXT_PUBLIC_HCAPTCHA_SITE_KEY:'66666666-7777-4888-8999-aaaaaaaaaaaa'},{PROTECTION_HMAC_KEY:'b'.repeat(64)},{NEXT_PUBLIC_SUPABASE_URL:'https://other.supabase.co'}])assert.notDeepEqual(probeMetadata({...env,...extra},nonce),base);
 assert.notEqual(probeMetadata(env,'other').proof,base.proof);
 assert.throws(()=>previewConfiguration({...env,APP_ALLOWED_ORIGINS:'http://captcha.banguseok.test'}));
});

test('actual PostgreSQL evidence ownership: rollback after success/timeout failures, existing/concurrent rows untouched',async()=>{
 const db=new PGlite();try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');await db.exec(await readFile(new URL('../supabase/migrations/202610210001_m5_request_protection.sql',import.meta.url),'utf8'));
  const fp='a'.repeat(64);let lostResponse=false,deleteFailures=0,inserts=0;
  const core={async request(path,options={}){
   const query=new URL(path,'https://test.invalid').searchParams;
   const args=['preview',fp];let where='environment=$1 and fingerprint=$2';
   if(query.has('verified_at')){where+=' and verified_at=$3::timestamptz';args.push(query.get('verified_at').slice(3));}
   if(options.method==='POST'){
    inserts++;const b=options.body;assert.equal(b.environment,'preview');assert.equal(query.has('on_conflict'),false);
    await db.query('insert into public.request_protection_checks values ($1,$2,$3,$4)',[b.environment,b.fingerprint,b.policy_version,b.verified_at]);
    if(lostResponse)throw Error('LOST_RESPONSE');return;
   }
   if(options.method==='DELETE'){assert.ok(query.has('verified_at'));if(deleteFailures-->0)throw Error('OFFLINE');await db.query('delete from public.request_protection_checks where '+where,args);return;}
   return (await db.query('select verified_at from public.request_protection_checks where '+where,args)).rows;
  }};
  await db.query("insert into public.request_protection_checks values ('production',$1,'m5a-v1',now()),('preview',$2,'m5a-v1',now())",[fp,'b'.repeat(64)]);
  for(const failure of ['after-insert','lost-response','retry-delete']){
   lostResponse=failure==='lost-response';deleteFailures=failure==='retry-delete'?2:0;
   await assert.rejects(()=>withPreviewEvidence(core,fp,async()=>{throw Error('FOLLOWUP_FAILED');}));
   assert.equal((await core.request('/checks')).length,0);
   assert.equal((await db.query('select * from public.request_protection_checks')).rows.length,2);
  }
  lostResponse=false;await withPreviewEvidence(core,fp,async()=>{});const before=inserts;
  await assert.rejects(()=>withPreviewEvidence(core,fp,async()=>{}));assert.equal(inserts,before);assert.equal((await core.request('/checks')).length,1);
  await db.query("delete from public.request_protection_checks where environment='preview' and fingerprint=$1",[fp]);
  const race={async request(path,options){if(options?.method==='POST'){await db.query("insert into public.request_protection_checks values ('preview',$1,'m5a-v1','2000-01-01')",[fp]);}return core.request(path,options);}};
  await assert.rejects(()=>withPreviewEvidence(race,fp,async()=>{}));assert.equal((await core.request('/checks')).length,1);
 }finally{await db.close();}
});
test('failed revocation is explicit and retries only this run row',async()=>{
 let deletes=0;const core={request:async(path,o)=>{if(o?.method==='DELETE'){deletes++;assert.match(path,/environment=eq.preview/);assert.match(path,/verified_at=eq./);throw Error('offline');}return [];}};
 await assert.rejects(()=>withPreviewEvidence(core,'c'.repeat(64),async()=>{throw Error();}),/PREVIEW_REVOCATION_FAILED_MANUAL_RECOVERY_REQUIRED/);assert.equal(deletes,3);
});
test('Preview HTTP runner rejects foreign destinations/redirects and retains session identity for cleanup on failed assertions',async t=>{
 const cookies=new Map();let calls=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls++;assert.equal(new URL(url).origin,PREVIEW_ORIGIN);assert.equal(options.redirect,'manual');assert.equal(options.headers['x-vercel-protection-bypass'],'test-bypass');
  return new Response('{"unexpected":true}',{status:200,headers:{'Set-Cookie':'banguseok-access=test-access; Secure; HttpOnly; SameSite=Lax'}});
 });
 const call=previewRequest({...env,VERCEL_AUTOMATION_BYPASS_SECRET:'test-bypass'},new AbortController().signal);
 await assert.rejects(()=>call('//foreign.invalid'));assert.equal(calls,0);
 await assert.rejects(()=>call('/api/session',{method:'POST',body:{},cookies,status:400}));assert.equal(cookies.get('banguseok-access'),'test-access');
 const removed=[];
 const fixture=await preparePreviewFixture(),tokens=createCaptchaTokens();
 await assert.rejects(()=>verifyPreviewFlow({fixture,browser:{token:async()=>tokens.issue('mock-widget-token',{issuedAt:Date.now(),challenge:'mock-challenge'})},call:async(path,o)=>{o.cookies.set('banguseok-access','test-access');throw Error('UNEXPECTED_RESPONSE');},core:{user:async()=> 'disposable-owner',request:async(path)=>removed.push(path)}}));
 assert.deepEqual(removed,['/rest/v1/festivals?owner_id=eq.disposable-owner','/auth/v1/admin/users/disposable-owner']);
});
