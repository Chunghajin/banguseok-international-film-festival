import { notFound } from "next/navigation";
import MovieCheck from "./movie-check";

export default function TmdbCheckPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <main className="mx-auto max-w-[720px] space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">G2 영화 검색·상세 검증</h1>
      <p>개발용 화면입니다. 검색 후 작품을 눌러 상세와 포스터를 확인하세요. 수상작으로 저장하지 않습니다.</p>
      <MovieCheck />
      <p className="text-sm">영화 정보·이미지: TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </main>
  );
}
