import {CATEGORIES} from '@/lib/award-catalog';
import type {PublicFestival} from '@/lib/festivals-server';
import {imageText} from '@/lib/share-image-layout';

export default function ShareImageCard({snapshot:s, posters}:{snapshot:PublicFestival; posters:(string|null)[]}) {
  const rowHeight = (984 - (s.selections.length-1)*12) / s.selections.length;
  const citation = [s.award_sentence, s.selection_sentence, s.volume_sentence].filter(Boolean).join('\n\n');
  const fittedCitation = imageText(citation, 916, 340, 27);
  return <div style={{display:'flex', flexDirection:'column', width:1080, height:1920, padding:56,
    background:'#F5F0E6', color:'#20201E', fontFamily:'G3Nanum', fontWeight:400}}>
    <header style={{display:'flex', flexDirection:'column', height:210, flexShrink:0, gap:8}}>
      <div style={{display:'flex', fontSize:21}}>BANGUSEOK International Film Festival · {s.created_year}</div>
      <div style={{display:'flex', fontSize:28}}>{s.nickname}의</div>
      <div style={{display:'flex', fontSize:64}}>방구석국제영화제</div>
      <div style={{display:'flex', fontSize:24}}>공식 수상 결과 · {s.awarded_count}개 부문 · {new Set(s.selections.map(m=>m.tmdb_id)).size}편</div>
    </header>
    <div style={{display:'flex', flexDirection:'column', gap:12, marginTop:24, height:984, flexShrink:0}}>
      {s.selections.map((movie,index)=>{
        const fitted = imageText(movie.title, 780, rowHeight-98, s.selections.length===3?38:30);
        return <div key={movie.category_id} style={{display:'flex', alignItems:'center', height:rowHeight, flexShrink:0,
          border:'1px solid #9B9487', padding:12, gap:20}}>
          {posters[index] ? /* eslint-disable-next-line @next/next/no-img-element -- G3 server ImageResponse asset. */
            <img src={posters[index]!} alt="" width={100} height={Math.min(150,rowHeight-26)} style={{objectFit:'cover',flexShrink:0}}/>
            : <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:100,height:Math.min(150,rowHeight-26),
              background:'#E7DFD0',fontSize:18,flexShrink:0}}>포스터 없음</div>}
          <div style={{display:'flex',flexDirection:'column',width:810,gap:8}}>
            <div style={{display:'flex',fontSize:22,lineHeight:1.1,color:'#59564F'}}>{CATEGORIES.find(c=>c.id===movie.category_id)!.name}</div>
            <div style={{display:'flex',fontSize:fitted.fontSize,lineHeight:1.3,whiteSpace:'pre-wrap'}}>{fitted.text}</div>
            <div style={{display:'flex',fontSize:19,lineHeight:1.1,color:'#59564F'}}>{movie.release_year??'연도 미상'}</div>
          </div>
        </div>;
      })}
    </div>
    <div style={{display:'flex',flexDirection:'column',marginTop:24,height:490,flexShrink:0,padding:24,border:'1px solid #9B9487',gap:14}}>
      <div style={{display:'flex',fontSize:23,color:'#59564F'}}>집행위원장 특별상</div>
      <div style={{display:'flex',fontSize:38}}>{s.special_award_title}</div>
      <div style={{display:'flex',fontSize:fittedCitation.fontSize,lineHeight:1.3,whiteSpace:'pre-wrap'}}>{fittedCitation.text}</div>
    </div>
    <footer style={{display:'flex',flexDirection:'column',marginTop:'auto',gap:10,color:'#59564F'}}>
      <div style={{display:'flex',fontSize:22}}>심사위원 만장일치. 심사위원 1명.</div>
      <div style={{display:'flex',fontSize:16}}>영화 정보·포스터: TMDB · 글꼴: 나눔고딕</div>
      <div style={{display:'flex',fontSize:13}}>This product uses the TMDB API but is not endorsed or certified by TMDB.</div>
    </footer>
  </div>;
}
