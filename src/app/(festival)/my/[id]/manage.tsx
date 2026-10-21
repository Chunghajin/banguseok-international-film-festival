'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import FestivalPaper from '@/components/festival-paper';
import {AUTH_NOTICE,deleteFestival,editingDraft,festivalRequest} from '@/lib/festival-browser';
import {currentDraft,saveDraft} from '@/lib/survey-store';
import type {SavedFestival} from '@/lib/festivals-server';
type Share={token:string;published_revision:number}|null;
export default function ManageFestival({id}:{id:string}){
 const router=useRouter(),lock=useRef(false);const [row,setRow]=useState<SavedFestival|null>(null),[share,setShare]=useState<Share>(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false),[remove,setRemove]=useState(false),[replace,setReplace]=useState(false),[copied,setCopied]=useState(false),[origin,setOrigin]=useState('');
 const load=useCallback(async()=>{const data=await festivalRequest(`/api/festivals/${id}`);setRow(data.festival);setShare(data.share);setReady(true);},[id]);
 useEffect(()=>{let active=true;festivalRequest(`/api/festivals/${id}`).then(data=>{if(active){setRow(data.festival);setShare(data.share);setOrigin(window.location.origin);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setReady(true);});return()=>{active=false;};},[id]);
 async function action(kind:'publish'|'unpublish'|'delete'){
  if(!row||lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   if(kind==='delete'){await deleteFestival(id,row.revision);const local=currentDraft();if(local?.editing_festival_id===id)saveDraft({...local,editing_festival_id:null,expected_revision:null,draft_id:crypto.randomUUID()});router.push('/my');return;}
   await festivalRequest(`/api/festivals/${id}/${kind}`,'POST',{revision:row.revision,...(kind==='publish'?{consent}:{})});setConsent(false);await load();
  }catch(e){setError(e instanceof Error?e.message:'처리하지 못했어요. 다시 시도해 주세요.');}finally{lock.current=false;setBusy(false);}
 }
 function edit(force=false){if(!row)return;const local=currentDraft();if(!force&&local&&((local.editing_festival_id!==id&&local.draft_id!==row.client_draft_id)||local.expected_revision!==row.revision)){setReplace(true);return;}saveDraft(editingDraft(row,force?null:local));router.push('/create/result');}
 const url=share?`${origin}/f/${share.token}`:'';
 async function copy(){try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setCopied(false);setError('복사하지 못했어요. 아래 주소를 선택해 복사해 주세요.');}}
 return <main id="main-content" className="result-page">
 {!ready?<p role="status">편집 권한과 서버 저장본을 확인하고 있어요.</p>:!row?<section className="result-empty"><h1 className="entry-title">이 브라우저에서 접근할 수 없어요.</h1><p>{error}</p><p>{AUTH_NOTICE}</p><Link href="/my" className="primary-action">내 영화제 목록으로 →</Link></section>:<>
  <section className="server-status"><p className="section-kicker">SAVED FESTIVAL · REVISION {row.revision}</p><h2>서버 저장 완료 · {share?'공개 중':'비공개'}</h2><p>아래 결과는 서버 저장본입니다. 로컬에서 수정한 내용은 다시 저장해야 반영됩니다.</p></section>
  <FestivalPaper nickname={row.nickname} data={{selections:row.selections,result:row.result,awarded_count:row.selections.length,unique_movie_count:new Set(row.selections.map(m=>m.tmdb_id)).size}} badge={share?'서버 저장본 · 공개 중':'서버 저장본 · 비공개'}/>
  <section className="share-management" aria-label="공유 관리"><h2>공유 관리</h2>
   {share&&<><p>{share.published_revision===row.revision?'공유본은 현재 저장본과 같습니다.':'공유본은 이전 내용입니다. 수정 저장은 공개본을 자동 변경하지 않습니다.'}</p><div data-sensitive="share-address"><label htmlFor="share-address">조회 전용 공개 URL</label><input id="share-address" readOnly value={url} onFocus={e=>e.currentTarget.select()}/><button className="primary-action" onClick={copy}>공개 URL 복사</button><a className="text-action" href={url} target="_blank" rel="noopener noreferrer">공개본 보기 ↗</a></div>{copied&&<p role="status">공개 URL을 복사했어요.</p>}<button className="text-action" disabled={busy} onClick={()=>action('unpublish')}>공개 중단</button></>}
   {(!share||share.published_revision!==row.revision)&&<><p>현재 위에 표시된 내용으로 공유합니다. 설문 답변 원문과 CSV는 공개되지 않습니다. 링크를 아는 사람은 결과를 볼 수 있습니다.</p><label className="public-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>이 내용으로 공개하는 데 동의합니다.</label><button className="primary-action" disabled={!consent||busy} onClick={()=>action('publish')}>{share?'공유본 갱신':'공유 링크 만들기'}</button></>}
  </section>
  <section className="owner-actions"><h2>수정·삭제</h2><p className="survey-hint">{AUTH_NOTICE}</p><button className="primary-action" disabled={busy} onClick={()=>edit()}>로컬 초안에서 수정하기</button>
   {replace&&<div className="storage-notice" role="group" aria-label="편집 초안 교체 확인"><p>현재 로컬 초안을 서버 저장본으로 교체할까요? 저장하지 않은 로컬 수정은 사라집니다. 서버 저장본은 지우지 않습니다.</p><button className="text-action" onClick={()=>setReplace(false)}>취소</button><button className="text-action" onClick={()=>edit(true)}>편집 초안 열기</button></div>}
   <button className="text-action" disabled={busy} onClick={()=>setRemove(true)}>영화제 삭제</button>{remove&&<div className="storage-notice" role="group" aria-label="영화제 삭제 확인"><p>서버 영화제와 공개본을 삭제합니다. 기존 링크는 열리지 않습니다. 로컬 초안은 보존되며 저장본 연결만 해제합니다.</p><button className="text-action" disabled={busy} onClick={()=>setRemove(false)}>삭제 취소</button><button className="primary-action" disabled={busy} onClick={()=>action('delete')}>영구 삭제 확인</button></div>}
  </section>{busy&&<p role="status">처리 중…</p>}{error&&<p role="alert" className="form-error">{error}</p>}<Link className="text-action" href="/my">내 영화제 목록으로</Link>
 </>}
 </main>;
}
