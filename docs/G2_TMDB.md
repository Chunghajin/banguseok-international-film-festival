# G2 — TMDB 실제 검색·상세 검증

2026-10-20 · v1.1 PRD 6.1/8/10장, SCREEN_CONTENT S04, CODEX_STEPS 단계 1 기준.

상태: **실제 TMDB 검증 10그룹 PASS, 종료 0**. G1 소유권 구조는 변경하지 않았고 G3는 시작하지 않았다. 후보 풀 72슬롯 검증과 전체 선정 UX는 이번 범위가 아니다.

## 실행

기존 `.env.local`의 `TMDB_READ_ACCESS_TOKEN`을 사용한다. 공개 환경변수 접두사를 붙이지 않으며 값을 채팅/명령행/로그에 출력하지 않는다.

```sh
npm ci
npm run dev -- --hostname 127.0.0.1
```

개발용 화면: `http://127.0.0.1:3000/dev/tmdb`. 제목 입력 → 검색 → 작품 클릭으로 상세 확인. 350ms debounce, IME 조합 중 요청 방지, 이전 검색/상세 취소, 수동 재시도, 최대 5페이지 이동을 제공한다. 조회 실패 시 기존 결과와 상세 선택을 보존한다. 수상 확정이나 저장은 하지 않는다.

별도 터미널:

```sh
npm test
npm run verify:g2
npm run build
npm run verify:g2:secrets
```

`verify:g2`는 실제 TMDB를 호출한다. `npm test`의 TMDB 오류 응답·단절·timeout 검사는 오프라인이며, G1 SQL 검사도 격리 DB만 사용한다. 비밀 노출 검사는 3000번 개발 서버와 생성된 `.next` client artifact를 대상으로 한다. 개발 서버를 다른 포트로 켰다면 문서의 3000번 조건에 맞춰 실행한다.

## 재사용 구조

- `src/lib/tmdb.ts`: `server-only` 경계, `createTmdbClient().search()/detail()`, 입력 검사, 정규화, 안전한 오류. 클라이언트는 `Movie` 타입만 import한다.
- `GET /api/movies/search?q=...&page=1`: `{items,page,has_more}`. trim 후 1~100자, 한 글자 허용, page 1~5, 최대 20개. `ko-KR`·`include_adult=false` 고정.
- `GET /api/movies/{id}`: 양의 int32 ID. 존재하지 않는/성인 영화는 404, 요청 ID와 응답 ID가 다르면 502.
- `Movie`: `tmdb_id,title,original_title,release_year,poster_path,poster_url`만 반환. 원문 TMDB 응답이나 인증 정보를 반환하지 않는다.
- 한국어 제목이 비어 있으면 원제, 둘 다 없으면 `제목 정보 없음`. 개봉일 없음은 `release_year=null`. 한국어 번역을 앱에서 임의 생성하거나 영어 검색을 한국어로 자동 치환하지 않는다.
- 포스터는 안전한 상대 이미지 경로만 허용하고 `https://image.tmdb.org/t/p/w500`으로 조합한다. 외부 URL·중첩 경로·query·SVG는 허용하지 않는다. 없거나 로드 실패 시 제목 타일을 표시한다.

**현재 두 HTTP API와 검증 화면은 개발 모드에서만 동작하며 production에서는 404다.** PRD 8장의 관리형 요청 보호·비용 한도가 아직 확인되지 않았기 때문이다. 메모리 Map을 서버리스 전역 제한으로 대체하지 않았다. 공개 적용 전에 실제 플랫폼 보호를 확인하고 이 gate를 변경해야 한다.

실제 연결을 명확하게 검증하기 위해 현재 TMDB 요청과 응답은 no-store이며 자동 재시도는 없다. PRD의 검색 10분/상세 24시간 캐시는 제안 사항으로 남긴다. 제품 연결 시 요청 보호와 함께 적용한다.

## 실제 정상·경계 사례

| 검색/사례 | 실제 상세 결과 | ID | 연도 | 확인 |
|---|---|---|---|---|
| 기생충 | 기생충 / 원제 기생충 | 496243 | 2019 | ko-KR 검색·상세·포스터 |
| Parasite | 패러사이트 / 원제 Parasite | 48311 | 1982 | 영어 검색, 한국어 표시. 2019년 작품으로 자동 확정하지 않음 |
| Inception | 인셉션 / 원제 Inception | 27205 | 2010 | 영어 검색·ko-KR 상세 |
| 괴물 | 괴물 / 원제 괴물 | 1255 | 2006 | 제목/원제/연도로 구분 |
| Untitled | Untitled / 원제 Untitled | 1647338 | null | 실제 `poster_path=null`, 한국어 title 번역 없음 |

Untitled는 실제 `/movie/{id}/translations`의 한국어 title 부재를 추가 확인했다. `ko-KR` 응답에 원제가 그대로 제공되며 포스터 URL은 null로 유지한다. 데이터는 TMDB 편집에 따라 이후 바뀔 수 있다.

기생충의 정규화된 포스터 URL에서 이미지 HTTP 200, `Content-Type: image/*`, 본문 존재를 확인했다. Chrome에서 한국어 검색 → 상세 → 실제 포스터 표시, Untitled의 포스터 없는 결과 타일을 확인했다. 스크린샷은 `/tmp/banguseok-g2.jpg`에 저장했다.

## 오류 검사 결과

| 사례 | 응답/행동 | 실행 구분 |
|---|---|---|
| 빈 검색어·형식이 잘못된 ID | 400, TMDB 요청 전 거부 | 로컬 HTTP + 오프라인/실검증 스크립트 |
| 100자 초과·잘못된 page | 400 | 오프라인 |
| 무작위 UUID 검색 | 200, `items=[]`, `has_more=false` | 실제 TMDB |
| 존재하지 않는 ID 2147483647 | 404 `MOVIE_NOT_FOUND` | 실제 TMDB + 로컬 HTTP |
| 잘못된 별도 테스트 토큰 | TMDB 인증 거부 → 503 `TMDB_AUTH_FAILED` | 실제 TMDB, 실제 키 변경 없음 |
| upstream 429 | 429 `TMDB_RATE_LIMITED`, retryable=true | 오프라인, 대량 요청하지 않음 |
| 네트워크 단절 | 503 `TMDB_NETWORK_ERROR` | 오프라인 |
| 응답 없는 요청 | 실제 5초 deadline에서 abort → 503 `TMDB_TIMEOUT` | 오프라인 stalled fetch, 실제 TMDB 장애 유발 아님 |
| upstream 500 / JSON·스키마 오류 | 502, 일반 오류 문구 | 오프라인 |
| 토큰 미설정 | 503 `TMDB_NOT_CONFIGURED` | 오프라인 |
| 비서버 모듈 import | server-only 경계가 거부 | 로컬 Node 검사 |

오류 응답은 `{code,message,retryable}`뿐이다. TMDB 원문 오류, 토큰, stack은 반환하거나 로그로 출력하지 않는다. TMDB 서버 인증 실패는 사용자 로그인 문제가 아니므로 API에서 503으로 표시한다.

## 실행 결과와 노출 검사

- `npm run verify:g2`: 실제 10그룹 PASS, 종료 0.
- `npm test`: 29건 통과, 실패 0. 기존 G1 오프라인 검사 포함. 5초 timeout도 실제 경과 후 abort 확인.
- lint·typecheck·production build 통과.
- 로컬 개발 HTTP: 화면/검색/상세 200, 빈 검색어/잘못된 ID 400, 없는 ID 404.
- 별도 production 서버에서 검증 화면/검색/상세가 모두 404임을 확인 후 서버 종료.
- 실제 토큰 문자열을 출력하지 않고 production/development client artifact 48개, 개발 로그 1개, 로컬 HTML/API 응답 6개를 검사해 미검출을 확인했다. 이후 artifact 수는 달라질 수 있다.
- server-only 경계가 비서버 import를 거부하는 것도 확인했다. `.env.local`은 기존처럼 Git 제외 대상이다.

## 아직 미검증

실제 TMDB 429/장애/timeout, 후보 풀 72슬롯 전체, 학교 공용 IP/플랜 요청 보호·비용 한도, 실기기 IME·모바일·접근성 전체 회귀, 자동화된 응답 순서 경합 시험, 브라우저 이미지 로드 실패 이벤트, TMDB 승인 로고·출처의 최종 제품 배치는 아직 미검증이다. 캐시와 production API 공개도 아직 진행하지 않았다. G3 PNG와 수상 UX는 구현하지 않았다.

공식 근거: [영화 검색](https://developer.themoviedb.org/reference/search-movie), [상세](https://developer.themoviedb.org/reference/movie-details), [이미지 URL](https://developer.themoviedb.org/docs/image-basics), [오류 코드](https://developer.themoviedb.org/docs/errors).

## 2026-10-25 최종 HTML 출처 표시

일반 화면과 공개 결과의 공통 푸터에 출처 및 크레딧을 표시한다. 승인 로고를 원본 색상·비율로 사용하고 공식 비보증 문구를 그대로 표시한다. 공유 PNG의 기존 문구와 결과 데이터는 변경하지 않는다.

- 공식 요구: https://developer.themoviedb.org/docs/faq 및 https://www.themoviedb.org/about/logos-attribution
- 승인 자산: https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg
- 원본 그대로 저장한 파일: `public/tmdb/blue-short.svg` · SHA-256 `8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c`
- `RELEASE_INTEGRATION.md`의 개인 절대 경로는 현재 문서에서 상대 경로로 교체했다. 과거 Git 이력은 보존된다. 작성 당시 저장소는 비공개였으며 이후 공개로 전환했다.
