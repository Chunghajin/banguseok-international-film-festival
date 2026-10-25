# 방구석국제영화제 (방국제)

**BANGUSEOK International Film Festival** — 지금까지 본 영화에 직접 상을 주고, 나만의 영화제 결과지를 저장·공유하는 웹 앱입니다. 서비스 문구는 “심사위원 만장일치. 심사위원 1명.”입니다.

- 서비스: <https://banguseok-film-festival.vercel.app/>
- 최종 제출 소스 브랜치: `feature/production-release-final` (이 브랜치)
- 기본 브랜치 `main`은 개발 초기(cf51cf0) 버전입니다. 최종 코드는 이 브랜치를 기준으로 봅니다.
- 이 저장소는 “AI와 함께 만들기” 과제 2 제출물이며 AI Coding Agent(Codex)와 협업해 개발했습니다.

## 주요 기능

1. 설문 6문항(건너뛰기 가능)과 6개 시상 부문에서 수상작 선택. 후보 66편 중 6편씩 반복 추천하며 TMDB 검색으로 직접 고를 수도 있습니다.
2. 서로 다른 부문 3개 이상이면 결과지 생성. 고정 규칙과 검토한 문구로 수상작과 집행위원장 특별상(7유형·21변형)을 정합니다. 서비스 실행 중 생성형 AI는 사용하지 않습니다.
3. 결과를 Supabase에 비공개로 저장(`/my`, `/my/{id}`)하고 수정·삭제할 수 있습니다. 저장본에서 공개에 동의하면 읽기 전용 링크(`/f/{token}`)가 만들어지며, 공개는 언제든 중단할 수 있습니다.
4. 공개된 결과로 1080×1920 PNG 이미지를 만들어 다운로드하거나 기기 공유로 보낼 수 있습니다.
5. 별도 회원가입 없이 Supabase 익명 인증과 hCaptcha, 요청 제한으로 저장·수정 권한을 보호합니다.

## 기술 스택

Next.js 16(App Router) · React 19 · TypeScript · Supabase(PostgreSQL, 익명 인증, RLS) · TMDB API · hCaptcha · Vercel · Next `ImageResponse`(PNG)

영화 정보와 포스터는 TMDB에서 가져오며 화면 푸터에 출처와 비보증 문구를 표시합니다. 이 서비스는 TMDB가 인증하거나 보증한 서비스가 아닙니다.

## 배포 및 검증 상태

- 운영 코드의 마지막 검증 커밋은 `94aa185`이고 결과 규칙은 `result-v1.1`입니다. `94aa185` 이후 커밋은 문서만 변경합니다.
- `c63d1d1`에서 실제 Production E2E(일반 Chrome CAPTCHA, 저장·수정·공개·PNG·공개 취소·삭제, 타 계정 차단, 요청 제한 429)를 2026-10-25에 실행해 통과했습니다. E2E 중 만든 테스트 자료는 정리했습니다.
- `94aa185`는 TMDB 출처 표시를 추가한 최종 운영 코드입니다. 자동 테스트 143개, lint, 타입 검사, production build가 통과했고 주요 화면과 보호 상태를 읽기 전용으로 확인했습니다. 이 커밋에서 전체 E2E를 다시 실행하지는 않았습니다.
- 특별상 문구 v1.2와 해당 DB migration은 원격에 적용하지 않았고 출시에서 제외했습니다.
- 실제 iOS·Android 기기의 공유 시트, 장기 부하, 전체 접근성 감사는 검증하지 않았습니다.
- `docs/`의 문서는 개발 단계별 기록이며 일부는 당시 상태(예: 배포 전·PNG 미구현·production 차단)를 서술합니다. 최종 상태는 이 README를 기준으로 합니다.

## 로컬 실행

Node.js 24.16.0과 npm을 사용합니다. 설치 버전은 `package.json`과 `package-lock.json`에 고정합니다.

```sh
npm ci
npm run dev
```

`http://localhost:3000`에서 랜딩을 확인합니다. 설문은 `/create/survey`, 시상 부문은 `/create/awards`, 결과 확인은 `/create/review`와 `/create/result`입니다. 설문은 환경 변수 없이 실행되며, 실제 영화 조회에는 서버 전용 `TMDB_READ_ACCESS_TOKEN`이, 저장·공개·PNG에는 Supabase와 hCaptcha 설정이 필요합니다. `.env.example`을 `.env.local`로 복사해 값을 채웁니다. `.env.local`은 Git에서 제외되며 키·토큰은 코드나 로그에 남기지 않습니다. `SUPABASE_SERVICE_ROLE_KEY`와 `TMDB_READ_ACCESS_TOKEN`은 서버 전용이므로 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## 구조

- `src/app/(festival)/`: 랜딩·설문·시상·결과·내 영화제 화면과 스타일
- `src/app/(public)/f/[token]/`: 읽기 전용 공개 결과
- `src/app/api/`: 영화 검색·상세·후보 카탈로그, 영화제 CRUD·공개, 세션, 공유 PNG 경로. `src/app/api/dev/`와 `src/app/dev/`는 개발·진단용이며 production에서는 404입니다.
- `src/lib/`: 설문·후보 추천·결과 규칙·TMDB·Supabase 접근·요청 보호
- `supabase/migrations/`: 저장본·공개 스냅샷 테이블, RLS와 권한, 서버 전용 RPC
- `tests/`: Node.js 테스트 러너와 격리된 PostgreSQL(PGlite) SQL·RLS 검사
- `scripts/`: 실제 Supabase·TMDB·브라우저 검증 도구
- `docs/`: 제품 명세(`PRD.md`), 화면 문구, 단계별 구현·검증 기록, 문제 해결 기록(`problem-log.md`)

## 데이터와 권한

저장본에는 설문·선정작·생성 결과·버전·revision이 들어 있고, 공개 시에는 허용한 필드만 별도 스냅샷으로 저장합니다. 클라이언트에는 쓰기 권한이 없으며 쓰기는 서버가 소유권과 입력을 검증한 뒤 서비스 역할 RPC로만 수행합니다. 오래된 revision으로 수정하면 충돌(409)을 반환합니다.

## 문서

기준 문서는 `docs/PRD.md`, `docs/SCREEN_CONTENT.md`, `docs/CODEX_STEPS.md`, `docs/CHANGELOG.md`입니다. 설정·검증 절차는 `docs/G1_SUPABASE.md`, `docs/G2_TMDB.md`, `docs/M5_HCAPTCHA.md`, `docs/RELEASE_INTEGRATION.md`를 참고합니다.
