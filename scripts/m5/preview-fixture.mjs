import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {qaCases} from '../m3/fixtures.mjs';
import {createFestivalService,nickname} from '../../src/lib/festivals-server.ts';
import {jsonBody} from '../../src/lib/festival-http.ts';
import {PREVIEW_ORIGIN} from '../../src/lib/m5-preview.ts';

// Exercise the real save validator with in-memory dependencies, never provider writes.
export async function validatePreviewFixture(fixture){
 const {input,updatedNickname}=fixture;nickname(input.nickname);nickname(updatedNickname);
 let row;
 const core={user:async()=> 'fixture-owner',request:async()=>[],read:async()=>row,save:async(token,p)=>{
  row={id:row?.id??randomUUID(),client_draft_id:p.p_draft,nickname:p.p_nickname,survey:p.p_survey,selections:p.p_selections,result:p.p_result,survey_version:p.p_survey_version,catalog_version:p.p_catalog_version,rules_version:p.p_rules_version,revision:(row?.revision??0)+1};return row;
 }};
 const service=createFestivalService({core,tmdb:{detail:async id=>({tmdb_id:Number(id),title:'검증',original_title:null,release_year:null,poster_path:null})}});
 const body=raw=>jsonBody(new Request(PREVIEW_ORIGIN+'/api/festivals',{method:'POST',headers:{Origin:PREVIEW_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify(raw)}));
 await service.save('fixture-session',await body(input));
 await service.save('fixture-session',await body({...input,id:row.id,expected_revision:1,nickname:updatedNickname}));
 assert.equal(row.revision,2);
 return fixture;
}
export async function preparePreviewFixture({qa,name='M5 검증',updatedName='M5 수정'}={}){
 qa??=(await qaCases())[0];
 const input={draft_id:randomUUID(),id:null,expected_revision:null,nickname:nickname(name),survey:qa.survey,selections:qa.selections.map(({category_id,tmdb_id})=>({category_id,tmdb_id})),survey_version:'survey-v1.1',catalog_version:'awards-v1.1',rules_version:'result-v1.1'};
 return validatePreviewFixture({input,updatedNickname:nickname(updatedName)});
}
