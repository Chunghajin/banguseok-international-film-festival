import assert from 'node:assert/strict';
import {channel} from 'node:diagnostics_channel';
import {G1Error} from '../g1/client.mjs';
import {authDiagnostic} from './diagnostics.mjs';

// Secrets and response identities live only in this closure; summary returns an explicit allowlist.
export function createReplayTrace({origin,publicKey,serviceKey,token,fetcher=fetch,now=Date.now}){
 const started=now(),records=[],identities=new Map(),owned=new Set();
 let removed=0,cleanupFailed=0;
 const subscriptions=['undici:request:create','undici:client:sendHeaders','undici:request:headers'].map((name,index)=>{
  const event=channel(name),handler=message=>{const r=message.request;if(String(r?.origin)!==origin||r?.path!=='/auth/v1/signup'||r?.method!=='POST')return;const record=records.at(-1);if(!record)return;const key=['wire_requests_created','wire_requests_sent','wire_responses_received'][index];record[key]=(record[key]??0)+1;};
  event.subscribe(handler);return {event,handler};
 });
 function sameBytes(value){return typeof value==='string'&&value===token&&Buffer.from(value,'utf8').equals(Buffer.from(token,'utf8'));}
 return {
  fetchFor(phase){
   assert.ok(['first','replay'].includes(phase));
   return async(url,options)=>{
    const target=new URL(url),headers=new Headers(options.headers),body=JSON.parse(options.body??'null');
    const tokenMatches=sameBytes(body?.gotrue_meta_security?.captcha_token);
    const record={phase,started_at_utc:new Date(now()).toISOString(),method:options.method,path:target.pathname,configured_origin_matches:target.origin===origin,original_token_exact_match:tokenMatches,authorization_present:headers.has('authorization'),cookie_present:headers.has('cookie'),public_api_key_matches:headers.get('apikey')===publicKey,service_key_used:headers.get('apikey')===serviceKey,redirects_disabled:options.redirect==='error',cache_disabled:options.cache==='no-store'};
    records.push(record);
    assert.equal(records.filter(r=>r.phase===phase).length,1,'UNEXPECTED_SIGNUP_RETRY');
    assert.ok(record.configured_origin_matches&&record.method==='POST'&&record.path==='/auth/v1/signup'&&tokenMatches&&!record.authorization_present&&!record.cookie_present&&record.public_api_key_matches&&!record.service_key_used&&record.redirects_disabled&&record.cache_disabled,'INVALID_SIGNUP_TRANSPORT');
    let response;try{response=await fetcher(url,options);}catch{record.transport_failed=true;throw Error('SIGNUP_TRANSPORT_FAILED');}
    record.finished_at_utc=new Date(now()).toISOString();record.http_status=response.status;const providerDate=Date.parse(response.headers.get('date')??'');record.provider_date_utc=Number.isFinite(providerDate)?new Date(providerDate).toISOString():null;record.response_origin_matches=Boolean(response.url)&&new URL(response.url).origin===origin;record.redirected=response.redirected;
    let data;try{data=await response.clone().json();}catch{record.response_json=false;return response;}
    record.response_json=true;
    if(!response.ok){const code=typeof data?.code==='string'?data.code:typeof data?.error_code==='string'?data.error_code:undefined;record.error=authDiagnostic(new G1Error(response.status,code));}
    if(response.ok&&typeof data?.user?.id==='string'){
     const created=Date.parse(data.user.created_at),serverDate=Date.parse(response.headers.get('date')??'');
     const fresh=Number.isFinite(created)&&Number.isFinite(serverDate)&&Math.abs(created-serverDate)<=10000&&created>=started-10000&&created<=now()+10000;
     identities.set(phase,{id:data.user.id,fresh,anonymous:data.user.is_anonymous===true});
     record.anonymous_user=data.user.is_anonymous===true;record.recent_creation_timestamp=fresh;record.session_returned=typeof data.access_token==='string'&&typeof data.refresh_token==='string';
     if(fresh&&data.user.is_anonymous===true)owned.add(data.user.id);
    }
    return response;
   };
  },
  summary(){
   const first=identities.get('first'),second=identities.get('replay');
   return {started_at_utc:new Date(started).toISOString(),started_at_kst:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'long'}).format(started),application_automatic_retries:0,signup_request_count:records.length,exact_same_original_token:records.length===2&&records.every(r=>r.original_token_exact_match),distinct_user_ids:first&&second?first.id!==second.id:null,two_distinct_new_anonymous_users:Boolean(first&&second&&first.id!==second.id&&first.fresh&&second.fresh&&first.anonymous&&second.anonymous),new_test_accounts_observed:owned.size,accounts_removed:removed,cleanup_failures:cleanupFailed,requests:structuredClone(records)};
  },
  dispose(){for(const {event,handler} of subscriptions)event.unsubscribe(handler);},
  async cleanup(core){
   for(const id of owned){try{
    await core.request(`/auth/v1/admin/users/${id}`,{admin:true,method:'DELETE'});
    try{await core.request(`/auth/v1/admin/users/${id}`,{admin:true});throw Error('ACCOUNT_STILL_PRESENT');}catch(e){if(!(e instanceof G1Error&&e.status===404))throw e;}
    removed++;
   }catch{cleanupFailed++;}}
   return {removed,failed:cleanupFailed};
  },
 };
}
