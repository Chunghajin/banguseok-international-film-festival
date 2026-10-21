import assert from 'node:assert/strict';
import test from 'node:test';
import {createShareImageHttp} from '../src/lib/share-image-http.ts';
import {imageText} from '../src/lib/share-image-layout.ts';
import {generateFestivalResult} from '../src/lib/festival-result.ts';
import {ProtectionError} from '../src/lib/request-protection.ts';
import {G1Error} from '../src/lib/supabase-core.mjs';
const token='a'.repeat(43),request=new Request(`https://festival.test/api/share-image/${token}`);
const selections=['grand','lifetime','sorry','once','dissent','rescue'].map((category_id,i)=>({category_id,tmdb_id:i===1?1:i+1,title:`수상작 ${i}`,original_title:null,release_year:2026,poster_path:null}));
const survey={q1:4,q2:0,q3:0,q4:0,q5:0,q6:'zero'};
function snapshot(count=3){const movies=selections.slice(0,count);return {nickname:'위원장',...generateFestivalResult({rules_version:'result-v1.1',survey,selections:movies}).result,selections:movies,awarded_count:count,brand_version:'1.1',created_year:2026,survey,owner_id:'private'};}
test('3–6 published selections and exact published special award reach renderer, with no private fields',async()=>{
 for(const count of [3,4,5,6]){
  const value=snapshot(count),events=[];
  const handle=createShareImageHttp({environment:'production',protection:{start:async(_r,kind)=>events.push(kind)},read:async t=>{assert.equal(t,token);events.push('read');return value;},render:async s=>{events.push('render');assert.equal(s.award_sentence,value.award_sentence);assert.equal(s.special_award_title,value.special_award_title);assert.deepEqual(s.selections,value.selections);assert.equal(s.survey,undefined);assert.equal(s.owner_id,undefined);assert.equal(s.evidence_ids,undefined);return new ArrayBuffer(8);}});
  const response=await handle(request,token);assert.equal(response.status,200);assert.deepEqual(events,['png','public','read','render']);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('content-type'),'image/png');assert.match(response.headers.get('content-disposition'),/attachment/);
 }
});
test('M5 429/503 fail closed before database or renderer; Retry-After survives',async()=>{
 for(const status of [429,503]){const handle=createShareImageHttp({environment:'production',protection:{start:async()=>{throw new ProtectionError(status,status===429?30:0);}},read:async()=>{assert.fail('read blocked');},render:async()=>{assert.fail('render blocked');}});const response=await handle(request,token);assert.equal(response.status,status);if(status===429)assert.equal(response.headers.get('retry-after'),'30');}
 const handle=createShareImageHttp({environment:'production',render:async()=>assert.fail('default protection must block')});assert.equal((await handle(request,token)).status,503);
});
test('UUID, invalid, private/unpublished/revoked/deleted tokens cannot render',async()=>{
 for(const value of ['11111111-1111-4111-8111-111111111111','bad',token]){
  let reads=0;const handle=createShareImageHttp({environment:'development',read:async()=>{reads++;throw new G1Error(404,'NOT_FOUND');},render:async()=>assert.fail('render blocked')});assert.equal((await handle(request,value)).status,404);assert.equal(reads,value===token?1:0);
 }
});
test('database and renderer/font/WASM/stream failures are JSON 503',async()=>{
 for(const where of ['read','render']){const handle=createShareImageHttp({environment:'development',read:async()=>{if(where==='read')throw Error('private details');return snapshot();},render:async()=>{throw Error('font bytes or stream');}});const response=await handle(request,token);assert.equal(response.status,503);assert.equal((await response.json()).code,'PNG_FAILED');}
});
test('max-length Korean, Latin, HTML-like and combining titles preserve all text within row budget',()=>{
 for(const count of [3,4,5,6])for(const text of ['한'.repeat(500),'W'.repeat(500),'<script>긴 제목</script>','가\u0301'.repeat(250)]){
  const height=(984-(count-1)*12)/count-98;const fitted=imageText(text,780,height,38);assert.equal(fitted.text.replaceAll('\n',''),text.normalize('NFC'));assert.ok(fitted.text.split('\n').length*fitted.fontSize*1.3<=height);
 }
});
