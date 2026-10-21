import assert from 'node:assert/strict';
import {checkArtifacts} from './secrets.mjs';
import {writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createG1Client} from '../g1/client.mjs';
import {qaCases} from '../m3/fixtures.mjs';
if(process.env.G1_ALLOW_TEST_WRITES!=='yes'){console.log('NOT RUN: G1_ALLOW_TEST_WRITES=yes required for disposable test accounts.');process.exit(2);}
const core=createG1Client(process.env),base='http://127.0.0.1:3000',owners=[],results=[];let lastStatus=0,lastCode='';const sensitive=[];
function jar(){return new Map();}
async function call(path,{cookies=jar(),method='GET',body,status=200,origin=base}={}){
 const response=await fetch(base+path,{method,headers:{Origin:origin,...(body!==undefined?{'Content-Type':'application/json'}:{}),Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join(';')},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 for(const value of response.headers.getSetCookie()){const [name,data]=value.split(';')[0].split('=');cookies.set(name,data);sensitive.push(data);assert.ok(value.includes('HttpOnly'));assert.ok(value.includes('SameSite=Lax'));}
 lastStatus=response.status;const text=await response.text();try{lastCode=JSON.parse(text).code??'';}catch{lastCode='HTML';}assert.equal(response.status,status,'HTTP status mismatch');
 for(const secret of [process.env.SUPABASE_SERVICE_ROLE_KEY,process.env.TMDB_READ_ACCESS_TOKEN,...[...cookies.values()]])if(secret)assert.ok(!text.includes(secret),'secret in body');
 let data;try{data=JSON.parse(text);}catch{data=text;}return {data,response,text};
}
function pass(name){results.push({name,result:'PASS'});console.log(`PASS: ${name}`);}
try{
 const a=jar(),b=jar();for(const cookies of [a,b]){await call('/api/session',{cookies,method:'POST',body:{}});owners.push(await core.user(cookies.get('banguseok-access')));}
 pass('Anonymous A/B sessions use HttpOnly cookies; no credentials in JSON');
 const qa=(await qaCases())[0];const input={draft_id:randomUUID(),id:null,expected_revision:null,nickname:'M4 검증',survey:qa.survey,selections:qa.selections.map(({category_id,tmdb_id})=>({category_id,tmdb_id})),survey_version:'survey-v1.1',catalog_version:'awards-v1.1',rules_version:'result-v1.1'};
 const created=(await call('/api/festivals',{cookies:a,method:'POST',body:input})).data.festival;assert.equal(created.revision,1);assert.equal(created.selections.length,3);assert.equal(created.result.variant_id,'C0');
 const retried=(await call('/api/festivals',{cookies:a,method:'POST',body:input})).data.festival;assert.equal(retried.id,created.id);pass('Actual 3-category save, server TMDB metadata/result and duplicate-create reconciliation');
 const id=created.id;await call(`/api/festivals/${id}`,{status:401});await call(`/api/festivals/${id}`,{cookies:b,status:404});
 await call('/api/festivals',{cookies:a,method:'POST',body:{...input,owner_id:owners[1]},status:400});await call('/api/festivals',{cookies:a,method:'POST',body:{...input,result:{special_award_title:'forged'}},status:400});pass('Unauthenticated access, B reads, forged owner and client result are rejected');
 await call(`/api/festivals/${id}/publish`,{cookies:a,method:'POST',body:{revision:1,consent:false},status:400});
 let share=(await call(`/api/festivals/${id}/publish`,{cookies:a,method:'POST',body:{revision:1,consent:true}})).data.share;
 const snapshot=await core.publicRead(share.token);assert.deepEqual(Object.keys(snapshot).sort(),['nickname','special_award_title','award_sentence','selection_sentence','volume_sentence','selections','awarded_count','brand_version','created_year'].sort());
 for(const m of snapshot.selections)assert.deepEqual(Object.keys(m).sort(),['category_id','tmdb_id','title','original_title','release_year','poster_path'].sort());
 const publicPage=await call(`/f/${share.token}`);assert.ok(publicPage.text.includes(snapshot.award_sentence));assert.match(publicPage.response.headers.get('cache-control'),/no-store/);assert.equal(publicPage.response.headers.get('set-cookie'),null);
 for(const privateValue of [owners[0],id,input.draft_id,'수상작 고치기','영화제 삭제'])assert.ok(!publicPage.text.includes(privateValue));pass('Explicit consent creates public URL; anonymous snapshot HTML is allowlisted, no-store and has no owner actions');
 for(const [path,method,body] of [[`/api/festivals/${id}`,'DELETE',{revision:1}],[`/api/festivals/${id}/publish`,'POST',{revision:1,consent:true}],[`/api/festivals/${id}/unpublish`,'POST',{revision:1}],['/api/festivals','POST',{...input,id,expected_revision:1}]])await call(path,{cookies:b,method,body,status:404});
 const onlyLink=new Map([['banguseok-access',share.token]]);await call(`/api/festivals/${id}`,{cookies:onlyLink,status:401});await call(`/api/festivals/${id}`,{cookies:onlyLink,method:'DELETE',body:{revision:1},status:401});pass('B cannot save/delete/publish/stop A; public token cannot read or mutate the original');
 const update={...input,id,expected_revision:1,survey:{q1:0,q2:4,q3:0,q4:0,q5:0,q6:'zero'}};let saved=(await call('/api/festivals',{cookies:a,method:'POST',body:update})).data.festival;assert.equal(saved.revision,2);assert.equal(saved.result.variant_id,'A1');
 saved=(await call('/api/festivals',{cookies:a,method:'POST',body:update})).data.festival;assert.equal(saved.revision,2);
 assert.deepEqual(await core.publicRead(share.token),snapshot);await call('/api/festivals',{cookies:a,method:'POST',body:{...update,survey:input.survey},status:409});
 await call(`/api/festivals/${id}/publish`,{cookies:a,method:'POST',body:{revision:1,consent:true},status:409});pass('Revision update, lost-response retry and stale-write conflict; old public snapshot stays unchanged');
 const changedShare=(await call(`/api/festivals/${id}/publish`,{cookies:a,method:'POST',body:{revision:2,consent:true}})).data.share;assert.equal(changedShare.token,share.token);assert.equal((await core.publicRead(share.token)).award_sentence,saved.result.award_sentence);pass('Explicit share refresh changes public snapshot and retains the current token');
 const refreshOnly=new Map([['banguseok-refresh',a.get('banguseok-refresh')]]);await call(`/api/festivals/${id}`,{cookies:refreshOnly});assert.ok(refreshOnly.get('banguseok-access'));pass('Server refresh restores owner session without exposing session JSON');
 await call(`/api/festivals/${id}/unpublish`,{cookies:a,method:'POST',body:{revision:2}});await call(`/f/${share.token}`,{status:404});pass('Stopping publication removes the old URL with no-store 404');
 const newShare=(await call(`/api/festivals/${id}/publish`,{cookies:a,method:'POST',body:{revision:2,consent:true}})).data.share;assert.notEqual(newShare.token,share.token);
 await call(`/api/festivals/${id}`,{cookies:a,method:'DELETE',body:{revision:1},status:409});await call(`/api/festivals/${id}`,{cookies:a,method:'DELETE',body:{revision:2}});
 await call(`/f/${newShare.token}`,{status:404});assert.equal((await core.request(`/rest/v1/festivals?id=eq.${id}&select=id`,{admin:true})).length,0);assert.equal((await core.request(`/rest/v1/festival_shares?festival_id=eq.${id}&select=festival_id`,{admin:true})).length,0);pass('Republish creates a new token; revision-safe deletion cascades original and public row');
 await call('/api/session',{method:'POST',body:{},origin:'https://foreign.example',status:403});pass('Foreign Origin cannot create a session or perform writes');
 const scanned=await checkArtifacts([...sensitive,process.env.SUPABASE_SERVICE_ROLE_KEY,process.env.TMDB_READ_ACCESS_TOKEN,share.token,newShare.token]);pass(`No service/TMDB/session/share secrets in ${scanned} browser artifacts or dev log files`);
 await writeFile('artifacts/m4/http-checks.json',JSON.stringify({results},null,2)+'\n');
}catch(error){const line=error.stack?.match(/verify\.mjs:(\d+):/)?.[1]??'?';console.error(`DIAGNOSTIC: HTTP ${lastStatus}, safe code ${/^[A-Z_]*$/.test(lastCode)?lastCode:'REDACTED'}, assertion line ${line}`);console.error(`FAIL: M4 actual HTTP group ${results.length+1}; tokens, sessions, assertions and raw errors are suppressed.`);process.exitCode=1;}
finally{for(const owner of owners){try{await core.request(`/rest/v1/festivals?owner_id=eq.${owner}`,{admin:true,method:'DELETE'});await core.request(`/auth/v1/admin/users/${owner}`,{admin:true,method:'DELETE'});}catch{console.error('CLEANUP FAILED: disposable M4 owner; no identifier printed.');process.exitCode=1;}}}
