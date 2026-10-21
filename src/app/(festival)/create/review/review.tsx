'use client';
import Link from 'next/link';
import {CATEGORIES} from '@/lib/award-catalog';
import {countSelected} from '@/lib/award-state';
import {saveDraft,useSurveyDraft} from '@/lib/survey-store';
export default function Review(){
 const state=useSurveyDraft(),draft=state.draft,count=draft?countSelected(draft):0;
 return <main id="main-content" className="awards-page review-page"><div className="review-masthead"><p className="section-kicker">SELECTION COMPLETE</p>{count>=3&&<span className="completion-seal" aria-hidden="true">선정<br/>완료</span>}</div><h1 className="entry-title">{count>=3?'수상작 선정 완료.':'3개 부문을 선정해 주세요.'}</h1>
  {state.notice&&<p className="storage-notice" role="status">{state.notice}</p>}
  {!state.ready?<p role="status">초안을 확인하고 있어요.</p>:<>
   {draft&&<><p className="review-summary">총 <strong>{count}개 부문</strong> / {new Set(Object.values(draft.selections).filter(Boolean).map(m=>m!.tmdb_id)).size}편</p><ul className="review-list">{CATEGORIES.filter(c=>draft.selections[c.id]).map(c=><li key={c.id}><h2>{c.name}</h2><p className="review-film"><strong>{draft.selections[c.id]!.title}</strong><span>{draft.selections[c.id]!.release_year??'연도 미상'}</span></p><Link href={`/create/awards/${c.id}`} aria-label={`${c.name} 수상작 변경`}>변경 →</Link></li>)}</ul></>}
   {count>=3&&<div className="next-stage-note"><span className="sample-mark">로컬 미리보기</span><h2>이제, 공식 수상 발표.</h2><p>확정 수상작과 설문으로 결과지를 만듭니다. 서버 저장·공개는 아직 하지 않습니다.</p><Link className="primary-action" href="/create/result">공식 결과지 미리보기 →</Link></div>}
   <Link className="primary-action" href="/create/awards" onClick={()=>{if(draft)saveDraft({...draft,current_screen:'awards'});}}>수상작 목록으로 →</Link>
   <Link className="text-action" href="/create/survey" onClick={()=>{if(draft)saveDraft({...draft,current_screen:'survey'});}}>설문 고치기</Link>
  </>}
 </main>;
}
