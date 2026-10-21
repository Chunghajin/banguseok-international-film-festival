export const G3_CASES = ["posters", "text", "missing", "poster-error", "font-error", "render-error"] as const;
export type G3Case = typeof G3_CASES[number];

// Fixed, TMDB-verified public metadata; no user results, survey answers, or secrets.
export const G3_MOVIES = [
  { tmdb_id: 496243, title: "기생충", year: 2019, poster_path: "/jjHccoFjbqlfr4VGLVLT7yek0Xn.jpg" },
  { tmdb_id: 545611, title: "에브리씽 에브리웨어 올 앳 원스", year: 2022, poster_path: "/dd29Kt2p2voyP2sB6p3jC36A7ce.jpg" },
  { tmdb_id: 27205, title: "인셉션", year: 2010, poster_path: "/atSxEGstxXRoSKDQFBgqQ5lpGSt.jpg" },
];
export const G3_BODY = "한글 본문과 줄바꿈을 확인합니다.\n두 번째 줄에도 문장이 이어집니다.";
export const G3_SYMBOLS = "〈영화〉 · “만장일치” — 1명! ①②③ & 100% / (2026)";
// Long-title stress text; not used as verified TMDB metadata.
export const G3_LONG_TITLE = "보랏 속편: 괄목할 만한 뇌물 전미국 정권 전달과 카자흐스탄의 국익 증진을 위한 여정";

export function g3Enabled(env: Record<string, string | undefined> = process.env) {
  return env.NODE_ENV === "development" || (env.VERCEL_ENV === "preview" && env.G3_PROBE_ENABLED === "yes");
}

export function g3Input(params: URLSearchParams): { mode: G3Case; count: number } {
  const mode = params.get("mode") ?? "posters";
  const count = params.get("count") ?? "3";
  if (!G3_CASES.includes(mode as G3Case) || !/^[3-6]$/.test(count)) throw new Error("INVALID_G3_CASE");
  return { mode: mode as G3Case, count: Number(count) };
}
