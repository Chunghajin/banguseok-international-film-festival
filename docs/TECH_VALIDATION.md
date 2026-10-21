# 기술 검증 준비

2026-10-20 · 기준: PRD v1.1 / CODEX_STEPS 단계 1

G1 실제 Supabase CLI 10/10, G2 실제 TMDB CLI 10그룹 통과를 확인했다. G3는 실제 PNG 생성과 로컬 검증까지 진행했고 Vercel runtime은 미검증이다. 상세는 [G1_SUPABASE.md](G1_SUPABASE.md), [G2_TMDB.md](G2_TMDB.md), [G3_PNG.md](G3_PNG.md)를 따른다. 제품 인증 UI/API와 전체 결과지, preview 배포는 구현하지 않았다.

## 환경변수

`.env.example`은 아래 이름만 빈 값으로 제공한다. 실제 값은 Git에서 제외된 `.env.local`과 이후 Vercel 환경변수에 설정한다. 준비 화면에는 값이 필요 없다.

| 이름 | 용도 | 공개 범위 |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 프로젝트 URL | 브라우저 공개 가능 |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Supabase 클라이언트용 publishable key | 브라우저 공개 가능, RLS 필요 |
| SUPABASE_SERVICE_ROLE_KEY | 검증된 서버 소유 경로의 DB 쓰기 | 서버 전용 |
| TMDB_READ_ACCESS_TOKEN | TMDB API 읽기 인증 | 서버 전용 |
| G1_ALLOW_TEST_WRITES | 전용 프로젝트의 G1 합성 데이터 검증 실행 표시 | 로컬 CLI 전용 |
| G1_CAPTCHA_TOKEN_A / G1_CAPTCHA_TOKEN_B | CAPTCHA가 켜진 경우 A/B 가입의 1회용 토큰 | 로컬 CLI 전용, 실행 후 제거 |
| G3_PROBE_ENABLED | 접근 제한된 Vercel preview에서만 G3 시험 경로 활성화 | preview 전용, production은 항상 닫힘 |

CAPTCHA 제공자와 현재 플랜의 요청 보호 기능은 미확정이다. 선택한 제공자의 실제 요구를 확인한 뒤 필요한 환경변수 이름을 추가한다. 대체 요청 제한용 HMAC 키도 PRD 8장의 대체안이 필요해질 때 추가한다.

## 다음 실행 순서와 통과 근거

| 게이트 | 준비할 설정 | 실제 확인할 것 | 현재 상태 |
|---|---|---|---|
| G1 익명 CRUD | Supabase 프로젝트·익명 로그인·CAPTCHA·RLS·서버 자격증명 | 원본/공개 2테이블, 서버 전용 쓰기, 익명 A/B 본인 CRUD·타인 조회/변경 거부·공개 token 편집 거부 | 실제 CLI 10/10 통과, 운영 보호 미검증 |
| G2 TMDB | 읽기 토큰·사용 조건/출처·요청 제한 | 서버 프록시의 한국어 검색/상세·동명이작·포스터 없음·오류, 후보 72슬롯 실제 ID 확인 | 실제 검색/상세 검증 통과, 후보 72슬롯·운영 보호 미검증 |
| G3 한글 PNG | Vercel preview 프로젝트·라이선스 확인한 한글 폰트·runtime 한도 | 배포 runtime에서 한글+영화명 PNG 생성·다운로드·실제 시각 확인, 이후 포스터 추가 | 로컬 생성·시각 검사 성공, 실제 배포 runtime 미실행 |

현재 플랜의 요청 제한/방화벽/비용 한도와 학교 공용 IP의 429 복구를 확인한다. 관리형 보호 미지원 시 PRD 8장의 대체안을 평가한다. 단순 DB 연결이나 목업 응답으로 게이트를 통과 처리하지 않는다.

G1/G2 실패는 최우선 해결하고, G3 실패는 HTML/URL 구현과 분리한다. 실제 실행 후 비밀정보를 제거한 증거와 성공/실패/미실행을 각각 기록한다. 실제 오류가 생기면 CODEX_STEPS 공통 지시문에 따라 `docs/problem-log.md`에 재현·수정·재검증을 남긴다.

## 이후 개발 순서

G1/G2/G3 → 콘텐츠/규칙/후보 셔플 → 설문/선정/초안/검색 → 실제 저장/CRUD/공개 URL → PNG → 실제 UX 비교 → 조건 충족 시 CSV → 출시 검증/보고서. 이번에는 서비스 화면이나 결과 규칙을 구현하지 않는다.
