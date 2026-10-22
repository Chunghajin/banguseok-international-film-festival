import assert from 'node:assert/strict';
import test from 'node:test';
import {CANDIDATE_MOVIES,candidateOrder,candidateWeight,validOrder} from '../src/lib/rolling-candidates.ts';
import {CATEGORIES} from '../src/lib/award-catalog.ts';
import {newSurveyDraft,restoreSurveyDraft} from '../src/lib/survey-draft.ts';
import {nominate,confirmSelection} from '../src/lib/award-state.ts';
import {savePayload} from '../src/lib/festival-browser.ts';
const rng=()=>{let n=1987;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/2**32);};
test('66 verified movies have distinct IDs and valid real poster paths, including every editorial seed',()=>{
 assert.equal(CANDIDATE_MOVIES.length,66);assert.equal(new Set(CANDIDATE_MOVIES.map(m=>m.tmdb_id)).size,66);
 for(const c of CATEGORIES)for(const m of c.groups.flat())assert.ok(CANDIDATE_MOVIES.some(v=>v.tmdb_id===m.id));
 for(const m of CANDIDATE_MOVIES){assert.ok(m.title);assert.ok(m.release_year>=1880);assert.ok(m.poster_path===null||/^\/[\w-]+\.(jpg|png|webp)$/.test(m.poster_path));assert.equal(m.poster_url,m.poster_path?'https://image.tmdb.org/t/p/w500'+m.poster_path:null);}
});
test('40 refreshes per category allow reappearance, widen exposure and preserve selected movies through restoration',()=>{
 const random=rng();let d=newSurveyDraft();const m=CANDIDATE_MOVIES[0];d=confirmSelection(nominate(d,'grand',{...m,category_id:'grand'}),'grand').state;
 const selected=structuredClone(d.selections),payload=savePayload(d);const stats=[];
 for(const c of CATEGORIES){let prev=d.candidate_order[c.id],repeat=false;const seen=new Set(prev);
  for(let i=0;i<40;i++){const next=candidateOrder(c.id,random,d.survey,prev);assert.ok(validOrder(c.id,next));assert.ok(next.some(id=>!prev.includes(id)));repeat ||= next.some(id=>seen.has(id));next.forEach(id=>seen.add(id));d={...d,candidate_order:{...d.candidate_order,[c.id]:next}};d=restoreSurveyDraft(JSON.stringify(d)).draft;assert.deepEqual(d.selections,selected);assert.deepEqual(savePayload(d),payload);prev=next;}
  assert.ok(seen.size>30);assert.equal(repeat,true);stats.push(seen.size);
 }
 assert.ok(stats.every(n=>n>30));
});
test('category and survey hints are weak, finite and positive for the entire pool',()=>{
 const low={q1:0,q2:0,q3:0,q4:0,q5:0,q6:'zero'},high={...low,q1:4,q4:4,q6:'hundredone_plus'};
 const id=CATEGORIES[0].groups[0][0].id;
 assert.ok(candidateWeight('grand',id,high)>candidateWeight('grand',id,{...high,q1:0}));
 assert.ok(candidateWeight('grand',id,low)>candidateWeight('rescue',id,low));
 for(const c of CATEGORIES)for(const m of CANDIDATE_MOVIES)for(const survey of [undefined,low,high]){const w=candidateWeight(c.id,m.tmdb_id,survey);assert.ok(w>=1&&w<=1.81);}
 assert.notDeepEqual(candidateOrder('grand',rng(),low),candidateOrder('grand',rng(),high));
});

test('a search winner outside the recommendation pool survives rerolls and draft restoration',()=>{
 const movie={category_id:'rescue',tmdb_id:2000000001,title:'검색 결과 테스트',original_title:null,release_year:2026,poster_path:null};
 assert.ok(!CANDIDATE_MOVIES.some(m=>m.tmdb_id===movie.tmdb_id));
 let d=confirmSelection(nominate(newSurveyDraft(),'rescue',movie),'rescue').state;
 for(let i=0;i<25;i++){d={...d,candidate_order:{...d.candidate_order,rescue:candidateOrder('rescue',Math.random,d.survey,d.candidate_order.rescue)}};d=restoreSurveyDraft(JSON.stringify(d)).draft;assert.deepEqual(d.selections.rescue,movie);}
});
