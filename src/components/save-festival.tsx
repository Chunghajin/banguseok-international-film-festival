'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import HCaptcha from './hcaptcha';
import {useRouter} from 'next/navigation';
import {AUTH_NOTICE,attachSaved,FestivalRequestError,festivalRequest,savePayload} from '@/lib/festival-browser';
import {currentDraft,saveDraft} from '@/lib/survey-store';
import type {SurveyDraft} from '@/lib/survey-draft';
export default function SaveFestival({draft}:{draft:SurveyDraft}){
 const router=useRouter(),lock=useRef(false);const [busy,setBusy]=useState(false),[error,setError]=useState(''),[needsCaptcha,setNeedsCaptcha]=useState(false),[captchaToken,setCaptchaToken]=useState(''),[attempt,setAttempt]=useState(0);
 async function save(){if(lock.current)return;lock.current=true;setBusy(true);setError('');const submitted=currentDraft()??draft;
  try{await festivalRequest('/api/session','POST',captchaToken?{captcha_token:captchaToken}:{});setNeedsCaptcha(false);const {festival}=await festivalRequest('/api/festivals','POST',savePayload(submitted));const latest=currentDraft();if(latest?.draft_id===submitted.draft_id)saveDraft(attachSaved(latest,submitted,festival));router.push(`/my/${festival.id}?saved=1`);}
  catch(e){if(e instanceof FestivalRequestError&&['CAPTCHA_REQUIRED','CAPTCHA_FAILED'].includes(e.code??''))setNeedsCaptcha(true);setError(e instanceof Error?e.message:'저장하지 못했어요. 초안은 유지됩니다.');}finally{lock.current=false;setBusy(false);setCaptchaToken('');setAttempt(n=>n+1);}
 }
 return <section className="save-festival" aria-label="영화제 저장"><h2>{draft.editing_festival_id?'수정 내용 저장':'이 결과로 내 영화제 개최하기'}</h2><p>먼저 비공개로 저장합니다. 공개 링크는 저장 후 내용을 확인하고 직접 만들 수 있어요.</p><p className="survey-hint">{AUTH_NOTICE}</p>
  {draft.editing_festival_id&&<p className="storage-notice">서버 저장본과 연결된 로컬 편집 초안입니다. 수정 저장만으로 공개본은 바뀌지 않습니다. <Link href={`/my/${draft.editing_festival_id}`}>서버 저장본 확인</Link></p>}
  {needsCaptcha&&<HCaptcha key={attempt} onToken={setCaptchaToken}/>}
  {error&&<p role="alert" className="form-error">{error}</p>}{busy&&<p role="status">인증·영화 확인 후 저장하고 있어요. 중복 클릭하지 않아도 됩니다.</p>}
  <button className="primary-action" disabled={busy||(needsCaptcha&&!captchaToken)} onClick={save}>{busy?'저장 중…':draft.editing_festival_id?'수정 내용 비공개 저장':'내 영화제 개최하기'}</button>
 </section>;
}
