import 'server-only';
import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {platformContext,protectionConfig,POLICY_VERSION} from './request-protection.ts';

export const PREVIEW_ORIGIN='https://banguseok-film-festival-preview-mikechung0918.vercel.app';
export const PREVIEW_PROBE='/api/dev/m5';
const mac=(key:string,value:unknown)=>createHmac('sha256',key).update(JSON.stringify(value)).digest('hex');
export function previewConfiguration(env:NodeJS.ProcessEnv){
 const config=protectionConfig(env);
 if(config.origins.length!==1||config.origins[0]!==PREVIEW_ORIGIN)throw Error('PREVIEW_ORIGIN_REQUIRED');
 return config;
}
export function probeHeaders(env:NodeJS.ProcessEnv,nonce=randomBytes(24).toString('hex'),time=String(Date.now())){
 const {secret}=previewConfiguration(env);
 return {'x-m5-nonce':nonce,'x-m5-time':time,authorization:`Bearer ${mac(secret,['m5-preview-probe',PREVIEW_PROBE,nonce,time])}`};
}
export function probeMetadata(env:NodeJS.ProcessEnv,nonce:string){
 const c=previewConfiguration(env);
 if(!env.SUPABASE_SERVICE_ROLE_KEY||!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||!env.TMDB_READ_ACCESS_TOKEN)throw Error('PREVIEW_CREDENTIALS_REQUIRED');
 return {probeVersion:2,challenge:nonce,origin:PREVIEW_ORIGIN,hostname:new URL(PREVIEW_ORIGIN).hostname,siteKey:c.siteKey,fingerprint:c.fingerprint,policy:POLICY_VERSION,
  // Challenge-bound equality proof; credentials themselves never leave the server.
  proof:mac(c.secret,['m5-preview-config',nonce,c.fingerprint,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,env.SUPABASE_SERVICE_ROLE_KEY,env.TMDB_READ_ACCESS_TOKEN])};
}
export function createPreviewProbe(env=process.env,clientSiteKey=env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY){
 return function GET(request:Request){
  const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'};
  try{
   if(env.VERCEL_ENV!=='preview'||request.method!=='GET'||new URL(request.url).search)throw Error();
   const config=previewConfiguration(env);if(config.siteKey!==clientSiteKey)throw Error();platformContext(request,env,config.origins);
   if(request.headers.get('sec-fetch-site')==='cross-site')throw Error();
   const nonce=request.headers.get('x-m5-nonce')??'',time=request.headers.get('x-m5-time')??'';
   if(!/^[a-f0-9]{48}$/.test(nonce)||!/^\d{13}$/.test(time)||Math.abs(Date.now()-Number(time))>60000)throw Error();
   const expected=probeHeaders(env,nonce,time).authorization,actual=request.headers.get('authorization')??'';
   if(actual.length!==expected.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))throw Error();
   const metadata=probeMetadata(env,nonce);
   if(request.headers.get('accept')==='application/json')return Response.json(metadata,{headers});
   const scriptNonce=randomBytes(18).toString('base64');
   const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M5 Preview 확인</title><main><h1>Preview hCaptcha 검증</h1><p>이 화면은 토큰을 메모리에만 보관합니다. 저장·가입·증명 등록은 실행하지 않습니다.</p><div class="h-captcha" data-sitekey="${config.siteKey}" data-callback="verified" data-expired-callback="expired" data-chalexpired-callback="expired" data-error-callback="failed"></div><p id="status" role="status">실제 확인을 완료해 주세요.</p></main><script id="m5-config" type="application/json">${JSON.stringify(metadata).replaceAll('<','\\u003c')}</script><script nonce="${scriptNonce}">window.m5Token='';window.m5State={status:'waiting',issuedAt:null,error:null};function verified(token){window.m5State={status:'verified',issuedAt:Date.now(),error:null};window.m5Token=token;document.getElementById('status').textContent='확인했습니다. 검증 프로세스가 진행합니다.';}function expired(){window.m5State={status:'expired',issuedAt:null,error:null};window.m5Token='';document.getElementById('status').textContent='다시 확인해 주세요.';}function failed(code){window.m5Token='';window.m5State={status:'error',issuedAt:null,error:['network-error','rate-limited','invalid-data','challenge-error','internal-error'].includes(code)?code:'unclassified'};document.getElementById('status').textContent='확인에 실패했습니다. 검증을 중단합니다.';}</script><script src="https://js.hcaptcha.com/1/api.js?hl=ko&recaptchacompat=off" async defer></script></html>`;
   return new Response(html,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${scriptNonce}' https://hcaptcha.com https://*.hcaptcha.com; frame-src https://hcaptcha.com https://*.hcaptcha.com; connect-src https://hcaptcha.com https://*.hcaptcha.com; img-src data: https://hcaptcha.com https://*.hcaptcha.com; style-src 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`}});
  }catch{return new Response(null,{status:404,headers});}
 };
}
