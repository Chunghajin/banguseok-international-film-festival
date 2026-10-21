import Link from 'next/link';
import {notFound} from 'next/navigation';
import FestivalPaper from '@/components/festival-paper';
import {createFestivalService} from '@/lib/festivals-server';
import {G1Error} from '@/lib/supabase-core.mjs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const fetchCache='force-no-store';
export const metadata={title:'공식 수상 결과 — 방국제',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function PublicFestival({params}:{params:Promise<{token:string}>}){
 const {token}=await params;if(!/^[A-Za-z0-9_-]{43}$/.test(token))notFound();
 let snapshot;try{snapshot=await createFestivalService().publicRead(token);}catch(e){if(e instanceof G1Error&&e.status===404)notFound();throw new Error('PUBLIC_RESULT_UNAVAILABLE');}
 return <main id="main-content" className="result-page"><FestivalPaper nickname={snapshot.nickname} badge="공개 수상 결과" data={{selections:snapshot.selections,awarded_count:snapshot.awarded_count,unique_movie_count:new Set(snapshot.selections.map(m=>m.tmdb_id)).size,result:snapshot}}/><p className="result-local-note">공개 동의 시 저장한 읽기 전용 결과입니다.</p><Link className="primary-action" href="/">나도 방국제 개최하기 →</Link></main>;
}
