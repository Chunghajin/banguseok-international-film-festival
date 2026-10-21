'use client';
import Link from 'next/link';
import {useEffect} from 'react';
import {previewFromDraft,ResultInputError,type FestivalPreview} from '@/lib/festival-result';
import {currentDraft,saveDraft,useSurveyDraft} from '@/lib/survey-store';
import FestivalPaper from '@/components/festival-paper';
import SaveFestival from '@/components/save-festival';
export default function ResultPreview(){
 const state=useSurveyDraft(),draft=state.draft;
 let preview:FestivalPreview|null=null,error='';
 if(draft){try{preview=previewFromDraft(draft);}catch(e){error=e instanceof ResultInputError&&e.code==='NOT_ENOUGH_SELECTIONS'?'3개 부문을 선정해 주세요.':'초안의 결과 입력을 확인해 주세요.';}}
 const valid=Boolean(preview);
 useEffect(()=>{const latest=currentDraft();if(valid&&latest&&latest.current_screen!=='result')saveDraft({...latest,current_screen:'result'});},[valid]);
 const chair=draft?.nickname.trim().normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu,'')||'익명의 집행위원장';
 const chairName=[...new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(chair)].slice(0,12).map(s=>s.segment).join('');
 return <main id="main-content" className="result-page">
  {state.notice&&<p className="storage-notice" role="status">{state.notice}</p>}
  {!state.ready?<p role="status">로컬 초안의 수상 기록을 확인하고 있어요.</p>:!preview?<section className="result-empty"><p className="section-kicker">OFFICIAL ANNOUNCEMENT</p><h1 className="entry-title">{draft?error:'작성 중인 초안이 없어요.'}</h1><p>공식 결과지는 확정한 수상작이 3개 부문 이상일 때 만들 수 있어요.</p><Link className="primary-action" href={draft?'/create/awards':'/'}>{draft?'수상작 선정으로 →':'방국제 입구로 →'}</Link></section>:<>
   <FestivalPaper nickname={chairName} data={preview} badge={draft?.editing_festival_id?"로컬 편집 미리보기":"로컬 미리보기 · 미게시"}/>
   {draft&&<SaveFestival draft={draft}/>}
   <nav className="result-edit" aria-label="결과 재편집"><Link className="primary-action" href="/create/awards" onClick={()=>{if(draft)saveDraft({...draft,current_screen:'awards',current_question:5});}}>수상작 고치기 →</Link><Link className="text-action" href="/create/survey" onClick={()=>{if(draft)saveDraft({...draft,current_screen:'survey',current_question:0});}}>설문 고치기</Link></nav>
   <p className="result-local-note">이 브라우저의 로컬 초안으로 만든 미리보기입니다.<br/>{draft?.editing_festival_id?"서버 저장본과 공개본은 수정 내용을 저장·공유 갱신한 뒤 바뀝니다.":"서버에 저장하거나 공개하지 않았습니다."}</p>
  </>}
 </main>;
}
