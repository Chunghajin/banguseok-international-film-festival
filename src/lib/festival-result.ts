import {CATEGORIES,type CategoryId} from './award-catalog.ts';
import {selection,type Selection} from './award-state.ts';
import {QUESTIONS,validAnswer,type Survey} from './survey.ts';
import {COMMENT_TEMPLATES,SELECTION_TEMPLATES,VOLUME_TEXT} from './result-content.ts';
export const AWARD_TITLES={consensus:'평점 협의상',audience:'객석 눈치상',interpretation:'해석 유예상',credits:'퇴장 유예상',secret:'비밀 애호상',sealed:'심사평 비공개 특별상',chair:'단독 개최 공로상'} as const;
export type SpecialAwardId=keyof typeof AWARD_TITLES;
export type VariantId=keyof typeof COMMENT_TEMPLATES;
export type SelectionVariant=keyof typeof SELECTION_TEMPLATES;
export type ResultV11={special_award_id:SpecialAwardId;variant_id:VariantId;special_award_title:string;award_sentence:string;selection_sentence:string;volume_sentence:string|null;answered_count:number;evidence_ids:string[]};
export type FestivalPreview={rules_version:'result-v1.1';survey:Survey;selections:Selection[];result:ResultV11;awarded_count:number;unique_movie_count:number;score:number|null;selection_variant:SelectionVariant};
export class ResultInputError extends Error {
 code:'INVALID_SURVEY'|'INVALID_SELECTION'|'NOT_ENOUGH_SELECTIONS'|'UNSUPPORTED_RULES';
 constructor(code:ResultInputError['code']){super(code);this.code=code;}
}
const PRIORITY=['interpretation','audience','consensus','secret','credits'] as const;
const RULES=[{id:'interpretation',question:'q3',linked:null},{id:'audience',question:'q2',linked:'sorry'},{id:'consensus',question:'q1',linked:'dissent'},{id:'secret',question:'q5',linked:'rescue'},{id:'credits',question:'q4',linked:'lifetime'}] as const;
function fill(template:string,values:Record<string,string|number>){
 return template.replace(/\{([a-z_]+)\}/g,(_,key:string)=>{if(!Object.hasOwn(values,key))throw new ResultInputError('INVALID_SELECTION');return String(values[key]);});
}
export function generateFestivalResult(input:{rules_version:string;survey:Survey;selections:Selection[]}):FestivalPreview {
 if(input.rules_version!=='result-v1.1')throw new ResultInputError('UNSUPPORTED_RULES');
 if(!input.survey||typeof input.survey!=='object'||!QUESTIONS.every(q=>Object.hasOwn(input.survey,q.id)&&validAnswer(q.id,input.survey[q.id])))throw new ResultInputError('INVALID_SURVEY');
 if(!Array.isArray(input.selections)||input.selections.length>6)throw new ResultInputError('INVALID_SELECTION');
 const seen=new Set<CategoryId>();
 const verified=input.selections.map(raw=>{if(!raw||!CATEGORIES.some(c=>c.id===raw.category_id)||seen.has(raw.category_id))throw new ResultInputError('INVALID_SELECTION');const valid=selection(raw.category_id,raw);if(!valid)throw new ResultInputError('INVALID_SELECTION');seen.add(valid.category_id);return valid;});
 if(verified.length<3)throw new ResultInputError('NOT_ENOUGH_SELECTIONS');
 const selections=CATEGORIES.flatMap(c=>verified.filter(m=>m.category_id===c.id));
 const survey=Object.fromEntries(QUESTIONS.map(q=>[q.id,input.survey[q.id]])) as Survey;
 const byCategory=Object.fromEntries(selections.map(m=>[m.category_id,m])) as Partial<Record<CategoryId,Selection>>;
 const repeats=new Map<number,{movie:Selection;count:number;first:number}>();
 selections.forEach((movie,first)=>{const group=repeats.get(movie.tmdb_id);if(group)group.count++;else repeats.set(movie.tmdb_id,{movie,count:1,first});});
 const repeated=[...repeats.values()].filter(m=>m.count>=2).sort((a,b)=>b.count-a.count||a.first-b.first||a.movie.tmdb_id-b.movie.tmdb_id);
 const sameGrand=Boolean(byCategory.grand&&byCategory.lifetime&&byCategory.grand.tmdb_id===byCategory.lifetime.tmdb_id);
 const candidates=RULES.flatMap(rule=>{const q=survey[rule.question];return q!==null&&q>=3?[{...rule,q,score:2*q+(rule.linked&&byCategory[rule.linked]?1:0)}]:[];})
  .sort((a,b)=>b.score-a.score||b.q-a.q||PRIORITY.indexOf(a.id)-PRIORITY.indexOf(b.id));
 const winner=candidates.at(0);
 const answeredCount=RULES.filter(rule=>survey[rule.question]!==null).length;
 const id:SpecialAwardId=winner?.id??(answeredCount===0?'sealed':'chair');
 let variant:VariantId;
 switch(id){
  case 'consensus':variant=byCategory.dissent?'C0':survey.q1===4?'C1':'C2';break;
  case 'audience':variant=byCategory.sorry?'A0':survey.q2===4?'A1':'A2';break;
  case 'interpretation':variant=byCategory.once?'I0':survey.q3===4?'I1':'I2';break;
  case 'credits':variant=byCategory.lifetime?'K0':survey.q4===4?'K1':'K2';break;
  case 'secret':variant=byCategory.rescue?'S0':survey.q5===4?'S1':'S2';break;
  case 'sealed':variant=repeated.length?'Z0':byCategory.grand?'Z1':'Z2';break;
  case 'chair':variant=sameGrand?'H0':byCategory.rescue?'H1':'H2';break;
 }
 let selectionVariant:SelectionVariant;
 if(sameGrand)selectionVariant='P1';
 else if(repeated.length)selectionVariant='P2';
 else if(byCategory.dissent&&byCategory.rescue)selectionVariant='P3';
 else if(['C0','A0','I0','K0','S0','H1'].includes(variant))selectionVariant='P4';
 else selectionVariant=byCategory.grand?'P5':'P6';
 const values=Object.fromEntries(selections.map(m=>[m.category_id,m.title]));
 const repeat=repeated[0];
 const textValues={...values,n:selections.length,first:selections[0].title,title:selectionVariant==='P1'?byCategory.grand!.title:repeat?.movie.title??'',count:repeat?.count??0};
 const result:ResultV11={special_award_id:id,variant_id:variant,special_award_title:AWARD_TITLES[id],award_sentence:fill(COMMENT_TEMPLATES[variant],values),selection_sentence:fill(SELECTION_TEMPLATES[selectionVariant],textValues),
  volume_sentence:survey.q6&&survey.q6!=='unknown'?VOLUME_TEXT[survey.q6]:null,answered_count:answeredCount,evidence_ids:[variant,selectionVariant]};
 return {rules_version:'result-v1.1',survey,selections,result,awarded_count:selections.length,unique_movie_count:repeats.size,score:winner?.score??null,selection_variant:selectionVariant};
}
export function previewFromDraft(draft:{rules_version:string;survey:Survey;selections:Record<CategoryId,Selection|null>;skipped_categories:CategoryId[]}){
 return generateFestivalResult({rules_version:draft.rules_version,survey:draft.survey,selections:CATEGORIES.flatMap(c=>!draft.skipped_categories.includes(c.id)&&draft.selections[c.id]?[draft.selections[c.id]!]:[])});
}
