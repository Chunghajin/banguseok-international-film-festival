'use client';
import {useEffect,useRef,useState} from 'react';
import type {Movie} from '@/lib/tmdb';
import {mergeResults,readySearch} from '@/lib/movie-search';
import MoviePoster from './movie-poster';
export async function movieRequest(body:unknown,signal?:AbortSignal){
 const r=await fetch('/api/catalog/movies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(7000)]):AbortSignal.timeout(7000)});
 const data=await r.json();if(!r.ok)throw Error(typeof data.message==='string'?data.message:'영화 정보를 불러오지 못했어요.');return data;
}
export default function MovieSearch({onChoose,pendingId}:{onChoose:(movie:Movie)=>void;pendingId?:number}){
 const [query,setQuery]=useState(''),[page,setPage]=useState(1),[composing,setComposing]=useState(false);
 const [items,setItems]=useState<Movie[]>([]),[hasMore,setHasMore]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[searched,setSearched]=useState(false);
 const requestId=useRef(0);
 useEffect(()=>{
  const id=++requestId.current,controller=new AbortController();
  if(!readySearch({query,page,composing}))return;
  const timer=setTimeout(async()=>{
   setBusy(true);setError('');
   try{const data=await movieRequest({action:'search',query:query.trim(),page},controller.signal);
    if(id!==requestId.current)return;setItems(old=>page===1?data.items:mergeResults(old,data.items));setHasMore(data.has_more);setSearched(true);
   }catch(e){if(!controller.signal.aborted&&id===requestId.current)setError(e instanceof Error?e.message:'검색에 실패했어요.');}
   finally{if(id===requestId.current)setBusy(false);}
  },350);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query,page,composing]);
 return <section className="movie-search" aria-label="영화 직접 검색">
  <label htmlFor="movie-query">영화 제목으로 직접 검색</label>
  <input id="movie-query" type="search" autoFocus value={query} maxLength={200} placeholder="한국어·영어 제목" onCompositionStart={()=>{requestId.current++;setBusy(false);setComposing(true);}} onCompositionEnd={()=>setComposing(false)} onChange={e=>{requestId.current++;setBusy(false);setQuery(e.target.value);setPage(1);setItems([]);setHasMore(false);setSearched(false);setError('');}}/>
  <p className="survey-hint">제목·개봉 연도·원제를 확인해 주세요.</p>
  {[...query.trim()].length>100&&<p role="alert">제목을 100자 이내로 입력해 주세요.</p>}
  {busy&&<p role="status">검색 중…</p>}{error&&<p role="alert" className="form-error">{error}</p>}
  {!busy&&!error&&searched&&items.length===0&&<p role="status">검색 결과가 없어요. 다른 제목으로 찾아보세요.</p>}
  <div className="search-results">{items.map(m=><button type="button" key={m.tmdb_id} className="search-movie" aria-pressed={pendingId===m.tmdb_id} onClick={()=>onChoose(m)}>
   <MoviePoster key={m.poster_path} path={m.poster_path} title={m.title}/><span><strong>{m.title}</strong><span>{m.release_year??'연도 미상'}</span><small>{m.original_title}</small>{pendingId===m.tmdb_id&&<b>선택됨</b>}</span>
  </button>)}</div>
  {hasMore&&page<5&&<button className="text-action" disabled={busy} onClick={()=>setPage(p=>p+1)}>더 보기</button>}
 </section>;
}
