import assert from 'node:assert/strict';
import test from 'node:test';
import {createFestivalService,publicSnapshot} from '../src/lib/festivals-server.ts';
import {createFestivalHttp,ACCESS_COOKIE,REFRESH_COOKIE} from '../src/lib/festival-http.ts';
import {G1Error} from '../scripts/g1/client.mjs';
import {newSurveyDraft,restoreSurveyDraft} from '../src/lib/survey-draft.ts';
import {attachSaved,deleteFestival,editingDraft,FestivalRequestError,savePayload} from '../src/lib/festival-browser.ts';
import {generateFestivalResult} from '../src/lib/festival-result.ts';
const id='11111111-1111-4111-8111-111111111111',draftId='22222222-2222-4222-8222-222222222222';
const survey={q1:0,q2:0,q3:0,q4:0,q5:0,q6:'zero'};
const selections=['grand','lifetime','once'].map((category_id,i)=>({category_id,tmdb_id:i+1,title:`saved-${i+1}`,original_title:null,release_year:2001,poster_path:null}));
const base={draft_id:draftId,id:null,expected_revision:null,nickname:'검증',survey,selections:selections.map(({category_id,tmdb_id})=>({category_id,tmdb_id})),survey_version:'survey-v1.1',catalog_version:'awards-v1.1',rules_version:'result-v1.1'};
const row={id,client_draft_id:draftId,nickname:'검증',survey,selections,result:generateFestivalResult({rules_version:'result-v1.1',survey,selections}).result,survey_version:'survey-v1.1',catalog_version:'awards-v1.1',rules_version:'result-v1.1',revision:1,created_at:'2026-10-21T00:00:00Z',updated_at:'2026-10-21T00:00:00Z'};
function fixture(existing=null){const calls={movies:0,saves:[],requests:[]};const core={user:async token=>{if(token!=='A')throw new G1Error(401,'UNAUTHENTICATED');return 'owner-A';},read:async(token)=>{if(token!=='A'||!existing)throw new G1Error(404,'NOT_FOUND');return existing;},request:async(path,options)=>{calls.requests.push({path,options});return existing?[existing]:[];},save:async(token,p)=>{calls.saves.push(p);return {...row,selections:p.p_selections,result:p.p_result,revision:existing?2:1,owner_id:'not-for-client'};}};
 const tmdb={detail:async value=>{calls.movies++;return {tmdb_id:Number(value),title:`canonical-${value}`,original_title:'original',release_year:2001,poster_path:null};}};return {calls,core,service:createFestivalService({core,tmdb})};}
test('forged owner/result and invalid version are rejected before metadata or RPC write',async()=>{
 for(const extra of [{owner_id:'attacker'},{result:{special_award_title:'forged'}},{rules_version:'old'}]){const f=fixture();await assert.rejects(()=>f.service.save('A',{...base,...extra}),e=>e.status===400);assert.equal(f.calls.movies,0);assert.equal(f.calls.saves.length,0);}
});
test('minimum three, strict survey, duplicate categories and invalid IDs block product writes',async()=>{
 for(const body of [{...base,selections:base.selections.slice(0,2)},{...base,survey:{...survey,q1:'4'}},{...base,selections:Array(3).fill(base.selections[0])},{...base,selections:base.selections.map(s=>({...s,tmdb_id:-1}))}]){const f=fixture();await assert.rejects(()=>f.service.save('A',body));assert.equal(f.calls.movies,0);assert.equal(f.calls.saves.length,0);}
});
test('new movies use verified server metadata, generated result and exact six-field selections',async()=>{
 const f=fixture(),saved=await f.service.save('A',base);assert.equal(f.calls.movies,3);assert.equal(saved.selections[0].title,'canonical-1');assert.equal(saved.owner_id,undefined);assert.deepEqual(f.calls.saves[0].p_result,generateFestivalResult({rules_version:'result-v1.1',survey,selections:saved.selections}).result);assert.equal(Object.keys(saved.selections[0]).length,6);
});
test('unchanged movie snapshots survive edits; authenticated owner and expected revision remain in G1 boundary',async()=>{
 const f=fixture(row);await f.service.save('A',{...base,id,expected_revision:1,survey:{...survey,q1:4}});assert.equal(f.calls.movies,0);assert.deepEqual(f.calls.saves[0].p_selections,selections);assert.equal(f.calls.saves[0].p_expected_revision,1);assert.equal(f.calls.saves[0].p_owner,undefined);
});
test('lost-response retry reconciles exactly one identical revision; different stale edits conflict',async()=>{
 const f=fixture({...row,revision:2});assert.equal((await f.service.save('A',{...base,id,expected_revision:1,survey:Object.fromEntries(Object.entries(survey).reverse())})).revision,2);assert.equal(f.calls.saves.length,0);
 await assert.rejects(()=>f.service.save('A',{...base,id,expected_revision:1,survey:{...survey,q1:4}}),e=>e.status===409);assert.equal(f.calls.movies,0);
});
test('B cannot update a known ID and failure never reaches movie lookup or service RPC',async()=>{
 const f=fixture(row);await assert.rejects(()=>f.service.save('B',{...base,id,expected_revision:1}));assert.equal(f.calls.movies,0);assert.equal(f.calls.saves.length,0);
});
test('public snapshot reconstructs nine fields and strips nested private data',()=>{
 const value={nickname:'검증',special_award_title:'상',award_sentence:'심사평',selection_sentence:'선정문',volume_sentence:null,selections:selections.map(m=>({...m,owner_id:'private',survey})),awarded_count:3,brand_version:'1.1',created_year:2026,owner_id:'private',survey,evidence_ids:['private']};
 const snapshot=publicSnapshot(value);assert.equal(Object.keys(snapshot).length,9);assert.equal(snapshot.owner_id,undefined);assert.equal(snapshot.selections[0].owner_id,undefined);assert.equal(snapshot.selections[0].survey,undefined);assert.throws(()=>publicSnapshot({...value,selections:[{...selections[0],category_id:'bogus'},...selections.slice(1)]}));
});
function request(path='/api/session',body={},cookies='',origin='http://localhost:3000'){return new Request(`http://localhost:3000${path}`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookies},body:JSON.stringify(body)});}
const session={access_token:'private-access',refresh_token:'private-refresh',expires_in:3600};
function httpFixture(){let signups=0,refresh=0;const core={user:async token=>{if(token!==session.access_token)throw new G1Error(401,'UNAUTHENTICATED');return 'owner';},signIn:async()=>{signups++;return session;},request:async()=>{refresh++;return session;}};return {core,counts:()=>({signups,refresh})};}
test('production and cross-Origin mutation gates run before authentication',async()=>{
 const f=httpFixture();const prod=createFestivalHttp({core:f.core,service:{},environment:'production'});assert.equal((await prod(request(),['session'])).status,503);
 const dev=createFestivalHttp({core:f.core,service:{},environment:'development'});assert.equal((await dev(request('/api/session',{},'','https://evil.example'),['session'])).status,403);assert.equal(f.counts().signups,0);
});
test('anonymous signup returns no token JSON and only HttpOnly SameSite cookies',async()=>{
 const f=httpFixture(),handle=createFestivalHttp({core:f.core,service:{},environment:'development'});const r=await handle(request(),['session']);assert.equal(r.status,200);assert.deepEqual(await r.json(),{authenticated:true});assert.equal(r.headers.getSetCookie().length,2);for(const c of r.headers.getSetCookie()){assert.match(c,/HttpOnly/);assert.match(c,/SameSite=Lax/);}assert.match(r.headers.get('cache-control'),/no-store/);
});
test('refresh is server-side and no read can silently create a new owner',async()=>{
 const f=httpFixture(),handle=createFestivalHttp({core:f.core,service:{list:async()=>({items:[]})},environment:'development'});
 const r=await handle(new Request('http://localhost:3000/api/festivals',{headers:{Cookie:`${REFRESH_COOKIE}=${session.refresh_token}`}}));assert.equal(r.status,200);assert.equal(f.counts().refresh,1);assert.equal(f.counts().signups,0);assert.ok(!(await r.text()).includes(session.refresh_token));
 assert.equal((await handle(new Request('http://localhost:3000/api/festivals'))).status,401);assert.equal(f.counts().signups,0);
});
test('a public token in the auth-cookie slot grants no identity; oversized JSON is rejected',async()=>{
 const f=httpFixture(),handle=createFestivalHttp({core:f.core,service:{},environment:'development'});assert.equal((await handle(request('/api/session',{},`${ACCESS_COOKIE}=${'a'.repeat(43)}`),['session'])).status,401);assert.equal(f.counts().signups,0);assert.equal((await handle(request('/api/session',{captcha_token:'x'.repeat(17000)}),['session'])).status,400);
});
test('saved draft relation restores UUID/revision while pending and candidate order remain local',()=>{
 const draft={...newSurveyDraft(),draft_id:draftId,current_question:5};for(const m of selections)draft.selections[m.category_id]=m;
 const attached=attachSaved(draft,draft,row);assert.equal(attached.editing_festival_id,id);assert.equal(attached.expected_revision,1);assert.deepEqual(restoreSurveyDraft(JSON.stringify(attached)).draft,attached);
 const changed={...draft,survey:{...survey,q2:4}};assert.equal(attachSaved(changed,draft,row).survey.q2,4);assert.deepEqual(savePayload(draft).selections,selections.map(({category_id,tmdb_id})=>({category_id,tmdb_id})));
 const local={...attached,expected_revision:1};assert.equal(editingDraft({...row,revision:2},local).expected_revision,1);assert.deepEqual(editingDraft(row,null).selections,attached.selections);
});

test('lost delete response reconciles only a subsequent authenticated 404',async()=>{
 const calls=[];await deleteFestival(id,1,async(path,method)=>{calls.push(method??'GET');throw new FestivalRequestError(method==='DELETE'?503:404,'safe');});assert.deepEqual(calls,['DELETE','GET']);
});
test('delete reconciliation never hides revision conflict, missing session or an existing original',async()=>{
 for(const status of [401,409]){let calls=0;await assert.rejects(()=>deleteFestival(id,1,async()=>{calls++;throw new FestivalRequestError(status,'safe');}));assert.equal(calls,1);}
 for(const getStatus of [200,401,503])await assert.rejects(()=>deleteFestival(id,1,async(path,method)=>{if(method==='DELETE')throw new FestivalRequestError(503,'safe');if(getStatus!==200)throw new FestivalRequestError(getStatus,'safe');return {}; }));
});
