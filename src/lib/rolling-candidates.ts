import {CATEGORIES,type CategoryId} from './award-catalog.ts';
import type {Survey} from './survey.ts';
import {CANDIDATE_MOVIES} from './candidate-movies.ts';
export {CANDIDATE_MOVIES};
const known=new Set(CANDIDATE_MOVIES.map(m=>m.tmdb_id));
export function validOrder(_id:CategoryId,value:unknown):value is number[]{
 return Array.isArray(value)&&value.length===6&&new Set(value).size===6&&value.every(id=>known.has(id));
}
export function candidateWeight(id:CategoryId,movieId:number,survey?:Survey){
 const category=CATEGORIES.find(c=>c.id===id)!;
 const group=category.groups.findIndex(g=>g.some(m=>m.id===movieId));
 // Editorial hints only: every verified film stays eligible with a similar weight.
 const question={grand:'q1',lifetime:'q4',sorry:'q2',once:'q3',dissent:'q1',rescue:'q5'} as const;
 const answer=survey?.[question[id]];
 const context=group<0?0:.4+(typeof answer==='number'?answer/4*.2:0);
 const volume=survey?.q6;
 const familiar=['zero','one_to_five','six_to_twenty'].includes(volume??'');
 const curious=['fiftyone_to_hundred','hundredone_plus'].includes(volume??'');
 const breadth=(familiar&&CATEGORIES.some(c=>c.groups[0].some(m=>m.id===movieId)))||(curious&&CATEGORIES.some(c=>c.groups[2].some(m=>m.id===movieId))) ? .2 : 0;
 return 1+context+breadth;
}
export function candidateOrder(id:CategoryId,random=Math.random,survey?:Survey,previous:readonly number[]=[]){
 const remaining=CANDIDATE_MOVIES.map(m=>({id:m.tmdb_id,weight:candidateWeight(id,m.tmdb_id,survey)}));
 const batch:number[]=[];
 for(let i=0;i<6;i++){
  let target=random()*remaining.reduce((sum,m)=>sum+m.weight,0),index=remaining.length-1;
  for(let j=0;j<remaining.length;j++){target-=remaining[j].weight;if(target<0){index=j;break;}}
  batch.push(remaining.splice(index,1)[0].id);
 }
 if(previous.length===6&&batch.every(id=>previous.includes(id))){
  const alternatives=CANDIDATE_MOVIES.filter(m=>!batch.includes(m.tmdb_id));
  if(alternatives.length)batch[5]=alternatives[Math.floor(random()*alternatives.length)].tmdb_id;
 }
 return batch;
}
