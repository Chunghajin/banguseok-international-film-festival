# 방국제

BANGUSEOK International Film Festival. M1 설문·초안, M2 수상작 선정, M3 공식 HTML 결과 로컬 미리보기를 구현했습니다. [M1](docs/M1.md) · [M2](docs/M2.md) · [M3 규칙·화면·검증](docs/M3.md). M4에서 실제 Supabase 저장·읽기 전용 공개 URL·소유자 관리까지 연결했습니다. [M4 동선·보안·실검증·배포 차단](docs/M4.md). PNG 통합은 아직 없습니다.

M1·M2 화면을 모바일 중심으로 다듬었습니다. [UI 개선 전후·측정·검증](docs/UI_REFINEMENT.md)에 360×800/1280×900 증거를 정리했습니다.

3개 부문 확정 후 발표 전 확인에서 ‘공식 결과지 미리보기’를 열 수 있습니다. URL은 `/create/result`이며 같은 브라우저의 초안을 사용합니다. `npm run verify:m3:browser`로 결과·재편집·직접 URL을 Chrome에서 검사합니다. Q01~Q12/T01~T18은 `npm test`에 포함됩니다.

G3 한글·실제 포스터 PNG는 로컬 기술 검증까지 완료했습니다. 실제 Vercel runtime과 휴대전화 검증은 남아 있습니다. [G3 실행·증거·제한](docs/G3_PNG.md)을 확인합니다.

M4는 `/create/result`에서 비공개 저장 후 `/my/{id}`에서 공개 동의·URL 복사·재편집·삭제를 제공합니다. 내 목록은 `/my`, 공개 결과는 `/f/{token}`입니다. 운영 쓰기 API는 요청 보호 검증 전 503을 유지합니다. 실제 저장에는 G1 안내의 Supabase 설정과 TMDB 토큰이 필요합니다.

M5-A 운영 요청 보호 코드를 준비했습니다. **실제 새 RPC 미준비·Supabase CAPTCHA 미강제 확인으로 배포 차단을 유지합니다.** 설정/SQL 적용/실검증 순서는 [M5-A](docs/M5_A.md)를 따릅니다. Vercel 배포는 수행하지 않았습니다.

## 로컬 실행

Node.js 24.16.0과 npm을 사용합니다. 설치 버전은 `package.json`과 `package-lock.json`에 고정합니다.

```sh
npm ci
npm run dev
```

`http://localhost:3000`에서 랜딩을 확인합니다. 설문은 `/create/survey`, 부문 목록은 `/create/awards`, 후보 선정은 `/create/awards/grand` 등이며 3부문부터 `/create/review`에 진입할 수 있습니다. M1은 환경변수 없이 실행됩니다. M2 실제 영화 조회에는 서버 전용 `TMDB_READ_ACCESS_TOKEN`이 필요합니다.

개발 서버 실행 후 `npm run verify:m1`, `npm run verify:m2:http`, `npm run verify:m2:browser`로 검사할 수 있습니다. 브라우저 스크립트는 이 Mac의 실제 Chrome을 임시 프로필/headless 360×800으로 실행합니다. `verify:m2:catalog`는 편집 후보 66개 고유 ID를 실제 TMDB 상세로 확인합니다.

M2의 별도 `/api/catalog/movies`는 로컬 요청 검증·60회/분 단일 프로세스 제한을 적용합니다. **production에서는 관리형 보호 미확인으로 503 차단**하므로 공개 배포 준비 완료가 아닙니다. 운영 조건은 M2 문서를 확인합니다. 기존 G2 개발 API는 그대로 production 404입니다.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## 구조

- `src/app/(festival)/`: 랜딩·설문·시상 진입점과 해당 화면 전용 스타일
- `src/lib/survey*.ts`: v1.1 설문 데이터·로컬 초안·클라이언트 상태
- `src/lib/award*.ts`, `src/components/movie-*.tsx`: 명세의 후보 카탈로그·층화 셔플·선정/검색 UX
- `src/lib/product-movies.ts`, `/api/catalog/movies`: M2 전용 영화 프록시와 요청 보호 게이트
- `tests/`: Node.js 테스트 러너, 격리된 PostgreSQL(PGlite) SQL/RLS 검사, 검증 클라이언트 검사
- `supabase/migrations/`: 원본/공개 테이블, RLS·권한, 서버 전용 RPC
- `scripts/g1/`: Node 전용 익명 A/B 세션과 실제 Supabase CRUD·권한 검증 도구
- `src/lib/tmdb.ts`, `scripts/g2/`: 서버 전용 TMDB 검색·상세 모듈과 실제 검증/토큰 노출 검사
- `/dev/tmdb`: 개발 모드에서만 열리는 영화 검색·상세·포스터 검증 화면
- `/dev/png`, `src/components/g3-card.tsx`, `scripts/g3/`: HTML과 분리된 한글/포스터 PNG 기술 검증, 실제 파일은 `artifacts/g3/`
- `docs/`: v1.1 제품·화면 명세, 개발 순서, 변경 이력, 기술 검증 준비
- `.env.example`: 다음 단계에서 사용할 환경변수 이름만 기재

## 다음 단계

기준 문서는 `docs/PRD.md`, `docs/SCREEN_CONTENT.md`, `docs/CODEX_STEPS.md`, `docs/CHANGELOG.md`입니다. 기술 검증 준비와 미실행 항목은 [TECH_VALIDATION.md](docs/TECH_VALIDATION.md)를 확인합니다.

G1 SQL 적용·키 설정·실제 검증 순서는 [G1_SUPABASE.md](docs/G1_SUPABASE.md)를 따릅니다. `npm test`는 실제 Supabase 검증이 아닙니다. 전용 테스트 프로젝트 설정 후 `G1_ALLOW_TEST_WRITES=yes npm run verify:g1`를 실행해야 실제 Auth/권한 실패 사례를 확인할 수 있습니다. 검증 도구는 자체 생성한 합성 데이터와 익명 사용자만 정리합니다.

G2 실행은 [G2_TMDB.md](docs/G2_TMDB.md)를 따릅니다. `.env.local`의 서버 전용 `TMDB_READ_ACCESS_TOKEN` 설정 후 `npm run verify:g2`로 실제 검색·상세를 확인합니다. `npm run dev -- --hostname 127.0.0.1`로 로컬 검증 화면을 열 수 있습니다. production에서는 요청 보호 확인 전까지 화면과 영화 API 모두 404입니다.

실제 연동 시 `.env.example`을 `.env.local`로 복사한 후 로컬에서 값을 입력합니다. `.env.local`은 Git 제외 대상입니다. `SUPABASE_SERVICE_ROLE_KEY`와 `TMDB_READ_ACCESS_TOKEN`은 서버 전용이며 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. 키·쿠키·세션·사용자 데이터를 코드나 로그에 남기지 않습니다.

현재 폴더는 Git 저장소가 아니며 원격 저장소·배포는 구성하지 않았습니다.

환경 구성 참고: [Next.js 공식 설치 문서](https://nextjs.org/docs/app/getting-started/installation), [Tailwind CSS 공식 Next.js 가이드](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
