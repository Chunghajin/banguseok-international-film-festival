import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {protectionConfig,platformContext,createRequestProtection,ProtectionError,protectionResponse} from '../src/lib/request-protection.ts';
import {createProductMovies} from '../src/lib/product-movies.ts';
import {createFestivalHttp} from '../src/lib/festival-http.ts';
import {captchaInput} from '../scripts/m5/captcha-input.mjs';
import {G1Error} from '../src/lib/supabase-core.mjs';
import {createHmac} from 'node:crypto';
const env={VERCEL:'1',VERCEL_ENV:'preview',APP_ALLOWED_ORIGINS:'https://festival.example',PROTECTION_HMAC_KEY:'a'.repeat(64),NEXT_PUBLIC_HCAPTCHA_SITE_KEY:'11111111-2222-4333-8444-555555555555',NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co'};
const request=(body={},extra={})=>new Request('https://internal.example/api/catalog/movies',{method:'POST',headers:{host:'festival.example',origin:'https://festival.example','content-type':'application/json','x-vercel-forwarded-for':'203.0.113.10',...extra},body:JSON.stringify(body)});
const allowed={allowed:true,retry_after:0,policy_version:'m5a-v1'};
test('release fingerprint binds policy, origin, Supabase project, real-format site key and HMAC key; no flag bypass',()=>{
 const base=protectionConfig(env);for(const [k,v] of [['APP_ALLOWED_ORIGINS','https://other.example'],['PROTECTION_HMAC_KEY','b'.repeat(64)],['NEXT_PUBLIC_SUPABASE_URL','https://other.supabase.co'],['NEXT_PUBLIC_HCAPTCHA_SITE_KEY','66666666-7777-4888-8999-aaaaaaaaaaaa']])assert.notEqual(protectionConfig({...env,[k]:v}).fingerprint,base.fingerprint);
 for(const extra of [{PROTECTION_HMAC_KEY:''},{NEXT_PUBLIC_HCAPTCHA_SITE_KEY:'1x00000000000000000000AA'},{APP_ALLOWED_ORIGINS:'https://*.example'},{APP_ALLOWED_ORIGINS:'http://example.com'},{APP_ALLOWED_ORIGINS:'https://example.com/path'}])assert.throws(()=>protectionConfig({...env,...extra}));
 const expected=createHmac('sha256',env.PROTECTION_HMAC_KEY).update(JSON.stringify(['m5a-v1','hcaptcha',base.origins,env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY,env.NEXT_PUBLIC_SUPABASE_URL])).digest('hex');assert.equal(base.fingerprint,expected);
 const legacy=createHmac('sha256',env.PROTECTION_HMAC_KEY).update(JSON.stringify(['m5a-v1',base.origins,env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY,env.NEXT_PUBLIC_SUPABASE_URL])).digest('hex');assert.notEqual(base.fingerprint,legacy);
 assert.throws(()=>protectionConfig({...env,NEXT_PUBLIC_HCAPTCHA_SITE_KEY:undefined,NEXT_PUBLIC_TURNSTILE_SITE_KEY:'0x4test-real-format-placeholder'}));
});
test('only Vercel-owned single IP and allowlisted Host/Origin accepted; spoof XFF never becomes identity',()=>{
 const origins=protectionConfig(env).origins;
 assert.equal(platformContext(request({}, {'x-forwarded-for':'1.2.3.4'}),env,origins).ip,'203.0.113.10');
 for(const headers of [{host:'attacker.example'},{origin:'https://attacker.example'},{'x-vercel-forwarded-for':''},{'x-vercel-forwarded-for':'1.2.3.4, 2.3.4.5'},{'sec-fetch-site':'cross-site'}])assert.throws(()=>platformContext(request({},headers),env,origins));
 assert.equal(platformContext(new Request('https://festival.example/f/public',{headers:{host:'festival.example','x-vercel-forwarded-for':'203.0.113.10','sec-fetch-site':'cross-site'}}),env,origins).ip,'203.0.113.10');
 assert.throws(()=>platformContext(request(),{...env,VERCEL:''},origins));assert.throws(()=>platformContext(request(),{...env,VERCEL_ENV:'development'},origins));
 assert.equal(platformContext(request({}, {'x-vercel-forwarded-for':'2001:0db8::1'}),env,origins).ip,'[2001:db8::1]');
});
test('shared budget sends HMAC identities only and charges even cached movies; optional owner is Auth-verified',async()=>{
 const calls=[],core={request:async(path,options)=>{calls.push(options.body);return allowed;},user:async token=>{assert.equal(token,'verified');return 'owner-A';}};
 const p=createRequestProtection({env,core});await p.start(request(),'movies');await p.movies(request({}, {cookie:'banguseok-access=verified'}),6);await p.owner(request(),'owner-A','save');
 assert.equal(calls[1].p_buckets.length,3);assert.equal(calls[1].p_buckets[0].cost,6);assert.equal(calls[2].p_buckets[0].seconds,3600);assert.equal(calls[2].p_buckets[0].limit,10);
 for(const b of calls.flatMap(c=>c.p_buckets))assert.match(b.key,/^[a-f0-9]{64}$/);
 for(const raw of ['203.0.113.10','owner-A','verified',env.PROTECTION_HMAC_KEY])assert.ok(!JSON.stringify(calls).includes(raw));
});
test('429 has actual Retry-After; outages, missing proof and malformed allow responses fail closed',async()=>{
 for(const result of [{...allowed,allowed:false,retry_after:23},null,{allowed:true},{...allowed,policy_version:'wrong'},{...allowed,retry_after:-1}]){
  const p=createRequestProtection({env,core:{request:async()=>result}});await assert.rejects(()=>p.start(request(),'write'),e=>{const r=protectionResponse(e);assert.equal(r.status,result?.retry_after===23?429:503);if(r.status===429)assert.equal(r.headers.get('retry-after'),'23');return true;});
 }
 const p=createRequestProtection({env,core:{request:async()=>{throw Error('secret upstream text');}}});await assert.rejects(()=>p.start(request(),'write'),e=>e.status===503&&!e.message.includes('secret'));
});
test('separate authenticated A/B keys and route budgets; forged movie session cannot choose owner bucket',async()=>{
 const calls=[],p=createRequestProtection({env,core:{request:async(path,o)=>{calls.push(o.body);return allowed;},user:async()=>{throw new G1Error(401,'UNAUTHENTICATED');}}});
 await p.owner(request(),'A','save');await p.owner(request(),'B','save');await p.owner(request(),'A','write');assert.equal(new Set(calls.map(c=>c.p_buckets[0].key)).size,3);
 await p.movies(request({}, {cookie:'banguseok-access=forged'}),1);assert.equal(calls.at(-1).p_buckets.length,2);
});
test('product movies use both shared checks before upstream; denied budget never calls TMDB',async()=>{
 let upstream=0;const seen=[];const protection={start:async()=>seen.push('start'),movies:async(r,c)=>{seen.push(c);throw new ProtectionError(429,12);}};
 const handle=createProductMovies({environment:'production',protection,client:{detail:async()=>{upstream++;}}});const r=await handle(request({action:'detail',id:1}));assert.equal(r.status,429);assert.equal(upstream,0);assert.equal(r.headers.get('retry-after'),'12');assert.deepEqual(seen,['start',1]);
 const ok=createProductMovies({environment:'production',protection:{start:async()=>{},movies:async()=>{}},client:{detail:async()=>({tmdb_id:1,title:'server'})}});assert.equal((await ok(request({action:'detail',id:1}))).status,200);
});
test('production new-session CAPTCHA missing/failure/success; existing owner needs no CAPTCHA but is limited',async()=>{
 let signup=0;const protectedOwners=[];const protection={start:async()=>{},signup:async()=>{},owner:async(r,id,k)=>protectedOwners.push([id,k])};
 const core={user:async token=>{if(token==='valid')return 'owner-A';throw new G1Error(401);},signIn:async token=>{signup++;if(token!=='captcha-ok')throw new G1Error(400,'captcha_failed');return {access_token:'valid',refresh_token:'refresh',expires_in:3600};}};
 const handler=createFestivalHttp({environment:'production',core,service:{},protection});
 assert.equal((await handler(request(),['session'])).status,428);assert.equal(signup,0);
 const bad=await handler(request({captcha_token:'wrong'}),['session']);assert.equal(bad.status,400);assert.equal((await bad.json()).code,'CAPTCHA_FAILED');
 assert.equal((await handler(request({captcha_token:'captcha-ok'}),['session'])).status,200);
 assert.equal((await handler(request({}, {cookie:'banguseok-access=valid'}),['session'])).status,200);assert.equal(signup,2);assert.deepEqual(protectedOwners,[['owner-A','session'],['owner-A','session']]);
});
test('pre-issued owner cannot bypass repeated publish/write limits; service ownership is still checked',async()=>{
 let mutations=0;const protection={start:async()=>{},owner:async()=>{throw new ProtectionError(429,60);}};
 const handle=createFestivalHttp({environment:'production',core:{user:async()=> 'owner-A'},service:{publish:async()=>{mutations++;}},protection});
 const r=await handle(request({revision:1,consent:true},{cookie:'banguseok-access=valid'}),['11111111-1111-4111-8111-111111111111','publish']);assert.equal(r.status,429);assert.equal(mutations,0);
});
test('M5 additive PostgreSQL: shared atomic windows, recovery, proof and revoked public privileges',async()=>{
 const db=new PGlite();try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');await db.exec(await readFile(new URL('../supabase/migrations/202610210001_m5_request_protection.sql',import.meta.url),'utf8'));
  const call=(key,limit=2,seconds=60,environment=null,fingerprint=null)=>db.query('select public.consume_request_budget($1::jsonb,$2,$3) as result',[JSON.stringify([{key,limit,seconds,cost:1}]),environment,fingerprint]).then(r=>r.rows[0].result);
  const key='a'.repeat(64);const r=await Promise.all([call(key),call(key),call(key)]);assert.deepEqual(r.map(x=>x.allowed),[true,true,false]);assert.ok(r[2].retry_after>0);
  assert.equal((await call('b'.repeat(64))).allowed,true);
  await db.exec('update public.request_buckets set window_start=window_start-86400');assert.equal((await call(key)).allowed,true);
  await assert.rejects(()=>call(key,2,60,'preview','c'.repeat(64)),{code:'PT503'});
  await db.query("insert into public.request_protection_checks(environment,fingerprint,policy_version) values('preview',$1,'m5a-v1')",['c'.repeat(64)]);assert.equal((await call('d'.repeat(64),2,60,'preview','c'.repeat(64))).allowed,true);
  for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(()=>call('e'.repeat(64)),{code:'42501'});await assert.rejects(()=>db.query('select * from public.request_buckets'),{code:'42501'});await assert.rejects(()=>db.query('select * from public.request_protection_checks'),{code:'42501'});await db.exec('reset role');}
  await assert.rejects(()=>call('raw-ip-address'),{code:'22023'});
  await db.exec("insert into public.request_buckets values(repeat('f',64),0,1,now()-interval '1 second')");await call('d'.repeat(64));assert.equal((await db.query("select count(*)::int as n from public.request_buckets where bucket=repeat('f',64)")).rows[0].n,0);
 }finally{await db.close();}
});

test('local real-CAPTCHA collector rejects dummy keys before starting a listener',()=>{
 assert.throws(()=>captchaInput('1x00000000000000000000AA'),/REAL_SITE_KEY_REQUIRED/);assert.throws(()=>captchaInput('<script>'),/REAL_SITE_KEY_REQUIRED/);
});
