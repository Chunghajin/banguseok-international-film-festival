import {readFile,writeFile} from 'node:fs/promises';
const spec=await readFile('docs/SCREEN_CONTENT.md','utf8');
const entries=[...new Map([...spec.matchAll(/^\|(grand|lifetime|sorry|once|dissent|rescue)\|(.+)\|$/gm)].flatMap(m=>[...m[2].matchAll(/([^,|]+)\((\d{4})\)/g)].map(x=>[x[1],{title:x[1],year:Number(x[2])}]))).values()];
const result=[];
for(const item of entries){
 const url=new URL('https://api.themoviedb.org/3/search/movie');url.search=new URLSearchParams({query:item.title,language:'ko-KR',include_adult:'false'});
 try{const r=await fetch(url,{headers:{Authorization:`Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`},signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error();const body=await r.json();const matches=body.results.filter(x=>x.release_date?.startsWith(String(item.year)));
 const options=(matches.length?matches:body.results).slice(0,3).map(x=>({id:x.id,title:x.title,original:x.original_title,date:x.release_date}));
 result.push({...item,options});console.log(JSON.stringify(result.at(-1)));
 }catch{console.log(JSON.stringify({...item,error:'LOOKUP_FAILED'}));}
}
await writeFile('artifacts/m2/catalog-search.json',JSON.stringify(result,null,2)+'\n');
