'use client';
import Script from 'next/script';
import {useCallback,useEffect,useRef,useState} from 'react';
import {validHCaptchaSiteKey} from '@/lib/captcha-config.mjs';
declare global {interface Window {hcaptcha?:{render:(element:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void};banguseokHCaptchaReady?:()=>void}}
export default function HCaptcha({onToken}:{onToken:(token:string)=>void}){
 const target=useRef<HTMLDivElement>(null),widget=useRef<string|null>(null);
 const [failed,setFailed]=useState(false),sitekey=process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
 const fail=useCallback(()=>{onToken('');setFailed(true);},[onToken]);
 const render=useCallback(()=>{
  if(!validHCaptchaSiteKey(sitekey)||!target.current||!window.hcaptcha||widget.current!==null)return;
  try{widget.current=window.hcaptcha.render(target.current,{sitekey,hl:'ko',callback:(token:string)=>{setFailed(false);onToken(token);},'expired-callback':()=>onToken(''),'chalexpired-callback':()=>onToken(''),'error-callback':fail});}catch{fail();}
 },[sitekey,onToken,fail]);
 useEffect(()=>{
  // The SDK onload fires after its asynchronous setup; Script onReady alone is too early.
  window.banguseokHCaptchaReady=render;
  return()=>{if(window.banguseokHCaptchaReady===render)delete window.banguseokHCaptchaReady;if(widget.current!==null)window.hcaptcha?.remove(widget.current);widget.current=null;};
 },[render]);
 if(!validHCaptchaSiteKey(sitekey))return <p role="alert">자동 요청 방지 설정이 필요해요. 초안은 유지됩니다.</p>;
 return <div aria-label="자동 요청 방지 확인"><p>저장 전에 한 번만 확인해 주세요.</p><Script src="https://js.hcaptcha.com/1/api.js?render=explicit&onload=banguseokHCaptchaReady&recaptchacompat=off" strategy="afterInteractive" onReady={render} onError={fail}/><div ref={target}/>{failed&&<p role="alert">확인을 불러오지 못했어요. 연결을 확인하고 페이지를 새로고침해 주세요. 초안은 유지됩니다.</p>}</div>;
}
