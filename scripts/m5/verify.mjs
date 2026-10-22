// Local CAPTCHA diagnosis only. Preview evidence requires the remote verifier.
import assert from 'node:assert/strict';
import {authDiagnostic,requireCaptchaReplayRejection} from './diagnostics.mjs';
const captchaOnly=process.argv.includes('--captcha-only');
// Local widget tokens cannot attest a deployed Preview configuration.
if(!captchaOnly){console.error('NOT RUN: use verify:m5:preview; legacy local verifier cannot register release evidence.');process.exit(2);}
import {captchaInput} from './captcha-input.mjs';
import {writeFile} from 'node:fs/promises';
import {createG1Client,G1Error} from '../g1/client.mjs';
import {CAPTCHA_PROVIDER,validHCaptchaSiteKey} from '../../src/lib/captcha-config.mjs';
if(process.env.G1_ALLOW_TEST_WRITES!=='yes'||(!process.env.M5_CAPTCHA_TOKEN&&!process.argv.includes('--captcha-browser'))){console.log('NOT RUN: disposable-write consent and fresh real-widget CAPTCHA required.');process.exit(2);}
const config={siteKey:process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY};
if(!validHCaptchaSiteKey(config.siteKey)){console.log('NOT RUN: real-format NEXT_PUBLIC_HCAPTCHA_SITE_KEY required; dummy keys rejected.');process.exit(2);}
let stage='invalid-captcha';
const environment=process.env.M5_VERIFY_ENV,core=createG1Client(process.env),owners=[],results=[];
const pass=name=>{results.push({name,result:'PASS'});console.log(`PASS: ${name}`);};
try{
 stage='invalid-captcha';
 try{const bad=await core.signIn('m5a-intentionally-invalid-captcha');owners.push(bad.user.id);await core.user(bad.access_token);throw Error('CAPTCHA_NOT_ENFORCED');}catch(e){if(!(e instanceof G1Error&&e.code==='captcha_failed'))throw e;}pass('Real Supabase rejects invalid CAPTCHA');
 stage='normal-captcha';
 const captchaToken=process.env.M5_CAPTCHA_TOKEN??await captchaInput(config.siteKey);
 const session=await core.signIn(captchaToken);owners.push(session.user.id);assert.equal(await core.user(session.access_token),session.user.id);pass('Fresh real-widget CAPTCHA succeeds through Supabase anonymous Auth');
 stage='captcha-replay';
 let replayError;try{const repeated=await core.signIn(captchaToken);owners.push(repeated.user.id);}catch(error){replayError=error;}requireCaptchaReplayRejection(replayError);pass('Real CAPTCHA token replay rejected');
 stage='cleanup';
 for(const owner of new Set(owners))await core.request(`/auth/v1/admin/users/${owner}`,{admin:true,method:'DELETE'});owners.length=0;
 await writeFile('artifacts/m5/captcha-checks.json',JSON.stringify({captcha_provider:CAPTCHA_PROVIDER,environment:environment??null,results,activated:false,scope:'Local CAPTCHA diagnosis only; no Preview hostname or release evidence attested.'},null,2)+'\n');
}catch(error){const diagnostic={stage,...authDiagnostic(error)};console.error('FAIL: '+JSON.stringify(diagnostic)+'; no keys, tokens, identities or upstream text printed.');if(captchaOnly)await writeFile('artifacts/m5/captcha-checks.json',JSON.stringify({results,failed:diagnostic,activated:false},null,2)+'\n');process.exitCode=1;}
finally{let removed=0;for(const owner of new Set(owners)){try{await core.request(`/auth/v1/admin/users/${owner}`,{admin:true,method:'DELETE'});removed++;}catch{console.error('Disposable provider-test cleanup failed; no identity printed.');process.exitCode=1;}}if(removed)console.log(`CLEANUP: ${removed} disposable account(s) removed; no identifiers printed.`);}
