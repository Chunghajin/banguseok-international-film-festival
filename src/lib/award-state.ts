import { CATEGORIES, type CategoryId } from './award-catalog.ts';
export type Selection = { category_id: CategoryId; tmdb_id: number; title: string; original_title: string|null; release_year: number|null; poster_path: string|null };
export type AwardState = {
  editing_festival_id: string|null; expected_revision: number|null; nickname: string;
  selections: Record<CategoryId,Selection|null>; pending_selection: Record<CategoryId,Selection|null>;
  skipped_categories: CategoryId[]; candidate_order: Record<CategoryId,number[]>; candidate_page: Record<CategoryId,0|1>; current_category: CategoryId;
};
export const categoryRecord = <T>(make: (id: CategoryId) => T) => Object.fromEntries(CATEGORIES.map(c=>[c.id,make(c.id)])) as Record<CategoryId,T>;
export function shuffle<T>(values: readonly T[], random = Math.random): T[] {
  const result=[...values];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function candidateOrder(id: CategoryId, random = Math.random) {
  const groups=CATEGORIES.find(c=>c.id===id)!.groups.map(group=>shuffle(group.map(m=>m.id),random));
  return [0,1].flatMap(page=>shuffle(groups.flatMap(group=>group.slice(page*2,page*2+2)),random));
}
export function validOrder(id: CategoryId, value: unknown): value is number[] {
  if(!Array.isArray(value)||value.length!==12||new Set(value).size!==12)return false;
  const groups=CATEGORIES.find(c=>c.id===id)!.groups;
  return [0,1].every(page=>groups.every(group=>value.slice(page*6,page*6+6).filter(id=>group.some(m=>m.id===id)).length===2));
}
export function newAwardState(): AwardState {
  return {editing_festival_id:null,expected_revision:null,nickname:'',selections:categoryRecord(()=>null),pending_selection:categoryRecord(()=>null),skipped_categories:[],
    candidate_order:categoryRecord(id=>candidateOrder(id)),candidate_page:categoryRecord(()=>0),current_category:'grand'};
}
export function isCategory(value: unknown): value is CategoryId { return CATEGORIES.some(c=>c.id===value); }
export function selection(id: CategoryId, raw: unknown): Selection|null {
  if(!raw||typeof raw!=='object')return null;
  const m=raw as Selection;
  if(m.category_id!==id||!Number.isSafeInteger(m.tmdb_id)||m.tmdb_id<1||m.tmdb_id>2147483647||typeof m.title!=='string'||!m.title.trim()||m.title.length>500
    ||(m.original_title!==null&&(typeof m.original_title!=='string'||m.original_title.length>500))
    ||(m.release_year!==null&&(!Number.isInteger(m.release_year)||m.release_year<1||m.release_year>9999))
    ||(m.poster_path!==null&&(typeof m.poster_path!=='string'||!/^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(m.poster_path))))return null;
  return {category_id:id,tmdb_id:m.tmdb_id,title:m.title,original_title:m.original_title,release_year:m.release_year,poster_path:m.poster_path};
}
export function restoreAwards(raw: Record<string,unknown>): {state:AwardState;repaired:boolean} {
  // M1 had no candidate arrays. Upgrade once, preserving its UUID, survey and timestamp.
  const legacy=!Object.hasOwn(raw,'candidate_order');
  let repaired=false;
  const orders=raw.candidate_order as Partial<AwardState['candidate_order']>|undefined;
  const pages=raw.candidate_page as Partial<AwardState['candidate_page']>|undefined;
  const selected=raw.selections as Partial<AwardState['selections']>|undefined;
  const pending=raw.pending_selection as Partial<AwardState['pending_selection']>|undefined;
  const skipped=Array.isArray(raw.skipped_categories)?raw.skipped_categories.filter(isCategory):[];
  const editing=typeof raw.editing_festival_id==='string'&&/^[0-9a-f-]{36}$/i.test(raw.editing_festival_id)&&Number.isInteger(raw.expected_revision)&&Number(raw.expected_revision)>0;
  const state:AwardState={editing_festival_id:editing?raw.editing_festival_id as string:null,expected_revision:editing?Number(raw.expected_revision):null,nickname:typeof raw.nickname==='string'?raw.nickname.slice(0,120):'',
    selections:categoryRecord(id=>selection(id,selected?.[id])),pending_selection:categoryRecord(id=>selection(id,pending?.[id])),
    skipped_categories:[],current_category:isCategory(raw.current_category)?raw.current_category:'grand',
    candidate_order:categoryRecord(id=>{if(validOrder(id,orders?.[id]))return [...orders![id]!];if(!legacy)repaired=true;return candidateOrder(id);}),
    candidate_page:categoryRecord(id=>{if(pages?.[id]===1)return 1;return 0;})};
  state.skipped_categories=[...new Set(skipped)].filter(id=>!state.selections[id]);
  return {state,repaired};
}
export function countSelected(state: AwardState){return CATEGORIES.filter(c=>state.selections[c.id]).length;}
export function nominate<T extends AwardState>(state:T,id:CategoryId,movie:unknown):T {
  const valid=selection(id,movie);if(!valid)throw Error('INVALID_SELECTION');
  return {...state,pending_selection:{...state.pending_selection,[id]:valid}};
}
export function confirmSelection<T extends AwardState>(state:T,id:CategoryId): {state:T;next:CategoryId|null} {
  const chosen=state.pending_selection[id];if(!chosen)throw Error('SELECTION_REQUIRED');
  const editing=Boolean(state.selections[id]);
  const updated={...state,selections:{...state.selections,[id]:state.selections[id]?.tmdb_id===chosen.tmdb_id?state.selections[id]:chosen},
    pending_selection:{...state.pending_selection,[id]:null},skipped_categories:state.skipped_categories.filter(c=>c!==id)};
  const index=CATEGORIES.findIndex(c=>c.id===id);
  const ordered=[...CATEGORIES.slice(index+1),...CATEGORIES.slice(0,index)];
  return {state:updated,next:editing?null:ordered.find(c=>!updated.selections[c.id]&&!updated.skipped_categories.includes(c.id))?.id??null};
}
export function skipCategory<T extends AwardState>(state:T,id:CategoryId):T {
  return {...state,selections:{...state.selections,[id]:null},pending_selection:{...state.pending_selection,[id]:null},skipped_categories:[...new Set([...state.skipped_categories,id])]};
}
