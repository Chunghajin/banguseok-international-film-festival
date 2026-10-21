import 'server-only';
import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {createG1Client,G1Error} from './supabase-core.mjs';
import {CAPTCHA_PROVIDER,validHCaptchaSiteKey} from './captcha-config.mjs';
export const POLICY_VERSION='m5a-v1';
export class ProtectionError extends G1Error {
 retryAfter:number;
 constructor(status=503,retryAfter=0){super(status,status===429?'RATE_LIMITED':'PROTECTION_REQUIRED');this.retryAfter=retryAfter;}
}
const reported=new Set<string>();
function unavailable(code:string):never{if(!reported.has(code)){reported.add(code);console.error('[request-protection]',code);}throw new ProtectionError();}
export function protectionConfig(env:NodeJS.ProcessEnv){
 const secret=env.PROTECTION_HMAC_KEY,siteKey=env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
 if(!secret||!/^[a-f0-9]{64}$/i.test(secret)||!validHCaptchaSiteKey(siteKey)||!env.APP_ALLOWED_ORIGINS||!env.NEXT_PUBLIC_SUPABASE_URL)throw Error('CONFIG_MISSING_OR_INVALID');
 const origins=env.APP_ALLOWED_ORIGINS.split(',').map(s=>s.trim()).sort();
 if(!origins.length||origins.some(s=>{try{const u=new URL(s);return s.includes('*')||u.origin!==s||u.protocol!=='https:'||u.username||u.password;}catch{return true;}}))throw Error('CONFIG_ORIGINS_INVALID');
 const fingerprint=createHmac('sha256',secret).update(JSON.stringify([POLICY_VERSION,CAPTCHA_PROVIDER,origins,siteKey,env.NEXT_PUBLIC_SUPABASE_URL])).digest('hex');
 return {secret,siteKey,origins,fingerprint};
}
export function platformContext(request:Request,env:NodeJS.ProcessEnv,origins:string[]){
 if(env.VERCEL!=='1'||!['preview','production'].includes(env.VERCEL_ENV??''))throw Error('PLATFORM_REQUIRED');
 const host=request.headers.get('host'),origin=`https://${host}`;
 if(!host||!origins.includes(origin))throw Error('HOST_NOT_ALLOWED');
 const readOnly=['GET','HEAD'].includes(request.method);
 if((!readOnly||request.headers.has('origin'))&&request.headers.get('origin')!==origin)throw new G1Error(403,'ORIGIN_REJECTED');
 if(!readOnly&&request.headers.get('sec-fetch-site')==='cross-site')throw new G1Error(403,'ORIGIN_REJECTED');
 // Vercel owns this header. Never fall back to client XFF outside its runtime.
 const raw=request.headers.get('x-vercel-forwarded-for')??'';
 if(!isIP(raw))throw Error('PLATFORM_IP_MISSING');
 const ip=isIP(raw)===6?new URL(`http://[${raw}]/`).hostname:raw;
 return {ip,environment:env.VERCEL_ENV!};
}
export function createRequestProtection({env=process.env,core}: {env?:NodeJS.ProcessEnv;core?:ReturnType<typeof createG1Client>}={}){
 function configuration(){try{return protectionConfig(env);}catch{return unavailable('CONFIG_MISSING_OR_INVALID');}}
 const client=()=>core??createG1Client(env);
 async function charge(request:Request,rules:{scope:string;subject:string;limit:number;seconds:number;cost?:number}[]){
  const config=configuration();let context;
  try{context=platformContext(request,env,config.origins);}catch(e){if(e instanceof G1Error)throw e;return unavailable('PLATFORM_OR_HOST_INVALID');}
  const buckets=rules.map(r=>({key:createHmac('sha256',config.secret).update(JSON.stringify([POLICY_VERSION,context.environment,r.scope,r.subject==='ip'?context.ip:r.subject])).digest('hex'),limit:r.limit,seconds:r.seconds,cost:r.cost??1}));
  let result;try{result=await client().request('/rest/v1/rpc/consume_request_budget',{admin:true,method:'POST',body:{p_buckets:buckets,p_environment:context.environment,p_fingerprint:config.fingerprint}});}catch{return unavailable('BUDGET_OR_VERIFICATION_UNAVAILABLE');}
  if(result?.policy_version!==POLICY_VERSION||typeof result.allowed!=='boolean'||!Number.isInteger(result.retry_after)||result.retry_after<0||result.retry_after>86400||(result.allowed&&result.retry_after!==0)||(!result.allowed&&result.retry_after<1))return unavailable('INVALID_BUDGET_RESPONSE');
  if(!result.allowed)throw new ProtectionError(429,result.retry_after);
 }
 return {
  async start(request:Request,kind:'movies'|'session'|'write'|'private'|'public'|'png'){
   const rules:{scope:string;subject:string;limit:number;seconds:number}[]=[{scope:kind,subject:'ip',limit:kind==='session'||kind==='png'?10:kind==='movies'?60:120,seconds:60}];
   if(kind==='write')rules.push({scope:'write-global',subject:'global',limit:3000,seconds:86400});
   await charge(request,rules);
  },
  async signup(request:Request){await charge(request,[{scope:'signup-global',subject:'global',limit:100,seconds:86400}]);},
  async movies(request:Request,cost:number){
   const rules=[{scope:'movie-units',subject:'ip',limit:180,seconds:60,cost},{scope:'movie-global',subject:'global',limit:5000,seconds:86400,cost}];
   const access=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('banguseok-access='))?.slice('banguseok-access='.length);
   if(access){try{const id=await client().user(access);rules.push({scope:'movie-owner',subject:id,limit:180,seconds:60,cost});}catch(e){if(!(e instanceof G1Error)||e.status!==401)return unavailable('AUTH_PROVIDER_UNAVAILABLE');}}
   await charge(request,rules);
  },
  async owner(request:Request,id:string,kind:'save'|'write'|'read'|'session'){
   await charge(request,[{scope:`owner-${kind}`,subject:id,limit:kind==='save'?10:kind==='read'?120:30,seconds:kind==='save'?3600:60}]);
  },
 };
}
export function protectionResponse(error:unknown){
 if(error instanceof G1Error&&error.status===403)return Response.json({code:'ORIGIN_REJECTED',message:'같은 서비스 화면에서 다시 시도해 주세요.'},{status:403,headers:{'Cache-Control':'private, no-store'}});
 if(!(error instanceof ProtectionError))return null;
 const wait=error.retryAfter;
 return Response.json({code:error.code,message:error.status===429?`${wait}초 후 다시 시도해 주세요. 초안과 선정작은 그대로 유지됩니다.`:'요청 보호를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',retryable:true},{status:error.status,headers:{'Cache-Control':'private, no-store',...(wait?{'Retry-After':String(wait)}:{})}});
}
