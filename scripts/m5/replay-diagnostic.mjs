import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createG1Client} from '../g1/client.mjs';
import {captchaInput} from './captcha-input.mjs';
import {authDiagnostic} from './diagnostics.mjs';
import {createReplayTrace} from './replay-trace.mjs';
import {CAPTCHA_PROVIDER,validHCaptchaSiteKey} from '../../src/lib/captcha-config.mjs';

if(process.env.G1_ALLOW_TEST_WRITES!=='yes'){console.log('NOT RUN: G1_ALLOW_TEST_WRITES=yes required for disposable users.');process.exit(2);}
if(!validHCaptchaSiteKey(process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY)){console.log('NOT RUN: real-format NEXT_PUBLIC_HCAPTCHA_SITE_KEY required; dummy keys rejected.');process.exit(2);}
const env=process.env,publicKey=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??'',serviceKey=env.SUPABASE_SERVICE_ROLE_KEY;
let role='unknown';if(publicKey.startsWith('sb_publishable_'))role='publishable';else try{role=JSON.parse(Buffer.from(publicKey.split('.')[1],'base64url')).role==='anon'?'anon':'not-anon';}catch{}
if(!['publishable','anon'].includes(role)||publicKey===serviceKey){console.error('NOT RUN: anonymous public API key configuration required.');process.exit(2);}
const core=createG1Client(env),origin=new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin;let trace,before,evidenceUnchanged=null,stage='baseline',outcome='UNVERIFIED',collectorCalls=0,authVersion='unavailable';
async function evidence(){const rows=await core.request('/rest/v1/request_protection_checks?select=environment,fingerprint,policy_version,verified_at&order=environment,fingerprint',{admin:true});return createHash('sha256').update(JSON.stringify(rows)).digest('hex');}
try{
 before=await evidence();const health=await core.request('/auth/v1/health');if(typeof health.version==='string'&&/^v?[0-9.]+$/.test(health.version))authVersion=health.version;stage='collect-one-token';
 const original=env.M5_CAPTCHA_TOKEN??await (async()=>{collectorCalls++;return captchaInput(env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY);})();
 trace=createReplayTrace({origin,publicKey,serviceKey,token:original});
 const firstClient=createG1Client(env,trace.fetchFor('first')),secondClient=createG1Client(env,trace.fetchFor('replay'));
 stage='first-signup';const first=await firstClient.signIn(original);
 stage='replay-signup';let second,replayError;try{second=await secondClient.signIn(original);}catch(error){replayError=error;}
 stage='verify-identities';assert.equal(await core.user(first.access_token),first.user.id);if(second)assert.equal(await core.user(second.access_token),second.user.id);
 const summary=trace.summary();assert.equal(summary.signup_request_count,2);assert.equal(summary.exact_same_original_token,true);assert.ok(summary.requests.every(r=>r.wire_requests_created===1&&r.wire_requests_sent===1&&r.wire_responses_received===1&&r.response_origin_matches&&!r.redirected),'TRANSPORT_NOT_CONFIRMED');
 outcome=second?(summary.two_distinct_new_anonymous_users?'REPLAY_CREATED_SECOND_USER':'REPLAY_ACCEPTED_IDENTITY_UNCLEAR'):replayError?.code==='captcha_failed'?'REPLAY_REJECTED':'REPLAY_UNVERIFIED_OTHER_ERROR';
 if(outcome!=='REPLAY_REJECTED')process.exitCode=1;
}catch(error){console.error('DIAGNOSTIC: '+JSON.stringify({stage,...authDiagnostic(error)}));process.exitCode=1;}
finally{
 const cleanup=trace?await trace.cleanup(core):{removed:0,failed:0};if(cleanup.failed)process.exitCode=1;
 try{evidenceUnchanged=before!==undefined&&(await evidence())===before;}catch{evidenceUnchanged=null;}if(evidenceUnchanged!==true)process.exitCode=1;
 const report={captcha_provider:CAPTCHA_PROVIDER,outcome,stage,auth_version:authVersion,public_key_type:role,independent_clients:true,release_evidence_unchanged:evidenceUnchanged,release_activated:false,collector_invocations:collectorCalls,application_widget_reset_calls:0,...(trace?.summary()??{}),cleanup};
 const rendered=JSON.stringify(report,null,2)+'\n';
 // Only allowlisted metadata is written. Check even this output before publishing it.
 for(const secret of [publicKey,serviceKey,env.TMDB_READ_ACCESS_TOKEN,env.PROTECTION_HMAC_KEY].filter(Boolean))assert.ok(!rendered.includes(secret));
 await writeFile('artifacts/m5/replay-diagnostic.json',rendered);console.log(rendered);
 trace?.dispose();
}
