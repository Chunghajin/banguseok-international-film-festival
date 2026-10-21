# M6 — 게시된 수상 결과 공유 이미지

2026-10-22. 작업 브랜치 `feature/share-image`, 독립 worktree `/private/tmp/banguseok-share-image`. 기본 작업 폴더의 미커밋 변경은 수정하지 않았다. push·main 병합·배포·Supabase 스키마/RLS·hCaptcha/Production 설정 변경은 하지 않았다.

## 동작과 접근 경계

- 공개 결과 `/f/[token]` 및 소유자 관리 `/my/[id]`에 작은 이미지 작업 영역만 추가했다. 기존 `FestivalPaper`, HTML 디자인과 결과 생성 규칙은 유지한다.
- `GET /api/share-image/[token]`은 M4 `publicRead`가 반환한 **게시 당시 public_snapshot**만 렌더링한다. 브라우저의 설문·초안·영화 목록·이미지 URL·결과 문구를 입력받지 않는다. 기존 G3 `ImageResponse`, 전체 한글 TTF, TMDB 포스터 fetch/fallback을 재사용한다.
- 비공개 저장본은 공개 동의/공유 링크 생성 후 사용할 수 있다. 소유자 인증만으로 비공개 저장본을 이미지로 내보내는 별도 경로는 없다. 수정 저장 후 공유본을 갱신하지 않았다면 PNG도 이전 공개본이다. 공개 중단/삭제된 토큰 및 UUID는 404다.
- 3~6개 확정 수상 **부문**의 영화 제목, 포스터, 연도, 부문 이름, 집행위원장 특별상과 기존 생성 문구를 그대로 연결한다. 같은 작품의 복수 수상을 유지하고 부문 수와 고유 작품 수를 구별한다. 특별상 문구를 다시 계산하지 않는다.
- 지원 기기의 Web Share API에 실제 `File`을 전달한다. 생성과 공유를 별도 클릭으로 나눠 사용자 활성화를 보존한다. 미지원 기기는 다운로드/이미지 열기를 제공한다. 공유 취소/실패 후 다운로드는 유지한다. PNG 재생성 실패 시 이전 다운로드를 제거하고 HTML은 유지한다.
- 생성은 사용자 클릭 시에만 실행한다. production/preview는 기존 M5 `png` 및 `public` 예산을 DB 조회와 렌더링보다 먼저 확인한다. 429/Retry-After, 보호 확인 실패 503을 유지한다. `NODE_ENV=development`만 기존 로컬 개발 관례대로 외부 플랫폼 보호를 생략한다. 제품에 우회 플래그를 추가하지 않았다.
- 결과와 오류는 no-store. 토큰/닉네임을 파일명에 넣지 않는다. 서버 캐시/파일 저장은 없다. HEAD/POST는 405다. 렌더 스트림을 전부 읽은 뒤 200을 반환하므로 폰트/WASM/stream 실패는 JSON 503으로 분리된다.
- 다운로드한 PNG는 공개 중단으로 회수할 수 없다는 점을 이미지 작업 영역에 표시한다.

## 레이아웃과 자산

1080×1920, G3 종이색/나눔고딕을 사용하는 기능 검증용 이미지다. 3~6개 행과 특별상 영역의 높이를 고정하고 제목/문구 길이에 따라 폰트를 줄여 전체 텍스트를 줄바꿈한다. 500자 제목도 삭제·말줄임하지 않지만 극단적으로 긴 제목은 글자가 작아진다. 포스터 없음/네트워크 오류는 대체 타일로 처리한다. 포스터 URL·MIME·크기·timeout은 기존 G3 검증을 사용한다.

`runtime=nodejs`, `maxDuration=30`. 폰트는 JS/base64 import 대신 runtime `readFile`로 읽는다. `next.config.ts` tracing에 `/api/share-image/*` 폰트를 명시했다. production trace의 route/global 합집합에서 전체 TTF 및 `next/dist/compiled/@vercel/og/resvg.wasm`을 확인했다. 기록: `artifacts/m6/bundle.json` (약 36.6 MB, **실제 Vercel 함수 패키지 크기는 아님**).

공식 ImageResponse 문서는 500 KB 번들 제약과 큰 자산의 runtime 로딩을 안내한다. 전체 TTF는 약 4.69 MB이므로 Node 파일 로딩/trace를 사용해도 실제 배포에서 검증이 필요하다. [Next ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response), [Vercel Functions 제한](https://vercel.com/docs/functions/limitations). 한국어/일반 문자 검증과 모든 emoji·희귀 한자 지원은 별개다.

## 검증 결과와 재실행

- `npm test`: **113/113 통과**. 새 M6 5개 테스트는 3~6부문 데이터와 정확한 특별상 연결, 비공개 필드 제거, 429/503 선차단, 비공개/무효/폐기 토큰 404, renderer/stream 오류, 최대 길이 한글/라틴/결합문자 제목을 검사한다. 기존 M3 fixture가 `artifacts/m2/catalog-verified.json`을 필요로 해 기존 폴더의 검증 산출물만 복사했다. 실제 계정 환경 파일은 복사하지 않았다.
- `npm run lint`, `npm run typecheck`: 통과.
- 기본 `npm run build` (Turbopack): 실행 환경에서 CSS 처리 자식 프로세스의 내부 포트 bind가 `Operation not permitted`로 실패. 권한 확장 재실행에서도 같았다. 이를 제품 코드나 설정 변경으로 우회하지 않았다.
- `npx next build --webpack`: **프로덕션 빌드 통과**. 기존 session API의 모듈 초기화가 Supabase 설정을 요구하므로 아래 로컬 fixture 값을 사용했다. 실제 자격 증명/서비스 호출은 없다.
- `npm run verify:m6`: **6개 HTTP/Chrome 검증 묶음 통과**. 로컬 mock Supabase의 게시 스냅샷을 실제 Next dev API로 렌더링한다. 3/6개, 포스터 일부 누락, 500자 한글 제목, 1080×1920 PNG, 실제 브라우저 이미지 decode/파일 다운로드, 360px 화면, Web Share 모의 성공/취소, 공개 중단 후 404 및 HTML 유지 확인. Chrome 파일 공유는 API mock이며 휴대전화 native share sheet 검증이 아니다.
- `npm run verify:m6:build`: **5개 production runtime 검증 통과**. 실제 `next start`와 기존 M5 보호 코드를 실행한다. 테스트 프로세스에만 Vercel 형식의 환경/플랫폼 헤더 및 로컬 예산 RPC fixture를 제공해 무효 플랫폼 요청 차단, 양쪽 예산 통과 후 실제 PNG 생성, 429/Retry-After, 예산 장애 503, 폐기된 공개본 404를 검사했다. Vercel 배포 검증을 대체하지 않는다.

```sh
npm test
npm run typecheck
npm run lint
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3197 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=fixture-only SUPABASE_SERVICE_ROLE_KEY=fixture-only npx next build --webpack
npm run verify:m6
npm run verify:m6:build
```

브라우저 검증은 macOS Google Chrome과 비어 있는 로컬 포트 3196~3199를 사용한다. 모든 테스트 서버는 종료한다. 검증 중 TMDB 포스터 CDN을 읽을 수 있으며 실패하면 포스터 대체 표시를 사용한다.

PNG 미리보기(모두 합성 테스트 결과이며 실제 사용자 결과가 아님):

- `artifacts/m6/three.png`, `six.png`: 정상 3/6개 수상 부문, 실제 CDN 포스터 1종 및 누락 타일.
- `artifacts/m6/three-long.png`, `six-long.png`: 각 영화 제목 500자.
- `artifacts/m6/production-local.png`: production 빌드의 실제 PNG.
- `artifacts/m6/mobile-actions.png`: 모바일 너비 이미지 작업 영역.
- `artifacts/m6/report.json`, `production-local.json`, `bundle.json`: 검증 기록. `artifacts/`는 기존 규칙대로 Git에서 제외한다.

## Vercel에서 남은 검증

기존 접근 제한된 Preview와 M5 readiness가 준비된 뒤, 권한 있는 사람이 이 브랜치를 검토하고 배포하는 단계에서 실행한다. 이번 작업에서 배포/Production 환경 변경은 하지 않았다.

1. 기본 Turbopack 빌드를 Vercel에서 재검증하고 이 로컬 환경의 포트 제한과 구분한다.
2. 배포된 Node 함수 안에 전체 TTF와 resvg WASM이 포함되는지, 실제 3/6개 PNG가 생성되는지 확인한다.
3. cold start, 30초 제한, 메모리, 동시에 들어오는 생성 요청, 함수 패키지/응답 크기와 비용을 확인한다. 폰트 최적화가 필요하다면 사용자 영화 제목을 보존하는 범위에서 별도 작업한다.
4. 현재 Preview의 M5 실제 예산 RPC/readiness 및 429·503을 확인한다. 검증 편의를 위해 운영 503을 해제하지 않는다.
5. 실제 소유자의 게시/공유본 갱신/공개 중단/삭제 흐름과 다른 소유자의 비공개 접근 거절을 확인한다. 이번 검증은 실제 Supabase 계정에 쓰지 않았다.
6. iOS Safari/Android에서 다운로드, 이미지 열기, native 파일 공유 및 수신 앱의 처리를 확인한다. Web Share는 HTTPS와 기기/수신 앱 지원에 따라 달라진다.

## Stitch 연결과 변경 파일

Stitch 확정 후 `src/components/share-image-card.tsx`의 시각 스타일을 맞춘다. 필요하면 `share-image-layout.ts`의 영역/폰트 계산 및 QA PNG도 함께 갱신한다. `FestivalPaper` HTML 전체를 교체하거나 PNG 엔드포인트/권한/데이터 모델을 바꿀 필요는 없다. 이미지용 JSX는 Satori의 Flexbox/CSS 부분집합 제약을 지켜야 한다.

| 파일 | 변경 |
| --- | --- |
| `src/app/api/share-image/[token]/route.tsx` | G3 기반 PNG 생성과 runtime 제한 |
| `src/lib/share-image-http.ts` | M5 보호, 게시본 조회, allowlist, 실패 분리 |
| `src/lib/share-image-layout.ts` | 전체 텍스트를 보존하는 자동 크기/줄바꿈 |
| `src/components/share-image-card.tsx` | 결과 데이터 전용 PNG 카드 |
| `src/components/share-image-actions.tsx` | 다운로드, 이미지 열기, 파일 공유 |
| `src/app/(public)/f/[token]/page.tsx` | 공개 페이지에 작업 영역 연결 |
| `src/app/(festival)/my/[id]/manage.tsx` | 관리 페이지에 게시본 이미지 연결 |
| `next.config.ts` | 한글 TTF tracing |
| `package.json` | M6 검증 명령 |
| `tests/m6-share-image.test.mjs` | 데이터/접근/보호/오류/긴 제목 검사 |
| `scripts/m6/verify.mjs` | 실제 HTTP PNG 및 Chrome 회귀 검증 |
| `scripts/m6/check-build.mjs` | production runtime, M5 및 trace 검사 |
| `docs/M6_SHARE_IMAGE.md` | 동작, 검증, 남은 확인, 디자인 연결 안내 |
