import 'server-only';
import {createG1Client,G1Error} from './supabase-core.mjs';
import {createTmdbClient} from './tmdb.ts';
import {generateFestivalResult} from './festival-result.ts';
import {CATEGORIES} from './award-catalog.ts';
import {selection,type Selection} from './award-state.ts';
import type {Survey} from './survey.ts';
import type {ResultV11} from './festival-result.ts';
export type SavedFestival={id:string;client_draft_id:string;nickname:string;survey:Survey;selections:Selection[];result:ResultV11;survey_version:'survey-v1.1';catalog_version:'awards-v1.1';rules_version:'result-v1.1';revision:number;created_at:string;updated_at:string};
export type PublicFestival={nickname:string;special_award_title:string;award_sentence:string;selection_sentence:string;volume_sentence:string|null;selections:Selection[];awarded_count:number;brand_version:string;created_year:number};
export const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function nickname(value:unknown){if(typeof value!=='string')throw new G1Error(400,'INVALID_NICKNAME');const name=value.trim().normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu,'')||'익명의 집행위원장';if([...new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(name)].length>12)throw new G1Error(400,'INVALID_NICKNAME');return name;}
export function safeFestival(row:SavedFestival):SavedFestival{
 return {id:row.id,client_draft_id:row.client_draft_id,nickname:row.nickname,survey:row.survey,selections:row.selections,result:row.result,survey_version:row.survey_version,catalog_version:row.catalog_version,rules_version:row.rules_version,revision:row.revision,created_at:row.created_at,updated_at:row.updated_at};
}
export function publicSnapshot(raw:unknown):PublicFestival{
 const r=raw as PublicFestival;
 if(!r||typeof r.nickname!=='string'||typeof r.special_award_title!=='string'||typeof r.award_sentence!=='string'||typeof r.selection_sentence!=='string'||(r.volume_sentence!==null&&typeof r.volume_sentence!=='string')||!Array.isArray(r.selections)||r.selections.length<3||r.selections.length>6||r.awarded_count!==r.selections.length||r.brand_version!=='1.1'||!Number.isInteger(r.created_year))throw new G1Error(404,'NOT_FOUND');
 const selections=r.selections.map(m=>CATEGORIES.some(c=>c.id===m.category_id)?selection(m.category_id,m):null);if(selections.some(m=>!m)||new Set(selections.map(m=>m!.category_id)).size!==selections.length)throw new G1Error(404,'NOT_FOUND');
 return {nickname:r.nickname,special_award_title:r.special_award_title,award_sentence:r.award_sentence,selection_sentence:r.selection_sentence,volume_sentence:r.volume_sentence,selections:selections as Selection[],awarded_count:r.awarded_count,brand_version:r.brand_version,created_year:r.created_year};
}
export function createFestivalService({core=createG1Client(process.env),tmdb=createTmdbClient()}={}){
 async function read(token:string,id:string){if(!uuid(id))throw new G1Error(404,'NOT_FOUND');return safeFestival(await core.read(token,id));}
 async function share(token:string,id:string){await core.user(token);await read(token,id);const rows=await core.request(`/rest/v1/festival_shares?festival_id=eq.${id}&select=token,published_revision`,{admin:true});return rows[0]??null;}
 return {core,read,share,
  async list(token:string,cursor:string|null=null){
   await core.user(token);const query=new URLSearchParams({select:'*',order:'updated_at.desc,id.desc',limit:'20'});
   if(cursor){try{if(cursor.length>300)throw Error();const c=JSON.parse(Buffer.from(cursor,'base64url').toString());if(!uuid(c.id)||typeof c.time!=='string'||!/^[0-9T:.+Z-]{20,40}$/.test(c.time)||!Number.isFinite(Date.parse(c.time)))throw Error();query.set('or',`(updated_at.lt.${c.time},and(updated_at.eq.${c.time},id.lt.${c.id}))`);}catch{throw new G1Error(400,'INVALID_CURSOR');}}
   const rows=await core.request(`/rest/v1/festivals?${query}`,{token});const last=rows.at(-1);
   return {items:rows.map(safeFestival),next_cursor:rows.length===20?Buffer.from(JSON.stringify({time:last.updated_at,id:last.id})).toString('base64url'):null};
  },
  async save(token:string,raw:Record<string,unknown>){
   await core.user(token);
   const allowed=['draft_id','id','expected_revision','nickname','survey','selections','survey_version','catalog_version','rules_version'];if(Object.keys(raw).some(k=>!allowed.includes(k))||!uuid(raw.draft_id)||!Array.isArray(raw.selections)||raw.selections.length<3||raw.selections.length>6)throw new G1Error(400,'INVALID_INPUT');
   if(raw.survey_version!=='survey-v1.1'||raw.catalog_version!=='awards-v1.1'||raw.rules_version!=='result-v1.1')throw new G1Error(400,'INVALID_VERSION');
   const name=nickname(raw.nickname),isUpdate=raw.id!==null&&raw.id!==undefined;
   if(isUpdate&&(!uuid(raw.id)||!Number.isInteger(raw.expected_revision)||Number(raw.expected_revision)<1))throw new G1Error(400,'INVALID_REVISION');
   const ids=raw.selections.map(m=>{if(!m||typeof m!=='object'||Object.keys(m).some(k=>!['category_id','tmdb_id'].includes(k))||!CATEGORIES.some(c=>c.id===m.category_id)||!Number.isSafeInteger(m.tmdb_id)||m.tmdb_id<1||m.tmdb_id>2147483647)throw new G1Error(400,'INVALID_SELECTION');return m as Pick<Selection,'category_id'|'tmdb_id'>;});
   if(new Set(ids.map(m=>m.category_id)).size!==ids.length)throw new G1Error(400,'INVALID_SELECTION');
   // Validate survey before any movie or service-role request; placeholder metadata is never saved.
   const validated=generateFestivalResult({rules_version:'result-v1.1',survey:raw.survey as Survey,selections:ids.map(m=>({...m,title:'validation',original_title:null,release_year:null,poster_path:null}))});
   const existing:SavedFestival|null=isUpdate?await read(token,raw.id as string):(await core.request(`/rest/v1/festivals?client_draft_id=eq.${raw.draft_id}&select=*`,{token}))[0]??null;
   if(existing&&existing.client_draft_id!==raw.draft_id)throw new G1Error(400,'INVALID_DRAFT');
   const same=existing&&existing.nickname===name&&JSON.stringify(generateFestivalResult({rules_version:existing.rules_version,survey:existing.survey,selections:existing.selections}).survey)===JSON.stringify(validated.survey)&&ids.length===existing.selections.length&&ids.every(m=>existing.selections.some(old=>old.category_id===m.category_id&&old.tmdb_id===m.tmdb_id));
   // A response can be lost after commit. Reconcile only one revision with identical user input.
   if(isUpdate&&existing!.revision!==raw.expected_revision){if(existing!.revision===Number(raw.expected_revision)+1&&same)return existing!;throw new G1Error(409,'CONFLICT');}
   if(!isUpdate&&existing){if(same)return safeFestival(existing);throw new G1Error(409,'CONFLICT');}
   const unique=new Map<number,Selection>();
   await Promise.all([...new Set(ids.map(m=>m.tmdb_id))].map(async id=>{
    const old=existing?.selections.find(m=>m.tmdb_id===id);if(old){unique.set(id,old);return;}
    const movie=await tmdb.detail(String(id));unique.set(id,{category_id:'grand',tmdb_id:movie.tmdb_id,title:movie.title,original_title:movie.original_title,release_year:movie.release_year,poster_path:movie.poster_path});
   }));
   const selections=ids.map(m=>{const old=existing?.selections.find(s=>s.category_id===m.category_id&&s.tmdb_id===m.tmdb_id);return {...(old??unique.get(m.tmdb_id)!),category_id:m.category_id};});
   const computed=generateFestivalResult({rules_version:'result-v1.1',survey:raw.survey as Survey,selections});
   return safeFestival(await core.save(token,{p_draft:raw.draft_id,p_nickname:name,p_survey:computed.survey,p_selections:computed.selections,p_result:computed.result,p_survey_version:'survey-v1.1',p_catalog_version:'awards-v1.1',p_rules_version:'result-v1.1',p_id:isUpdate?raw.id:null,p_expected_revision:isUpdate?raw.expected_revision:null}));
  },
  async publish(token:string,id:string,revision:number,consent:boolean){if(consent!==true)throw new G1Error(400,'CONSENT_REQUIRED');await read(token,id);const s=await core.publish(token,id,revision);return {token:s.token,published_revision:s.published_revision};},
  async unpublish(token:string,id:string,revision:number){await read(token,id);await core.publish(token,id,revision,true);},
  async remove(token:string,id:string,revision:number){await read(token,id);await core.remove(token,id,revision);},
  async publicRead(token:string){return publicSnapshot(await core.publicRead(token));},
 };
}
