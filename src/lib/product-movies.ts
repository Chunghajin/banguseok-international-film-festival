import 'server-only';
import {createRequestProtection,protectionResponse} from './request-protection.ts';
import {createTmdbClient, movieErrorResponse, MovieError, movieId, searchInput} from './tmdb.ts';
import {CATEGORIES} from './award-catalog.ts';
const knownIds=new Set(CATEGORIES.flatMap(c=>c.groups.flat().map(m=>m.id)));
const localHosts=new Set(['localhost','127.0.0.1','[::1]']);
const cache=new Map<string,{expires:number;value:unknown}>();

export function createProductMovies({client=createTmdbClient(),environment=process.env.NODE_ENV,now=Date.now,protection=createRequestProtection()}={}) {
 let start=0,used=0;
 return async function handle(request: Request) {
  try {
   const local=environment==='development';
   if(!local)await protection.start(request,'movies');
   const url=new URL(request.url);
   // Next dev may normalize its internal request URL; validate the local Host and Origin together.
   const incoming=new URL(`${url.protocol}//${request.headers.get('host')??url.host}`);
   if(local&&(!localHosts.has(incoming.hostname)||request.headers.get('origin')!==incoming.origin||request.headers.get('sec-fetch-site')==='cross-site'))
    throw new MovieError(403,'ORIGIN_REJECTED','같은 로컬 화면에서 다시 시도해 주세요.');
   if(!request.headers.get('content-type')?.startsWith('application/json'))throw new MovieError(400,'INVALID_REQUEST','요청 형식을 확인해 주세요.');
   // Local counters are only for development; deployed requests always charge the shared database.
   if(now()-start>=60000){start=now();used=0;}
   if(local&&++used>60)throw new MovieError(429,'LOCAL_RATE_LIMITED','요청이 많아요. 잠시 후 다시 시도해 주세요.',true);
   
   const reader=request.body?.getReader();let size=0;const chunks:Uint8Array[]=[];
   if(!reader)throw new Error();
   for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();throw new MovieError(400,'INVALID_REQUEST','요청이 너무 길어요.');}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new MovieError(400,'INVALID_REQUEST','요청 형식을 확인해 주세요.');}
   if(!body||typeof body!=='object'||Array.isArray(body))throw new MovieError(400,'INVALID_REQUEST','요청 형식을 확인해 주세요.');
   let key:string,ttl:number,load:()=>Promise<unknown>;
   if(body.action==='search'&&typeof body.query==='string'){
    const input=searchInput(body.query,String(body.page??1));key=`s:${input.page}:${input.q}`;ttl=600000;
    load=()=>client.search(input.q,String(input.page),request.signal);
   }else if(body.action==='detail'&&typeof body.id==='number'){
    const id=movieId(String(body.id));key=`d:${id}`;ttl=86400000;load=()=>client.detail(String(id),request.signal);
   }else if(body.action==='candidates'&&Array.isArray(body.ids)&&body.ids.length===6&&new Set(body.ids).size===6&&body.ids.every((id:unknown)=>typeof id==='number'&&knownIds.has(id))){
    // A batch costs at least one request; uncached upstream details share the same 60/min budget.
    const uncached=body.ids.filter((id:number)=>!cache.get(`d:${id}`)||cache.get(`d:${id}`)!.expires<=now()).length;
    if(local)used+=Math.max(0,uncached-1);if(local&&used>60)throw new MovieError(429,'LOCAL_RATE_LIMITED','요청이 많아요. 잠시 후 다시 시도해 주세요.',true);
    key=`b:${body.ids.join(',')}`;ttl=0;
    load=async()=>({items:await Promise.all(body.ids.map(async(id:number)=>{
     const detailKey=`d:${id}`,cached=cache.get(detailKey);
     if(cached&&cached.expires>now())return cached.value;
     try{const movie=await client.detail(String(id),request.signal);cache.set(detailKey,{value:movie,expires:now()+86400000});return movie;}
     catch{return {tmdb_id:id,unavailable:true};}
    }))});
   }else throw new MovieError(400,'INVALID_REQUEST','요청 값을 확인해 주세요.');
   if(!local)await protection.movies(request,body.action==='candidates'?6:1);
   const cached=cache.get(key);const value=cached&&cached.expires>now()?cached.value:await load();
   if(cache.size>500)cache.clear();cache.set(key,{expires:now()+ttl,value});
   return Response.json(value,{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  } catch(error){const response=protectionResponse(error)??movieErrorResponse(error);if(response.status===429&&!response.headers.has('Retry-After'))response.headers.set('Retry-After','60');return response;}
 };
}
