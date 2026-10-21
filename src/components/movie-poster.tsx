'use client';
import {useState} from 'react';
export default function MoviePoster({path,title}:{path:string|null;title:string}){
 const [failed,setFailed]=useState(false);
 const safe=path&&/^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(path);
 return <span className="movie-poster">{safe&&!failed?
  // eslint-disable-next-line @next/next/no-img-element -- TMDB fixed host, native onError preserves the title tile.
  <img src={`https://image.tmdb.org/t/p/w500${path}`} alt="" width={300} height={450} loading="lazy" onError={()=>setFailed(true)}/>:<span>{title}<small>포스터 없음</small></span>}</span>;
}
