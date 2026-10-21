'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {CATEGORIES} from '@/lib/award-catalog';
import {countSelected} from '@/lib/award-state';
import {saveDraft,useSurveyDraft} from '@/lib/survey-store';
export default function AwardsEntry(){
 const state=useSurveyDraft(),router=useRouter(),draft=state.draft;
 const count=draft?countSelected(draft):0;
 return <main id="main-content" className="awards-page">
  <div className="survey-topline"><Link className="text-action" href="/create/survey" onClick={()=>{if(draft)saveDraft({...draft,current_screen:'survey'});}}>← 설문으로</Link><p>수상작 선정 {count}/6</p></div>
  <p className="section-kicker">OFFICIAL SELECTION</p><h1 className="entry-title">당신의 수상작을<br/>발표해 주세요.</h1>
  <p>지금까지 실제로 본 영화 중 골라 주세요.<br/>3개 부문만 정하면 시상식을 열 수 있습니다.</p>
  {state.notice&&<p className="storage-notice" role="status">{state.notice}</p>}
  {!state.ready?<p role="status">초안을 확인하고 있어요.</p>:!draft||draft.current_question!==5?<Link className="primary-action" href="/create/survey">먼저 신고서 작성하기 →</Link>:<>
   <ol className="category-list">{CATEGORIES.map((c,i)=>{const selected=draft.selections[c.id],skipped=draft.skipped_categories.includes(c.id);return <li key={c.id}>
    <span className="category-index">0{i+1}</span><div><h2>{c.name}</h2><p>{c.description}</p><p className="category-status">{selected?`${selected.title} · ${selected.release_year??'연도 미상'}`:skipped?'이번에는 미시상':'아직 선정하지 않았어요'}</p>
    <Link href={`/create/awards/${c.id}`} onClick={()=>saveDraft({...draft,current_screen:'category',current_category:c.id})} aria-label={`${c.name} ${selected?'변경':'선정하기'}`}>{selected?'변경':'선정하기'} →</Link></div>
   </li>;})}</ol>
   <button className="primary-action" disabled={count<3} onClick={()=>{saveDraft({...draft,current_screen:'review',updated_at:new Date().toISOString()});router.push('/create/review');}}>{count>=3?`${count}개 선정됨 · 시상식 열기`:`${3-count}개 부문 더 선정해 주세요`}</button>
   <p className="survey-hint">같은 영화를 여러 부문에 선정해도 됩니다. 모든 부문을 방문할 필요는 없어요.</p>
  </>}
 </main>;
}
