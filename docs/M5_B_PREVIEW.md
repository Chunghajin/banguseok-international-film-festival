# M5-B Vercel Preview 사전 점검

## 2026-10-22 진단 화면 v2 Preview 반영 — 읽기 전용 preflight PASS

- 실제 배포: **https://banguseok-film-festival-kief24s1o-mikechung0918.vercel.app**
- 배포 ID: `dpl_GgBbDBMSv5YRCNMG3UcsfcMp5Y9a`, READY, OIDC environment=preview, target=null. Production으로 분류되면 취소·중단하는 guard를 두었고 실제 Preview 분류와 무인증302를 alias 이동 전에 확인했다.
- 고정 hostname/Origin: **https://banguseok-film-festival-preview-mikechung0918.vercel.app**. 현재 alias는 위 v2 배포를 가리킨다. 이전 READY Preview `dpl_A57C68rJLLDFukMq3p3Tbs2Hzhkm`는 보존했다. 복구가 필요하지 않으며, 아래 명령은 이 Preview alias만 이전 대상으로 되돌린다.

  ```sh
  vercel alias set banguseok-film-festival-i0m7jaril-mikechung0918.vercel.app \
    banguseok-film-festival-preview-mikechung0918.vercel.app --scope mikechung0918
  ```

main/HEAD `cf51cf007164db1c02e0656592e6e2f4124b65b5`의 git archive에 M5 코드·검사 도구·테스트·package.json만 명시적으로 반영했다. 브랜치/commit/push 없이 격리한 스냅샷의 업로드 dry-run은125개였고 실제 서버/공개 credential 값 일치0개와 env 파일 미포함을 확인했다. Stitch 폴더/작업 문서 및 미커밋 .gitignore는 제외하고 M6/PNG 소스는 HEAD와 바이트 일치를 확인했다. 배포 중 M5 원본 파일 해시도 변하지 않았다.

| 읽기 전용 원격 검사 | 결과 |
| --- | --- |
| 공식 `--preflight` | 종료0; fixture의 실제 제품 입력 검사도 원격 쓰기 없이 통과 |
| 원격 JSON/HTML v2 |200, probeVersion=2, m5State 및 별도 error callback 존재 |
| 정확한 hostname·Origin·Sitekey·정책 fingerprint·비밀 구성 | 요청별 challenge에 결합한 proof를 메모리에서 비교해 모두 일치; 비밀값/원문 metadata 미기록 |
| Vercel 자격 없음 / 작업자 서명 없음 |302 / 404 |
| 인증 HTML |200, no-store·CSP·Set-Cookie 없음; HTML만 읽고 SDK/challenge 미실행 |
| catalog POST·session POST·festivals GET/POST·가상 공개 token GET | 모두503/PROTECTION_REQUIRED, no-store·쿠키 없음 |
| 외부 Origin의 session POST |403/ORIGIN_REJECTED |
| 증명 | 해당 Preview fingerprint0개; 모든 환경의 증명 행은 검사 전후 동일 |
| 종료 감사 | 이번 임시 automation 자격 폐기·최종0개, 무인증302, Authentication/환경 변수/Production target·도메인/Git 미연결 상태 불변 |

증명·계정·콘텐츠 생성, CAPTCHA challenge는 실행하지 않았다. 읽기 전용 사전 검사는 PASS이며 alias 롤백은 불필요하다. **전체 E2E는 여전히 미완료다.** 최종 Stitch/M6 통합 이후 새 최종 Preview에서 v2 preflight·503·새 challenge/제공자·증명 등록/실패 철회·HTTPS 저장/게시/공개/취소/삭제·정리와 M6 PNG 검사를 별도 승인 범위로 다시 수행한다. 현재 중간 배포의 설정 일치 결과를 최종 소스/화면의 기능 증명으로 재사용하지 않는다. 수동 증명 철회 도구 `scripts/m5/revoke-preview.mjs`와 아래 기존 실행별 timestamp 조건 절차는 유지하며 이번에는 실행할 증명 행이 없다.

## 2026-10-22 실패 분석·재검증 안정화 — 로컬 검증 PASS / 원격 E2E 재개 BLOCKED

이번 작업은 코드·기존 안전 로그·로컬 테스트만 다뤘다. 증명/원격 테스트 계정/영화제 생성, 실제 challenge, Vercel 배포·설정 변경은 실행하지 않았다. 사용자가 확인한 정리 상태(증명0·임시 계정0·영화제0)를 변경하지 않았다. Stitch·M6/PNG 파일 및 브랜치, Production·RLS·보안 정책·GitHub는 변경하지 않았다.

### 확정 사실과 원인 범위

1. **첫 저장 실패는 확정:** 이전 검사기의 `M5 Preview 검증`이13 grapheme으로 제품12자 제한을 넘었다. 원격 응답은400/INVALID_INPUT이었고, 같은 문자열에 제품 `nickname()`을 적용하면 INVALID_NICKNAME이었다. 실제 저장 API와 제품 제한은 올바르게 동작했다.
2. **두 번째 실패의 확정 위치:** 기존 안전 실행 보고서에는 preflight 성공, 세션503, invalid CAPTCHA400/captcha_failed가 있고, 당시 터미널에는 전용 창의 `ACTION` 출력이 있었다. 소스 순서상 Chrome 시작·CDP 연결·검사 화면 navigation·공유 예산·공개 RPC 권한 검사·invalid 토큰 거부 이후다. **`browser.token()`의 대기/구성 검사부터 fresh `core.signIn()` 응답을 기록하기 전까지**로 좁힐 수 있다. fresh HTTP 응답·신규 계정 승인·재사용 검사·증명 등록 기록은 없다. 당시에는 요청 시작 이벤트와 상세 오류가 기록되지 않아 “요청 미전송”과 “전송했지만 응답 없음”을 구별할 수 없다.
3. **추정에 그치는 원인:** challenge 만료/미완료, 브라우저·CDP 오류, 설정 불일치, 네트워크 단절·절전/시계 변화, 제공자 일시 장애 중 어느 것인지 소급 확정할 근거가 없다. 뒤따른 Supabase 읽기 타임아웃과 종료 감사 실패는 실제 관측이지만, 그것이 최초 실패의 원인이라는 인과관계는 미확정이다. hostname/Sitekey 오류나429, fresh 토큰 재사용 거부였다고 단정하지 않는다.

### 수정된 사전 검사·단계 기록

- `preview-fixture.mjs`가 QA 입력을 **원격 요청 전에 생성**한다. 닉네임을 제품 `nickname()`으로 정규화/검증하고, 정상 생성·정상 수정 입력을 실제 `jsonBody()`/`createFestivalService().save()`에 통과시킨다. 주입한 in-memory core/TMDB만 사용하므로 DB·TMDB 요청은 없다. 필수 설문·선정 수/중복/영화 ID·버전·초안 UUID·허용 필드·16KiB 본문 제한까지 제품 규칙을 그대로 검사한다. 임의로 잘라서12자에 맞추지 않는다.
- 최초 preflight 이전, 증명 INSERT 직전, 기능 검사 진입 시 입력을 재확인한다. 증명 직전에는 원격 preflight도 다시 실행한다. 실제 제공자 세션은 Auth 사용자 확인과 refresh token 존재를 요구하고, 앱 A/B 세션은 사용자 확인·두 쿠키 존재·서로 다른 사용자·인증된 영화제 목록 읽기를 확인한 뒤 첫 저장으로 넘어간다. 계정 ID·쿠키·JWT는 진단에 넣지 않는다.
- `createPreviewSteps()`는 허용목록의 `phase`, `event=start/request-start/response/transport-failed/complete/failed`, HTTP 상태, 안전 오류 유형, 경과 시간만 출력한다. URL/본문/헤더/응답 원문/토큰/hash/사용자 정보는 기록하지 않는다. 최초 실패를 보존하므로 정리 오류가 원래 실패를 덮어쓰지 않는다. 정리 단계의 오류도 별도 이벤트로 남는다.
- 예를 들어 `provider-challenge` 실패와 `provider-signup request-start → transport-failed`를 구분한다. Vercel/작업자 접근 실패, Origin·Sitekey·fingerprint 불일치, 위젯 대기 timeout, callback 만료, SDK network/rate-limit/internal 오류, Auth401/403, Auth429와 앱429, 제공자 HTTP5xx, 전송 timeout/DNS/reset을 구분한다. HTTP 응답이 없으면 상태는 null이다. redirect는 따라가지 않고 상태를 확인하며 자격을 다른 origin으로 전달하지 않는다.

### 새 challenge와 토큰 소비 규칙

- 새 검증 화면은 `probeVersion=2`, 요청별 challenge nonce, 메모리의 widget 상태와 발급 시각을 제공한다. expired/chalexpired callback과 error callback을 분리했다. SDK 오류도 공식 코드 허용목록만 보관하고 임의 원문은 `unclassified`로 바꾼다. [공식 callback/오류 정의](https://docs.hcaptcha.com/configuration).
- `preview-captcha.mjs`가 토큰을 closure에만 보관하며 **발급 후90초의 보수적 로컬 유효기간**을 검사한다. 이는 제공자의 실제 만료 시간을 알아냈다는 뜻이 아니다. 같은 run의 challenge nonce 재사용과 토큰 digest 중복을 거부한다. raw 토큰/digest는 출력·파일 저장하지 않는다.
- 일반 가입은 `consume()`으로만 보내며, **전송 전에 소비 처리**한다. timeout·429·네트워크 장애가 나도 같은 토큰으로 가입을 다시 보내지 않는다. primary 요청이 정상 완료된 토큰에만 별도의 `replay()`를 정확히 한 번 허용해 의도적인 재사용 거부를 검사한다. primary/replay 실패 뒤 자동 가입 재시도는 없다.
- 매 수집은 별도 새 화면 navigation/challenge를 요구한다. 이전 `M5_CAPTCHA_TOKEN`이나 수동 복사 토큰을 읽지 않는다. 새 프로세스는 새 Chrome incognito context를 사용한다. 위젯 오류·만료·제한은 즉시 중단하고,180초 대기 deadline을 넘겨 무한히 기다리지 않는다. 제공자 SDK 내부의 제한된 네트워크 재시도와 검사기의 가입 재시도는 구별한다. 증명 철회/정리의 기존 제한된 재시도는 유지한다.
- Supabase가 fresh 요청에 일반 `captcha_failed`만 반환하면 중복·만료·hostname/키·제공자 거부를 **응답 하나만으로 확정하지 않는다**. 진단에는 `unconfirmed_causes`로 후보를 표시한다. 로컬 guard로 확인한 재사용/만료와, 구성 attestation으로 확인한 불일치는 별도 확정 코드로 남긴다. 콘솔 hostname 제한/대응 Secret의 문제까지 SDK/일반 거부 코드만으로 단정하지 않는다.

### 검증 결과와 다음 실행 순서

전체122/122·typecheck·lint·production build 통과.11/12/13 grapheme(한글/ASCII/emoji/결합 문자), 빈 이름 fallback, 잘못된 필수 입력/본문 크기, 요청 전 차단, A/B 세션 확인 순서, 토큰 전송 실패 후 재사용 차단·의도적 replay1회·만료, 새 challenge 요구, HTTP/전송/위젯 오류 분류, 진단 비밀정보 미포함을 테스트했다. 격리 PostgreSQL의 기존 철회 테스트도 통과했다. 브라우저 산출물24개에서 현재 서버 비밀값 미검출.

**코드 안정화는 PASS지만 현재 배포 그대로의 전체 E2E 재개는 BLOCKED다.** 이번에는 배포하지 않았고 기존 Preview는 새 v2 상태 정보를 갖고 있지 않다. 다음에는 M5 변경만 격리해 보호된 Preview에 반영 → 무증명503·원격 설정·v2 preflight → 새 challenge의 제공자 검사 → 승인된 증명 등록/HTTPS 기능 검사 순으로 진행한다. v2 불일치는 preflight에서 등록·가입 전에 중단한다. 실제 fresh challenge 성공과 저장/공유 통과는 이번 로컬 테스트가 대신 증명하지 않는다. 통합 후 증명 재사용 금지 기준은 아래 기록을 유지한다.

## 2026-10-22 승인된 실제 E2E — BLOCKED, 증명 철회·정리 완료

대상은 기존 `dpl_A57C68rJLLDFukMq3p3Tbs2Hzhkm`와 고정 Preview origin 그대로다. 사용자가 hCaptcha hostname 확인과 실제 challenge·임시 데이터·Preview 증명 등록·실패 철회를 승인했다. Production 배포/증명·GitHub·RLS·CAPTCHA 정책·Stitch/M6 파일은 변경하지 않았다. 앱 재배포도 없었다.

### 첫 실행에서 실제 확인한 결과

- 실행 전 원격 preflight 재통과: 정확한 Origin·Sitekey·fingerprint·credential proof 일치, 기존 세션 API503, 해당 Preview 증명0개. 수동 철회 도구 `--check`와 관련 로컬 테스트6개도 재확인했다.
- 임의 invalid CAPTCHA는 Supabase400/captcha_failed. 사람이 Preview hostname의 실제 challenge를 완료한 fresh 토큰은 익명 가입200, **같은 토큰의 독립 클라이언트 재사용은400/captcha_failed**. 제공자 검증 계정 정리까지 통과했다.
- 이번 실행의 증명 `verified_at=2026-10-22T05:48:58.989652Z`를 preview에만 신규 등록했다. 세션 API는 **등록 전503 → 등록 후428/CAPTCHA_REQUIRED**로 바뀌었다.
- 사람이 추가로 완료한 Preview challenge로 A/B 두 세션을 실제 생성했다(각200). 각 원본 토큰을 새 세션에서 다시 제출하면400/CAPTCHA_FAILED였다.
- 첫 영화제 저장은400/INVALID_INPUT으로 중단됐다. 로컬 검사기가 넣은 `M5 Preview 검증`은13 grapheme으로 앱의12자 제한을 넘었다. 앱이 올바르게 거부한 테스트 입력 오류다. 실제 영화제는 생성되지 않았다.
- 자동 철회 경로가 이번 정확한 행만 제거했다. 추가로 수동 철회 helper의 같은 행 조건으로 재확인했고 행0개, **철회 후 세션 API503**을 실제 관측했다. 임시 계정3개(제공자1+A/B2)의 Auth 삭제와 소유 영화제/공유 행 부재를 점검했다. 임시 Vercel 자격도 폐기했다.

### 수정 후 재시도와 최종 복구

- 로컬 `preview-flow.mjs`의 테스트 닉네임을 `M5 검증`/`M5 수정`으로 수정했다. 실제 제품의 `nickname()` 검증을 모듈 로드 시 호출해 부적합한 테스트 값이면 원격 작업 전에 실패하게 했다. 앱 입력 기준은 완화하지 않았다.
- 수정한 로컬 도구로 preflight·수동 철회 도구를 다시 확인했고 invalid CAPTCHA 거부도 다시 관측했다. 이후 실제 challenge/제공자 단계가 실패해 중단됐으며 **새 증명 등록 로그나 신규 사용자 승인 응답은 없었다**. 이 실행은 원인 코드를 출력하지 않아 challenge 만료/브라우저 실패/제공자 전송 실패 중 어느 것인지 확정할 수 없다.
- 직후 Supabase 읽기는 타임아웃이었고 증명 재조회·임시 자격 폐기 등 종료 감사도 일시 실패했다. 이를 성공으로 해석하지 않았다. 복구 확인에서 남아 있던 이번 자동화 자격1개만 폐기해 최종0개를 확인했다. Supabase 연결 회복 후 정확한 fingerprint의 Preview 증명0개와 첫 실행 행 부재를 다시 확인했다.
- 최종 읽기 전용 데이터 감사에서 실행 시작 이후 새 익명 계정0개(관리자 목록 한 페이지 내 전체 확인), 이번 테스트 닉네임의 영화제0개였다. 모호한 다른 사용자 데이터를 임의로 삭제하지 않았다. 현재 수동 복구가 필요한 증명·계정·콘텐츠·임시 자격은 없다.
- 재시도 실패 뒤에는 더 이상 실제 challenge/가입/증명 등록을 실행하지 않았다. 다음 원인 진단을 위해 기존 안전 진단 함수에 Preview 위젯/브라우저 timeout·CDP·중단 코드 허용목록을 추가하고 검사기가 이를 출력하도록 했다. 원문 오류/키/토큰은 여전히 출력하지 않는다. 이는 이전 실패 원인을 소급 확정한 것이 아니다. 관련 로컬 테스트9/9와 lint 통과.

| 기능 | 이번 실환경 결과 |
| --- | --- |
| 원격 구성/플랫폼 인증·수동 철회 도구 | PASS |
| 첫 실행의 invalid/fresh/replay 제공자 검증 | PASS |
| A/B 세션·각 토큰 재사용 거부 | PASS |
| 증명 등록→세션428, 실패 철회→503 | PASS |
| 영화제 저장 | 첫 시도400(검사기 닉네임 오류); 수정 후 미완료 |
| 수정·게시·공개 읽기·게시 취소·삭제·429 | 미완료 |
| 생성/정리 | 확인된 임시 익명 계정3개 모두 정리, 영화제 생성0개 |
| 현재 증명/임시 Vercel 자격/수동 복구 |0개 / 0개 / 불필요 |

**M5-B 전체는 BLOCKED다.** 첫 제공자/세션 통과를 저장·공유 기능 완료로 확대하지 않는다. 일반 공개나 Production 허가는 생기지 않았다.

### 최종 Stitch/M6 통합 시 증명 재사용 판단

현재 활성 증명은 없으므로 재사용할 증명도 없다. 앞으로 중간 Preview 검증이 통과하더라도 그 기록을 **최종 통합본의 전체 기능 증명으로 자동 재사용하면 안 된다**. 현재 fingerprint는 정책·Origin·Sitekey·Supabase URL·HMAC에 결합되지만 배포 ID·소스·Stitch 화면·M6 PNG 코드를 포함하지 않는다. 같은 설정이면 DB 게이트가 기술적으로 열릴 수 있어도 새 코드가 검증됐다는 뜻은 아니다.

최종 통합 전 보유 중인 중간 증명이 있다면 실행 소유 timestamp로 그 Preview 행만 별도 승인 범위에서 철회한다. 통합 Preview READY와 고정 alias/인증/503 차단을 확인하고, 원격 구성·제공자·실제 HTTPS 저장/소유권/게시/공개/취소/삭제와 UI 회귀를 **최종 빌드에서 다시 검증**한다. M6 PNG 경로는 그 통합본의 별도 PNG 검사도 통과해야 한다. origin/Sitekey/HMAC/Supabase/정책이 바뀌면 기존 fingerprint 증명을 새 구성에 복사하지 않는다. Production 증명에는 어떤 중간 Preview 결과도 전용하지 않는다.

## 2026-10-22 실제 배포 — M5 격리 Preview·읽기 전용 사전 검사 통과

- 고정 주소: **https://banguseok-film-festival-preview-mikechung0918.vercel.app**
- 새 실제 배포 URL: **https://banguseok-film-festival-i0m7jaril-mikechung0918.vercel.app**
- 새 배포 ID: `dpl_A57C68rJLLDFukMq3p3Tbs2Hzhkm`, READY, OIDC environment=preview, target=null. 원격 빌드 성공 후에만 alias를 옮겼다.
- 직전 alias 대상은 `dpl_2QAJLrftWYPrGt65b61SwR98iCLK` / `banguseok-film-festival-3tl1c6car-mikechung0918.vercel.app`이며 삭제하지 않았다. 아래 명령으로 **Preview alias만** 복구할 수 있다. Production을 대상으로 하는 `vercel rollback`/promote는 사용하지 않는다. [공식 alias 명령](https://vercel.com/docs/cli/alias).

  ```sh
  vercel alias set banguseok-film-festival-3tl1c6car-mikechung0918.vercel.app \
    banguseok-film-festival-preview-mikechung0918.vercel.app --scope mikechung0918
  ```

### 격리·안전 확인

브랜치는 main, HEAD는 `cf51cf007164db1c02e0656592e6e2f4124b65b5`였다. 브랜치 변경·commit·merge·push 없이 `git archive HEAD`로 임시 디렉터리를 만들고 M5 코드/검증 도구/테스트와 package.json만 명시적으로 덧붙였다. Stitch 미추적 폴더와 작업 문서는 업로드에서 제외했고, M6/PNG 소스는 커밋 기준 그대로 사용했다. 로컬 미커밋 `.gitignore`와 디자인 파일을 업로드하지 않았다. dry-run 업로드122개, 스냅샷 전체142개에서 실제 비밀값 일치0개, `.env.local` 미포함을 확인했다.

첫 시도의 `--skip-domain`은 CLI가 Production 전용 옵션이라 배포 생성 전에 거부했다. 배포 목록·alias 불변을 확인한 뒤 해당 옵션을 제거하고 `--target=preview`로 배포했다. Production 배포/승격 명령은 실행하지 않았다. 새 배포는 API에서 실제 preview 환경을 확인했다.

### 원격 검사 결과

공식 automation-bypass 자격을 일시 생성해 프로세스 메모리/헤더에서만 사용했다. `verify:m5:preview -- --preflight`만 실행했으며 `--provider`/`--activate-preview`는 실행하지 않았다. 검사 실패 시 alias를 이전 대상으로 되돌리는 finally 절차를 먼저 준비했다. 이번 검사는 통과해 새 alias를 유지했다. 임시 자격은 finally에서 폐기했고 최종 자격 수0을 확인했다.

| 검사 | 실제 결과 |
| --- | --- |
| 원격 preflight | 종료0; 정확한 origin/hostname/Sitekey/정책 fingerprint/credential equality proof 일치 |
| Vercel 자격만 있고 작업자 인증이 없는 검사 화면 |404 |
| 두 인증을 통과한 검사 HTML |200; 실제 Sitekey·hCaptcha SDK 포함, CSP, no-store, Set-Cookie 없음 |
| POST `/api/catalog/movies`, `/api/session` |503 / PROTECTION_REQUIRED |
| GET·POST `/api/festivals` |503 / PROTECTION_REQUIRED |
| GET `/f/<형식만 유효한 합성 token>` |503 / PROTECTION_REQUIRED |
| 자격 없는 검사 화면(자격 폐기 후 포함) |302, Vercel 인증 이동 |
| 증명 테이블 | 전후 읽기 해시 동일; 정확한 Preview fingerprint의 행0개 |

앱503 응답은 `private, no-store`이고 앱 세션 쿠키를 설정하지 않았다. Sitekey·fingerprint·Secret·토큰 원문은 출력/파일 저장하지 않았다. Supabase는 증명 행 읽기만 수행했으며 사용자·영화제 생성/삭제 테스트, CAPTCHA 제출·challenge 완료, 증명 INSERT/DELETE는 실행하지 않았다.

최종 확인: Preview 환경 변수7개와 값/범위 불변, Authentication `all_except_custom_domains` 유지, Production target은 기존 CANCELED 그대로, Production 도메인 `banguseok-film-festival.vercel.app` 그대로, Git 자동 배포 미연결. 이번 추가 수동 철회 도구를 포함한 M5 테스트6/6과 lint 통과. 기존 전체113/113·타입·빌드 결과는 아래 이전 구현 검증 기록이며, 이번에는 전체 테스트를 반복하지 않았다.

### 증명 등록 전 수동 철회 명령 준비

`scripts/m5/revoke-preview.mjs`를 추가했다. 기본 `--check`는 읽기만 하며 `--execute`에는 별도 승인 환경 값이 필요하다. **정확한 Preview 구성에서 계산한 fingerprint + environment=preview + 이번 실행의 6자리 마이크로초 verified_at**을 모두 요구하므로 기존 다른 행/Production 행을 삭제할 수 없다. 일괄 삭제·증명 upsert 기능은 없다.

향후 승인된 등록 실행의 `EVIDENCE ATTEMPT` 로그에 나온 timestamp를 `M5_RUN_VERIFIED_AT`에 넣고, 해당 실행 당시의 정확한 Preview 비밀 구성을 메모리에 주입한 상태에서 수행한다. timestamp는 비밀값이 아니지만 다른 실행 값을 대신 넣으면 안 된다. 아래 두 명령은 **준비만 했고 실제 실행하지 않았다**.

```sh
M5_VERIFY_ENV=preview \
  APP_ALLOWED_ORIGINS=https://banguseok-film-festival-preview-mikechung0918.vercel.app \
  node --conditions=react-server --env-file-if-exists=.env.local \
  scripts/m5/revoke-preview.mjs --check "$M5_RUN_VERIFIED_AT"

# 해당 행의 철회 승인을 받은 뒤에만 실행
M5_VERIFY_ENV=preview M5_ALLOW_PREVIEW_REVOCATION=yes \
  APP_ALLOWED_ORIGINS=https://banguseok-film-festival-preview-mikechung0918.vercel.app \
  node --conditions=react-server --env-file-if-exists=.env.local \
  scripts/m5/revoke-preview.mjs --execute "$M5_RUN_VERIFIED_AT"
```

`--check`의 rows=1은 이번 실행 행이 확인됐다는 뜻이고 rows=0이면 이미 철회됐거나 구성이 달라졌을 수 있다. 다른 행을 넓혀 삭제하지 말고 원래 구성을 먼저 재확인한다. `--execute`는 조건부 DELETE 뒤 같은 행이 없는지 재조회한다. 이후 임시 인증으로 세션 API503과 무인증302를 다시 확인하고 테스트 인증 자격을 폐기한다. alias 복구만으로 DB 증명이 철회되는 것은 아니다.

남은 조건: hCaptcha 콘솔의 정확한 hostname/allowlisting 확인, 실제 Preview challenge와 invalid/fresh/replay 제공자 검증. 다음 승인 범위는 임시 계정/테스트 영화제 생성·정리, 정확한 Preview 증명 신규 INSERT, 후속 HTTPS 기능·429 검사, 실패 시 이번 증명만 자동/수동 철회다. Production 증명/설정/공개 배포와 PNG는 포함하지 않는다. DB 장애·SIGKILL 때 클라이언트 철회를 보장할 수 없다는 아래 위험은 그대로다.

## 2026-10-22 구현 — Preview 증명 전 위젯 검사·등록 후 자동 철회

**아래 새 절차가 이전 수동 등록 명령을 대체한다. 실제 증명 등록·외부 가입·새 코드 배포는 이번 구현 검증에서 실행하지 않았다.** 기존 배포는 계속503 차단 상태다.

### 구현 범위와 정확한 구성 확인

- `GET /api/dev/m5`는 **Preview 전용 읽기 전용 검사 화면**이다. VERCEL=1, preview 환경, 기존 allowlist의 정확히 한 개 고정 HTTPS origin, 올바른 Host·Origin·단일 Vercel IP, 작업자 HMAC 인증을 모두 요구한다. Production·개발 환경·잘못된 인증은404다. Vercel Authentication은 별도로 유지해야 하며 이 코드는 플랫폼 인증을 해제하지 않는다.
- 작업자 인증은 기존 보호 HMAC 키로 만든 목적별 서명이며, 헤더의 난수 challenge·경로·60초 timestamp에 결합된다. 키 자체를 전송하지 않는다. JSON 응답은 동일 challenge에 결합된 fingerprint·Sitekey·origin·정책·credential equality proof를 반환한다. 검증 프로세스가 가진 Supabase 공개 키·service-role·TMDB·HMAC 구성이 원격과 같은지도 값 출력 없이 비교한다. 빌드에 인라인된 Sitekey와 런타임 Sitekey가 다르면 경로가 열리지 않는다.
- 기본 origin은 `https://banguseok-film-festival-preview-mikechung0918.vercel.app` 하나로 고정한다. 배포별 URL·localhost·다른 allowlist를 검증 대상으로 바꾸지 않는다. 변경하려면 코드·테스트·hCaptcha 설정·fingerprint를 함께 재검토해야 한다.
- HTML 화면은 실제 hCaptcha SDK만 실행한다. 토큰은 `window.m5Token` 메모리에만 보관하고 만료/오류 때 비운다. 가입·세션 쿠키·DB 접근·증명 등록 기능은 없다. 결과 페이지/저장 API의503은 그대로다. 따라서 **별도 검사 화면으로 실제 Preview hostname 위젯을 먼저 완료**하여 순환 문제를 해결한다. UI 전용 토큰 모형이나 CAPTCHA 우회가 아니다.
- 기존 `verify:m5 -- --captcha-only --captcha-browser`는 여전히 **로컬 제공자 진단만** 수행한다. 로컬 hostname의 과거 성공은 이번 Preview 구성의 증명이 아니다. 기존 일반 `verify:m5`의 증명 등록 경로는 제거했고 안내 후 종료2로 막았다. Production 증명 생성 경로를 새 도구에 추가하지 않았다.

### 실행 순서와 승인 경계

1. 먼저 이 코드만 포함하는 Preview를 배포하고 READY/preview/alias/Authentication 유지 여부를 확인한다. 동시 작업 트리 전체를 그대로 업로드하지 말고 Stitch·PNG 변경을 제외한 소스 스냅샷을 사용한다. 현재 문서에 있는 기존 READY 배포에는 새 경로가 없다. Production 배포·승격·Git 연결은 필요 없다.
2. [hCaptcha Sites](https://dashboard.hcaptcha.com/sites)의 **기존 Preview Sitekey**에서 `banguseok-film-festival-preview-mikechung0918.vercel.app` 등록 및 제공되는 Domain allowlisting 상태를 사람이 확인한다. 새 Secret 발급·Supabase 설정 변경은 하지 않는다. 실제 challenge 완료는 사람이 수행한다.
3. 검증 프로세스에는 Preview의 정확한 비밀 구성과 `VERCEL_AUTOMATION_BYPASS_SECRET`을 메모리 환경으로 공급한다. `.env.local`이 정확한 Preview 값인지 가정하지 않는다. 외부 비밀 관리 원본/로그인된 Vercel의 공식 자동화 자격을 사용하고 채팅·명령 인자·새 env 파일에 복사하지 않는다. 자격의 생성·폐기는 실행 관리자가 담당한다. 도구는 별도 자격을 만들거나 Vercel 보호 설정을 바꾸지 않는다. 진단 JSON·HAR·화면 캡처·브라우저 저장 상태를 저장하지 않는다.
4. **읽기 전용 preflight** — DB 쓰기·가입·증명 등록 없음:

   ```sh
   M5_VERIFY_ENV=preview npm run verify:m5:preview -- --preflight
   ```

   원격 configuration attestation 일치, 자격 없는302, Vercel 자격만 있고 작업자 HMAC이 없으면 검사 화면404, 세션 API503/PROTECTION_REQUIRED를 확인한다. 불일치·redirect·인증 실패는 중단한다. 자동화 자격은 헤더로만 보내며 URL에 넣지 않는다.
5. **증명 없이 제공자 실검증** — 별도 임시 데이터 쓰기 승인 후:

   ```sh
   M5_VERIFY_ENV=preview G1_ALLOW_TEST_WRITES=yes \
     npm run verify:m5:preview -- --preflight --provider
   ```

   전용 Chrome의 incognito context에서 Preview 검사 화면을 열고 실제 challenge를 완료한다. CDP는 loopback에만 연결하고, 자격 헤더 주입은 정확한 Preview origin으로 제한한다. hCaptcha 등 외부 요청에 자격을 주입하지 않는다. 토큰은 브라우저/프로세스 메모리에서만 전달한다. 로컬 제공자 토큰 환경 변수는 사용하지 않는다. 독립 클라이언트 공유 예산·분리된 subject·실제 창 만료·공개 키 RPC 거부, invalid CAPTCHA 거부·Preview fresh 토큰 가입·동일 토큰 재사용 거부·임시 사용자 정리를 검사한다. **이 명령은 증명을 등록하지 않는다.**
6. **실제 등록과 후속 기능 검사** — 다음 작업에 대한 명시적 승인 후에만:

   ```sh
   M5_VERIFY_ENV=preview G1_ALLOW_TEST_WRITES=yes M5_ALLOW_PREVIEW_EVIDENCE=yes \
     npm run verify:m5:preview -- --activate-preview
   ```

   이 명령은 preflight와 제공자 검사를 새로 실행한다. 이미 같은 Preview fingerprint의 증명이 있으면 덮어쓰지 않고 중단한다. 새 행을 **upsert 없이 INSERT**한 뒤 증명 필수 RPC, 실제 HTTPS 세션의 CAPTCHA_REQUIRED, 새 Preview challenge로 A/B 세션·재사용 거부·HttpOnly/Secure/SameSite 쿠키·중복 저장·읽기/수정/삭제·stale revision·소유권/조작 거부·공유 동의·공유 중단/삭제 후404·공개 응답 no-store·비밀값 미노출·잘못된 Origin403·실제 ingress 세션 예산429와 Retry-After를 검사한다. 보통 서로 다른 challenge 세 번(제공자1+A/B2)이 필요하다. 운영자 완료 시간이 길어져 창이 바뀌거나 Auth/TMDB 오류·429가 발생하면 통과로 세지 않고 실패 처리한다.
7. 생성한 테스트 사용자에 속한 영화제와 사용자만 정리하고, 원격 구성을 다시 확인하며, 전용 브라우저를 닫는 데까지 성공해야 증명을 유지한다. 인증 자격의 폐기는 실행 관리자의 finally 절차에 포함한다. 그 뒤 일반 UI 동선·모바일·초안 복원·실제 로그 비밀 노출 여부를 별도 확인한다. PNG는 이번 검사 범위에서 제외한다.

### 자동 철회와 남는 한계

- 새 증명은 `environment=preview + 정확한 fingerprint + 이번 verified_at(마이크로초)`로 소유권을 식별한다. INSERT 시도 전에 timestamp를 복구용으로 표시한다. fingerprint·키·토큰·사용자 식별자는 출력하지 않는다.
- 등록 후 RPC·기능 검사·데이터 정리·구성 재확인·브라우저 정리 중 실패하거나 SIGINT/SIGTERM을 받으면 finally에서 **이번 실행의 정확한 행만** DELETE한다. POST 응답 유실도 철회 대상으로 처리한다. 최대3회 재시도하고 같은 조건의 GET 결과가 빈 배열인지 확인한다. 기존 Preview 행·다른 fingerprint·Production 행은 수정/삭제하지 않는다. `request-protection.ts`, SQL/RLS, CAPTCHA 검증 기준, API의503·429는 바꾸지 않았다.
- DB 장애로 DELETE가 불가능하면 `AUTOMATIC REVOCATION FAILED`로 실패하고 성공/해제 완료를 출력하지 않는다. 실행 전 출력된 verified_at과 정확한 Preview 구성에서 도출한 fingerprint로 **그 행만** 확인·철회하는 복구 권한을 준비해야 한다. 철회 후 새 세션 요청503과 인증 없는302를 재확인한다. 일반 실행이 만드는 예산 카운터는 기존 정책대로 만료되며 다른 사용자 데이터를 정리 대상으로 삼지 않는다.
- **SIGKILL·호스트 종료·영구 DB 장애·완전히 응답이 유실된 지연 INSERT까지 클라이언트 finally만으로 완전 보장할 수는 없다.** 현재 DB에는 증명 lease/TTL이 없고 이번에 스키마를 바꾸지 않았다. 활성화 실행 중 장애 감시와 해당 실행 행에 대한 수동 복구 담당자가 필요하다. 이 한계를 없애려면 별도 승인으로 DB lease/원자적 등록·철회 설계가 필요하다.
- 이 도구의 성공은 명시한 실제 HTTPS 검사 범위에 한정된다. 전체 UI/모바일/PNG 및 향후 콘솔 Secret 변경을 자동 인증하지 않는다. 구성 변경 시 새 검증이 필요하며 자동화 자격을 일반 공개 링크에 넣지 않는다.

로컬 검증: 전체113/113, lint·typecheck·production build 통과. 새 테스트는 Production/외부 요청 차단, 구성·키·challenge 불일치, PostgreSQL 기반 기존/동시 실행 행 보존·후속 실패·POST 응답 유실·철회 재시도, HTTPS 검사기 오류 시 정리 식별자 보존을 확인했다. 브라우저 빌드 파일24개에서 현재 service-role·HMAC·TMDB 비밀값 미검출. 첫 테스트/빌드의 loopback 포트 제한은 포트 허용 상태에서 재검증했고, 빌드에 남은 오류 캐시만 제거했다. 외부 실검증·증명 등록·새 Preview 배포는 미실행이다. 아래 이전 명령과 “검증 화면 미구현” 설명은 당시 상태의 기록이다.

## 2026-10-22 후속 — 고정 Preview alias·실환경 503 확인

**현재 고정 URL: https://banguseok-film-festival-preview-mikechung0918.vercel.app**

- 기존 READY 배포의 alias는 0개였고 Git 연결도 없었다. Production 도메인 `banguseok-film-festival.vercel.app`과 별개인 위 Preview 전용 alias를 수동 생성했다. 이후 새 READY Preview로만 이동했다. Git branch alias나 자동 추적 도메인이 아니므로 다음 재배포 때도 READY·preview 확인 후 수동 재연결해야 한다.
- `APP_ALLOWED_ORIGINS=https://banguseok-film-festival-preview-mikechung0918.vercel.app`를 **Preview 범위에만** 등록했다. 기존 6개 변수는 변경하지 않았으며 총 7개 모두 Preview 전용임을 최종 API 조회로 확인했다.
- 기존 원격 배포 `dpl_6Bfs1TZFibeP6NkrC7ZrNRgwKAFc`를 `vercel redeploy <id> --environment preview --no-wait`로 재빌드했다. 로컬 소스 업로드 없이 원격 소스를 재사용해 Stitch 동시 작업을 배제했다. 새 배포는 `dpl_2QAJLrftWYPrGt65b61SwR98iCLK`, 실제 배포별 URL은 **https://banguseok-film-festival-3tl1c6car-mikechung0918.vercel.app**, 상태 READY, OIDC environment=preview다. API target=null은 기존 Preview와 동일하며 production을 뜻하지 않는다.
- Authentication `all_except_custom_domains` 유지. Production target은 기존 `dpl_9eY3DEFsnzXyCstZgTFt5voL39ap`/CANCELED 그대로이며 Production 도메인 목록도 기존 1개 그대로다. 승격·Production 배포·Git 자동 연결·commit/push 없음.
- 작업 시작과 종료 시 로컬 변경 파일 목록에 앱 소스 변경은 없었다. 기존 `.gitignore`, `.vercelignore`, 문서 변경을 보존했고 `docs/design/`, `scripts/stitch/`는 수정하지 않았다. 이번 로컬 수정은 이 문서와 CHANGELOG뿐이다.

### 실제 HTTPS 결과

Vercel Authentication을 끄지 않고, `vercel curl`과 같은 공식 automation-bypass 헤더 방식으로 검사했다. 테스트 자격은 API 응답에서 프로세스 메모리에만 보관했고 URL·파일·출력에 넣지 않았다. 첫 시도는 생성 직후 전파 전401로 중단했고 자격을 폐기했다. 재시도는 2초 전파 대기 후200으로 앱 진입에 성공했다. 성공·실패 모두 finally에서 테스트 자격을 폐기했으며 최종 bypass 자격 수0을 확인했다. [공식 동작](https://vercel.com/docs/cli/curl), [생성·폐기 API](https://vercel.com/docs/rest-api/projects/update-protection-bypass-for-automation).

| 접근·요청 | 관측 결과 |
| --- | --- |
| 자격 없는 GET `/`, `/api/session` (검사 전·폐기 후) |302, Vercel 인증 이동 |
| 테스트 자격으로 GET `/` |200 |
| POST `/api/catalog/movies`, `/api/session` |503 / PROTECTION_REQUIRED |
| GET·POST `/api/festivals` |503 / PROTECTION_REQUIRED |
| DELETE `/api/festivals/<테스트 UUID>` |503 / PROTECTION_REQUIRED |
| POST `/api/festivals/<테스트 UUID>/publish`, `/unpublish` |503 / PROTECTION_REQUIRED |
| GET `/f/<형식만 유효한 테스트 token>` |503 / PROTECTION_REQUIRED |
| GET `/f/invalid`, `/api/movies/search`, `/dev/png`, `/api/dev/png` |404 |
| 다른 Origin으로 POST `/api/session` |403 / ORIGIN_REJECTED |

표의 앱 응답에는 Set-Cookie가 없고,503·403에는 `Cache-Control: private, no-store`가 있었다. 런타임 로그에서 안전한 코드 `BUDGET_OR_VERIFICATION_UNAVAILABLE`만 추출했다. 코드 순서상 설정·허용 Host·Origin·Vercel IP 검사 뒤 DB 검증/예산 호출까지 도달한 결과다. 이 오류 하나로 DB 장애와 증명 부재를 구분하지는 못한다. 별도 읽기 전용 조회에서 **로컬에 설정된 Supabase의 Preview 증명 행0개**를 확인했으며 원격 sensitive 키와 로컬 키의 동일성은 이번에 재검증하지 않았다. DB 쓰기·증명 등록은 실행하지 않았다.

### 사람이 해야 할 hCaptcha 콘솔 작업

1. [hCaptcha Dashboard → Sites](https://dashboard.hcaptcha.com/sites)에서 Vercel Preview의 `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`에 해당하는 기존 Sitekey를 연다. 다른 Sitekey나 Secret을 새로 만들지 않는다.
2. hostname 입력란에 **`banguseok-film-festival-preview-mikechung0918.vercel.app`**를 추가·저장한다. scheme·path·port 없이 넣는다. `vercel.app` 전체나 wildcard를 넣지 않는다. 기존 로컬 검증 hostname은 삭제하지 않는다.
3. **Domain allowlisting** 기능이 제공된다면 정확한 hostname 목록과 활성 상태를 확인한다. 공식 문서는 기본 off이며 기능이 순차 제공될 수 있다고 설명하므로, 단순 hostname 입력이나 항목 부재를 강제 제한 완료로 해석하지 않는다. 기능이 보이지 않으면 그 상태를 보고한다. [공식 설정](https://docs.hcaptcha.com/configuration).

콘솔 로그인·변경·실제 Preview 위젯 완료는 이번에 수행하지 않았다. 현재 앱 위젯은 아래 순서 문제로 아직 표시할 수 없다.

### 증명 등록의 정확한 절차 — 이번에는 실행 금지

증명은 Vercel 환경 변수가 아니라 Supabase `public.request_protection_checks`의 `(environment, fingerprint)` 행이다. fingerprint는 HMAC 키·policy·hCaptcha 제공자·정렬된 origins·Sitekey·Supabase URL에 결합된다. hostname 변경 전의 로컬 검증을 그대로 재사용할 수 없다.

1. 위 hostname의 hCaptcha 설정을 사람이 확인하고, Preview의 정확한 구성과 검증 프로세스의 Supabase URL·공개 키·service-role·Sitekey·HMAC 값이 일치하는지 **비밀값 출력 없이** 확인한다. sensitive Vercel 변수는 다시 읽을 수 있다고 가정하지 말고 기존 비밀 관리 원본을 사용한다. 증명을 등록하면 이 Preview 구성의 보호 게이트가 열리므로 별도 사용자 승인을 받은 뒤 진행한다.
2. 현재 수집기는 `http://captcha.banguseok.test:<임시 포트>` 전용이다. 같은 Sitekey로 이 개발 hostname에서 새 실제 위젯을 완료할 수 있어야 기존 도구를 쓸 수 있다. 이 수집으로 **Preview hostname 위젯 검증이 끝났다고 주장하지 않는다**. Preview 위젯 검증을 증명보다 먼저 요구한다면 쓰기 권한을 주지 않는 별도 검증 화면·메모리 수집 경로가 먼저 필요하며, 이번에는 만들지 않았다.
3. 향후 승인 후, Preview의 정확한 비밀 구성이 메모리에 주입된 검증 프로세스에서 아래 명령을 실행한다. `.env.local`이 다른 환경이면 이 명령만으로 키가 맞춰지지 않는다. 기존 `M5_CAPTCHA_TOKEN`을 남기지 않고 새 위젯 수집을 사용한다. 토큰을 CLI 인자·파일·로그에 넣지 않는다.

   ```sh
   env -u M5_CAPTCHA_TOKEN \
     APP_ALLOWED_ORIGINS=https://banguseok-film-festival-preview-mikechung0918.vercel.app \
     M5_VERIFY_ENV=preview G1_ALLOW_TEST_WRITES=yes \
     npm run verify:m5 -- --captcha-browser
   ```

4. `scripts/m5/verify.mjs`는 독립 클라이언트 공유 예산·창 만료·공개 키 RPC 거부·invalid CAPTCHA 거부·fresh CAPTCHA 가입·동일 토큰 재사용 거부·임시 계정 정리를 모두 검사한다. 정리 성공 뒤에만 service-role로 `request_protection_checks?on_conflict=environment,fingerprint`에 preview/fingerprint/m5a-v1을 upsert하고, 해당 증명을 요구하는 RPC를 검사한다. `--captcha-only`나 replay 진단은 증명을 등록하지 않는다. 수동으로 통과 행만 INSERT하는 방식은 사용하지 않는다.
5. 등록 직후 보호된 고정 Preview에서 실제 위젯·ingress·동일 Origin·공유 예산429·A/B 소유권·CRUD·공유 중단/삭제·캐시를 검증한다. 증명은 런타임 DB에서 확인하므로 **등록 자체에는 재배포가 필요 없다**. 모든 검증 통과 전 M5-B 완료/공개 출시로 표시하지 않는다.
6. **실패 시 철회 절차가 필요하다.** 현재 도구는 upsert 이후 RPC 검사나 결과 파일 쓰기가 실패해도 증명을 자동 삭제하지 않는다. DB에는 증명 TTL도 없다. 따라서 “명령 실패=증명 없음”은 보장되지 않는다. 향후 등록 승인에는 실패 시 **이번 preview·정확한 fingerprint 행만 철회**하는 권한과 담당자를 포함하고, 철회 후503을 재확인해야 한다. 기존 다른 행/production을 일괄 삭제하지 않는다. 이번에는 철회나 DB 변경도 실행하지 않았다.

순서 문제의 원인은 `SaveFestival`이 세션 API의 CAPTCHA_REQUIRED/FAILED 뒤에만 위젯을 렌더링하지만, 세션 API는 증명 없는 보호 단계에서503으로 먼저 끝나는 데 있다. 현재 코드로 “정상 Preview 저장 화면에서 CAPTCHA 포함 전체 검증 → 최초 증명 등록”은 불가능하다. 기존 기준을 유지하려면 제공자 사전 검증·Preview 한정 증명 등록·실제 Preview 후속 검증을 별도 단계로 승인하거나, 먼저 제한된 검증 화면을 설계해야 한다.503 우회·임의 enable flag·RLS/CAPTCHA 완화는 하지 않는다.

남은 차단은 hCaptcha 콘솔 확인, 정확한 Preview 구성에 대한 제공자 재검증/등록 승인, 실제 위젯·기능·공유/부하 검증이다. 앱 코드 변경이 없어 로컬 테스트·lint·build는 반복하지 않았고 이번 원격 Preview 빌드와 위 HTTPS 검사를 실제 실행했다. 아래 항목은 이전 상태의 이력이다.

## 2026-10-22 재시도 — Preview READY

- [공식 Environments 문서](https://vercel.com/docs/deployments/environments)의 What counts as the first deployment를 확인했다. CANCELED/ERROR도 첫 배포로 인정하며, 모든 배포를 삭제한 경우에만 다시 첫 배포가 된다. 직전의 보수적 차단 판단은 이 공식 동작 확인과 사용자 재시도 지시로 갱신한다.
- 첫 CANCELED 기록 보존·프로젝트 일치·Authentication 보호·Production READY0·Preview 변수6개를 재확인한 후 `vercel deploy --target=preview --project <linked-project-id> --yes --json --no-wait` 실행. 새 응답은 preview/INITIALIZING, 후속 API는 preview/BUILDING→READY, errorCode 없음.
- 실제 URL: **https://banguseok-film-festival-fnacr47fm-mikechung0918.vercel.app**
- 실제 hostname: **banguseok-film-festival-fnacr47fm-mikechung0918.vercel.app**. 배포별 URL이며 안정적인 Preview alias는 없다(배포 aliases 조회0개). Production alias 연결·승격은 실행하지 않았다.
- 완료 후에도 첫 기록 CANCELED, Production target CANCELED, READY Production0. 첫 기록은 삭제하지 않았다. Authentication 설정 all_except_custom_domains 유지.
- 쿠키·인증·우회 헤더 없는 GET으로 `/`, `/api/catalog/movies`, `/api/session` 모두302 Vercel 인증 리다이렉트, 앱 콘텐츠 미노출 확인. 이는 플랫폼 보호 검증이며 앱 API503을 직접 관측한 결과는 아니다. 보호를 통과하기 위한 bypass Secret 발급·정책 완화는 하지 않았다.
- 업로드 전 dry run에서 비밀 파일/artifacts/캐시/의존성 제외와 실제 로컬 비밀값 미포함을 다시 확인했다. Supabase DB·CAPTCHA 설정·Production 환경 변수·운영 증명·앱 보안 코드는 변경하지 않았다. APP_ALLOWED_ORIGINS는 미등록이다. 운영 증명 등록 도구는 실행하지 않았다.
- 다음: 우선 고정 Preview hostname 사용 여부를 정한다. 이후 hCaptcha 허용 hostname과 Preview APP_ALLOWED_ORIGINS(정확한 HTTPS origin)를 맞춘다. 현재 배포 URL은 위젯 hostname 등록의 대상이 될 수 있지만, 환경 변수 변경 후 재배포하면 새 배포별 URL이 생긴다. 이전 URL의 배포 환경 변수는 갱신되지 않으므로 오래된 URL만 허용하는 반복을 피해야 한다. 현재 alias 추가·환경 변수 등록·추가 배포는 수행하지 않았다.
- 정확한 Preview 구성의 fingerprint 검증 증명과 실제 ingress/위젯/CRUD/공유 검증은 여전히 미완료다. 증명 전503 때문에 제품 저장 화면이 위젯을 표시하지 못하는 순서 문제도 그대로 남아 있다. Preview READY를 기능 검증 또는 공개 출시 완료로 해석하지 않는다.
- 아래 첫 시도 취소 기록은 이력으로 보존한다. 이번에는 로컬 앱 테스트를 재실행하지 않았고 Vercel 원격 빌드 성공과 비로그인 차단만 실제 확인했다.

## 2026-10-22 실제 첫 배포 시도 — BLOCKED / 취소

- 실제 연결: Vercel CLI 사용자 chunghajin, 기본 팀 mikechung0918, 프로젝트 banguseok-film-festival. Node24.x, Git 자동 배포 미연결 확인.
- Preview의 공개 Config3개와 서버 Secret3개 확인. APP_ALLOWED_ORIGINS 미등록. Supabase·CAPTCHA·운영 검증 증명·Production 환경 변수는 변경하지 않았다.
- 프로젝트 Vercel Authentication은 ssoProtection.deploymentType=all_except_custom_domains. Preview 보호가 설정돼 있었다. 보호 정책 변경 없음.
- CLI65.0.0의 `deploy --dry --json --environment preview --yes`에서 artifacts가 포함되는 것을 발견했다. Git ignore만으로 CLI 업로드 제외를 보장하지 못했다. .vercelignore를 추가하고 재검사:132개, .env.local/artifacts/의존성/빌드 캐시 제외, 실제 로컬 비밀값 일치0개, 필요한 앱 소스·한글 폰트 포함. 처음 점검 시 .gitignore의 .vercel 줄을 별도 파일로 오인한 설명은 정정했다.
- 실제 명령은 `vercel deploy --environment preview --project <linked-project-id> --yes --json --no-wait`. **--prod·Production 승격 명령은 실행하지 않았다.** 그런데 생성 응답과 후속 API 조회의 target이 production이었다. INITIALIZING에서 관측 직후 취소 API를 호출했고 CANCELED를 확인했다. 성공한 Preview나 빌드 완료가 아니다.
- 취소된 생성 hostname: `banguseok-film-festival-7eqvumhc1-mikechung0918.vercel.app`. 비로그인·쿠키 없는 GET은302로 Vercel 로그인에 리다이렉트됐으며 앱 콘텐츠는 없었다. 이 URL은 사용할 수 있는 Preview 주소가 아니다.
- 응답에 계획된 alias `banguseok-film-festival-mikechung0918.vercel.app`가 있었으나 aliasAssigned=false이고 비로그인 GET404였다. 안정적인 Preview alias로 등록하거나 hCaptcha/APP_ALLOWED_ORIGINS에 넣으면 안 된다.
- **외부 상태 변화:** 취소된 production 분류 배포 레코드가 생성됐고 프로젝트 targets.production도 그 CANCELED 레코드를 참조한다. Production 상태가 완전히 불변이었다고 보고하지 않는다. 도메인 배정·공개 앱 serving은 확인되지 않았고, 이후 삭제·승격·추가 배포도 실행하지 않았다.
- 설치된 CLI는 첫 배포의 implicit production 배정을 별도 안내하는 코드를 포함한다. [Vercel 저장소의 같은 현상 보고](https://github.com/vercel/vercel/issues/17069)에도 새 프로젝트의 명시적 Preview가 Production으로 분류된 사례가 있다. 이번 서버 target 관측은 확정이며, 특정 우회·두 번째 재시도가 안전하다고 입증된 것은 아니다.
- 현재 차단: Production 생성 없이 Preview를 보장할 경로 확인이 필요하다. placeholder Production 배포·프로젝트 보호 해제·Git 자동 연결·무작정 재시도는 하지 않는다. hCaptcha Preview hostname, APP_ALLOWED_ORIGINS, 새 fingerprint 검증은 실제 Preview target과 주소가 확인된 뒤 진행한다.
- 앱 코드는 변경하지 않아 기존 fail-closed503 조건은 그대로다. 배포가 취소돼 원격 앱503·검색/저장/공유/PNG 런타임은 검증하지 못했다. 운영 증명은 등록하지 않았다. 아래 내용은 최초 사전 점검 당시의 이력이다.

---

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
