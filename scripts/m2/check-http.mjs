import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:3000',token=process.env.TMDB_READ_ACCESS_TOKEN,results=[];
async function call(body,status=200,origin=base){
 const r=await fetch(`${base}/api/catalog/movies`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 assert.equal(r.status,status);const text=await r.text();if(token)assert.ok(!text.includes(token));return JSON.parse(text);
}
function pass(name){results.push({name,result:'PASS'});console.log(`PASS: ${name}`);}
try{
 for(const query of ['기생충','Inception']){
  const data=await call({action:'search',query});const expected=query==='기생충'?496243:27205;
  assert.ok(data.items.some(m=>m.tmdb_id===expected));pass(`actual search ${query}`);
 }
 const detail=await call({action:'detail',id:496243});assert.equal(detail.title,'기생충');assert.ok(detail.poster_path);pass('actual selected detail with safe poster path');
 const missing=await call({action:'detail',id:1647338});assert.equal(missing.poster_path,null);pass('actual missing-poster detail remains selectable');
 await call({action:'detail',id:-1},400);await call({action:'detail',id:2147483647},404);pass('invalid and nonexistent IDs rejected');
 const empty=await call({action:'search',query:'방국제존재하지않는영화제목무작위882641'});assert.equal(empty.items.length,0);await call({action:'search',query:''},400);pass('zero results and empty input');
 await call({action:'detail',id:496243},403,'https://foreign.example');pass('foreign Origin rejected');
 pass('actual M2 API responses contain no TMDB token');
 await writeFile('artifacts/m2/http-checks.json',JSON.stringify({results},null,2)+'\n');
}catch{console.error(`FAIL: M2 HTTP group ${results.length+1}; raw responses and secrets are not printed.`);process.exitCode=1;}
