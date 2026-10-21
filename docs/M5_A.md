# M5-A — 운영 요청 보호와 배포 차단 해제 준비

> **2026-10-21 현재 변경:** 앱·검증 도구를 hCaptcha로 교체했다. 아래 최초 Turnstile 설정 설명은 이력이며 현재 설정에는 사용하지 않는다. 현재 콘솔·환경 변수·개발 hostname·운영 증명을 쓰지 않는 검증 순서는 [M5_HCAPTCHA.md](M5_HCAPTCHA.md)를 따른다. 사용자 실검증에서 hCaptcha 정상 가입·동일 토큰 재사용 거부가 확인됐다. 운영 증명 등록은 없고503을 유지한다. Preview 준비 점검은 [M5_B_PREVIEW.md](M5_B_PREVIEW.md).

2026-10-21. **코드·SQL·검증 도구 준비 완료, 운영 차단은 유지한다. 실제 Vercel 배포와 새 SQL 적용은 하지 않았다.**

## 현재 실제 외부 상태

`G1_ALLOW_TEST_WRITES=yes npm run verify:m5:readiness`를 실제 Supabase에 실행했다. 새 제한 RPC는 NOT_READY, 고의로 잘못된 CAPTCHA를 넣은 익명 가입은 **성공하여 NOT_ENFORCED**로 판정됐다. 생성된 임시 Auth 계정은 삭제했다. 이 결과는 CAPTCHA 통과가 아니라 설정 결함을 확인한 결과다. Dashboard의 구체적인 toggle 값은 API로 읽지 않았으나 현재 익명 가입에 CAPTCHA가 강제되지 않는 것은 실제 요청으로 확인했다.

`npm run verify:m5`는 필수 설정·실제 CAPTCHA 입력이 없어 **NOT RUN / 종료 2**였다. 관리형 카운터의 실제 공유·429·만료 복귀, 실제 CAPTCHA 성공/재사용 거부, Vercel ingress 검증은 아직 완료하지 않았다. 보호 증명 레코드를 등록하지 않았다.

## 선택과 대안 비교

| 선택지 | 현재 확인한 제약 | 판단 |
| --- | --- | --- |
| Vercel WAF | Hobby는 규칙 1개, 고정 창 최대 10분. Pro 규칙 수는 늘지만 시간 창 제약이 있음 | 가장 먼저 검토. IP·여러 API·사용자 시간당 저장을 작은 기본 구성으로 모두 표현하기 어려움. 실제 계정 플랜/콘솔 설정은 미확인 |
| Upstash Redis | Free 250MB, 월 500K commands. REST로 Vercel 사용 가능 | 적합한 대안이지만 계정·키·저장소를 추가해야 함. 이번에는 도입하지 않음 |
| **기존 Supabase Postgres** | Free DB 500MB/shared compute, 1주 비활동 시 pause. 제한 RPC도 DB 부하/용량에 포함 | **선택**. PRD 8의 원자적 bucket 대안을 그대로 사용. 새 Redis/큐/의존성 없음 |

기본 플랫폼 기능 우선이라는 v1.1 방침을 바꾸지 않는다. 플랜의 제약이 없는 상위 Vercel 기능을 이미 보유했는지는 확인하지 못했으며, 무료 규모를 기준으로 기존 문서의 대안을 구현했다. 이 방식은 관리형 DB에 영속적인 공유 카운터를 두는 방식이며 Vercel 인스턴스 메모리 카운터가 아니다. DDoS를 함수 실행 이전에 막는 edge 방화벽의 대체품은 아니다.

CAPTCHA는 **Cloudflare Turnstile Managed widget + Supabase Auth 서버 검증**을 선택했다. Turnstile 무료 플랜이 있고 Supabase가 공식 지원한다. 새로 필요한 계정은 Cloudflare이며, 기존 Supabase/Vercel 계정은 재사용한다. Preview용 Supabase 프로젝트와 위젯을 운영과 분리하는 것을 권장한다. 계정 생성·키 발급·도메인 등록을 대신 수행하지 않았다.

출처: [Vercel WAF 제한](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), [Upstash 가격](https://upstash.com/pricing/redis), [Supabase 가격](https://supabase.com/pricing), [Turnstile 플랜](https://developers.cloudflare.com/turnstile/plans/), [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha).

## API별 보호

| 경로 | 배포 환경 보호 |
| --- | --- |
| POST `/api/catalog/movies` | IP당 HTTP 60회/분. 영화 처리 단위 IP당 180/분, 이미 Auth 검증된 사용자도 180/분. 전체 5,000단위/일 |
| POST `/api/session` | IP 10회/분, 기존 소유자 확인 30회/분. **새 가입만** 전체 100회/일. 새 가입에는 CAPTCHA 필수 |
| POST `/api/festivals` | IP 쓰기 120회/분 + 사용자 쓰기 30회/분 + 저장 10회/시간 + 전체 쓰기 3,000회/일 |
| POST publish/unpublish, DELETE festival | 동일 쓰기 예산 + 기존 Auth·owner·revision·동의 검사 |
| GET `/api/festivals`, GET `/{id}` | IP 120회/분 + Auth 사용자 120회/분 + 원본 RLS |
| GET/HEAD `/f/{token}` | Proxy에서 IP 120회/분. 읽기 전용이며 외부 사이트의 일반 공유 링크 방문 허용 |
| Preview `/api/dev/png`를 명시적으로 연 경우 | IP 10회/분 + 같은 검증 증명 필요. 운영에서는 기존 G3 비활성 유지 |
| 기존 G2 `/api/movies/*`, `/dev/tmdb` | 배포 환경 404 유지 |

영화 검색·상세 1회는 1단위, 후보 6편 batch는 6단위다. 캐시 적중도 동일하게 계산해 인스턴스별 캐시 여부로 보호를 우회하지 못한다. 6부문×2페이지의 72편 조회는 HTTP 12회/72단위로 예산 안에 들어간다. 검색·선택 확인의 여유를 두고, 공용 IP 및 실제 사용자 부하는 M5-B에서 확인한다. 일일 전역 예산은 소규모 공개를 위한 비용 상한이며 트래픽 예측값이 아니다. 공격자가 전역 예산을 소진하면 정상 사용자도 429가 되므로 관찰 후 정책 버전과 검증을 함께 갱신해야 한다.

고정 창이므로 경계에서 최대 두 창 분량의 burst가 가능하다. DB 시간을 사용하고 원자적 upsert/행 잠금으로 여러 인스턴스가 공유한다. 다차원 키는 정렬해 잠금 순서를 고정한다. 한도 초과는 해당 창 종료까지의 실제 `Retry-After`와 한국어 안내를 반환한다. 예산 저장소 장애·잘못된 응답·검증 증명 없음은 503이며 무제한 허용으로 넘어가지 않는다.

## IP·개인정보·권한

Vercel 시스템의 `VERCEL`/`VERCEL_ENV`, 명시적 HTTPS Host 허용목록, 상태 변경 Origin을 확인한다. IP는 그 환경에서만 플랫폼의 `x-vercel-forwarded-for` 단일 IP를 사용하고 일반 client XFF로 fallback하지 않는다. Vercel 앞에 별도 프록시를 추가하기 전에는 신뢰 경계를 재검증해야 한다. [플랫폼 헤더 근거](https://vercel.com/docs/headers/request-headers).

IP·사용자 ID는 환경·경로 종류와 함께 서버 HMAC으로 변환하고 카운터에는 digest·창·횟수·만료만 저장한다. 원문 IP·인증 토큰·영화 검색어를 제한 테이블에 저장하지 않는다. 24시간 TTL의 만료 행을 후속 요청마다 최대 500개 정리하므로 유휴 상태에서는 물리 삭제가 지연될 수 있다. 엄격한 24시간 삭제가 필요하면 DB 정기 정리를 별도로 설정해야 한다.

새 테이블은 RLS 활성화/anon·authenticated 권한 회수, 새 RPC는 service_role만 실행 가능하다. **G1 테이블·RLS·RPC·소유권은 변경하지 않는다.** CAPTCHA는 새 계정 생성의 봇 방지일 뿐 소유권 증명이 아니다. 이미 발급된 세션도 사용자 예산과 기존 Auth/CRUD 검사를 통과해야 한다. 클라이언트 owner_id·공개 token·JWT 임의 해석으로 사용자 예산 키를 정하지 않는다.

## 운영 503 해제 조건

단일 enable 환경 변수는 없다. 매 배포 요청은 아래를 모두 만족해야 한다.

1. Vercel 배포 runtime와 정확한 Host/Origin/IP가 유효하다.
2. HMAC 비밀 키·실제 형식의 Turnstile site key·허용 origin·Supabase 설정이 유효하다. 공식 dummy site key는 배포 설정에서 거부한다.
3. 정책 버전·환경·origin 집합·site key·프로젝트 URL·HMAC 키로 만든 fingerprint와 일치하는 **실제 검증 레코드**가 DB에 있다.
4. 요청마다 실제 공유 RPC가 실행되어 현재 예산을 허용한다. 메모리 캐시나 과거 허용 응답으로 이 단계를 생략하지 않는다.
5. 쓰기는 여기에 Auth·소유권·입력·revision 검사를 추가한다.

검증 레코드는 아래 실검증 도구가 DB 공유 제한/만료·공개 RPC 차단·실제 CAPTCHA 실패/성공/재사용 거부를 모두 확인한 뒤에만 기록한다. 이 도구는 SQL을 적용하거나 Vercel을 배포하지 않는다. 레코드를 SQL Editor에서 수동 삽입해서 통과시키지 않는다. service-role 관리자 자체는 모든 DB를 바꿀 수 있으므로 키 보호는 여전히 필수다.

Supabase Dashboard에서 CAPTCHA를 나중에 끄는 변경은 fingerprint로 자동 감지할 수 없다. 설정 변경 전 검증 레코드를 취소하고 다시 검증해야 한다. 이 운영 변경 절차와 실제 Vercel의 위젯/헤더 검증을 대체하는 장치라고 주장하지 않는다.

서버 진단은 `[request-protection]` 뒤의 고정 오류 코드만 출력한다. 공개 응답에는 설정 이름·값·원문 upstream 오류를 넣지 않는다. 기존 민감 URL 수신 요청 로그 비활성화를 유지한다. 호스팅 제공자의 request URL/로그 수집 정책은 M5-B에서 따로 확인한다.

## 사용자가 직접 수행할 설정 순서

1. **Supabase 프로젝트 확인**: 현재 G1용 테스트 프로젝트와 향후 운영 프로젝트를 구분한다. 기존 데이터를 삭제하거나 G1 migration을 재실행하지 않는다. Free의 활성 프로젝트 수/compute/용량·Vercel 사용량/지출 알림을 확인한다.
2. **추가 SQL 검토/적용**: SQL Editor → New query에서 `supabase/migrations/202610210001_m5_request_protection.sql`만 한 번 실행한다. request_buckets/request_protection_checks 두 테이블과 consume_request_budget 한 함수를 추가하는 트랜잭션이다. G1 권한/함수 변경이나 기존 데이터 삭제는 없다. 객체 이름이 이미 있다면 재실행 대신 적용 이력을 확인한다. 이번 작업에서는 실제 DB에 적용하지 않았다.
3. **Cloudflare**: Dashboard → Turnstile → Add widget → Managed. Preview 전용 위젯에는 검증용 `127.0.0.1` 및 M5-B에서 확정할 정확한 Preview hostname을 등록한다. 운영 위젯에는 실제 운영 hostname만 등록한다. wildcard/Any Hostname/dummy key로 운영 검증을 대신하지 않는다. Site key와 Secret key를 안전하게 보관한다.
4. **Supabase CAPTCHA**: 대상 프로젝트 → Settings → Authentication → Bot and Abuse Protection → Enable CAPTCHA protection. Provider를 Turnstile로 선택하고 해당 위젯의 **Secret key를 이 콘솔에만** 입력한 뒤 Save한다. Allow anonymous sign-ins는 유지한다. Rate Limits에서 익명 가입 제한과 실제 server-egress IP 적용을 확인한다. 현재 서버 가입 경로는 사용자 IP 전달로 Supabase 자체 한도를 변경하지 않는다. 낮은 공용 egress 한도가 정상 가입을 막는지는 Preview에서 확인해야 한다. 보호를 끄고 테스트를 통과시키지 않는다.
5. **로컬 비밀 설정**: `.env.local`에 아래 새 이름을 설정한다. APP_ALLOWED_ORIGINS는 정확한 HTTPS origin의 쉼표 목록(경로/끝 slash/wildcard 없음), PROTECTION_HMAC_KEY는 비밀번호 관리자로 생성한 32바이트 난수의 64자리 hex, site key는 해당 환경 위젯의 공개 Site key다. 키를 채팅·코드·로그에 붙이지 않는다. Preview/Production의 키·프로젝트를 혼합하지 않는다.
6. **실제 준비 상태 재확인**: `G1_ALLOW_TEST_WRITES=yes npm run verify:m5:readiness`. READY/REJECTED인지 확인한다. CAPTCHA가 강제되면 기존 G1 CLI도 새 실제 CAPTCHA 토큰 A/B가 필요하다. 자동 검사를 위해 CAPTCHA를 끄지 않는다.
7. **실제 제공자 검증**: `G1_ALLOW_TEST_WRITES=yes M5_VERIFY_ENV=preview npm run verify:m5 -- --captcha-browser`. 출력된 127.0.0.1 주소를 브라우저로 열어 실제 widget 확인을 완료한다. 토큰은 프로세스 메모리로만 전달되며 출력·파일 저장하지 않는다. 이 로컬 수집은 로컬 hostname을 등록한 검증 위젯으로 사용한다. 운영 검증에서는 운영 호스트 위젯의 신선한 토큰을 보안 환경 입력으로 공급하는 M5_CAPTCHA_TOKEN 방식을 사용할 수 있다. 모든 검사/정리 성공과 종료 코드 0만 인정한다. 실패/NOT RUN 상태에서는 해제하지 않는다.
8. **M5-B에서만 Vercel 설정/배포**: Project Settings → Environment Variables에서 Preview/Production을 구분해 아래 환경 변수를 등록한다. 실제 Preview URL이 정해지면 APP_ALLOWED_ORIGINS와 Turnstile hostname을 맞추고, fingerprint가 바뀌므로 해당 환경 검증을 다시 실행한다. 현재 단계에서는 배포하지 않는다.
9. **M5-B 확인 후 공개 판단**: 실제 Vercel header spoof 거부, HTTPS Secure/HttpOnly cookie, 학교 공용 IP 정상 흐름/429 복귀, 사람의 실제 CAPTCHA 성공/실패, A/B 권한과 공개 링크를 확인한다. DDoS 기본 보호·사용량 알림 및 가능한 WAF edge 제한을 콘솔에서 확인한다. 검증되지 않은 부분이 남으면 일반 공개 확산은 보류한다.

로컬 production 차단 검사는 빌드 후 port 3100에서 `npm run start -- --hostname 127.0.0.1 --port 3100`을 켜고 `npm run verify:m5:http`로 재현한다. 이는 미설정 차단 검사이며 Vercel 실검증이 아니다.

긴급 차단은 해당 환경의 request_protection_checks 레코드를 삭제하는 방식으로 수행할 수 있다. 카운터나 G1 영화제 데이터는 지우지 않는다. CAPTCHA/정책 설정을 바꾸면 검증 도구를 다시 실행한다.

## 필요한 환경 변수 이름

신규 앱 설정:

```text
APP_ALLOWED_ORIGINS
PROTECTION_HMAC_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY
```

검증 도구 전용:

```text
G1_ALLOW_TEST_WRITES
M5_VERIFY_ENV
M5_CAPTCHA_TOKEN
```

M5_CAPTCHA_TOKEN은 `--captcha-browser` 사용 시 불필요하며 Vercel 앱 환경에 넣지 않는다. Turnstile Secret key도 앱 환경에 넣지 않고 Supabase 콘솔에만 등록한다. VERCEL/VERCEL_ENV는 플랫폼 시스템 값으로 직접 흉내 내서 배포 검증을 대신하지 않는다.

기존 이름은 그대로 필요하다: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, TMDB_READ_ACCESS_TOKEN. .env.example은 전부 빈 값이다.

## 실행한 검사와 구분

| 검사 | 결과/범위 |
| --- | --- |
| 기본 테스트 | 96/96: 기존 86 + M5 10. PostgreSQL은 PGlite 격리 DB이며 hosted 증명 아님 |
| 실제 G1 / G2 / 로컬 G3 | 각각 10/10, 10/10, 11/11 회귀 통과 |
| 실제 M4 HTTP | 12그룹 통과. 로컬 개발 경로이므로 새 배포 제한의 실제 제공자 검증은 아님 |
| 실제 Chrome 기존 UI | M1/M2 23그룹, M3 10그룹, M4 14그룹 통과 |
| Chrome M5 오류 주입 + M4 | 15그룹: 가짜 CAPTCHA_REQUIRED/미설정 UI, 가짜 429 저장 실패 초안 보존 + 실제 Supabase 기존 흐름 |
| 실제 준비 상태 | 새 RPC NOT_READY, 잘못된 CAPTCHA 가입 NOT_ENFORCED. 차단 유지 / 종료 2 |
| 실제 새 제공자 검증 | 설정/토큰 부족으로 NOT RUN / 종료 2 |
| 로컬 production HTTP | 10건: 영화/세션/쓰기에 설정 부족 503, 공개 읽기 Proxy 503, 개발 API 404, 내부 진단·키 미노출 |
| lint / typecheck / build | 통과. 배포 아님 |
| 비밀 검사 | 실제 TMDB/service key 문자열 번들·개발 로그·API 응답 미검출. 실제 HMAC/Turnstile secret은 미설정이므로 해당 실키 검사는 미실행 |

새 M5 오프라인 검사는 Origin/Host/플랫폼 IP spoof, 키의 HMAC 처리, 환경 fingerprint, A/B 예산 분리, 캐시 우회 방지, 429 Retry-After, 제공자 장애/잘못된 허용 응답, CAPTCHA 없음/실패/성공과 기존 세션 재사용, 반복 게시 차단을 포함한다. 실제 CAPTCHA 성공과 위젯 만료/상호작용은 테스트 더블로 대체되었다. 새 managed RPC의 실제 시간 경과·서버리스 다중 인스턴스·실제 학교 IP 검증은 아직 없다.

초기 Chrome 동시 실행에서는 개발 서버 반복 재컴파일 중 초기 로딩 검사가 실패했다. 생성 캐시만 정리한 뒤 순차 재검증해 통과했다. 제품 보안 검사를 생략해 통과시킨 것이 아니다.

## 변경 파일과 증거

- `src/lib/request-protection.ts`: 설정/fingerprint/신뢰 경계, 공유 예산, 안전한 실패 응답.
- `src/lib/product-movies.ts`, `src/lib/festival-http.ts`: 기존 운영 503을 검증된 공유 예산 경로로 연결, 기존 Auth/CRUD 유지.
- `src/components/turnstile.tsx`, `save-festival.tsx`, `src/lib/festival-browser.ts`: 필요할 때만 CAPTCHA, 만료·실패/초안 보존.
- `src/proxy.ts`: 공개 읽기 보호를 HTML 렌더 전 적용해 실제 429/503 반환.
- `src/app/api/dev/png/route.tsx`: 선택적 Preview 검증 endpoint 보호만 추가. PNG 통합 아님.
- `supabase/migrations/202610210001_m5_request_protection.sql`: 추가 migration, **실제 미적용**.
- `scripts/m5/{readiness,verify,captcha-input,check-http}.mjs`, `tests/m5-protection.test.mjs`, `tests/setup.test.mjs`, `scripts/m4/browser.mjs`의 선택적 M5 오류 주입, package.json, .env.example, 관련 문서.
- [실제 준비 상태](../artifacts/m5/readiness.json), [M5 오류 주입/실제 회귀 Chrome](../artifacts/m5/browser-checks.json), [production 차단](../artifacts/m5/production-checks.json), [M1/M2 UI 회귀](../artifacts/m5/regression/browser-checks.json).

## M5-B 준비 상태

코드는 빌드 가능하고 SQL·위젯·실제 제공자 검증 도구·설정 순서는 준비했다. 그러나 **SQL 실제 적용, CAPTCHA 강제 설정, 실제 CAPTCHA 성공/재사용 거부, managed 공유 예산 실검증, 실제 Vercel 헤더/위젯/HTTPS/공용 IP가 배포 차단 항목**이다. 현재 공개 배포 준비 완료라고 보고하지 않는다. Preview는 보호 상태를 확인하는 다음 단계이며, Preview 배포 자체와 일반 공개 승인을 혼동하지 않는다.

PNG 제품 통합·CSV·회원가입·소셜 로그인·OG 확대는 하지 않았다. 실제 제공자 설정·실기기·분산 부하·비용/로그 콘솔은 사용자가 설정 후 검증해야 한다.


## CAPTCHA readiness UNVERIFIED 진단 보완

실제 Supabase는 invalid CAPTCHA에 HTTP 400과 숫자 code=400, 문자열 error_code=captcha_failed를 함께 반환했다. 공통 클라이언트의 code 우선 선택이 숫자를 저장해 기존 문자열 비교에 실패했다. 문자열 기계 코드를 보존하도록 오류 해석만 수정했으며 상태/인증/거부 조건은 완화하지 않았다. 실제 재검사 결과 READY/REJECTED, 종료 0이다. 이것만으로 정상 CAPTCHA 승인이나 재사용 거부까지 확인한 것은 아니다.

readiness는 이제 signup/verify-user 단계, HTTP 상태, 허용목록 오류 코드·분류만 표시한다. 네트워크/429/가입 비활성/인증·제공자 오류/알 수 없는 오류는 UNVERIFIED로 남긴다. msg·응답 원문·토큰은 표시하지 않는다.

운영 해제 증명을 등록하지 않는 별도 CAPTCHA 진단:

```sh
G1_ALLOW_TEST_WRITES=yes npm run verify:m5 -- --captcha-only --captcha-browser
```

로컬 Node 연결에 기존 IPv4 우선 설정이 필요한 경우:

```sh
NODE_OPTIONS='--no-network-family-autoselection --dns-result-order=ipv4first' G1_ALLOW_TEST_WRITES=yes npm run verify:m5 -- --captcha-only --captcha-browser
```

터미널에 출력되는 임시 127.0.0.1 주소에서 실제 위젯을 완료하면 invalid 거부/normal 승인/replay 거부를 각각 검사한다. 이 모드는 request_protection_checks에 쓰지 않으며 M5-B를 배포하지 않는다. 위젯 도메인 오류 시 Cloudflare의 해당 **검증용** 위젯에 127.0.0.1 허용을 확인한다. 운영 위젯의 로컬 도메인을 불필요하게 추가하지 않는다. 정상 승인 실패 시 Supabase의 Provider=Turnstile 및 Secret key가 현재 Site key와 같은 위젯인지 확인한다. CAPTCHA를 끄거나 dummy key로 성공을 대체하지 않는다.


### 실제 CAPTCHA 세 사례 진단 결과

사용자가 실제 위젯을 완료한 진단에서 invalid token은 captcha_failed로 거부됐고 정상 토큰으로 익명 가입이 승인됐다. 같은 토큰 재사용은 **추가 익명 계정 생성을 허용해 CAPTCHA_REPLAY_ACCEPTED로 실패**했다. 최근 재검증의 정상/재사용 계정 두 개는 모두 삭제했다. 공개 키는 publishable 유형이며 service-role과 다르고, site key는 공식 dummy key가 아니었다. Auth 버전은 v2.197.0이었다. provider Secret의 콘솔 값 및 제공자 내부 동작은 확인하지 못했으므로 재사용 허용의 외부 원인을 확정하지 않는다.

진단 전후 request_protection_checks의 값은 해시 비교로 동일했다. 운영 해제 증명 등록·설정 변경·SQL 변경·M5-B 배포는 하지 않았다. readiness 종료 0은 invalid-token 거부 확인일 뿐 세 사례 전체 성공이 아니다.

다음에는 Supabase Bot and Abuse Protection의 Provider=Turnstile, 실제 위젯 Secret과 Site key의 대응, 테스트 Secret 혼용 여부를 콘솔에서 확인한다. Auth Logs에서 최근 POST /signup 성공 두 건과 Cloudflare Turnstile Token Validation 내역을 함께 확인한다. 설정이 올바른데 재사용이 계속 허용되면 제공자 지원에 Auth 버전·상태·재현 절차만 전달하고 토큰/키/세션/로그 원문은 전달하지 않는다. 재사용 거부가 확인될 때까지 운영 차단을 유지한다.

