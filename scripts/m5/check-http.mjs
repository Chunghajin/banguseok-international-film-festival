import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {checkArtifacts} from '../m4/secrets.mjs';
const results=[],base='http://127.0.0.1:3100',id='11111111-1111-4111-8111-111111111111';
try{
 for(const [path,method,status]of [['/api/catalog/movies','POST',503],['/api/session','POST',503],['/api/festivals','POST',503],['/api/festivals','GET',503],[`/api/festivals/${id}`,'DELETE',503],[`/api/festivals/${id}/publish`,'POST',503],[`/api/festivals/${id}/unpublish`,'POST',503],['/f/'+'a'.repeat(43),'GET',503],['/f/invalid','GET',404],['/api/movies/search','GET',404]]){
  const r=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json'},...(method==='GET'?{}:{body:'{}'}),signal:AbortSignal.timeout(10000)});const text=await r.text();assert.equal(r.status,status);assert.equal(r.headers.get('set-cookie'),null);
  for(const secret of [process.env.TMDB_READ_ACCESS_TOKEN,process.env.SUPABASE_SERVICE_ROLE_KEY,process.env.PROTECTION_HMAC_KEY].filter(Boolean))assert.ok(!text.includes(secret));assert.ok(!text.includes('CONFIG_MISSING_OR_INVALID'));results.push({route:path.startsWith('/f/')?'/f/[redacted]':path,status});
 }
 const scanned=await checkArtifacts([process.env.TMDB_READ_ACCESS_TOKEN,process.env.SUPABASE_SERVICE_ROLE_KEY,process.env.PROTECTION_HMAC_KEY]);await writeFile('artifacts/m5/production-checks.json',JSON.stringify({results,scanned},null,2)+'\n');console.log(`PASS: 10 local production checks; safe failures; ${scanned} artifacts/logs scanned.`);
}catch{console.error('FAIL: local production protection/secret checks; no raw data printed.');process.exitCode=1;}
