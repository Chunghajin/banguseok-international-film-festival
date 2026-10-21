# M5-A hCaptcha 전환 준비 (2026-10-21)

현재 앱과 검증 도구의 CAPTCHA 제공자는 hCaptcha다. 사용자 실검증에서 정상 가입과 동일 토큰 재사용 거부를 확인했다. Turnstile 문제의 내부 원인을 확정한 것은 아니다. Supabase 콘솔·DB·migration·환경 비밀값·운영 검증 기록은 변경하지 않았고 Vercel 배포도 하지 않았다. `.env.local`은 수정하지 않았다.

## 사용자가 수행할 설정

1. hCaptcha 콘솔에서 **개발용으로 발급한 실제 Sitekey**를 확인한다. 공식 공개 dummy Sitekey는 사용하지 않는다. 앱과 실검증 도구는 알려진 dummy 키 3종을 거부한다. 실제 키처럼 보이는 형식만으로 올바른 Secret 연결을 증명하지는 못한다.
2. 개발 hostname은 `captcha.banguseok.test`로 사용한다. macOS에서 `sudo nano /etc/hosts`로 다음 한 줄을 추가한다. 이번 작업에서는 hosts 파일을 수정하지 않았다.

   ```text
   127.0.0.1 captcha.banguseok.test
   ```

   hCaptcha 콘솔에서 hostname 제한 기능을 사용할 수 있다면 이 **hostname만** 개발 Sitekey에 허용한다. URL·포트·localhost·127.0.0.1을 hostname으로 등록하지 않는다. 실제 보유 도메인을 사용하는 Preview/Production 키와 구분한다. [hCaptcha 로컬 개발 안내](https://docs.hcaptcha.com/), [위젯 설정](https://docs.hcaptcha.com/configuration).
3. `.env.local`에 공개 Sitekey를 `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`로 설정한다. `NEXT_PUBLIC_TURNSTILE_SITE_KEY`는 더 이상 읽지 않으므로 제거한다. 개발 수집기는 고정 hostname을 사용하므로 새 hostname 환경 변수는 필요 없다. **hCaptcha Secret은 `.env.local`이나 앱 환경에 넣지 않는다.** 앱을 실행 중이었다면 재시작한다.
4. Supabase Dashboard → Authentication 설정 → Bot and Abuse Protection에서 CAPTCHA 활성 상태를 유지한 채 제공자를 **hCaptcha**로 바꾸고, 재발급한 대응 Secret을 입력·저장한다. CAPTCHA를 껐다 켜는 방식은 사용하지 않는다. Secret을 터미널이나 보고서에 붙이지 않는다. [Supabase 공식 설정 안내](https://supabase.com/docs/guides/auth/auth-captcha).
5. 아래는 추가·재검증 절차다. 이번 문서 갱신에서는 실행하지 않았다. 테스트용 임시 계정이 생성될 수 있으며 도구가 정리한다. 실제 가입·삭제 권한 동의가 필요한 명령이다.

   ```sh
   G1_ALLOW_TEST_WRITES=yes npm run verify:m5:readiness
   G1_ALLOW_TEST_WRITES=yes npm run verify:m5 -- --captcha-only --captcha-browser
   G1_ALLOW_TEST_WRITES=yes npm run verify:m5:replay
   ```

   readiness는 잘못된 토큰 거부만 검사하며 Supabase의 현재 제공자 설정을 자동 판별하지 않는다. 나머지 두 명령은 각각 **새 위젯을 한 번씩** 완료한다. 출력된 `http://captcha.banguseok.test:<임시 포트>`를 연다. 이전 실행의 URL·토큰을 다음 실행에서 사용하지 않는다. 키·토큰을 명령 인자로 붙이지 않는다. 기존 `M5_CAPTCHA_TOKEN`이 환경에 남아 있다면 제거하고 실제 위젯 수집을 사용한다.

6. 통과 조건은 invalid token → captcha_failed, fresh widget token → 신규 익명 사용자 승인, **동일 원본 token → captcha_failed와 추가 계정 없음**, 테스트 계정 정리 성공이다. 429·네트워크 오류·타임아웃은 재사용 거부 통과가 아니다. replay는 원본 문자열/바이트 비교, 두 독립 signup의 실제 HTTP 전송 횟수, 신규 사용자 구분을 그대로 계측한다. 원문 토큰·ID·JWT는 출력·저장하지 않는다.

위 세 명령은 운영 해제 증명을 등록하지 않는다. **일반 `verify:m5`를 `--captcha-only` 없이 실행하면 검증 성공 후 증명을 등록하므로 현재 단계에서는 실행하지 않는다.** Preview의 실제 위젯·Origin·플랫폼 헤더 확인과 운영 해제 판단은 M5-B에서 별도로 수행한다.

## 보호 정책과 변경 범위

- `src/components/hcaptcha.tsx`로 위젯 교체, `save-festival.tsx` 호출부 변경. 새로운 의존성 없이 공식 SDK 사용. 만료·challenge 만료·SDK 오류에 토큰을 비우고 저장 버튼 재검증을 요구한다. 로컬 초안 저장 로직은 그대로다.
- `src/lib/captcha-config.mjs`: hCaptcha 제공자 상수와 UUID 형식·공식 dummy 키 검사 공유.
- `src/lib/request-protection.ts`: fingerprint 입력을 `[m5a-v1, hcaptcha, origins, sitekey, Supabase URL]`로 변경. HMAC 방식·요청 한도·서버 장애 차단·Origin 검사 유지. 이전 fingerprint의 검증 기록은 새 구성과 매칭되지 않아 운영503을 해제하지 못한다.
- 요청 제한 `POLICY_VERSION=m5a-v1`과 DB 함수·테이블은 유지하므로 SQL 수정·재적용이 필요 없다. Secret 변경이나 콘솔의 CAPTCHA 비활성화는 fingerprint로 감지할 수 없다. 콘솔 변경 시 기존 검증 증명 무효화와 재검증 절차는 여전히 필요하다.
- `scripts/m5/{readiness,verify,replay-diagnostic,captcha-input}.mjs`: 새 공개 환경 변수·hCaptcha 위젯·제공자 진단 필드 적용. 수집기는 TCP loopback에만 바인딩하고 정확한 개발 Host·Origin을 요구한다.
- `.env.example`, `tests/{setup,m5-protection,m5-hcaptcha}.test.mjs`, M5 문서 갱신. 새로운 Secret 변수·가입 Hook·SQL 없음.

## 검증 결과

- 기본 테스트 108/108 통과. 외부 연결 없는 SDK 더블로 위젯 성공/만료/오류/지연 로딩/제거/재진입, 로컬 HTTP 수집기의 Host·Origin·원본 토큰 보존, fingerprint 제공자 분리와 공식 dummy 키 거부를 확인했다.
- lint, typecheck, `npm run build` 통과(종료0). 첫 빌드의 sandbox 포트 오류와 캐시된 오류를 확인하고 생성된 Turbopack 캐시만 지운 뒤 포트 허용 상태에서 재실행했다. 소스나 빌드 설정은 바꾸지 않았다.
- 첫 테스트 실행은 컴포넌트 테스트 더블의 모듈 모형 오류와 sandbox의 loopback 포트 제한으로 실패했다. 더블을 수정하고 로컬 포트 허용 상태에서 108/108을 확인했다. 첫 lint의 effect 동기 상태 변경 지적은 SDK onload/Script onReady 콜백에서 렌더링하도록 수정했다.
- 교체 작업 당시에는 실제 hCaptcha가 미검증이었다. 이후 사용자 실행 결과로 정상 가입·동일 원본 토큰 재사용 거부가 확인됐다(아래 기록). Vercel Preview 및 그 hostname의 실제 위젯은 여전히 미검증이다. 이번 문서 갱신에서 외부 검증은 재실행하지 않았다.
- 교체 작업 당시 로컬 환경은 값 출력 없이 변수 존재 여부만 확인했으며 새 Sitekey가 미설정이었다. 이후 사용자가 실검증을 완료했다. 현재 로컬·콘솔 설정은 이번 갱신에서 다시 조회하지 않았다.
- 빌드된 브라우저 산출물24개에서 현재 설정된 service-role·TMDB·보호 HMAC 비밀값이 검출되지 않았다. 실제 HTTP 응답·브라우저 네트워크 검사는 이번에 실행하지 않았다.

## 사용자 실제 재사용 진단 통과 기록

2026-10-21 대화에서 사용자가 제공한 실행 결과다. 이번 에이전트가 재실행한 결과로 표기하지 않으며, 정확한 실행 시각과 원문 토큰은 기록하지 않는다. 기존 Turnstile 실패 산출물을 덮어쓰지 않는다.

| 항목 | 사용자 보고 결과 |
| --- | --- |
| captcha_provider | hcaptcha |
| outcome | REPLAY_REJECTED |
| 첫 가입 | HTTP200 |
| 동일 원본 토큰 재사용 | HTTP400 / captcha_failed |
| independent_clients | true |
| 신규 계정 | 1개, 정리 성공 |
| release_activated | false |

이 결과는 정상 토큰 승인과 동일 토큰 재사용 거부의 근거다. 잘못된 임의 토큰 거부·공유 제한·정확한 Preview 구성의 fingerprint 증명·Vercel ingress 검증 전체를 대신하지 않는다. 운영503 유지. 다음 단계와 콘솔 순서는 [M5_B_PREVIEW.md](M5_B_PREVIEW.md).
