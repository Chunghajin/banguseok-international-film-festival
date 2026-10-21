import {CATEGORIES} from './award-catalog.ts';
import {categoryRecord} from './award-state.ts';
import {newSurveyDraft,type SurveyDraft} from './survey-draft.ts';
import type {SavedFestival} from './festivals-server';
export const AUTH_NOTICE='이 브라우저에서 수정·삭제할 수 있어요. 브라우저 데이터를 지우거나 다른 기기로 이동하면 편집 권한을 잃을 수 있어요. 공유 링크는 조회용이며 편집 권한을 복구하지 않습니다.';
export class FestivalRequestError extends Error{status:number;code?:string;constructor(status:number,message:string,code?:string){super(message);this.status=status;this.code=code;}}
export async function festivalRequest(path:string,method='GET',body?:unknown){
 let response;try{response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:body!==undefined?{'Content-Type':'application/json'}:{},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});}catch{throw new FestivalRequestError(503,'연결이 끊겼거나 시간이 초과됐어요. 초안은 유지됩니다. 같은 요청으로 다시 시도해 주세요.');}
 let data;try{data=await response.json();}catch{throw new FestivalRequestError(503,'응답을 확인하지 못했어요. 초안은 유지됩니다. 같은 요청으로 다시 시도해 주세요.');}
 if(!response.ok)throw new FestivalRequestError(response.status,typeof data.message==='string'?data.message:'요청을 완료하지 못했어요.',data.code);return data;
}
export function savePayload(draft:SurveyDraft){return {draft_id:draft.draft_id,id:draft.editing_festival_id,expected_revision:draft.expected_revision,nickname:draft.nickname,survey:draft.survey,selections:CATEGORIES.flatMap(c=>!draft.skipped_categories.includes(c.id)&&draft.selections[c.id]?[{category_id:c.id,tmdb_id:draft.selections[c.id]!.tmdb_id}]:[]),survey_version:draft.survey_version,catalog_version:draft.catalog_version,rules_version:draft.rules_version};}
export function attachSaved(current:SurveyDraft,submitted:SurveyDraft,row:SavedFestival):SurveyDraft{
 const unchanged=JSON.stringify(savePayload(current))===JSON.stringify(savePayload(submitted));
 return {...current,...(unchanged?{survey:row.survey,nickname:row.nickname,selections:categoryRecord(id=>row.selections.find(m=>m.category_id===id)??null)}:{}),editing_festival_id:row.id,expected_revision:row.revision};
}
export function editingDraft(row:SavedFestival,local:SurveyDraft|null):SurveyDraft{
 if(local&&(local.editing_festival_id===row.id||local.draft_id===row.client_draft_id))return {...local,editing_festival_id:row.id,expected_revision:local.expected_revision??row.revision,current_screen:'result'};
 return {...newSurveyDraft(),draft_id:row.client_draft_id,editing_festival_id:row.id,expected_revision:row.revision,nickname:row.nickname,survey:row.survey,selections:categoryRecord(id=>row.selections.find(m=>m.category_id===id)??null),current_question:5,current_screen:'result'};
}

export async function deleteFestival(id:string,revision:number,request=festivalRequest){
 try{await request(`/api/festivals/${id}`,'DELETE',{revision});}
 catch(error){
  if(!(error instanceof FestivalRequestError)||![404,503].includes(error.status))throw error;
  // A committed delete may lose its response; only an authenticated 404 confirms absence.
  try{await request(`/api/festivals/${id}`);}catch(readError){if(readError instanceof FestivalRequestError&&readError.status===404)return;throw error;}
  throw error;
 }
}
