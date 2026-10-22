import {CATEGORIES} from '@/lib/award-catalog';
import type {Selection} from '@/lib/award-state';
import MoviePoster from './movie-poster';
import Crayon from './crayon';
export type PaperData={selections:Selection[];awarded_count:number;unique_movie_count:number;result:{special_award_title:string;award_sentence:string;selection_sentence:string;volume_sentence:string|null}};

/** Read-only paper shared by local preview, owner management and public snapshots.
 * Save/auth/share controls remain with callers, including M6 ShareImageActions. */
export default function FestivalPaper({nickname,data,badge}:{nickname:string;data:PaperData;badge:string}){
 return <>
  <header className="result-masthead">
   <div className="result-edition"><span>BANGUSEOK International Film Festival</span><span className="result-local-badge">{badge}</span></div>
   <div className="result-announcement">
    <div className="result-emblem" aria-hidden="true"><Crayon mark="laurel"/><div><span>방구석국제영화제</span><strong>공식<br/>수상 발표</strong></div></div>
    <div className="result-identity"><p className="result-chair">{nickname}의</p><h1>방구석국제영화제</h1><p className="result-slogan">심사위원 만장일치.<br/>심사위원 1명.</p>
     <div className="result-tally"><span>공식 수상 발표</span><span>{data.awarded_count}개 부문 · {data.unique_movie_count}편</span></div><p className="hand-note">성대하게, 혼자.</p>
    </div>
   </div>
  </header>
  <section className="result-winners" aria-labelledby="winners-title">
   <div className="result-section-heading"><span aria-hidden="true">01</span><h2 id="winners-title">공식 수상작</h2><p>한 사람의 만장일치.</p></div>
   <ol className="result-film-grid">{data.selections.map((movie,index)=>{
    const category=CATEGORIES.find(c=>c.id===movie.category_id)!;
    return <li key={movie.category_id} className={`result-film ${movie.category_id==='grand'?'result-grand':''}`} data-category={movie.category_id}>
     <MoviePoster key={`${movie.tmdb_id}:${movie.poster_path}`} path={movie.poster_path} title={movie.title}/>
     <div className="result-film-caption"><span className="result-film-order" aria-hidden="true">0{index+1}</span><h3>{category.name}</h3><p className="result-film-title">{movie.title}</p><p className="result-film-year">{movie.release_year??'연도 미상'}</p><Crayon mark="check" className="winner-check"/></div>
    </li>;
   })}</ol>
  </section>
  <section className="result-special" aria-labelledby="special-title">
   <div className="result-section-heading"><span aria-hidden="true">02</span><h2 id="special-title">집행위원장 특별상</h2></div>
   <div className="result-citation"><Crayon mark="pixel-trophy"/><p className="citation-kicker">THE CHAIRPERSON’S SPECIAL AWARD</p><h3>{data.result.special_award_title}</h3><p className="award-sentence">{data.result.award_sentence}</p>
    <div className="result-verdict"><span className="result-stamp" aria-hidden="true">만장일치<br/><b>1명</b></span><p className="selection-sentence">{data.result.selection_sentence}</p></div>
    {data.result.volume_sentence&&<p className="volume-sentence">{data.result.volume_sentence}</p>}
   </div><p className="result-humour-note">특별상은 설문 답변과 시상 내역을 소재로 한 농담입니다.</p>
  </section>
  <footer className="result-colophon"><p>BANGUSEOK<br/>International Film Festival</p><p>심사위원 만장일치. 심사위원 1명.</p></footer>
 </>;
}
