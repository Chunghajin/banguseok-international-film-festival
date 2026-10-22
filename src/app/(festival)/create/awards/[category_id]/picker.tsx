'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {CATEGORIES,type CategoryId} from '@/lib/award-catalog';
import {confirmSelection,countSelected,nominate,skipCategory,selection,candidateOrder,type Selection} from '@/lib/award-state';
import {currentDraft,saveDraft,useSurveyDraft} from '@/lib/survey-store';
import type {SurveyDraft} from '@/lib/survey-draft';
import type {Movie} from '@/lib/tmdb';
import {CANDIDATE_MOVIES} from '@/lib/rolling-candidates';
import MoviePoster from '@/components/movie-poster';
import Crayon from '@/components/crayon';
import MovieSearch,{movieRequest} from '@/components/movie-search';
const hydratedCategories=new Map<CategoryId,Movie[]>();
export default function AwardPicker({id}:{id:CategoryId}){
 const state=useSurveyDraft(),draft=state.draft,router=useRouter();
 const category=CATEGORIES.find(c=>c.id===id)!,categoryIndex=CATEGORIES.findIndex(c=>c.id===id);
 const ids=draft?.candidate_order[id];
 const [loaded,setLoaded]=useState<{key:string;items:Movie[]}>({key:'',items:[]});
 const [failure,setFailure]=useState({key:'',message:''}),[retry,setRetry]=useState(0),[searching,setSearching]=useState(false),[choosing,setChoosing]=useState(false),[choiceError,setChoiceError]=useState(''),[confirmSkip,setConfirmSkip]=useState(false);
 const choiceRequest=useRef(0),chooseAbort=useRef<AbortController|null>(null),heading=useRef<HTMLHeadingElement>(null),searchButton=useRef<HTMLButtonElement>(null),skipButton=useRef<HTMLButtonElement>(null),cancelSkip=useRef<HTMLButtonElement>(null);
 const pending=draft?.pending_selection[id],selected=draft?.selections[id],count=draft?countSelected(draft):0;
 const loadKey=id+':'+retry;
 const visible=CANDIDATE_MOVIES.map(m=>loaded.items.find(latest=>latest.tmdb_id===m.tmdb_id)??m);
 const loading=state.ready&&Boolean(draft)&&loaded.key!==loadKey&&failure.key!==loadKey;
 useEffect(()=>{heading.current?.focus();window.scrollTo(0,0);},[id]);
 useEffect(()=>{
  const latest=currentDraft();
  if(state.ready&&latest&&latest.current_question===5&&(latest.current_screen!=='category'||latest.current_category!==id))
   saveDraft({...latest,current_screen:'category',current_category:id});
 },[id,state.ready]);
 useEffect(()=>{if(confirmSkip)cancelSkip.current?.focus();},[confirmSkip]);
 useEffect(()=>()=>{chooseAbort.current?.abort();choiceRequest.current++;},[]);
 useEffect(()=>{
  const latest=currentDraft();if(!state.ready||!latest)return;
  const controller=new AbortController(),requested=latest.candidate_order[id],key=id+':'+retry;
  // Reuse successful category hydration in this tab; rolling itself never requests TMDB.
  const cached=retry===0?hydratedCategories.get(id):undefined;
  const request=cached?Promise.resolve({items:cached}):movieRequest({action:'candidates',ids:requested},controller.signal);
  request.then(data=>{
   if(controller.signal.aborted)return;
   const items:Movie[]=Array.isArray(data.items)?data.items.flatMap((raw:Movie)=>{
    const valid=selection(id,{...raw,category_id:id});
    return valid&&(cached||requested.includes(valid.tmdb_id))?[{...valid,poster_url:null}]:[];
   }):[];
   setLoaded({key,items});
   if(items.length===6){hydratedCategories.set(id,items);setFailure({key:'',message:''});}
   else setFailure({key,message:'최신 영화 정보를 확인하지 못했어요. 확인된 후보로 계속 고를 수 있어요.'});
  }).catch(()=>{if(!controller.signal.aborted)setFailure({key,message:'최신 영화 정보를 확인하지 못했어요. 확인된 후보로 계속 고를 수 있어요.'});});
  return()=>controller.abort();
 },[id,retry,state.ready]);
 function persist(next:SurveyDraft,category:CategoryId=id){saveDraft({...next,current_screen:'category',current_category:category,updated_at:new Date().toISOString()});}
 async function choose(movie:Movie,verifiedCandidate=false){
  if(!draft)return;chooseAbort.current?.abort();const controller=new AbortController();chooseAbort.current=controller;
  const request=++choiceRequest.current;setChoosing(true);setChoiceError('');
  try{const verified=verifiedCandidate?movie:await movieRequest({action:'detail',id:movie.tmdb_id},controller.signal);
   if(request===choiceRequest.current&&!controller.signal.aborted){
    // Read the latest draft: navigation/page changes during the request must not be overwritten.
    const next={...verified,category_id:id} as Selection;
    const latest=currentDraft();if(latest)persist(nominate(latest,id,next));
   }
  }catch(e){if(request===choiceRequest.current&&!controller.signal.aborted)setChoiceError(e instanceof Error?e.message:'영화를 확인하지 못했어요.');}
  finally{if(request===choiceRequest.current)setChoosing(false);}
 }
 function leave(){chooseAbort.current?.abort();choiceRequest.current++;if(draft)saveDraft({...draft,current_screen:'awards',pending_selection:{...draft.pending_selection,[id]:null},updated_at:new Date().toISOString()});router.push('/create/awards');}
 function skip(){if(!draft)return;chooseAbort.current?.abort();choiceRequest.current++;const next=skipCategory(draft,id);saveDraft({...next,current_screen:'awards',updated_at:new Date().toISOString()});router.push('/create/awards');}
 function confirm(){if(!draft||!pending||choosing)return;const result=confirmSelection(draft,id);saveDraft({...result.state,current_screen:result.next?'category':'awards',current_category:result.next??id,updated_at:new Date().toISOString()});router.push(result.next?`/create/awards/${result.next}`:'/create/awards');}
 function refreshCandidates(){const latest=currentDraft();if(!latest)return;persist({...latest,candidate_order:{...latest.candidate_order,[id]:candidateOrder(id,Math.random,latest.survey,latest.candidate_order[id])}});}
 function closeSearch(){setSearching(false);requestAnimationFrame(()=>searchButton.current?.focus());}
 const searchToggle=<button key="search-toggle" className="search-toggle text-action" ref={searchButton} aria-expanded={searching} aria-label={searching?'검색 닫기':'영화 제목으로 직접 검색'} onClick={()=>searching?closeSearch():setSearching(true)}>{searching?'검색 닫기':'직접 검색 ↗'}</button>;
 return <main id="main-content" className="award-picker" data-searching={searching}>
  <div className="survey-topline"><button className="text-action" onClick={leave}>← 목록으로</button><p>수상작 {count}/6</p></div>
  <div className="award-document"><header className="award-heading"><div className="award-document-number" aria-hidden="true">0{categoryIndex+1}<Crayon mark="circle"/></div><p className="section-kicker">AWARD 0{categoryIndex+1} / 06</p><h1 className="entry-title" ref={heading} tabIndex={-1}>{category.name}</h1>
  <p className="category-description">{category.description}</p><p className="viewing-reminder">지금까지 실제로 본 영화 중 골라 주세요.</p>
  </header><div className="award-document-body">
  {state.notice&&<p className="storage-notice" role="status">{state.notice}</p>}
  {!state.ready?<p role="status">초안을 확인하고 있어요.</p>:!draft||draft.current_question!==5?<Link className="primary-action" href="/create/survey">먼저 신고서 작성하기 →</Link>:<>
   {selected&&<p className="current-winner">현재 수상작: {selected.title} ({selected.release_year??'연도 미상'})</p>}
   <div className="movie-exploration">
   {searching&&searchToggle}
   {searching?<MovieSearch key={id} onChoose={movie=>choose(movie)} pendingId={pending?.tmdb_id}/>:<section aria-label="추천 영화 후보">
    <div className="candidate-toolbar"><p className="survey-hint" role="status">{loading?'최신 영화 정보를 확인하는 중…':'추천 후보 6편 · 더 둘러볼 수 있어요'}</p>{searchToggle}</div>
    {failure.key===loadKey&&<div role="alert" className="form-error">{failure.message}<button className="text-action" onClick={()=>setRetry(v=>v+1)}>최신 정보 다시 확인</button></div>}
    <div className="poster-grid">{ids?.map(movieId=>{
     const expected=CANDIDATE_MOVIES.find(m=>m.tmdb_id===movieId)!;
     const movie=visible.find(m=>m.tmdb_id===movieId);
     const valid=movie&&typeof movie.title==='string';
     const checked=(pending??selected)?.tmdb_id===movieId;
     return <button className="poster-card" key={movieId} type="button" disabled={!valid} aria-pressed={checked} aria-label={`${valid?movie.title:expected.title} · ${valid?movie.release_year??'연도 미상':expected.release_year}${!valid?' · 정보 확인 중 또는 정보 없음':''}`} onClick={()=>{if(valid)void choose(movie,true);}}>
      <MoviePoster key={movie?.poster_path??'none'} path={valid?movie.poster_path:null} title={valid?movie.title:expected.title}/>
      <span className="poster-title">{valid?movie.title:expected.title}</span><span className="poster-year">{valid?movie.release_year??'연도 미상':expected.release_year}</span>
      {checked&&<span className="poster-selected"><Crayon mark="check"/>{pending?.tmdb_id===movieId?'선정 대기':'수상작'}</span>}{!valid&&<span className="poster-year">{loading?'로딩 중':'정보 없음'}</span>}
     </button>;
    })}</div>
    <button className="text-action other-candidates" onClick={refreshCandidates}>다른 후보작 둘러보기 ↻</button>
    <p className="survey-hint">후보는 기억을 돕는 예시입니다. 전에 본 후보가 다시 나올 수 있으며, 확정한 수상작은 유지돼요.</p>
   </section>}
   </div>
   {choiceError&&<p role="alert" className="form-error">{choiceError}</p>}
   <div className="selection-bar" data-state={pending||choosing?"pending":selected?"confirmed":"empty"} aria-live="polite"><p>{choosing?'영화 정보 확인 중…':pending?<>선정 대기 <strong>{pending.title}</strong><span>{pending.release_year??'연도 미상'}</span></>:selected?`현재: ${selected.title}`:'수여할 작품을 선택해 주세요.'}</p>
    <button className="primary-action" disabled={!pending||choosing} onClick={confirm}>이 작품에 수여</button>
    {count>=3&&<Link className="text-action" href="/create/review" onClick={()=>saveDraft({...draft,current_screen:'review',updated_at:new Date().toISOString()})}>{count}개 선정됨 · 시상식 열기</Link>}
   </div>
   <button className="text-action skip-question" ref={skipButton} onClick={()=>selected?setConfirmSkip(true):skip()}>이 부문 건너뛰기</button>
   {confirmSkip&&<div className="skip-confirm" role="group" aria-label="수상작 제거 확인"><p>현재 수상작을 제거하고 이 부문을 건너뛸까요?</p><button className="text-action" ref={cancelSkip} onClick={()=>{setConfirmSkip(false);skipButton.current?.focus();}}>취소</button><button className="text-action" onClick={skip}>제거하고 건너뛰기</button></div>}
   <nav className="category-navigation" aria-label="시상 부문 이동">
    {categoryIndex>0?<Link href={`/create/awards/${CATEGORIES[categoryIndex-1].id}`} onClick={()=>persist(draft,CATEGORIES[categoryIndex-1].id)}>← 이전 부문</Link>:<span/>}
    {categoryIndex<5&&<Link href={`/create/awards/${CATEGORIES[categoryIndex+1].id}`} onClick={()=>persist(draft,CATEGORIES[categoryIndex+1].id)}>다음 부문 →</Link>}
   </nav>
  </>}
  </div></div>
 </main>;
}
