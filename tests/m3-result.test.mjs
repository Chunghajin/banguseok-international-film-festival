import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {generateFestivalResult,previewFromDraft,AWARD_TITLES} from '../src/lib/festival-result.ts';
import {COMMENT_TEMPLATES,SELECTION_TEMPLATES,VOLUME_TEXT} from '../src/lib/result-content.ts';
import {newSurveyDraft,restoreSurveyDraft} from '../src/lib/survey-draft.ts';
import {qaCases} from '../scripts/m3/fixtures.mjs';
const film=(category_id,tmdb_id,title=String(tmdb_id))=>({category_id,tmdb_id,title,original_title:null,release_year:2001,poster_path:null});
const base=[film('grand',496243,'A'),film('lifetime',862,'B'),film('once',597,'C')];
const run=(q=[0,0,0,0,0],selections=base,q6='unknown',extra={})=>generateFestivalResult({rules_version:'result-v1.1',survey:{...Object.fromEntries(q.map((v,i)=>[`q${i+1}`,v])),q6},selections,...extra});
test('all 21 comments, six selection sentences and volume messages are exact v1.1 text',async()=>{
 const spec=await readFile('docs/SCREEN_CONTENT.md','utf8');assert.equal(Object.keys(COMMENT_TEMPLATES).length,21);assert.equal(Object.keys(AWARD_TITLES).length,7);
 for(const text of [...Object.values(COMMENT_TEMPLATES),...Object.values(SELECTION_TEMPLATES),...Object.values(VOLUME_TEXT),...Object.values(AWARD_TITLES)])assert.ok(spec.includes(text));
});
test('Q01–Q12 match independently parsed expected titles, variants, scores and complete Korean sentences',async()=>{
 const cases=await qaCases(),evidence=[];assert.equal(cases.length,12);
 for(const c of cases){const out=run(Object.values(c.survey).slice(0,5),c.selections,c.survey.q6);const r=out.result;
  assert.equal(r.special_award_title,c.expected.title,c.id);assert.equal(r.variant_id,c.expected.variant,c.id);assert.equal(out.score,c.expected.score,c.id);
  assert.equal(r.award_sentence,c.expected.award_sentence,c.id);assert.equal(r.selection_sentence,c.expected.selection_sentence,c.id);assert.equal(r.volume_sentence,c.expected.volume_sentence,c.id);
  assert.ok(!/\{[a-z_]+\}/.test(r.award_sentence+r.selection_sentence));
  evidence.push({id:c.id,result:'PASS',special_award_title:r.special_award_title,variant_id:r.variant_id,score:out.score,award_sentence:r.award_sentence,selection_sentence:r.selection_sentence,volume_sentence:r.volume_sentence});
 }
 await mkdir('artifacts/m3',{recursive:true});await writeFile('artifacts/m3/qa-results.json',JSON.stringify(evidence,null,2)+'\n');
});
test('T01–T10: null/zero, bonus threshold, fixed priority and score precedence',()=>{
 const sorry=[base[0],film('sorry',862,'B'),base[2]];
 const cases=[[[null,null,null,null,null],base,'Z1',null],[[0,0,0,0,0],base,'H2',null],[[0,4,0,0,0],sorry,'A0',9],[[0,4,0,0,0],base,'A1',8],[[0,3,0,0,0],sorry,'A0',7],[[0,2,0,0,0],sorry,'H2',null],[[0,null,0,0,0],sorry,'H2',null],[[4,4,0,0,0],[base[0],sorry[1],film('dissent',597,'C')],'A0',9],[[0,0,4,0,0],base,'I0',8],[[4,3,0,0,0],sorry,'C1',8]];
 for(const [q,s,id,score] of cases){const r=run(q,s);assert.equal(r.result.variant_id,id);assert.equal(r.score,score);}
});
test('T11–T14: duplicate awards and P1/P2 precedence, zero/year-volume bins',()=>{
 const one=run(undefined,base.map(m=>({...m,tmdb_id:496243,title:'A'})));assert.equal(one.result.variant_id,'H0');assert.equal(one.selection_variant,'P1');assert.equal(one.unique_movie_count,1);assert.equal(one.awarded_count,3);
 const two=run(undefined,[film('grand',862,'A'),film('sorry',862,'A'),film('lifetime',496243,'B'),film('once',496243,'B')]);assert.equal(two.result.variant_id,'H2');assert.equal(two.selection_variant,'P2');assert.ok(two.result.selection_sentence.includes('〈A〉'));
 for(const volume of ['zero','unknown','fiftyone_to_hundred','hundredone_plus']){const out=run(undefined,base,volume);assert.equal(out.result.variant_id,'H2');assert.equal(out.result.volume_sentence,volume==='unknown'?null:VOLUME_TEXT[volume]);}
});
test('T15/T18: metadata, nickname, ordering, shuffle, time and CSV cannot change any result',()=>{
 const q=[0,4,0,0,0],s=[base[0],film('sorry',862,'B'),base[2]],original=run(q,s);
 const shuffled=run(q,[...s].reverse(),'unknown',{draft_id:'different',nickname:'다른 이름',updated_at:'later',owner_id:'other',candidate_order:[3,2,1],csv:[1,5]});
 assert.deepEqual(shuffled,original);
 const survey={q6:'unknown',q5:0,q4:0,q3:0,q2:4,q1:0};assert.deepEqual(generateFestivalResult({rules_version:'result-v1.1',survey,selections:s}),original);
});
test('T16: insufficient/duplicate/invalid selections, invalid survey values and rules reject without mutation',()=>{
 for(const value of [5,-1,2.5,'3',undefined])assert.throws(()=>run([value,0,0,0,0]),/INVALID_SURVEY/);
 assert.throws(()=>run(undefined,base.slice(0,2)),/NOT_ENOUGH_SELECTIONS/);assert.throws(()=>run(undefined,[base[0],base[0],base[2]]),/INVALID_SELECTION/);
 assert.throws(()=>run(undefined,[...base.slice(0,2),film('once',-1)]),/INVALID_SELECTION/);
 assert.throws(()=>run(undefined,[...base.slice(0,2),{...base[2],poster_path:'https://unsafe.example/x.jpg'}]),/INVALID_SELECTION/);
 assert.throws(()=>run(undefined,base,'unknown',{rules_version:'result-v1.0'}),/UNSUPPORTED_RULES/);
});
test('T17: actual re-edits update A0→A1→A2 and recompute linked selection text',()=>{
 assert.equal(run([0,4,0,0,0],[base[0],film('sorry',862,'B'),base[2]]).result.variant_id,'A0');
 const edit=run([0,4,0,0,0]);assert.equal(edit.result.variant_id,'A1');assert.equal(edit.score,8);assert.equal(edit.selection_variant,'P5');
 const weaker=run([0,3,0,0,0]);assert.equal(weaker.result.variant_id,'A2');assert.equal(weaker.score,6);
});
test('every award reaches each of its three variants; all seven and all 21 branches are exercised',()=>{
 const noLinks=[film('grand',496243),film('dissent',862),film('rescue',597)];
 const without=(id)=>{const categories=['grand','lifetime','sorry','once','dissent','rescue'].filter(c=>c!==id);return categories.slice(0,3).map((c,i)=>film(c,[496243,862,597][i]));};
 const examples=[
 [[4,0,0,0,0],noLinks,'C0'],[[4,0,0,0,0],base,'C1'],[[3,0,0,0,0],base,'C2'],
 [[0,4,0,0,0],without('lifetime'),'A0'],[[0,4,0,0,0],base,'A1'],[[0,3,0,0,0],base,'A2'],
 [[0,0,3,0,0],base,'I0'],[[0,0,4,0,0],without('once'),'I1'],[[0,0,3,0,0],without('once'),'I2'],
 [[0,0,0,3,0],base,'K0'],[[0,0,0,4,0],without('lifetime'),'K1'],[[0,0,0,3,0],without('lifetime'),'K2'],
 [[0,0,0,0,4],noLinks,'S0'],[[0,0,0,0,4],base,'S1'],[[0,0,0,0,3],base,'S2'],
 [[null,null,null,null,null],base.map(m=>({...m,tmdb_id:862})),'Z0'],[[null,null,null,null,null],base,'Z1'],[[null,null,null,null,null],without('grand'),'Z2'],
 [[0,0,0,0,0],base.map(m=>({...m,tmdb_id:862})),'H0'],[[0,0,0,0,0],noLinks,'H1'],[[0,0,0,0,0],base,'H2']];
 const variants=new Set();for(const [q,s,v] of examples){assert.equal(run(q,s).result.variant_id,v);variants.add(v);}assert.equal(variants.size,21);
});
test('priority interpretation→audience→consensus→secret→credits and q4 neutral stay exact',()=>{
 assert.equal(run([3,0,3,0,0]).result.special_award_id,'interpretation');
 assert.equal(run([4,4,0,4,4],[film('grand',1),film('dissent',2),film('sorry',3),film('rescue',4),film('lifetime',5)]).result.special_award_id,'audience');
 assert.equal(run([4,0,0,4,4],[film('grand',1),film('dissent',2),film('rescue',4),film('lifetime',5)]).result.special_award_id,'consensus');
 assert.equal(run([0,0,0,4,4],[film('grand',1),film('rescue',4),film('lifetime',5)]).result.special_award_id,'secret');
 assert.equal(run([0,0,0,2,0]).result.special_award_id,'chair');
});
test('P1–P6 selection precedence and duplicate count/first-category tie are deterministic',()=>{
 assert.equal(run(undefined,base.map(m=>({...m,tmdb_id:1}))).selection_variant,'P1');
 const s=[film('grand',10,'early'),film('sorry',10,'early'),film('once',1,'late'),film('rescue',1,'late')];assert.ok(run(undefined,s).result.selection_sentence.includes('〈early〉'));
 assert.equal(run(undefined,[film('grand',1),film('dissent',2),film('rescue',3)]).selection_variant,'P3');
 assert.equal(run([0,4,0,0,0],[base[0],film('sorry',2),base[2]]).selection_variant,'P4');assert.equal(run().selection_variant,'P5');
 assert.equal(run(undefined,[film('lifetime',1),film('sorry',2),film('once',3)]).selection_variant,'P6');
});
test('null never gains an inferred action and q6 cannot change award, score or variant',()=>{
 for(const q of [[null,null,null,null,null],[null,0,null,2,null]])for(const volume of [null,'zero','hundredone_plus']){
  const out=run(q,base,volume);assert.ok(['sealed','chair'].includes(out.result.special_award_id));assert.equal(out.score,null);assert.ok(!/외부 자문|옆자리 표정|고개를 끄덕|관람 원칙|취향 공개/.test(out.result.award_sentence));
 }
 const a=run([0,0,4,0,0],base,'zero'),b=run([0,0,4,0,0],base,'hundredone_plus');assert.equal(a.result.variant_id,b.result.variant_id);assert.equal(a.score,b.score);
});
test('draft roundtrip, pending/skipped exclusion, saved titles and literal unsafe-looking titles stay stable',()=>{
 const d={...newSurveyDraft(),current_question:5,current_screen:'result'};for(const m of base)d.selections[m.category_id]=m;
 const before=previewFromDraft(d),restored=restoreSurveyDraft(JSON.stringify(d));assert.ok(restored.draft);assert.deepEqual(previewFromDraft(restored.draft),before);
 d.pending_selection.sorry=film('sorry',27205,'not confirmed');assert.deepEqual(previewFromDraft(d),before);
 d.skipped_categories=['grand'];assert.throws(()=>previewFromDraft(d),/NOT_ENOUGH_SELECTIONS/);
 const title='<img src=x onerror=alert(1)> {rescue}';const unsafe=run(undefined,[{...base[0],title},...base.slice(1)]);assert.ok(unsafe.result.selection_sentence.includes(title));
 assert.equal(before.result.selection_sentence,run().result.selection_sentence);
});

test('skipped categories are excluded from both rendered awards and special-award bonus',()=>{
 const d={...newSurveyDraft(),survey:{q1:0,q2:4,q3:0,q4:0,q5:0,q6:'unknown'}};
 for(const m of [...base,film('sorry',27205,'미시상 작품')])d.selections[m.category_id]=m;d.skipped_categories=['sorry'];
 const preview=previewFromDraft(d);assert.equal(preview.awarded_count,3);assert.ok(!preview.selections.some(m=>m.category_id==='sorry'));assert.equal(preview.result.variant_id,'A1');assert.equal(preview.score,8);
});
