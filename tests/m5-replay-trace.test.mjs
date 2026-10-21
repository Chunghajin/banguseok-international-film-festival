import assert from 'node:assert/strict';
import test from 'node:test';
import {createG1Client,G1Error} from '../scripts/g1/client.mjs';
import {createReplayTrace} from '../scripts/m5/replay-trace.mjs';
const origin='https://example.supabase.co',env={NEXT_PUBLIC_SUPABASE_URL:origin,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public-key-fixture',SUPABASE_SERVICE_ROLE_KEY:'server-key-fixture'},token='original-secret-token-fixture';
function trace(fetcher){return createReplayTrace({origin,publicKey:env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,serviceKey:env.SUPABASE_SERVICE_ROLE_KEY,token,fetcher});}
const session=id=>Response.json({access_token:'private-jwt-fixture',refresh_token:'private-refresh-fixture',user:{id,is_anonymous:true,created_at:new Date().toISOString()}},{headers:{date:new Date().toUTCString()}});
test('both independent clients transmit the exact original token; summary omits identities and secrets',async()=>{
 let calls=0;const t=trace(async()=>session(++calls===1?'id-a-private':'id-b-private'));
 try{const first=createG1Client(env,t.fetchFor('first')),second=createG1Client(env,t.fetchFor('replay'));await first.signIn(token);await second.signIn(token);const s=t.summary();assert.equal(s.exact_same_original_token,true);assert.equal(s.signup_request_count,2);for(const r of s.requests){assert.equal(r.path,'/auth/v1/signup');assert.equal(r.authorization_present,false);assert.equal(r.cookie_present,false);assert.equal(r.public_api_key_matches,true);}
  for(const value of [token,'private-jwt-fixture','private-refresh-fixture','id-a-private','id-b-private',env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,env.SUPABASE_SERVICE_ROLE_KEY])assert.ok(!JSON.stringify(s).includes(value));
 }finally{t.dispose();}
});
test('a changed token, administrator signup, wrong endpoint or automatic application retry is blocked before fetch',async()=>{
 let calls=0;const t=trace(async()=>{calls++;return session('id-private');});try{
  await assert.rejects(()=>createG1Client(env,t.fetchFor('first')).signIn(token+'changed'));assert.equal(calls,0);
  const replay=t.fetchFor('replay'),base={method:'POST',headers:{apikey:'public-key-fixture'},body:JSON.stringify({gotrue_meta_security:{captcha_token:token}}),cache:'no-store',redirect:'error'};
  await assert.rejects(()=>replay(new URL(origin+'/auth/v1/admin/users'),base));assert.equal(calls,0);
 }finally{t.dispose();}
 for(const header of [{authorization:'Bearer private-admin'}, {cookie:'private-session=secret'}, {apikey:'server-key-fixture'}]){const x=trace(async()=>{calls++;return session('id-private');});try{await assert.rejects(()=>x.fetchFor('first')(new URL(origin+'/auth/v1/signup'),{method:'POST',headers:{apikey:'public-key-fixture',...header},body:JSON.stringify({gotrue_meta_security:{captcha_token:token}}),cache:'no-store',redirect:'error'}));assert.equal(calls,0);}finally{x.dispose();}}
 const x=trace(async()=>session('id-private'));try{const c=createG1Client(env,x.fetchFor('first'));await c.signIn(token);await assert.rejects(()=>c.signIn(token));}finally{x.dispose();}
});
test('distinct fresh IDs are distinguished from an old/existing session and only fresh test users are deleted',async()=>{
 let n=0;const t=trace(async()=>session(++n===1?'first-private-id':'second-private-id'));
 try{await createG1Client(env,t.fetchFor('first')).signIn(token);await createG1Client(env,t.fetchFor('replay')).signIn(token);assert.equal(t.summary().two_distinct_new_anonymous_users,true);const deleted=[];const result=await t.cleanup({request:async(path,o)=>{if(o.method==='DELETE'){deleted.push(path);return null;}throw new G1Error(404);}});assert.equal(result.removed,2);assert.equal(deleted.length,2);assert.equal(t.summary().accounts_removed,2);}finally{t.dispose();}
 const old=trace(async()=>Response.json({access_token:'private-jwt',user:{id:'existing-private-id',is_anonymous:true,created_at:'2000-01-01T00:00:00Z'}},{headers:{date:new Date().toUTCString()}}));try{await old.fetchFor('first')(new URL(origin+'/auth/v1/signup'),{method:'POST',headers:{apikey:'public-key-fixture'},body:JSON.stringify({gotrue_meta_security:{captcha_token:token}}),cache:'no-store',redirect:'error'});assert.equal(old.summary().new_test_accounts_observed,0);await old.cleanup({request:async()=>assert.fail('existing account must not be deleted')});}finally{old.dispose();}
});
test('rejected replay and failed cleanup stay visible without raw error messages',async()=>{
 const t=trace(async()=>Response.json({code:400,error_code:'captcha_failed',msg:'private-provider-details'},{status:400}));try{await assert.rejects(()=>createG1Client(env,t.fetchFor('first')).signIn(token));assert.equal(t.summary().requests[0].error.safe_code,'captcha_failed');assert.ok(!JSON.stringify(t.summary()).includes('private'));}finally{t.dispose();}
 const x=trace(async()=>session('id-private'));try{await createG1Client(env,x.fetchFor('first')).signIn(token);const cleanup=await x.cleanup({request:async()=>{throw Error('private-key');}});assert.equal(cleanup.failed,1);assert.equal(x.summary().cleanup_failures,1);assert.ok(!JSON.stringify(x.summary()).includes('private'));}finally{x.dispose();}
});
