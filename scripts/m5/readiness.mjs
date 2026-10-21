import {createG1Client,G1Error} from '../g1/client.mjs';
import {authDiagnostic} from './diagnostics.mjs';
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {CAPTCHA_PROVIDER,validHCaptchaSiteKey} from '../../src/lib/captcha-config.mjs';
const results=[];let owner,stage='signup';const core=createG1Client(process.env);
if(process.env.G1_ALLOW_TEST_WRITES!=='yes'){console.log('NOT RUN: G1_ALLOW_TEST_WRITES=yes required for disposable CAPTCHA probe.');process.exit(2);}
if(!validHCaptchaSiteKey(process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY)){console.log('NOT RUN: real-format NEXT_PUBLIC_HCAPTCHA_SITE_KEY required; dummy keys rejected.');process.exit(2);}
console.log('Expected CAPTCHA provider: hcaptcha (Dashboard configuration is not detected by this probe).');
try{
 try{const r=await core.request('/rest/v1/rpc/consume_request_budget',{admin:true,method:'POST',body:{p_buckets:[{key:randomBytes(32).toString('hex'),seconds:1,limit:1,cost:1}]}});results.push({check:'managed-bucket-migration',result:r?.policy_version==='m5a-v1'?'READY':'UNVERIFIED'});}catch{results.push({check:'managed-bucket-migration',result:'NOT_READY'});}
 try{
  const session=await core.signIn('m5a-intentionally-invalid-captcha');owner=session.user.id;stage='verify-user';
  await core.user(session.access_token);results.push({check:'Supabase-rejects-invalid-CAPTCHA',result:'NOT_ENFORCED'});
 }catch(e){results.push({check:'Supabase-rejects-invalid-CAPTCHA',result:stage==='signup'&&e instanceof G1Error&&e.code==='captcha_failed'?'REJECTED':'UNVERIFIED',stage,...authDiagnostic(e)});}
 for(const r of results){console.log(`${r.check}: ${r.result}`);if(r.reason)console.log(`  stage=${r.stage}; HTTP=${r.http_status??'unknown'}; code=${r.safe_code}; reason=${r.reason}`);}
 await writeFile('artifacts/m5/readiness.json',JSON.stringify({captcha_provider:CAPTCHA_PROVIDER,provider_configuration_detected:false,results,activated:false},null,2)+'\n');
 if(results.some(r=>!['READY','REJECTED'].includes(r.result)))process.exitCode=2;
}finally{if(owner){try{await core.request(`/auth/v1/admin/users/${owner}`,{admin:true,method:'DELETE'});}catch{console.error('Disposable CAPTCHA-probe cleanup failed; no identity printed.');process.exitCode=1;}}}
