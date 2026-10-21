"use client";

import { useEffect, useRef, useState } from "react";
import type { Movie } from "@/lib/tmdb";

function Poster({ movie }: { movie: Movie }) {
  const [failed, setFailed] = useState(false);
  return movie.poster_url && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element -- Direct TMDB image check, without a second image proxy.
    <img src={movie.poster_url} alt={`${movie.title} 포스터`} width={100} height={150}
      className="h-[150px] w-[100px] shrink-0 object-cover" onError={() => setFailed(true)} />
  ) : <div className="flex h-[150px] w-[100px] shrink-0 items-center border p-2 text-sm">{movie.title} · 포스터 없음</div>;
}

export default function MovieCheck() {
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState<{ items: Movie[]; page: number; has_more: boolean } | null>(null);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [message, setMessage] = useState("영화 제목을 입력하세요.");
  const [retry, setRetry] = useState(0);
  const detailRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query.trim() || composing) return;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(async () => {
      setMessage("검색 중…");
      try {
        const response = await fetch(`/api/movies/search?${new URLSearchParams({ q: query, page: String(page) })}`, { signal: controller.signal });
        const data = await response.json();
        if (!current) return;
        if (!response.ok) { setMessage(data.message || "검색하지 못했어요."); return; }
        setSearch(data);
        setMessage(data.items.length ? `${data.items.length}개 결과 · ${data.page}페이지` : "검색 결과가 없어요.");
      } catch {
        if (current) setMessage("서버에 연결하지 못했어요. 다시 시도해 주세요.");
      }
    }, 350);
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [query, page, composing, retry]);

  useEffect(() => () => detailRequest.current?.abort(), []);

  async function select(movie: Movie) {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setMessage("상세 조회 중…");
    try {
      const response = await fetch(`/api/movies/${movie.tmdb_id}`, { signal: controller.signal });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) { setMessage(data.message || "상세를 불러오지 못했어요."); return; }
      setSelected(data);
      setMessage("상세 조회 완료. 수상작으로 저장하지 않았습니다.");
    } catch { if (!controller.signal.aborted) setMessage("상세에 연결하지 못했어요. 작품을 다시 눌러 주세요."); }
  }

  return <div className="space-y-4">
    <label className="block" htmlFor="movie-query">한국어·영어 영화 제목</label>
    <input id="movie-query" value={query} maxLength={100} className="min-h-11 w-full border bg-white px-3"
      onChange={event => { setQuery(event.target.value); setPage(1); }}
      onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} />
    <p role="status" aria-live="polite">{query.trim() ? message : "영화 제목을 입력하세요."}</p>
    <button type="button" className="min-h-11 border px-4" disabled={!query.trim()} onClick={() => setRetry(value => value + 1)}>다시 검색</button>
    {selected && <section aria-label="선택 영화 상세" className="flex gap-4 border p-4">
      <Poster key={`${selected.tmdb_id}:${selected.poster_path}`} movie={selected} />
      <div className="min-w-0 break-words"><h2 className="font-bold">{selected.title}</h2>
        <p>원제: {selected.original_title ?? "정보 없음"}</p><p>개봉: {selected.release_year ?? "연도 미상"} · ID: {selected.tmdb_id}</p>
        <p className="text-sm">포스터 경로: {selected.poster_path ?? "없음"}</p></div>
    </section>}
    <ul className="space-y-3">{search?.items.map(movie => <li key={movie.tmdb_id}>
      <button type="button" className="flex min-h-11 w-full gap-4 border p-3 text-left" onClick={() => select(movie)}>
        <Poster movie={movie} /><span className="min-w-0 break-words"><strong>{movie.title}</strong><br />
          {movie.release_year ?? "연도 미상"} · {movie.original_title ?? "원제 정보 없음"}<br />ID: {movie.tmdb_id}</span>
      </button>
    </li>)}</ul>
    {search && <div className="flex gap-4">
      <button type="button" className="min-h-11 border px-4" disabled={search.page <= 1} onClick={() => setPage(search.page - 1)}>이전 페이지</button>
      <button type="button" className="min-h-11 border px-4" disabled={!search.has_more} onClick={() => setPage(search.page + 1)}>다음 페이지</button>
    </div>}
  </div>;
}
