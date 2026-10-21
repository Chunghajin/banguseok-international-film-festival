'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {AUTH_NOTICE,festivalRequest,FestivalRequestError} from '@/lib/festival-browser';
import type {SavedFestival} from '@/lib/festivals-server';
export default function MyFestivals(){
 const [items,setItems]=useState<SavedFestival[]>([]),[cursor,setCursor]=useState<string|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;festivalRequest('/api/festivals').then(data=>{if(active){setItems(data.items);setCursor(data.next_cursor);}}).catch(e=>{if(active)setError(e instanceof FestivalRequestError&&e.status===401?'이 브라우저에서 확인할 수 있는 영화제가 없어요.':e.message);}).finally(()=>{if(active)setReady(true);});return()=>{active=false;};},[]);
 async function more(){setBusy(true);try{const data=await festivalRequest(`/api/festivals?cursor=${encodeURIComponent(cursor!)}`);setItems(old=>[...new Map([...old,...data.items].map(row=>[row.id,row])).values()]);setCursor(data.next_cursor);}catch(e){setError(e instanceof Error?e.message:'목록을 불러오지 못했어요.');}finally{setBusy(false);}}
 return <main id="main-content" className="awards-page"><p className="section-kicker">MY FESTIVALS</p><h1 className="entry-title">내 영화제</h1><p className="survey-hint">{AUTH_NOTICE}</p>
 {!ready&&<p role="status">이 브라우저의 영화제를 확인하고 있어요.</p>}{error&&<p role="status" className="storage-notice">{error}</p>}{ready&&!error&&!items.length&&<p>저장한 영화제가 없어요.</p>}
 <ul className="my-festival-list">{items.map(row=><li key={row.id}><Link href={`/my/${row.id}`}><strong>{row.nickname}의 영화제</strong><span>{row.selections.length}개 부문 · {new Date(row.created_at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})}</span><span>결과·공유 관리 →</span></Link></li>)}</ul>
 {cursor&&<button className="text-action" onClick={more} disabled={busy}>더 보기</button>}<Link className="primary-action" href="/">로컬 초안 이어쓰기 →</Link></main>;
}
