import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {CATEGORIES} from '../src/lib/award-catalog.ts';
import {candidateOrder,validOrder,newAwardState,nominate,confirmSelection,skipCategory,countSelected} from '../src/lib/award-state.ts';
import {newSurveyDraft,restoreSurveyDraft} from '../src/lib/survey-draft.ts';
import {createProductMovies} from '../src/lib/product-movies.ts';
import {mergeResults,readySearch} from '../src/lib/movie-search.ts';
const movie=(category_id='grand',tmdb_id=496243)=>({category_id,tmdb_id,title:'기생충',original_title:'기생충',release_year:2019,poster_path:null});
test('all six names/descriptions/order and 72 candidate slots exactly match SCREEN_CONTENT',async()=>{
 const spec=await readFile('docs/SCREEN_CONTENT.md','utf8');
 assert.deepEqual(CATEGORIES.map(c=>c.id),['grand','lifetime','sorry','once','dissent','rescue']);
 for(const c of CATEGORIES){
  assert.ok(spec.includes(`|${c.id}|${c.name}|${c.description} |`));
  const line=spec.split('\n').find(s=>s.startsWith(`|${c.id}|`)&&s.includes('(20'));
  assert.ok(line);const groups=line.split('|').slice(2,5).map(g=>[...g.matchAll(/([^,]+)\((\d{4})\)/g)].map(m=>({label:m[1].trim(),year:Number(m[2])})));
  assert.deepEqual(c.groups.map(g=>g.map(({label,year})=>({label,year}))),groups);
  assert.ok(c.groups.every(g=>g.length===4));assert.equal(new Set(c.groups.flat().map(m=>m.id)).size,12);
 }
 assert.equal(CATEGORIES.find(c=>c.id==='once').groups[1][2].id,12477,'1988 animation, not the 2005 live-action namesake');
});
test('stratified Fisher-Yates pages are 2:2:2, disjoint and a valid permutation',()=>{
 for(const c of CATEGORIES)for(const random of [()=>0,()=>.99999,Math.random]){
  const order=candidateOrder(c.id,random);assert.ok(validOrder(c.id,order));
  assert.equal(order.length,12);assert.equal(new Set(order).size,12);
  assert.ok(order.slice(0,6).every(id=>!order.slice(6).includes(id)));
 }
 assert.notDeepEqual(candidateOrder('grand',()=>0),candidateOrder('grand',()=>.99999));
});
test('reload restores candidate order/page, pending, confirmed and skipped without reshuffling',()=>{
 let d={...newSurveyDraft(),current_screen:'category',current_question:5,current_category:'grand'};
 d=nominate(d,'grand',movie());d.candidate_page.grand=1;d=skipCategory(d,'lifetime');
 const restored=restoreSurveyDraft(JSON.stringify(d));assert.deepEqual(restored.draft,d);
 const done=confirmSelection(restored.draft,'grand').state;
 assert.equal(done.selections.grand.tmdb_id,496243);assert.equal(done.pending_selection.grand,null);
 assert.equal(done.candidate_page.grand,1);assert.deepEqual(done.candidate_order,d.candidate_order);
});
test('corrupt candidate arrays alone recover; valid category orders, answers and selections survive',()=>{
 const d={...newSurveyDraft(),survey:{q1:0,q2:null,q3:4,q4:2,q5:1,q6:'zero'}};
 d.selections.grand=movie();const original=[...d.candidate_order.lifetime];d.candidate_order.grand=Array(12).fill(496243);
 const restored=restoreSurveyDraft(JSON.stringify(d));assert.match(restored.notice,/후보 목록을 복구/);
 assert.ok(validOrder('grand',restored.draft.candidate_order.grand));assert.deepEqual(restored.draft.survey,d.survey);
 assert.deepEqual(restored.draft.selections.grand,d.selections.grand);assert.deepEqual(restored.draft.candidate_order.lifetime,original);
 assert.equal(restoreSurveyDraft(JSON.stringify(restored.draft)).notice,'');
});
test('M1 upgrade preserves draft UUID, answers and last edit; generated arrays persist on roundtrip',()=>{
 const d=newSurveyDraft();const legacy=Object.fromEntries(Object.entries(d).filter(([key])=>['draft_version','survey_version','catalog_version','rules_version','draft_id','survey','current_question','current_screen','updated_at'].includes(key)));
 const upgraded=restoreSurveyDraft(JSON.stringify(legacy)).draft;assert.equal(upgraded.draft_id,d.draft_id);assert.equal(upgraded.updated_at,d.updated_at);assert.deepEqual(upgraded.survey,d.survey);
 assert.deepEqual(restoreSurveyDraft(JSON.stringify(upgraded)).draft,upgraded);
});
test('pending is not an award; confirm moves past selected/skipped; editing returns to list',()=>{
 let d=newAwardState();d=skipCategory(d,'lifetime');d=nominate(d,'grand',movie());assert.equal(countSelected(d),0);
 let result=confirmSelection(d,'grand');assert.equal(result.next,'sorry');assert.equal(countSelected(result.state),1);
 d=nominate(result.state,'grand',movie('grand',278));result=confirmSelection(d,'grand');assert.equal(result.next,null);assert.equal(result.state.selections.grand.tmdb_id,278);
 const skipped=skipCategory(result.state,'grand');assert.equal(skipped.selections.grand,null);assert.equal(skipped.pending_selection.grand,null);assert.ok(skipped.skipped_categories.includes('grand'));assert.equal(countSelected(skipped),0);
});
test('three distinct categories may award the same film; grand is optional and valid snapshots are strict',()=>{
 let d=newAwardState();for(const id of ['lifetime','sorry','once'])d=confirmSelection(nominate(d,id,movie(id)),id).state;
 assert.equal(countSelected(d),3);assert.equal(d.selections.grand,null);
 assert.throws(()=>nominate(d,'grand',movie('grand',-1)),/INVALID_SELECTION/);
 assert.throws(()=>nominate(d,'grand',{...movie(),poster_path:'https://bad.example/key'}),/INVALID_SELECTION/);
 assert.throws(()=>confirmSelection(d,'rescue'),/SELECTION_REQUIRED/);
});
test('same movie keeps its existing title snapshot when reconfirmed',()=>{
 let d=confirmSelection(nominate(newAwardState(),'grand',movie()),'grand').state;
 d=confirmSelection(nominate(d,'grand',{...movie(),title:'changed upstream'}),'grand').state;
 assert.equal(d.selections.grand.title,'기생충');
});
test('search waits for IME completion, permits one character, bounds input; pagination dedupes IDs',()=>{
 assert.equal(readySearch({query:'괴',page:1,composing:true}),false);assert.equal(readySearch({query:'괴',page:1,composing:false}),true);
 assert.equal(readySearch({query:' '.repeat(10),page:1,composing:false}),false);assert.equal(readySearch({query:'가'.repeat(101),page:1,composing:false}),false);
 assert.deepEqual(mergeResults([{tmdb_id:1},{tmdb_id:2}],[{tmdb_id:2},{tmdb_id:3}]).map(m=>m.tmdb_id),[1,2,3]);
});
function request(body,origin='http://localhost:3000',url='http://localhost:3000/api/catalog/movies'){
 return new Request(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
}
test('product proxy fails closed in production and rejects foreign origin/host before TMDB',async()=>{
 let calls=0;const client={search:async()=>{calls++;return {};},detail:async()=>{calls++;return movie();}};
 assert.equal((await createProductMovies({environment:'production',client})(request({action:'detail',id:1}))).status,503);
 const handle=createProductMovies({environment:'development',client});
 assert.equal((await handle(request({action:'detail',id:1},'https://evil.example'))).status,403);
 assert.equal((await handle(request({action:'detail',id:1},'https://evil.example','https://evil.example/api/catalog/movies'))).status,403);assert.equal(calls,0);
});
test('product proxy validates ID/query/page/batch, bounds payload and counts local request limit',async()=>{
 let calls=0;const client={search:async()=>{calls++;return {items:[]};},detail:async()=>{calls++;return movie();}};
 const handle=createProductMovies({environment:'development',client});
 for(const body of [{action:'detail',id:-1},{action:'search',query:''},{action:'search',query:'hi',page:6},{action:'candidates',ids:Array(6).fill(1)},{action:'search',query:'x'.repeat(2000)}])assert.equal((await handle(request(body))).status,400);
 assert.equal(calls,0);
 for(let i=0;i<55;i++)await handle(request({action:'search',query:'unit-rate-test'}));
 const limited=await handle(request({action:'search',query:'unit-rate-test'}));assert.equal(limited.status,429);assert.equal(calls,1,'public movie cache avoids repeated upstream searches');
 assert.ok(!(await limited.text()).includes('Bearer'));
});
test('failed candidate detail stays an unavailable slot, without borrowing from another page',async()=>{
 const ids=candidateOrder('grand',()=>0).slice(0,6);
 const handle=createProductMovies({environment:'development',client:{search:async()=>({}),detail:async()=>{throw Error('secret-upstream');}}});
 const r=await handle(request({action:'candidates',ids}));assert.equal(r.status,200);const body=await r.json();assert.deepEqual(body.items,ids.map(tmdb_id=>({tmdb_id,unavailable:true})));assert.ok(!JSON.stringify(body).includes('secret-upstream'));
});

test('Next internal URL normalization accepts only a matching loopback Host and Origin',async()=>{
 let calls=0;const handle=createProductMovies({environment:'development',client:{search:async()=>{calls++;return {items:[]};},detail:async()=>movie()}});
 const local=new Request('http://0.0.0.0:3000/api/catalog/movies',{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'application/json'},body:JSON.stringify({action:'search',query:'host-regression'})});
 assert.equal((await handle(local)).status,200);assert.equal(calls,1);
 const foreign=new Request('http://0.0.0.0:3000/api/catalog/movies',{method:'POST',headers:{host:'evil.example',origin:'http://evil.example','content-type':'application/json'},body:'{}'});assert.equal((await handle(foreign)).status,403);
});

test('cached candidate revisits count once per batch, while uncached details consume their actual cost',async()=>{
 const ids=CATEGORIES.find(c=>c.id==='rescue').groups.flat().slice(0,6).map(m=>m.id);let calls=0;
 const handle=createProductMovies({environment:'development',client:{search:async()=>({}),detail:async id=>{calls++;return {...movie('rescue',Number(id)),title:'cached-budget-fixture'};}}});
 for(let i=0;i<12;i++)assert.equal((await handle(request({action:'candidates',ids}))).status,200);
 assert.equal(calls,6);
});
