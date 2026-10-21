import 'server-only';
import {createRequestProtection,protectionResponse} from './request-protection.ts';
import {ResultInputError} from './festival-result.ts';
import {G1Error,createG1Client} from './supabase-core.mjs';
import {createFestivalService,uuid} from './festivals-server.ts';
export const ACCESS_COOKIE='banguseok-access',REFRESH_COOKIE='banguseok-refresh';
const headers={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const refreshes=new Map<string,{expires:number;promise:Promise<Record<string,unknown>>}>();
function cookie(request:Request,name:string){const value=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(`${name}=`))?.slice(name.length+1);return value&&/^[A-Za-z0-9_.-]{1,4000}$/.test(value)?value:null;}
export async function jsonBody(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new G1Error(400,'INVALID_CONTENT_TYPE');
 const reader=request.body?.getReader();if(!reader)throw new G1Error(400,'INVALID_INPUT');let size=0,text='';const decoder=new TextDecoder();
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new G1Error(400,'INPUT_TOO_LARGE');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
 try{const data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data as Record<string,unknown>;}catch{throw new G1Error(400,'INVALID_INPUT');}
}
export function localWriteGuard(request:Request,environment=process.env.NODE_ENV){
 if(environment!=='development')throw new G1Error(503,'PROTECTION_REQUIRED');
 const url=new URL(request.url),incoming=new URL(`${url.protocol}//${request.headers.get('host')??url.host}`);
 if(!['localhost','127.0.0.1','[::1]'].includes(incoming.hostname)||request.headers.get('origin')!==incoming.origin||request.headers.get('sec-fetch-site')==='cross-site')throw new G1Error(403,'ORIGIN_REJECTED');
}
function sessionCookies(response:Response,session:Record<string,unknown>,secure:boolean){
 if(typeof session.access_token!=='string'||typeof session.refresh_token!=='string')throw new G1Error(401,'UNAUTHENTICATED');
 for(const [name,value,age] of [[ACCESS_COOKIE,session.access_token,Number(session.expires_in)||3600],[REFRESH_COOKIE,session.refresh_token,2592000]] as const){
  if(!/^[A-Za-z0-9_.-]+$/.test(value))throw new G1Error(401,'UNAUTHENTICATED');
  response.headers.append('Set-Cookie',`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure?'; Secure':''}`);
 }
}
const messages:Record<string,string>={CONFLICT:'다른 저장 내용과 충돌했어요. 초안은 유지됩니다. 서버 내용을 확인한 뒤 다시 편집해 주세요.',UNAUTHENTICATED:'이 브라우저의 편집 권한을 확인할 수 없어요. 공유 링크는 편집 권한을 복구하지 않습니다.',NOT_FOUND:'이 브라우저에서 접근할 수 있는 영화제가 없어요.',PROTECTION_REQUIRED:'운영 요청 보호 확인 전에는 저장·공개를 사용할 수 없어요.',RATE_LIMITED:'요청이 많아요. 잠시 후 다시 시도해 주세요.',CAPTCHA_REQUIRED:'저장 전에 자동 요청 방지 확인을 완료해 주세요.',CAPTCHA_FAILED:'자동 요청 방지 확인을 다시 완료해 주세요. 초안은 유지됩니다.'};
export function failure(error:unknown){const protectedFailure=protectionResponse(error);if(protectedFailure)return protectedFailure;const status=error instanceof ResultInputError?400:error instanceof G1Error&&[400,401,403,404,409,428,429,503].includes(error.status)?error.status:503;const code=error instanceof G1Error&&Object.hasOwn(messages,error.code)?error.code:status===400?'INVALID_INPUT':'REQUEST_FAILED';return Response.json({code,message:messages[code]??'요청을 완료하지 못했어요. 초안은 유지됩니다. 입력과 연결을 확인한 뒤 다시 시도해 주세요.'},{status,headers});}
export function createFestivalHttp({core=createG1Client(process.env),service=createFestivalService({core}),environment=process.env.NODE_ENV,now=Date.now,protection=createRequestProtection({core})}={}){
 const buckets=new Map<string,{count:number;until:number}>();
 function limit(key:string,count:number,window:number){if(buckets.size>1000)throw new G1Error(429,'RATE_LIMITED');const bucket=buckets.get(key);if(!bucket||bucket.until<=now()){buckets.set(key,{count:1,until:now()+window});return;}if(++bucket.count>count)throw new G1Error(429,'RATE_LIMITED');}
 return async function handle(request:Request,path:string[]=[]){
  let renewed:Record<string,unknown>|null=null;
  const respond=(value:unknown)=>{const response=Response.json(value,{headers});if(renewed)sessionCookies(response,renewed,environment!=='development'||new URL(request.url).protocol==='https:');return response;};
  async function identity(create=false,captcha?:string){
   const token=cookie(request,ACCESS_COOKIE),refresh=cookie(request,REFRESH_COOKIE);
   if(token){try{await core.user(token);return token;}catch(e){if(!(e instanceof G1Error)||e.status!==401)throw e;}}
   if(refresh){let entry=refreshes.get(refresh);if(!entry||entry.expires<now()){
    if(refreshes.size>100)refreshes.clear();entry={expires:now()+8000,promise:core.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:refresh}})};refreshes.set(refresh,entry);
   }try{renewed=await entry.promise;const access=String(renewed!.access_token??'');await core.user(access);return access;}catch{throw new G1Error(401,'UNAUTHENTICATED');}}
   if(create&&!token){
    if(environment!=='development'){if(!captcha)throw new G1Error(428,'CAPTCHA_REQUIRED');await protection.signup(request);}
    try{renewed=await core.signIn(captcha);}catch(e){if(e instanceof G1Error&&e.code==='captcha_failed')throw new G1Error(400,'CAPTCHA_FAILED');throw e;}
    const access=String(renewed!.access_token);await core.user(access);return access;
   }
   throw new G1Error(401,'UNAUTHENTICATED');
  }
  try{
   const writing=request.method!=='GET',local=environment==='development';
   if(local){if(writing)localWriteGuard(request,environment);}else await protection.start(request,path[0]==='session'?'session':writing?'write':'private');
   if(path[0]==='session'){
    if(request.method!=='POST')throw new G1Error(404,'NOT_FOUND');if(local)limit('signup',10,60000);const body=await jsonBody(request);
    if(Object.keys(body).some(k=>k!=='captcha_token')||(body.captcha_token!==undefined&&(typeof body.captcha_token!=='string'||body.captcha_token.length>8000)))throw new G1Error(400,'INVALID_INPUT');
    const token=await identity(true,body.captcha_token as string|undefined);if(!local)await protection.owner(request,await core.user(token),'session');return respond({authenticated:true});
   }
   const token=await identity(),owner=await core.user(token);
   if(local){if(writing)limit(`write:${owner}`,60,60000);}else await protection.owner(request,owner,writing?'write':'read');
   if(path.length===0&&request.method==='GET'){
    return respond(await service.list(token,new URL(request.url).searchParams.get('cursor')));
   }
   if(path.length===0&&request.method==='POST'){if(local)limit(`save:${owner}`,10,3600000);else await protection.owner(request,owner,'save');return respond({festival:await service.save(token,await jsonBody(request))});}
   const id=path[0];if(!uuid(id))throw new G1Error(404,'NOT_FOUND');
   if(path.length===1&&request.method==='GET')return respond({festival:await service.read(token,id),share:await service.share(token,id)});
   const body=await jsonBody(request);if(!Number.isInteger(body.revision)||Number(body.revision)<1)throw new G1Error(400,'INVALID_REVISION');
   if(path.length===1&&request.method==='DELETE'){if(Object.keys(body).some(k=>k!=='revision'))throw new G1Error(400,'INVALID_INPUT');await service.remove(token,id,Number(body.revision));return respond({deleted:true});}
   if(path.length===2&&path[1]==='publish'&&request.method==='POST'){if(Object.keys(body).some(k=>!['revision','consent'].includes(k)))throw new G1Error(400,'INVALID_INPUT');return respond({share:await service.publish(token,id,Number(body.revision),body.consent===true)});}
   if(path.length===2&&path[1]==='unpublish'&&request.method==='POST'){if(Object.keys(body).some(k=>k!=='revision'))throw new G1Error(400,'INVALID_INPUT');await service.unpublish(token,id,Number(body.revision));return respond({unpublished:true});}
   throw new G1Error(404,'NOT_FOUND');
  }catch(error){const response=failure(error);if(renewed)sessionCookies(response,renewed,environment!=='development'||new URL(request.url).protocol==='https:');return response;}
 };
}
