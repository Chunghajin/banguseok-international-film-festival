# M5-A 동일 CAPTCHA 토큰 재사용 진단

2026-10-21 실검증. 설정·SQL·RLS·운영 503 게이트 변경 없음. M5-B 배포 없음.

## 실제 결과

명령:

```sh
G1_ALLOW_TEST_WRITES=yes NODE_OPTIONS='--no-network-family-autoselection --dns-result-order=ipv4first' npm run verify:m5:replay
```

실제 위젯을 한 번 완료한 후 수집한 원본 문자열 하나를 두 독립 클라이언트에 전달했다. 수집 서버는 첫 수집 직후 닫힌다. 위젯 reset 호출·토큰 재발급·trim/정규화는 없다. 전송 직전 JSON 안의 captcha_token을 원본과 문자열 및 UTF-8 바이트로 비교했다. 토큰 원문·해시·사용자 ID·JWT는 기록하지 않았다.

| 항목 | 실제 관측 |
| --- | --- |
| Supabase Auth 버전 | v2.197.0 (health 응답) |
| 가입 키 | publishable, service-role과 다름 |
| 정확히 동일한 원본 토큰 | 두 요청 모두 true |
| 가입 경로 | POST /auth/v1/signup 두 번 |
| 실제 Node HTTP 전송 | 각 요청 create/sendHeaders/response 1회씩 |
| 관리자 Bearer·기존 세션 Cookie | 둘 다 없음 |
| 리다이렉트·애플리케이션 자동 재시도 | 없음 |
| 첫 응답 | HTTP 200, 신규 익명 사용자·세션 |
| 재사용 응답 | HTTP 200, 첫 사용자와 다른 신규 익명 사용자·세션 |
| 신규 여부 | created_at을 로컬 및 서버 시각과 비교, 반환 JWT의 사용자도 별도 조회해 일치 확인 |
| 임시 계정 | 2개 삭제, 각각 관리자 조회 404 확인 |
| 운영 해제 증명 | 전후 동일, 새 증명 등록 없음 |
| 결과 | REPLAY_CREATED_SECOND_USER, 종료 코드 1 |

개별 전송 시각 및 안전한 진단 필드: `artifacts/m5/replay-diagnostic.json`.

첫 수집 시도는 입력 대기 만료로 가입 요청 없이 종료됐다. 위 표는 새 수집 창에서 실제 위젯 완료 후 실행한 재검증 결과다.

## 원인 판정과 한계

테스트가 다른 토큰을 보냈거나 기존 세션을 재사용했거나 관리자 가입·자동 재시도를 실행해 생긴 결과라는 설명은 이번 계측에서 배제했다. 기존 verify.mjs도 const captchaToken을 두 번 signIn에 전달하며, 공통 코어는 공개 키로 signup을 직접 호출한다. 기존 수집·가입 코드에서 재사용 현상을 만드는 버그는 발견하지 못했다. 이번 변경은 진단 계측과 테스트뿐이다.

관측된 이상은 **호스팅된 Supabase Auth 가입 경로에서 같은 토큰으로 신규 가입 두 건이 승인된 것**이다. Supabase 내부 검증 호출, 게이트웨이 처리, 적용된 CAPTCHA 설정, Cloudflare Siteverify 판정 중 어느 단계가 원인인지는 아직 확정할 수 없다. 응답 속도 차이만으로 캐시나 검증 생략을 단정하지 않는다.

[Cloudflare 공식 문서](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)상 토큰은 단일 사용이며 재사용 시 timeout-or-duplicate가 예상된다. Supabase의 captcha_failed는 해당 제공자 오류를 감싼 인증 오류이므로 두 코드가 그대로 일치할 필요는 없다. 이번 실제 응답 두 건에는 오류 코드가 없었다.

[동일 버전 공개 검증 코드](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/security/captcha.go)는 secret/response/remoteip을 Siteverify로 전송한다. [미들웨어](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/api/middleware.go)의 관리자 Bearer 예외에 해당하는 헤더는 본 진단에서 전송하지 않았다. 공개 소스와 health 버전만으로 호스팅 런타임의 내부 동작까지 증명할 수는 없다.

## 사용자가 확인할 콘솔 로그

설정 변경이나 추가 가입 전에 아래 기존 이벤트를 확인한다. 콘솔 접근과 로그 확인은 아직 수행하지 않았다.

- 실제 요청: **2026-10-21 20:00:03.443~20:00:04.061 KST** / **11:00:03.443~11:00:04.061 UTC**.
- 검색 범위: **19:58~20:02 KST** / **10:58~11:02 UTC**. 콘솔 타임존을 먼저 확인한다.
- 첫 요청: 11:00:03.443~03.979 UTC, HTTP 200.
- 재사용 요청: 11:00:03.981~04.061 UTC, HTTP 200.

1. Supabase 프로젝트 → Logs → 위 Time Range → API Gateway와 Auth를 각각 확인한다. Method=POST, Pathname=/auth/v1/signup, Status=200을 찾는다. Auth 내부 경로가 /signup으로 기록되면 그 경로도 확인한다. 정리 과정의 admin/users DELETE·GET은 가입과 구분한다. [공식 로그 필터 안내](https://supabase.com/docs/guides/observability/logs).
2. 같은 구간에서 CAPTCHA 검증 성공/실패, captcha_failed, timeout-or-duplicate, 제공자 오류·타임아웃을 확인한다. 요청 ID를 콘솔 내부에서 연결하되 원문 로그·사용자 ID·JWT는 보고서에 붙이지 않는다. 정상 200만으로 Siteverify가 호출됐다고 결론 내리지 않는다.
3. Cloudflare → Turnstile → 해당 위젯 → Analytics/Token validation에서 같은 시각의 validation 성공·실패와 가능한 오류 분류를 확인한다. 위젯 challenge 성공과 서버 token validation 성공은 구분한다. 집계 그래프만 제공되면 개별 두 요청의 판정을 입증할 수 없다는 한계를 남긴다.
4. 읽기 전용으로 Supabase CAPTCHA 제공자가 Turnstile인지, 활성 상태인지, 서버 secret이 실제 위젯에 대응하는 실키인지 확인한다. 키 원문을 복사·공유하지 않는다. 공개 sitekey가 실키라는 사실만으로 서버 secret의 종류·매칭을 증명할 수 없다.

판정 기준: Cloudflare에서 성공1/중복실패1인데 Supabase 가입2건 성공이면 Supabase의 검증 결과 처리 확인이 우선이다. validation 호출 자체가 확인되지 않으면 적용 설정·검증 경로부터 확인한다. 성공2건으로 보이면 집계 혼입 가능성을 제외하고 Cloudflare에 단일 사용 보장 여부를 문의한다. 집계만으로는 제공자 귀책을 확정하지 않는다.

## 최소 재현 및 지원 문의용 요약

재검사가 필요할 때만 위 명령을 실행하고 출력된 새 localhost 주소에서 실제 위젯을 한 번 완료한다. 프로세스는 원본 하나로 두 signup을 순차 실행하고 임시 계정을 정리하며 운영 해제 기록을 쓰지 않는다. 반복 실행은 실제 가입을 만들고 Auth 한도를 소모한다.

아래 문안은 지원 문의용 초안이며 외부로 전송하지 않았다.

> Hosted Supabase Auth v2.197.0 accepted the exact same real Turnstile token for two sequential anonymous POST /auth/v1/signup requests at 2026-10-21 11:00:03.443–11:00:04.061 UTC. Both responses were HTTP 200 and returned distinct, newly created anonymous users and sessions. Equality was checked against the original token immediately before both sends, using string and UTF-8 byte equality. Each request had exactly one observed HTTP send/response, a publishable API key, no Authorization or Cookie header, and no redirect or application retry. Two independent clients were used; the widget was collected once and never reset. Both temporary users were deleted and absence verified. Invalid CAPTCHA rejection was observed in an earlier, separate readiness check; it does not establish replay protection. Please inspect whether both signups invoked Siteverify, the effective CAPTCHA configuration, and the handling of success/error results for these requests. No token, key, user ID, JWT, or raw log is included here.

## 변경 범위와 테스트

- `scripts/m5/replay-trace.mjs`: 원본 비교·HTTP 이벤트 계측·안전한 요약·신규 테스트 사용자만 삭제.
- `scripts/m5/replay-diagnostic.mjs`: 두 독립 클라이언트의 실검증과 운영 해제 증명 불변 확인.
- `tests/m5-replay-trace.test.mjs`: 동일/변경 토큰, 잘못된 권한·경로·재시도, 기존 세션, 신규 사용자, 삭제 실패, 비밀값 미출력의 오프라인 회귀 테스트 4개.
- `package.json`: `verify:m5:replay` 명령.
- 기본 테스트105/105, lint/typecheck 통과. 실제 연결의 재사용 거부 검사는 실패했으며 실패로 보고했다.

G1/G2/G3·브라우저 전체 회귀는 이번에 재실행하지 않았다. 앱·인증 정책·SQL·환경 설정 변경 없음. 원인이 확인되고 재사용 거부 실검증이 통과할 때까지 운영503 해제·M5-B로 진행하지 않는다.
