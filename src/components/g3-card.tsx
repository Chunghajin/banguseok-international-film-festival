import { G3_BODY, G3_LONG_TITLE, G3_MOVIES, G3_SYMBOLS } from "@/lib/g3-fixture";

export default function G3Card({ posters, count = 3, onPosterError }: {
  posters: (string | null)[]; count?: number; onPosterError?: (index: number) => void;
}) {
  return <div style={{ width: 1080, height: 1920, display: "flex", flexDirection: "column",
    padding: 64, background: "#F5F0E6", color: "#20201E", fontFamily: "G3Nanum", fontWeight: 400 }}>
    <div style={{ display: "flex", fontSize: 26 }}>BANGUSEOK International Film Festival</div>
    <div style={{ display: "flex", fontSize: 68, marginTop: 28 }}>방국제 · 한글 PNG 검증</div>
    <div style={{ display: "flex", fontSize: 34, marginTop: 20 }}>심사위원 만장일치. 심사위원 1명.</div>
    <div style={{ display: "flex", fontSize: 30, lineHeight: 1.5, whiteSpace: "pre-wrap", marginTop: 24 }}>{G3_BODY}</div>
    <div style={{ display: "flex", fontSize: 27, marginTop: 20 }}>{G3_SYMBOLS}</div>
    <div style={{ display: "flex", flexWrap: "wrap", marginTop: 32, gap: 20 }}>
      {Array.from({ length: count }, (_, index) => {
        const movie = G3_MOVIES[index % G3_MOVIES.length];
        const poster = posters[index % G3_MOVIES.length];
        return <div key={index} style={{ display: "flex", width: count > 3 ? 466 : 952, height: 270,
          border: "2px solid #59564F", padding: 14, gap: 20, alignItems: "center" }}>
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element -- Same JSX is rendered by the browser and ImageResponse.
            <img src={poster} alt={`${movie.title} 포스터`} width={150} height={225}
              style={{ objectFit: "cover", flexShrink: 0 }} onError={onPosterError ? () => onPosterError(index % 3) : undefined} />
          ) : <div style={{ display: "flex", width: 150, height: 225, flexShrink: 0, alignItems: "center",
            justifyContent: "center", background: "#E7DFD0", fontSize: 26, padding: 12 }}>포스터 없음</div>}
          <div style={{ display: "flex", flexDirection: "column", width: count > 3 ? 246 : 732, flexShrink: 1, gap: 16 }}>
            <div style={{ display: "flex", fontSize: 24, color: "#59564F" }}>검증 작품 {index + 1}</div>
            <div style={{ display: "flex", width: "100%", fontSize: count > 3 ? 28 : 42, lineHeight: 1.35, wordBreak: "break-word" }}>{movie.title}</div>
            <div style={{ display: "flex", fontSize: 24 }}>{movie.year} · ID {movie.tmdb_id}</div>
          </div>
        </div>;
      })}
    </div>
    <div style={{ display: "flex", flexDirection: "column", marginTop: 34, gap: 14 }}>
      <div style={{ display: "flex", fontSize: 25, color: "#59564F" }}>긴 영화 제목 · 전체 줄바꿈 시험</div>
      <div style={{ display: "flex", fontSize: 38, lineHeight: 1.45 }}>{G3_LONG_TITLE}</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 14, fontSize: 23, color: "#59564F" }}>
      <div style={{ display: "flex" }}>G3 기술 검증용 예시 · 실제 사용자 결과가 아닙니다.</div>
      <div style={{ display: "flex" }}>영화 정보·포스터: TMDB · 글꼴: 나눔고딕 (SIL OFL 1.1)</div>
      <div style={{ display: "flex", fontSize: 17 }}>This product uses the TMDB API but is not endorsed or certified by TMDB.</div>
    </div>
  </div>;
}
