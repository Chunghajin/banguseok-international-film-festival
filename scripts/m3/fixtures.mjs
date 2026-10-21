import {readFile} from 'node:fs/promises';
const short={G:'grand',L:'lifetime',S:'sorry',O:'once',D:'dissent',R:'rescue'};
export async function qaCases(){
 const spec=await readFile('docs/SCREEN_CONTENT.md','utf8');
 const movies=JSON.parse(await readFile('artifacts/m2/catalog-verified.json','utf8'));
 const inputs=[...spec.matchAll(/^\|(Q\d{2})\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|$/gm)];
 return inputs.map(([,id,nickname,q,volume,chosen])=>{
  const values=q.split(',').map(v=>v==='N'?null:Number(v));
  const survey=Object.fromEntries(values.map((v,i)=>[`q${i+1}`,v]));survey.q6=volume;
  const selections=chosen.split(', ').map(value=>{const [category,label]=value.split(':');const m=movies.find(m=>m.editorial_title===label);if(!m)throw Error('MISSING_VERIFIED_QA_MOVIE');return {category_id:short[category],tmdb_id:m.tmdb_id,title:label,original_title:m.original_title,release_year:m.release_year,poster_path:m.poster_path};});
  const section=spec.split(`**${id} — `)[1].split('QA:')[0];const [heading,...rest]=section.trim().split('\n\n');
  const [title,variant,score]=heading.replace('**','').split(' / ');
  const volumeText=volume==='unknown'?null:spec.match(new RegExp(`^\\|${volume}\\|([^|]+)\\|$`,'m'))[1];
  return {id,nickname,survey,selections,expected:{title,variant,score:score?Number(score.replace('score','')):null,award_sentence:rest[0].trim(),selection_sentence:rest[1].trim(),volume_sentence:volumeText}};
 });
}
