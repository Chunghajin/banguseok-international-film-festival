import assert from 'node:assert/strict';
import {G1Error} from '../g1/client.mjs';
import {PREVIEW_ORIGIN} from '../../src/lib/m5-preview.ts';
import {validatePreviewFixture} from './preview-fixture.mjs';

export function previewRequest(env,signal,fetcher=fetch){
 return async function call(path,{method='GET',body,cookies=new Map(),status=200,origin=PREVIEW_ORIGIN}={}){
  assert.ok(path.startsWith('/')&&!path.startsWith('//'));assert.equal(new URL(path,PREVIEW_ORIGIN).origin,PREVIEW_ORIGIN);
  if(origin!==PREVIEW_ORIGIN&&status!==403)throw Error('PREVIEW_ORIGIN_MISMATCH');
  if(!env.VERCEL_AUTOMATION_BYPASS_SECRET)throw Error('PREVIEW_SESSION_MISSING');
  const response=await fetcher(PREVIEW_ORIGIN+path,{method,redirect:'manual',cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(30000)]),headers:{Origin:origin,'x-vercel-protection-bypass':env.VERCEL_AUTOMATION_BYPASS_SECRET,'Content-Type':'application/json',Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join(';')},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await response.text();
  for(const cookie of response.headers.getSetCookie()){
   const [name,...value]=cookie.split(';')[0].split('=');cookies.set(name,value.join('='));
   assert.match(cookie,/; HttpOnly/i);assert.match(cookie,/; Secure/i);assert.match(cookie,/; SameSite=Lax/i);
   assert.ok(['banguseok-access','banguseok-refresh'].includes(name));
  }
  for(const key of [env.SUPABASE_SERVICE_ROLE_KEY,env.PROTECTION_HMAC_KEY,env.TMDB_READ_ACCESS_TOKEN,env.VERCEL_AUTOMATION_BYPASS_SECRET,...cookies.values()].filter(Boolean))assert.ok(!text.includes(key),'Credential in response');
  let data;try{data=JSON.parse(text);}catch{data=text;}
  if(!(Array.isArray(status)?status:[status]).includes(response.status))throw new G1Error(response.status,response.status>=300&&response.status<400?'PREVIEW_PROBE_ACCESS_REJECTED':data?.code);
  return {response,data,text};
 };
}

export async function verifyPreviewFlow({call,browser,core,fixture,steps}){
 await validatePreviewFixture(fixture);
 const {input,updatedNickname}=fixture,run=(name,action)=>steps?steps.run(name,action):action();
 const owners=[];let cleanupFailed=false;
 try{
  const a=new Map(),b=new Map();
  for(const cookies of [a,b]){
   const captcha=await run('session-challenge',()=>browser.token());
   try{await run('session-create',()=>captcha.consume(token=>call('/api/session',{method:'POST',body:{captcha_token:token},cookies})));}
   finally{if(cookies.get('banguseok-access'))owners.push(await run('session-verify',()=>core.user(cookies.get('banguseok-access'))));}
   if(!cookies.get('banguseok-access')||!cookies.get('banguseok-refresh'))throw Error('PREVIEW_SESSION_MISSING');
   const replayCookies=new Map();
   try{await run('session-replay',()=>captcha.replay(async token=>{const replay=await call('/api/session',{method:'POST',body:{captcha_token:token},cookies:replayCookies,status:400});assert.equal(replay.data.code,'CAPTCHA_FAILED');}));}
   finally{if(replayCookies.get('banguseok-access'))owners.push(await core.user(replayCookies.get('banguseok-access')));}
  }
  assert.equal(new Set(owners).size,2);
  for(const cookies of [a,b])await run('session-verify',()=>call('/api/festivals',{cookies}));
  const saved=(await call('/api/festivals',{method:'POST',body:input,cookies:a})).data.festival;assert.equal(saved.revision,1);assert.equal(saved.selections.length,3);
  assert.equal((await call('/api/festivals',{method:'POST',body:input,cookies:a})).data.festival.id,saved.id);
  assert.ok((await call('/api/festivals',{cookies:a})).data);
  const path='/api/festivals/'+saved.id;
  await call(path,{status:401});await call(path,{cookies:b,status:404});
  await call(path,{cookies:b,method:'DELETE',body:{revision:1},status:404});
  await call('/api/festivals',{cookies:a,method:'POST',body:{...input,owner_id:owners[1]},status:400});
  await call(path+'/publish',{cookies:a,method:'POST',body:{revision:1,consent:false},status:400});
  const updated=(await call('/api/festivals',{cookies:a,method:'POST',body:{...input,id:saved.id,expected_revision:1,nickname:updatedNickname}})).data.festival;assert.equal(updated.revision,2);
  await call('/api/festivals',{cookies:a,method:'POST',body:{...input,id:saved.id,expected_revision:1,nickname:'오래된 수정'},status:409});
  for(const action of ['publish','unpublish'])await call(path+'/'+action,{cookies:b,method:'POST',body:{revision:2,...(action==='publish'?{consent:true}:{})},status:404});
  const share=(await call(path+'/publish',{cookies:a,method:'POST',body:{revision:2,consent:true}})).data.share;
  const publicPage=await call('/f/'+share.token);assert.match(publicPage.response.headers.get('cache-control'),/no-store/);assert.equal(publicPage.response.headers.get('set-cookie'),null);assert.ok(publicPage.text.includes(updatedNickname));
  for(const value of [owners[0],saved.id,input.draft_id])assert.ok(!publicPage.text.includes(value));
  await call(path+'/unpublish',{cookies:a,method:'POST',body:{revision:2}});await call('/f/'+share.token,{status:404});
  const next=(await call(path+'/publish',{cookies:a,method:'POST',body:{revision:2,consent:true}})).data.share;assert.notEqual(next.token,share.token);
  await call(path,{cookies:a,method:'DELETE',body:{revision:1},status:409});await call(path,{cookies:a,method:'DELETE',body:{revision:2}});
  await call('/f/'+next.token,{status:404});
  await call('/api/session',{method:'POST',body:{},origin:'https://foreign.invalid',status:403});
 }finally{
  await run('flow-cleanup',async()=>{for(const owner of new Set(owners)){
   try{await core.request(`/rest/v1/festivals?owner_id=eq.${encodeURIComponent(owner)}`,{admin:true,method:'DELETE'});await core.request(`/auth/v1/admin/users/${encodeURIComponent(owner)}`,{admin:true,method:'DELETE'});}catch{cleanupFailed=true;}
  }if(cleanupFailed)throw Error('PREVIEW_FIXTURE_CLEANUP_FAILED');});
 }
}
