// This verifier alone records provider evidence. It never deploys or applies SQL.
import assert from 'node:assert/strict';
import {authDiagnostic,requireCaptchaReplayRejection} from './diagnostics.mjs';
const captchaOnly=process.argv.includes('--captcha-only');
import {captchaInput} from './captcha-input.mjs';
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createG1Client,G1Error} from '../g1/client.mjs';
import {protectionConfig,POLICY_VERSION} from '../../src/lib/request-protection.ts';
import {CAPTCHA_PROVIDER,validHCaptchaSiteKey} from '../../src/lib/captcha-config.mjs';
if(process.env.G1_ALLOW_TEST_WRITES!=='yes'||(!process.env.M5_CAPTCHA_TOKEN&&!process.argv.includes('--captcha-browser'))||(!captchaOnly&&!['preview','production'].includes(process.env.M5_VERIFY_ENV??''))){console.log('NOT RUN: disposable-write consent, M5_VERIFY_ENV and fresh real-widget M5_CAPTCHA_TOKEN required.');process.exit(2);}
let config;try{config=captchaOnly?{siteKey:process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}:protectionConfig(process.env);}catch{console.log('NOT RUN: protection configuration incomplete; no release evidence recorded.');process.exit(2);}
if(!validHCaptchaSiteKey(config.siteKey)){console.log('NOT RUN: real-format NEXT_PUBLIC_HCAPTCHA_SITE_KEY required; dummy keys rejected.');process.exit(2);}
let stage='budget';
const environment=process.env.M5_VERIFY_ENV,core=createG1Client(process.env),second=createG1Client(process.env),owners=[],results=[];
const pass=name=>{results.push({name,result:'PASS'});console.log(`PASS: ${name}`);};
const budget=(client,key,seconds=60,limit=1,proof=false)=>client.request('/rest/v1/rpc/consume_request_budget',{admin:true,method:'POST',body:{p_buckets:[{key,seconds,limit,cost:1}],...(proof?{p_environment:environment,p_fingerprint:config.fingerprint}:{})}});
try{
 if(!captchaOnly){
 const key=randomBytes(32).toString('hex');assert.equal((await budget(core,key)).allowed,true);const denied=await budget(second,key);assert.equal(denied.allowed,false);assert.ok(denied.retry_after>0);assert.equal((await budget(second,randomBytes(32).toString('hex'))).allowed,true);pass('Two independent clients share the managed counter; independent subjects stay separate');
 const recovery=randomBytes(32).toString('hex');await budget(core,recovery,1);await new Promise(r=>setTimeout(r,1200));assert.equal((await budget(second,recovery,1)).allowed,true);pass('Actual provider window expiry restores requests');
 await assert.rejects(()=>core.request('/rest/v1/rpc/consume_request_budget',{method:'POST',body:{p_buckets:[]}}),e=>e instanceof G1Error&&[401,403].includes(e.status));pass('Public key cannot invoke service-only limiter');
 }
 stage='invalid-captcha';
 try{const bad=await core.signIn('m5a-intentionally-invalid-captcha');owners.push(bad.user.id);await core.user(bad.access_token);throw Error('CAPTCHA_NOT_ENFORCED');}catch(e){if(!(e instanceof G1Error&&e.code==='captcha_failed'))throw e;}pass('Real Supabase rejects invalid CAPTCHA');
 stage='normal-captcha';
 const captchaToken=process.env.M5_CAPTCHA_TOKEN??await captchaInput(config.siteKey);
 const session=await core.signIn(captchaToken);owners.push(session.user.id);assert.equal(await core.user(session.access_token),session.user.id);pass('Fresh real-widget CAPTCHA succeeds through Supabase anonymous Auth');
 stage='captcha-replay';
 let replayError;try{const repeated=await core.signIn(captchaToken);owners.push(repeated.user.id);}catch(error){replayError=error;}requireCaptchaReplayRejection(replayError);pass('Real CAPTCHA token replay rejected');
 // Remove test identities before recording release evidence; failed cleanup must not activate anything.
 stage='cleanup';
 for(const owner of new Set(owners))await core.request(`/auth/v1/admin/users/${owner}`,{admin:true,method:'DELETE'});owners.length=0;
 if(!captchaOnly){
 stage='evidence';
 await core.request('/rest/v1/request_protection_checks?on_conflict=environment,fingerprint',{admin:true,method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{environment,fingerprint:config.fingerprint,policy_version:POLICY_VERSION}});
 assert.equal((await budget(core,randomBytes(32).toString('hex'),1,1,true)).allowed,true);pass('Provider evidence recorded for exact environment/configuration; checked RPC accepts it');
 }
 await writeFile(captchaOnly?'artifacts/m5/captcha-checks.json':'artifacts/m5/provider-checks.json',JSON.stringify({captcha_provider:CAPTCHA_PROVIDER,environment:environment??null,results,activated:!captchaOnly,scope:captchaOnly?'CAPTCHA diagnosis only; no release evidence registered.':'Managed DB and Supabase CAPTCHA only; Vercel ingress/widget/HTTPS still require M5-B.'},null,2)+'\n');
}catch(error){const diagnostic={stage,...authDiagnostic(error)};console.error('FAIL: '+JSON.stringify(diagnostic)+'; no keys, tokens, identities or upstream text printed.');if(captchaOnly)await writeFile('artifacts/m5/captcha-checks.json',JSON.stringify({results,failed:diagnostic,activated:false},null,2)+'\n');process.exitCode=1;}
finally{let removed=0;for(const owner of new Set(owners)){try{await core.request(`/auth/v1/admin/users/${owner}`,{admin:true,method:'DELETE'});removed++;}catch{console.error('Disposable provider-test cleanup failed; no identity printed.');process.exitCode=1;}}if(removed)console.log(`CLEANUP: ${removed} disposable account(s) removed; no identifiers printed.`);}
