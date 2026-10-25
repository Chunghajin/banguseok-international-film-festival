import Image from 'next/image';

export default function TmdbCredits() {
  return <section className="tmdb-credits" aria-labelledby="tmdb-credits-title">
    <h2 id="tmdb-credits-title">출처 및 크레딧</h2>
    <a href="https://www.themoviedb.org/" aria-label="TMDB 홈페이지">
      <Image src="/tmdb/blue-short.svg" alt="TMDB" width={274} height={36} unoptimized style={{width:120,height:'auto'}} />
    </a>
    <p>영화 정보와 포스터: TMDB.</p>
    <p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
  </section>;
}
