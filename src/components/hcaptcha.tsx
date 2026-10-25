'use client';
import Script from 'next/script';
import {useEffect,useRef,useState} from 'react';
import {validHCaptchaSiteKey} from '@/lib/captcha-config.mjs';
declare global {interface Window {hcaptcha?:{render:(element:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void};banguseokHCaptchaReady?:()=>void}}
// Only the provider callback establishes readiness; Script load/ready can precede SDK setup.
let sdkReady=false;
const waiting=new Set<()=>void>();
function sdkLoaded(){sdkReady=true;diagnostic('sdk','ready');for(const render of waiting)render();if(window.banguseokHCaptchaReady===sdkLoaded)delete window.banguseokHCaptchaReady;}
// Exact strings only: https://docs.hcaptcha.com/configuration#error-codes
const providerErrors=new Set(['rate-limited','network-error','invalid-data','challenge-error','challenge-closed','challenge-expired','missing-captcha','invalid-captcha-id','internal-error','script-error']);
function providerCode(value:unknown){return typeof value==='string'&&providerErrors.has(value)?value:'unknown';}
function diagnostic(stage:string,code:string,failure=false){const message=`[hCaptcha] stage=${stage} code=${code}`;if(failure)console.warn(message);else console.info(message);}
export default function HCaptcha({onToken}:{onToken:(token:string)=>void}){
 const target=useRef<HTMLDivElement>(null),scriptFailure=useRef<(()=>void)|null>(null);
 const [failed,setFailed]=useState(false),[loadScript,setLoadScript]=useState(false);
 const sitekey=process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
 useEffect(()=>{
  if(!validHCaptchaSiteKey(sitekey))return;
  diagnostic('lifecycle','mounted');
  let active=true,rendering=false,generation=0,widget:string|null=null;
  const fail=(stage:string,code:string)=>{if(!active)return;diagnostic(stage,code,true);onToken('');setFailed(true);};
  const render=()=>{
   if(!active||!sdkReady||!target.current||widget!==null||rendering)return;
   rendering=true;const current=++generation,live=()=>active&&current===generation;
   let renderFailure='exception';diagnostic('render','started');
   try{
    if(!window.hcaptcha)throw new Error();
    setFailed(false);
    const id=window.hcaptcha.render(target.current,{sitekey,hl:'ko',callback:(token:string)=>{if(live()){diagnostic('widget','token-received');setFailed(false);onToken(token);}},'expired-callback':()=>{if(live()){diagnostic('widget','expired');onToken('');}},'chalexpired-callback':()=>{if(live()){diagnostic('widget','challenge-expired');onToken('');}},'error-callback':(error:unknown)=>{if(live())fail('provider',providerCode(error));}});
    if(typeof id!=='string'||!id){renderFailure='invalid-widget-id';throw new TypeError();}
    widget=id;
    diagnostic('render','returned-awaiting-callback');
   }catch{fail('render',renderFailure);}finally{rendering=false;}
  };
  const scriptFailed=()=>fail('script','load-error');
  scriptFailure.current=scriptFailed;
  waiting.add(render);
  if(!sdkReady)window.banguseokHCaptchaReady=sdkLoaded;
  // Finish registration before a later commit can mount Script.
  queueMicrotask(()=>{if(active){diagnostic('script',sdkReady?'already-ready':'requested');setLoadScript(true);render();}});
  return()=>{
   active=false;generation++;waiting.delete(render);diagnostic('lifecycle','unmounted');
   if(scriptFailure.current===scriptFailed)scriptFailure.current=null;
   const id=widget;widget=null;
   if(id!==null)try{window.hcaptcha?.remove(id);}catch{diagnostic('remove','exception',true);}
  };
 },[sitekey,onToken]);
 if(!validHCaptchaSiteKey(sitekey))return <p role="alert">자동 요청 방지 설정이 필요해요. 초안은 유지됩니다.</p>;
 return <div aria-label="자동 요청 방지 확인"><p>저장 전에 한 번만 확인해 주세요.</p>{loadScript&&<Script src="https://js.hcaptcha.com/1/api.js?render=explicit&onload=banguseokHCaptchaReady&recaptchacompat=off" strategy="afterInteractive" onError={()=>scriptFailure.current?.()}/>}<div ref={target}/>{failed&&<p role="alert">확인을 불러오지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요. 초안은 유지됩니다. <button type="button" onClick={()=>window.location.reload()}>새로고침</button></p>}</div>;
}
