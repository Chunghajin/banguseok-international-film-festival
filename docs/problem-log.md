# 초기 환경 구성 문제 기록

## M3 실행 문법·타입 캐시·장식 겹침 수정 — 2026-10-21

- 사용자 요청/기대: 기존 구조에서 결정적 특별상과 로컬 HTML을 구현하고 테스트/실제 화면을 확인한다.
- 초기 실행: Node 24의 strip-only 테스트 러너가 TypeScript constructor parameter property를 지원하지 않아 M3 테스트 모듈 로드가 실패했다. 코드 속성을 명시적으로 선언·할당해 기존 런타임 방식에 맞췄다. 빈 후보 배열의 첫 원소도 `at(0)`으로 읽어 fallback의 undefined 타입을 명확히 했다.
- 별도 환경 오류: `.next/types`에 `routes.d 2.ts`, `validator 2.ts` 등 오래된 중복 생성 파일 4개가 함께 포함돼 타입 선언이 충돌했다. 생성 경로/헤더를 확인한 뒤 중복 생성물만 제거했다. 소스나 tsconfig에서 오류를 숨기지 않았다.
- 시각 검사: 첫 결과지 월계관이 닉네임/제목과 겹쳤다. 음수 여백을 제거하고 장식 자체 영역으로 분리한 뒤 실제 Chrome 스크린샷을 다시 확인했다.
- 재검증: 테스트 72/72, typecheck/lint/build, Q01~Q12 전체 기대 문구, M3 Chrome 10그룹·기존 UI 23그룹 통과. 로컬 production 503 보호 유지 확인.
- 한계: 실제 사용자에게 심사평 의미/유머를 확인한 것은 아니다. 실제 모바일 OS/보조공학·Vercel은 미검증이다. 저장/공개/PNG는 범위 밖이다.
- commit: 없음(Git 저장소 미구성).

## M1·M2 모바일 후보·하단 영역 배치 개선 — 2026-10-21

- 사용자 요청/기대: 기존 기능을 유지하면서 후보 포스터를 더 일찍 보여 주고 선택·포커스·스크롤을 다듬는다.
- 실제/재현: 변경 전 Chrome 360×800에서 대상 page0 첫 포스터가 497px에 시작하고 미선정 sticky 수여 영역이 126px를 차지했다. 첫 줄 포스터 하단 일부가 고정 영역 뒤에 놓였다.
- 수정: 상단 압축·검색 보조 링크·미선정 수여 영역 일반 흐름·pending 전용 고정 영역을 적용했다. 설문에는 선택지 전체의 별도 포커스 링을 유지했다. 후보/선정/점수/서버 보안 로직은 변경하지 않았다.
- 조정 근거: 중간안에서 검색을 전체 후보 아래에 두었으나 발견성이 낮아 후보 도구줄의 작은 링크로 변경했다. 최종 첫 포스터는 319px이며, 중간안 304px를 최종값으로 보고하지 않는다.
- 재검증: 단위 59/59, lint/typecheck/build 통과. 실제 Chrome 모바일·데스크톱 23그룹 통과. 스크롤한 마지막 선택지/후보/검색 결과의 도달 가능성과 가림, 이미지 대체 크기 유지, 복원/변경/검색을 확인했다.
- 한계: pending sticky 영역이 모든 스크롤 위치에서 콘텐츠와 겹치지 않는다고 주장하지 않는다. 실제 OS 가상 키보드·실기기·보조공학·배포는 미검증이다. 변경 전후 스크린샷과 조건은 UI_REFINEMENT 문서 참조.
- commit: 없음(Git 저장소 미구성).

## M2 실제 로컬 Origin·후보 요청 예산 검증 — 2026-10-21

- 사용자 요청/기대: 실제 TMDB 후보·검색·선정 UX가 Chrome 360×800에서 동작하며 기존 보안 경계를 유지한다.
- 실제/재현: 첫 실제 브라우저 후보 요청이 403 ORIGIN_REJECTED였다. Next dev 내부 Request URL과 외부 요청 Host의 차이로, 정상 Origin을 내부 URL과 비교하던 검사가 거부했다.
- 수정: development에서 loopback Host 허용목록과 Origin의 일치를 함께 검사한다. production 차단·다른 출처 차단은 유지했다. 내부 URL이 0.0.0.0이고 Host/Origin이 127.0.0.1인 회귀 검사를 추가했다.
- 별도 실제 발견: 반복 선정 검증 중 캐시된 상세도 batch마다 6회로 집계해 로컬 429가 빨리 발생했다. 한도를 올리지 않고 실제 미캐시 상세 수를 batch 비용에 반영했다. 캐시 재방문 12회에서 상세 호출 6회만 발생하는 테스트를 추가했다.
- 러너 문제: CDP 대기 검사가 DOM 객체를 직렬화하려다 시간 초과했다. Boolean 검사와 문맥 교체 대기로 고쳤다. 앱의 pending 자체는 당시에도 저장돼 있었으므로 앱 선정 실패로 분류하지 않는다. 기존 CUA 연결 시간 초과는 별도 임시 headless Chrome으로 우회했다.
- 콘텐츠 식별: TMDB 검색이 ‘반딧불이의 묘’ 동명 2005년 실사판을 반환했다. 명세의 1988년 애니메이션 12477을 상세 확인해 고정하고 회귀 검사에 추가했다. 임의 ID/작품 대체는 하지 않았다.
- 재검증: 단위 59/59, typecheck·lint·build, 실제 카탈로그 66편, M2 HTTP 8그룹, 실제 Chrome 15그룹 통과. 로컬 production M2 API 503/G2 API 404 확인.
- 한계: 관리형 운영 한도·실제 모바일 OS 키보드·사용자 A/B 시험·Vercel은 미검증. 실제 429/인증/인터넷 장애 발생을 성공 증거로 만들지 않았다. 브라우저 오류 주입 결과와 실제 TMDB 성공은 별도로 기록했다.
- commit: 없음(Git 저장소 미구성).

## M1 native 확인창 자동화 중단 — 2026-10-21

- 요청/기대: 모바일 설문 복원과 새로 시작하기를 검사하고, 실행하지 못한 항목을 구분한다.
- 실제/재현: Chrome 360×800의 설문 완료·복원·재편집 후 랜딩에서 ‘새로 개최하기’를 클릭했다. native 확인창 단계에서 자동화의 `Input.dispatchMouseEvent`가 시간 초과됐고 이후 연결 복구도 실패했다.
- 조치: 접근 제어나 초안 보호 확인창을 제거하지 않았다. 브라우저 취소/승인 성공으로 보고하지 않고 검증 한계로 분리했다. 관련 앱 결함이 입증된 것은 아니다.
- 재검증: 별도 실행한 단위 테스트 45/45, typecheck·lint·build·M1 HTTP 3경로·토큰 노출 검사 통과. 실제 브라우저 재시작 확인창 검사는 여전히 미완료다.
- 다음 확인: 연결이 정상인 브라우저에서 취소 시 기존 초안 유지, 승인 시 새 draft_id·미응답 상태·q1 시작을 확인한다. 다른 localStorage 키/익명 세션 보존도 함께 확인한다.
- commit: 없음(Git 저장소 미구성).

## G3 원문자 누락 및 검증 assertion 수정 — 2026-10-20

- 사용자 요청: 한글·특수문자·실제 포스터가 포함된 PNG를 생성하고 HTML 실패 분리를 실제 확인한다.
- 기대/실제: 첫 PNG는 1080×1920으로 생성됐으나 ①②③이 빈 공간으로 나왔다. FontTools cmap 검사에서 초기 Google Fonts TTF(2,054,744 bytes)의 해당 글리프가 없었다.
- 수정: 재배포 가능한 나눔고딕 전체판(4,691,820 bytes, 내부 이름/글리프 변경 없음)과 저작권/OFL을 포함했다. cmap 및 실제 PNG 시각 검사로 한글/기호를 확인하고 hash 회귀 검사를 추가했다.
- 별도 검사 코드 문제: font/render 실패 시험에서 PNG 503·HTML 200은 정상이었으나, HTML에 없는 문자 그대로인 `HTML 화면`을 찾는 assertion 때문에 2개가 실패했다. 실제 고정 aria-label로 검사하도록 고친 후 11/11 통과했다.
- 구현 검사: Route Handler의 JSX try/catch에 React lint 규칙이 경고했다. ImageResponse 스트림을 `arrayBuffer()`로 try 안에서 실제 소비하는 특수 경로임을 해당 줄에 명시했다. 실제 잘못된 font 및 강제 변환 오류를 503으로 처리함을 확인했다.
- 재검증: 실제 PNG 8개 전체 디코딩/해상도, 본문/줄바꿈/특수문자/긴 제목·포스터 시각 확인. 로컬 테스트 35건, lint/typecheck/build 통과. G1/G2 기능 변경 없음.
- 한계: Vercel runtime·실제 모바일 다운로드/Instagram·폰트 4.69MB의 배포/메모리 제한은 미검증이다. 로컬 production 성공을 Vercel 배포 성공으로 표현하지 않는다.
- commit: 없음(Git 저장소 미구성).

## G1 공개 token 편집 거부 검사 실패 — 2026-10-20

- 사용자 요청: 실제 G1의 단일 실패만 분석·수정하고 Supabase에 재검증. 접근 제어·공개 허용목록 완화 금지.
- 기대: 공개 token만으로 삭제를 요청하면 helper가 401로 거부한다.
- 실제/재현: 실제 Supabase 재실행에서 공개 스냅샷 키 검사를 통과한 뒤 `denied(() => client.remove(share.token, row.id, 1), 401)`가 실패했다. `assert.rejects`는 실제 거부 HTTP 403을 받아 기대값과 불일치했다. 기존 공통 로그가 상세를 가려 `ASSERTION_OR_RUNNER_ERROR`만 표시했다.
- 분류: DB 접근 허용이나 CRUD 쓰기 실패가 아니라 Auth upstream 상태와 helper/테스트 계약의 불일치. 공개 token은 Auth에서 이미 거부됐다.
- 수정: 공통 Auth 사용자 확인에서만 401/403 → `401 UNAUTHENTICATED`로 정규화. DB 403·네트워크 503 유지. 민감값 없이 assertion 소스 위치와 숫자 HTTP 상태를 표시하는 진단 추가. SQL·RLS·권한·허용목록 변경/재적용 없음.
- 회귀: Auth 401/403 각각에서 공개 token의 조회/저장/삭제/공개/공개 중단 차단 및 service-role 호출 0회, DB/네트워크 오류 상태 보존, 진단의 민감값 제거 검사. 수정 전 회귀 실패를 확인했고 수정 후 통과했다.
- 실제 재검증: `G1_ALLOW_TEST_WRITES=yes npm run verify:g1` 10/10 PASS, 종료 0, 테스트 데이터/사용자 정리 오류 없음. 공개 스냅샷 9개·selection 내부 6개 허용 필드, 공개 token 및 B 세션 접근 거부, 거부 전후 원본/공개본 동일 확인. `npm test` 19건 통과/실패 0, lint 통과.
- 한계: 제품용 API/브라우저 세션·CAPTCHA·운영 요청 보호는 미검증. G2·G3·전체 UI는 범위 밖이며 변경하지 않았다.
- commit: 없음(Git 저장소 미구성).

## G1 검증 환경 미설정 — 2026-10-20

- 사용자 요청 요약: G1 익명 소유권/CRUD에 집중하고 환경이 없으면 SQL과 직접 수행할 단계를 준비한다.
- 기대: 실제 Supabase 익명 A/B를 생성하고 권한 거부 사례를 확인한다.
- 실제/재현: `.env.local` 및 필요한 환경변수 3개가 없고 `docker info`도 daemon socket 부재로 실패했다. `npm run verify:g1`는 종료 2, `NOT RUN`으로 중단한다.
- AI 조치: SQL migration과 실제 검증 CLI, `docs/G1_SUPABASE.md`의 사용자 설정 절차를 준비했다. 실제 연결 성공을 대신하는 mock 성공 보고는 하지 않았다.
- 재검증: `npm test`의 오프라인 검사 16건 통과. PostgreSQL SQL/RLS 검사는 실행했으나 Supabase Auth/gateway는 실행하지 않았다. lint·typecheck·빌드 통과.
- 한계/다음 조치: 전용 Supabase 프로젝트 생성·익명 인증·SQL 적용·로컬 키 설정·CAPTCHA 조건 준비 후 `G1_ALLOW_TEST_WRITES=yes npm run verify:g1`로 실제 검증해야 한다.
- commit: 없음(Git 저장소 미구성).

2026-10-20 · 사용자 요청 요약: docs 4종을 읽고 초기 Next.js/TypeScript/Tailwind 환경과 기술 검증 준비까지만 진행, 개발 서버 실행 확인.

## 1. 로컬 포트 권한 제한

- 기대: `npm run dev -- --hostname 127.0.0.1` 실행 및 `npm run build` 성공.
- 실제/재현: 제한된 실행 환경에서 개발 서버가 `listen EPERM 127.0.0.1:3000`으로 종료. Turbopack 빌드도 CSS/PostCSS 처리용 내부 포트의 `Operation not permitted`로 실패.
- AI 수정: 앱이나 번들러 설정은 바꾸지 않고 동일 명령을 실행 권한 확장 후 재실행.
- 재검증: 개발 서버 Ready, GET `/` HTTP 200, 한국어·브랜드·준비 상태 확인. 프로덕션 빌드 성공 및 정적 페이지 생성.
- 한계: 이 실행 환경의 권한 문제이며 배포 runtime 검증과 다르다. 실제 브라우저 시각 검사는 in-app browser 미제공으로 미실행.
- commit: 없음(Git 저장소 미구성).

## 2. PostCSS 설정 린트 경고

- 기대: `npm run lint` 경고 없이 통과.
- 실제/재현: 익명 객체의 default export에 `import/no-anonymous-default-export` 경고, `--max-warnings=0` 조건으로 실패.
- AI 수정: 설정 객체를 `config` 상수로 선언해 export.
- 재검증: 동일 lint 명령 통과.
- 한계: 서비스 로직은 아직 구현하지 않아 해당 영역 테스트는 없음.
- commit: 없음.

## 4. CSS 확인용 단발 검사 수정

- 기대: 실제 HTTP 스타일시트에서 Tailwind 적용 확인.
- 실제/재현: CSS 응답은 200이었으나 검사에서 `tailwindcss` 문자열을 찾도록 작성해 실패했다. 개발 서버가 반환한 CSS에는 해당 주석이 없었다.
- AI 수정: 주석 검색 대신 실제 생성된 `@layer utilities`, `max-width: 720px`, `min-height: 100dvh` 규칙을 확인하도록 단발 검사 수정. 앱 코드는 변경하지 않음.
- 재검증: HTML 및 스타일시트 HTTP 200, 한국어 준비 문구와 생성된 CSS 규칙 확인 통과.
- 한계: 브라우저 시각 검사와는 다르다.
- commit: 없음.

## 3. 개발 도구 의존성 취약점

- 기대: 설치 후 의존성 안전성 확인.
- 실제/재현: 전체 `npm audit`에서 high 5건. `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` 경로. braces 중첩 패턴의 스택 고갈 위험(GHSA-vfj7-8cjw-p6xm).
- AI 조치: `npm audit --omit=dev`로 런타임 영향 분리(0건), `npm view braces version` 확인(3.0.3, 수정 안정 버전 없음). audit가 제시한 Next 14 계열 ESLint 설정으로의 강제 다운그레이드는 적용하지 않음.
- 재검증: 린트·타입·테스트·빌드는 통과. 전체 audit의 5건은 미해결 상태.
- 한계/다음 조치: 개발 도구가 처리하는 외부 glob 패턴에 영향 가능. 현재 앱은 사용자 패턴을 받지 않는다. upstream 수정 버전이 나오면 도구 업데이트 후 audit/린트 재검증.
- commit: 없음.


## 2026-10-21 M4 통합 검증

- 실제 Supabase와 Chrome 독립 A/B context에서 소유권·공개본 분리·갱신·중단·삭제를 확인했다. SQL/RLS 완화 없음.
- 초기 Node TMDB timeout으로 G2 9건/G3 5건 및 M4 재저장이 실패했다. IPv4 우선 + 자동 주소 family 선택 비활성의 로컬 실행에서 G2/G3/M4 전체 재검증 통과. 앱 timeout을 늘리거나 검증을 건너뛰지 않았다. Vercel 네트워크는 별도 확인 필요.
- 개발 서버를 재시작한 뒤 Chrome의 초기 로딩 대기는 재발하지 않았다. 빌드와 dev 검증을 동시에 실행하지 않는다.
- production 영화 API와 신규 M4 쓰기는 503 유지. 분산 한도·CAPTCHA·외부 Origin·호스팅 로그/캐시·실제 기기 확인 전 배포 완료로 보고하지 않는다.

- 최종 타입 검사에서 Next 생성 캐시 `routes.d 2.ts`의 중복 LayoutProps가 발생했다. 자동 생성 헤더를 확인한 중복 캐시만 제거하고 typecheck/build를 재실행해 통과했다. 제품 타입이나 설정을 완화하지 않았다.


## 2026-10-21 M5-A

- 실제 Supabase invalid-CAPTCHA probe가 가입에 성공했다. NOT_ENFORCED로 기록하고 임시 계정 삭제. 새로운 공유 제한 RPC도 NOT_READY다. 따라서 운영 차단을 유지한다.
- M5-A 추가 migration은 준비만 했으며 기존 G1 migration/RLS를 바꾸지 않았다. 실제 provider 성공은 설정 부족으로 NOT RUN이다.
- 초기 Chrome 회귀에서 개발 서버 반복 재컴파일 중 SSR 로딩/평가 실패. .next/dev 생성 캐시 정리 후 순차 재검증해 M4 14, M1/M2 23, M3 10 통과. M5 오류 주입 추가 실행은 15그룹 통과.
- Vercel의 실제 trusted-IP 헤더, 공용 IP 예산, CAPTCHA widget/HTTPS/로그/비용 설정은 M5-B 배포 검사까지 미검증이다.

- 최종 개발 서버 재시작 때 Turbopack persistence의 생성 중복 파일 `CURRENT 2`로 기동 실패. .next/dev/cache 생성 캐시만 정리하고 다시 기동했다. 소스/DB/환경 값을 지우지 않았다. 이 로컬 캐시 재발 위험은 배포 검증과 별개다.


## M5 CAPTCHA UNVERIFIED 원인

Supabase가 invalid CAPTCHA를 HTTP 400/error_code=captcha_failed로 거부했지만 공통 클라이언트가 숫자 code를 우선해 잘못 분류했다. 문자열 기계 코드 해석 수정 후 실제 readiness READY/REJECTED(0)를 확인했다. 다른 오류는 계속 UNVERIFIED이며 정상 토큰 승인/재사용 거부는 별도 실제 위젯 확인이 필요하다. --captcha-only 진단은 운영 해제 레코드를 등록하지 않는다.

실제 위젯을 통한 정상 가입은 성공했다. 재사용 단계 assertion이 원인을 가리던 진단을 보강한 재검사에서 CAPTCHA_REPLAY_ACCEPTED 및 서로 다른 익명 계정 2개 생성을 확인했고 모두 삭제했다. Auth v2.197.0, publishable key 사용, 공식 dummy site key 아님. 외부 제공자의 재사용 허용 원인은 아직 미확정이다. 운영 해제 증명 해시는 전후 동일하며 차단 유지.
