# M5-B Vercel Preview 사전 점검

2026-10-21. **설정 준비·차단 상태의 Preview 배포 계획까지 준비 가능. 실제 사용자 흐름 검증과 공개 서비스 허용은 아직 불가.** 이번 작업은 문서와 정적 코드 점검뿐이며 배포·콘솔 변경·SQL·증명 등록·외부 가입 검사를 실행하지 않았다.

## 완료와 미완료 구분

- 사용자 실행 hCaptcha replay: 첫 signup200, 동일 원본 replay400/captcha_failed, 독립 클라이언트, 신규 계정1개 정리 성공, release_activated=false. 정상 승인·재사용 거부는 확인. Turnstile 내부 원인은 미확정.
- 직전 코드 검증:108/108, lint/typecheck/build 통과. 이번 문서 갱신에서는 테스트를 재실행하지 않았다.
- Preview hostname·프로젝트 설정·배포 보호·환경 변수는 콘솔 미확인. 로컬 작업 폴더에 .git/.vercel 연결 정보가 없어 원격 소스/프로젝트 연결도 확인하지 못했다. Git 연결은 자동 배포 방식의 준비 항목이며 CLI 수동 Preview 방식을 쓰면 Git 자체가 필수는 아니다.
- 임의 invalid hCaptcha 토큰 거부의 최신 실행 결과는 이번 사용자 보고에 없으므로 별도 확인 필요. 재사용 거부와 구분한다.

## 현재 코드의 차단 조건

`request-protection.ts`는 VERCEL=1, VERCEL_ENV=preview/production, 정확한 HTTPS Host/Origin, 단일 IP 형식의 x-vercel-forwarded-for, 공유 DB 예산, 환경·fingerprint 검증 기록을 요구한다. 누락/장애503, 초과429를 유지한다. VERCEL_URL을 APP_ALLOWED_ORIGINS로 자동 확장하거나 XFF fallback을 추가하지 않는다.

fingerprint는 HMAC으로 `[m5a-v1, hcaptcha, 정렬된 origins, Sitekey, Supabase URL]`에 결합된다. hCaptcha 재사용 성공 보고만으로 DB 검증 기록이 생기지 않는다. origin·Sitekey·프로젝트·HMAC 변경 시 새 검증이 필요하며, Secret/콘솔 활성 상태는 자동 감지하지 못한다.

| 경로 | 증명 없는 Preview 예상 | 증명 후 확인할 사항 |
| --- | --- | --- |
| 랜딩·설문·로컬 결과 | 정적/로컬 진행 가능 | 모바일·초안 복원 |
| /api/catalog/movies |503| 실제 TMDB 검색·후보·429·복귀 |
| /api/session, /api/festivals 및 쓰기 |503| CAPTCHA, A/B 소유권·revision·중복 저장 |
| /f/<읽기 전용 token> | 올바른 token 형식도 Proxy에서503 | 공개 snapshot·중단/삭제 후404·캐시 |
| 개발 TMDB API | 운영 빌드404 | 운영 경로로 공개하지 않음 |
| /dev/png, /api/dev/png | 기본404 | Preview probe 켠 경우 PNG API도 증명 전503 |

### 기능 검증을 막는 순서 문제

SaveFestival은 /api/session이 CAPTCHA_REQUIRED 또는 CAPTCHA_FAILED를 반환한 후 위젯을 표시한다. 현재 증명 전에는 보호 start 단계에서503이 먼저 발생하므로 Preview의 정상 저장 화면으로 실제 위젯을 띄울 수 없다. `captcha-input.mjs`는 로컬 captcha.banguseok.test 전용이며 Preview 토큰을 수집하는 도구가 아니다.

따라서 **증명 없는 차단 Preview에서 모든 기능을 먼저 통과한 뒤 증명을 등록하는 순서는 현재 코드로 불가능**하다. 후속 M5-B에서 승인된 순서를 정해야 한다: (1) 차단된 배포의 빌드/보호를 확인, (2) 정확한 Preview 구성에 대한 제공자 사전 검증과 preview 한정 증명 등록을 별도 승인, (3) 실제 Preview 위젯·ingress·전체 흐름을 검증하고 실패 시 증명을 철회. Preview hostname 위젯을 증명 등록보다 먼저 검증하려면 쓰기 권한을 주지 않는 제한된 검증 화면/수집 경로를 별도 설계해야 한다. 이번에는 추가하지 않았다. 단순 enable flag·503 우회로 해결하지 않는다.

## 배포 전에 사용자가 콘솔에서 수행할 순서

1. **대상 프로젝트·소스·환경 확정.** Vercel 기존 Project의 Settings에서 작업한다. 새 프로젝트 Import의 Deploy 버튼이나 자동 배포를 유발하는 push는 아직 실행하지 않는다. 프로젝트가 없으면 준비할 소스와 설정 목록까지만 정한다. Framework=Next.js, Root Directory=package.json 위치, Install=npm ci, Build=npm run build, Output 기본값. Node.js24.x를 선택한다. [지원 Node 버전](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
2. **검증 hostname 결정.** 안정된 Preview branch alias 또는 보유 staging hostname 하나를 정한다. 실제 할당 URL이 아직 없으면 임의 추정하지 말고 미정으로 남긴다. 향후 승인된 첫 차단 배포 후 URL을 확보하고 설정·재배포가 필요할 수 있다. 재배포마다 바뀌는 deployment URL 전체를 허용할 필요는 없다.
3. **hCaptcha hostname 정합성.** 해당 Sitekey에 정확한 Preview hostname을 허용한다. hCaptcha에는 scheme/path/port 없는 hostname, 앱에는 아래의 HTTPS origin을 넣는다. *.vercel.app 전체 허용 금지. Sitekey가 Supabase에 등록된 Secret과 대응하는지 확인한다. Supabase 한 프로젝트의 CAPTCHA Secret은 Preview 환경별로 자동 분리되지 않으므로 별도 키를 만들었다면 대응 관계를 확인해야 한다. 기존 설정을 끄지 않는다. [hCaptcha 설정](https://docs.hcaptcha.com/configuration).
4. **Vercel Environment Variables → Preview 범위만 등록.** 아래 이름을 사용하고 값은 문서·채팅에 붙이지 않는다. NEXT_PUBLIC 값도 빌드 시 반영되므로 변경 후 재배포가 필요하다. [환경 변수](https://vercel.com/docs/environment-variables).

   | 이름 | 용도 |
   | --- | --- |
   | NEXT_PUBLIC_SUPABASE_URL | 검증 대상 프로젝트 |
   | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | 같은 프로젝트 공개 키 |
   | NEXT_PUBLIC_HCAPTCHA_SITE_KEY | Preview에서 사용할 실제 Sitekey |
   | SUPABASE_SERVICE_ROLE_KEY | 서버 전용, 동일 프로젝트 |
   | TMDB_READ_ACCESS_TOKEN | 서버 전용 |
   | PROTECTION_HMAC_KEY | 서버 전용64자리 hex, 사전 검증과 동일한 Preview 값 |
   | APP_ALLOWED_ORIGINS | 정확한 https://<preview-host> |
   | G3_PROBE_ENABLED | 기본 미설정, 별도 PNG probe 검증 때만 yes |

   APP_ALLOWED_ORIGINS는 쉼표 목록을 지원하나 필요한 hostname만 넣는다. wildcard·끝 slash·path·http 금지. Preview 키를 Production 범위에 복제하지 않는다. VERCEL/VERCEL_ENV는 플랫폼 시스템 값이므로 수동 생성하지 말고 노출 설정을 확인한다. Preview 빌드의 NODE_ENV는 production이며 development로 덮어쓰면 안 된다. [시스템 환경 변수](https://vercel.com/docs/environment-variables/system-environment-variables).

   **등록하지 않을 값:** hCaptcha Secret, 과거 TURNSTILE 키, G1_ALLOW_TEST_WRITES, G1_CAPTCHA_TOKEN_A/B, M5_CAPTCHA_TOKEN, M5_VERIFY_ENV. 마지막 두 개는 로컬 검증 프로세스 전용이다.
5. **Supabase 읽기 점검.** 익명 Auth·hCaptcha 활성, 키의 프로젝트 일치, 이미 적용한 managed-bucket RPC와 권한을 확인한다. 기존 migration 재실행·RLS 변경 금지. 같은 DB를 쓰면 실제 데이터가 공유된다는 점을 확인하고 테스트용 사용자/콘텐츠만 사용한다. 이 앱은 익명 직접 가입이라 OAuth callback wildcard 추가는 필요 없다.
6. **Deployment Protection 정책 확인.** Preview는 우선 보호 상태로 유지한다. Vercel 로그인이 필요한 상태에서는 시크릿 창의 공개 링크가 앱에 도달하지 못할 수 있으므로 앱 소유권 오류와 구분한다. 비로그인 외부 공유 검증에는 플랫폼이 허용하는 제한된 테스트 접근 방식 또는 별도 공개 Preview 결정이 필요하다. bypass Secret을 앱 응답이나 공유 URL에 넣지 않는다. [Vercel 배포 보호](https://vercel.com/docs/deployment-protection).
7. **로그·Functions 설정 확인 후 멈춘다.** Supabase 지역과 네트워크 지연, Functions 플랜·메모리·실행 시간·예산 알림을 점검한다. 실제 Deploy와 preview 증명 등록은 아직 하지 않는다. Runtime Logs/드레인의 URL 기록에 공개 token·Cookie·Authorization이 남지 않는지 이후 실제 요청으로 확인해야 한다. incomingRequests:false만으로 플랫폼 로그까지 숨겨진다고 판단하지 않는다.

## 공개 링크·PNG 런타임 사전 확인

- 공개 페이지는 저장된 snapshot만 읽고 force-dynamic/revalidate0/force-no-store 및 응답 no-store를 사용한다. Preview에서 공유→공개 중단→동일 URL 차단, 삭제→차단, 다른 세션 수정 불가를 실제 HTTPS에서 재검증해야 한다. 캐시 헤더와 Vercel CDN 응답도 확인한다.
- 편집 세션·초안은 hostname에 묶인다. Preview alias를 바꾸면 같은 브라우저라도 기존 쿠키·localStorage를 이용하지 못할 수 있다. 검증 동안 hostname을 고정한다. 공개 링크 복사는 현재 접속 origin을 사용하므로 그 hostname도 allowlist 대상이어야 한다.
- G3는 **개발 probe만 존재**하고 실제 결과지 PNG 통합은 미구현이다. 기본404 유지 가능하며 Preview 준비를 막지 않는다. 켜려면 Preview의 G3_PROBE_ENABLED=yes와 정상 보호 증명이 둘 다 필요하다. Production에서는 probe가 비활성이다.
- PNG는 Chromium이 아니라 next/og ImageResponse(Node.js, maxDuration15초)를 사용한다. 로컬 빌드 trace에서 한글 폰트4,691,820바이트와 WASM 포함을 확인했다. Vercel 최종 번들 크기·콜드스타트·메모리·15초 내 렌더링은 아직 미검증이며, [Functions 제한](https://vercel.com/docs/functions/limitations)과 배포 산출물을 확인해야 한다.
- TMDB 포스터 fetch3초 제한/실패 시 대체, PNG 실패503/HTML 유지 설계다. Preview에서1080×1920, 한글·포스터, 폰트/변환 실패 후 HTML과 공개 URL 유지까지 확인한다. 테스트 도구는 Vercel 보호를 자동 통과하지 않는다.

## 현재 판단

**차단 상태의 Preview 배포를 준비하는 데 확인된 앱 빌드 장애는 없다.** 하지만 정확한 hostname·콘솔 환경·preview 증명과 위젯 검증 순서·Vercel ingress 헤더·비로그인 테스트 접근은 미해결이다. 이 항목을 해결하기 전 M5-B 전체 통과 또는 공개 서비스 준비 완료로 표시하지 않는다. 기본 PNG는 별도 보류 가능하다.
