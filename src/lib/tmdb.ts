import "server-only";

export type Movie = {
  tmdb_id: number;
  title: string;
  original_title: string | null;
  release_year: number | null;
  poster_path: string | null;
  poster_url: string | null;
};

export class MovieError extends Error {
  status: number;
  code: string;
  retryable: boolean;
  constructor(status: number, code: string, message: string, retryable = false) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export function movieErrorResponse(error: unknown) {
  const safe = error instanceof MovieError ? error
    : new MovieError(503, "MOVIES_UNAVAILABLE", "영화 정보를 불러오지 못했어요.", true);
  return Response.json({ code: safe.code, message: safe.message, retryable: safe.retryable }, {
    status: safe.status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export function posterUrl(path: unknown): string | null {
  return typeof path === "string" && /^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(path)
    ? `https://image.tmdb.org/t/p/w500${path}` : null;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MovieError(502, "TMDB_BAD_RESPONSE", "영화 정보 형식을 확인하지 못했어요.", true);
  }
  return value as Record<string, unknown>;
}

export function normalizeMovie(value: unknown): Movie {
  const raw = object(value);
  if (!Number.isSafeInteger(raw.id) || Number(raw.id) < 1 || Number(raw.id) > 2147483647) {
    throw new MovieError(502, "TMDB_BAD_RESPONSE", "영화 정보를 확인하지 못했어요.", true);
  }
  const original = typeof raw.original_title === "string" ? raw.original_title.trim() || null : null;
  const title = (typeof raw.title === "string" ? raw.title.trim() : "") || original || "제목 정보 없음";
  const date = typeof raw.release_date === "string" ? raw.release_date : "";
  const year = /^\d{4}-\d{2}-\d{2}$/.test(date) && Number(date.slice(0, 4)) > 0 ? Number(date.slice(0, 4)) : null;
  const url = posterUrl(raw.poster_path);
  return { tmdb_id: Number(raw.id), title, original_title: original, release_year: year,
    poster_path: url ? raw.poster_path as string : null, poster_url: url };
}

export function movieId(value: string): number {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
    throw new MovieError(400, "INVALID_MOVIE_ID", "올바른 영화 ID를 입력해 주세요.");
  }
  return Number(value);
}

export function searchInput(query: string, page = "1") {
  const q = query.trim();
  if ([...q].length < 1 || [...q].length > 100) {
    throw new MovieError(400, "INVALID_QUERY", "영화 제목을 1~100자로 입력해 주세요.");
  }
  if (!/^[1-5]$/.test(page)) throw new MovieError(400, "INVALID_PAGE", "검색 페이지는 1~5만 사용할 수 있어요.");
  return { q, page: Number(page) };
}

export function createTmdbClient({ token = process.env.TMDB_READ_ACCESS_TOKEN, fetcher = fetch } = {}) {
  async function request(path: string, params: Record<string, string>, callerSignal?: AbortSignal): Promise<unknown> {
    if (!token?.trim()) throw new MovieError(503, "TMDB_NOT_CONFIGURED", "영화 검색 서버 설정이 필요해요.");
    const url = new URL(`https://api.themoviedb.org/3/${path}`);
    url.search = new URLSearchParams({ language: "ko-KR", ...params }).toString();
    const timeout = AbortSignal.timeout(5000);
    const signal = callerSignal ? AbortSignal.any([timeout, callerSignal]) : timeout;
    try {
      const response = await fetcher(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store", redirect: "error", signal });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new MovieError(503, "TMDB_AUTH_FAILED", "영화 검색 서버의 인증 설정을 확인해야 해요.");
        }
        if (response.status === 404) throw new MovieError(404, "MOVIE_NOT_FOUND", "해당 영화를 찾지 못했어요.");
        if (response.status === 429) throw new MovieError(429, "TMDB_RATE_LIMITED", "요청이 많아요. 잠시 후 다시 시도해 주세요.", true);
        throw new MovieError(502, "TMDB_UPSTREAM_ERROR", "영화 서비스가 응답하지 않아요. 다시 시도해 주세요.", true);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof MovieError) throw error;
      if (error instanceof SyntaxError) throw new MovieError(502, "TMDB_BAD_RESPONSE", "영화 정보 형식을 확인하지 못했어요.", true);
      if (timeout.aborted || (error instanceof Error && error.name === "TimeoutError")) {
        throw new MovieError(503, "TMDB_TIMEOUT", "영화 조회 시간이 초과됐어요. 다시 시도해 주세요.", true);
      }
      throw new MovieError(503, "TMDB_NETWORK_ERROR", "영화 서비스에 연결하지 못했어요. 다시 시도해 주세요.", true);
    }
  }
  return {
    async search(query: string, page = "1", signal?: AbortSignal) {
      const input = searchInput(query, page);
      const data = object(await request("search/movie", { query: input.q, page: String(input.page), include_adult: "false" }, signal));
      if (!Array.isArray(data.results) || !Number.isInteger(data.total_pages) || Number(data.total_pages) < 0) {
        throw new MovieError(502, "TMDB_BAD_RESPONSE", "검색 결과 형식을 확인하지 못했어요.", true);
      }
      const items = data.results.filter(item => object(item).adult !== true).slice(0, 20).map(normalizeMovie);
      return { items, page: input.page, has_more: input.page < 5 && input.page < Number(data.total_pages) };
    },
    async detail(id: string, signal?: AbortSignal) {
      const validId = movieId(id);
      const raw = object(await request(`movie/${validId}`, {}, signal));
      if (raw.adult === true) throw new MovieError(404, "MOVIE_NOT_FOUND", "해당 영화를 찾지 못했어요.");
      const movie = normalizeMovie(raw);
      if (movie.tmdb_id !== validId) throw new MovieError(502, "TMDB_BAD_RESPONSE", "영화 ID를 확인하지 못했어요.", true);
      return movie;
    },
  };
}
