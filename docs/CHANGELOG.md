## 2026-10-23 — 6편씩 반복 후보 추천

- 검증된 통합3adb0e2에서 feature/rolling-candidates를 분리.66편의 실제 metadata 재사용, 부문/설문 약한 가중치·화면 내 중복/직전 동일 집합 방지·무제한 로컬 재추출 추가.
- 현재6편 초안 복원과 구형 page2 이전, 확정작/검색작 보존. 최신 정보 확인 실패에도 안전 후보 선정·확정과 명시 재시도 가능. 반복 버튼72회에 추가 API/TMDB0회.
- 전체134/134·lint·typecheck·기본 production build 통과. D+E 선정18·결과24·M2 브라우저15·M6 production runtime7그룹 회귀 통과. 실제 TMDB 검증66회. 상세 ROLLING_CANDIDATES.md.
- M5/CAPTCHA/RLS/503/M6/DB schema 코드, 기존 브랜치 및 원격 환경 변경 없음. 로컬 fixture 검증이며 새 소스의 Preview E2E/배포/증명 등록은 미실행.

## 2026-10-22 — M5-B v2 격리 Preview·읽기 전용 preflight PASS

- M5 전용 스냅샷125개 업로드, READY Preview `dpl_GgBbDBMSv5YRCNMG3UcsfcMp5Y9a` 배포 후 고정 alias 이동. 이전 A57 배포 보존·Preview alias 전용 롤백 명령 기록.
- 실제 원격 probeVersion2·v2 HTML·Origin/Sitekey/fingerprint/비밀 구성 일치. 무인증302·작업자 미인증404·API/공개503·외부 Origin403 확인. 증명 행 불변·해당 Preview0개, 임시 자동화 자격 폐기 완료.
- 증명·계정·콘텐츠·challenge 미실행. Production/환경 설정·Git 연결·Stitch·M6 소스 불변. 최종 통합 후 전체 E2E 별도 수행 필요. 상세 docs/M5_B_PREVIEW.md.

## 2026-10-22 — M5-B 입력 사전 검사·CAPTCHA 단계 진단 안정화

- 정상 저장/수정 fixture를 원격 요청 전 실제 제품 입력 검증에 통과시키고 닉네임11/12/13자·유니코드·본문/필수 필드 경계 테스트 추가. 증명 직전 구성과 입력 재확인, 저장 전 A/B 인증 읽기 확인.
- 단계별 요청 시작/HTTP 응답/전송 실패와 위젯 v2 상태 진단 추가. 가입 토큰은 전송 전 소비, 실패 후 재사용 차단, 의도적 replay는1회만. raw 토큰/키/본문/식별자는 로그에 넣지 않음.
- 첫 실패13자 초과는 확정. 두 번째는 challenge 대기~fresh 응답 전으로만 확인되며 구체 원인은 로그 부족으로 미확정. generic captcha_failed 원인은 추정 후보로 구분.
- 전체122/122·타입·lint·build 통과. 실제 증명/계정/콘텐츠 생성·배포 없음. 전체 E2E 재개 전 보호된 Preview에 v2 반영 및 preflight 필요. Stitch·M6/PNG·Production 정책 변경 없음.

## 2026-10-22 — M5-B 실제 E2E BLOCKED·철회/정리 확인

- 승인된 실제 Preview challenge·invalid/fresh/replay 제공자 검증과 A/B 세션 생성/재사용 거부 통과. Preview 증명 등록으로 세션503→428, 저장 검사 실패 후 실행 소유 행 철회로503 복귀 확인.
- 검사기 닉네임13자가 제품12자 제한에 걸려 첫 저장400. 로컬 fixture를 수정하고 제품 nickname 검증으로 사전 확인. 재시도는 실제 challenge/제공자 단계에서 실패해 새 증명 없이 중단; 뒤따른 원격 요청 장애 후 복구 감사 완료.
- 임시 계정3개 정리·영화제 생성0개. 최종 Preview 증명0·임시 자격0·실행 이후 익명 계정/테스트 영화제 잔존0 확인. 저장/공유 기능은 미완료이며 M5-B PASS 아님. 안전 진단 보완, 로컬9/9·lint 통과.
- 최종 Stitch/M6 통합 시 중간 증명을 자동 재사용하지 않고 최종 빌드에서 재검증하도록 문서화. Production/보안 정책/외부 작업 파일 변경 없음.

## 2026-10-22 — M5-B 격리 Preview 배포·원격 preflight 통과

- main/HEAD 기반 임시 스냅샷에 M5 파일만 반영, Stitch·M6 변경과 비밀 파일 제외. 업로드122개·비밀값 일치0개 확인 후 Preview READY 배포 `dpl_A57C68rJLLDFukMq3p3Tbs2Hzhkm` 생성, 기존 고정 alias 이동.
- 실제 URL https://banguseok-film-festival-i0m7jaril-mikechung0918.vercel.app. 원격 origin/Sitekey/fingerprint/credential 구성 일치, 인증 HTML200·작업자 인증 없는404·무인증302·기존 API/공개 읽기503 확인. 임시 인증 자격 폐기 완료.
- 증명 전후 불변·정확한 Preview 증명0개. 사용자/콘텐츠 테스트·증명 등록/철회·Production·GitHub 설정 변경 없음. alias 롤백 명령과 실행별 수동 철회 도구/명령 준비, 관련 M5 테스트6/6·lint 통과. 상세 docs/M5_B_PREVIEW.md.

## 2026-10-22 — M5-B Preview 증명 안전 실행 절차 구현

- Preview 전용 작업자 인증 검사 화면으로 실제 hostname 위젯을 증명 전에 표시. 원격 challenge로 fingerprint·Sitekey·빌드/런타임 키·Preview credential 구성을 비교하며 제품 API503은 유지한다.
- `verify:m5:preview`의 읽기 전용 preflight/증명 없는 provider/명시 승인 activation 모드 추가. 새 Preview 증명만 INSERT하고 후속 HTTPS·데이터 정리 실패 시 실행 소유 행만 자동 철회. 기존 로컬 검증 도구의 일반 증명 등록 경로 제거.
- Production/기존 증명·Stitch·공유 PNG 파일 변경 없음. 실제 증명 등록·외부 가입·새 Preview 배포는 미실행. DB 장애·프로세스 강제 종료 시 철회 한계와 수동 복구 범위를 M5_B_PREVIEW.md에 명시.
- 전체113/113·lint·typecheck·production build 통과, 브라우저 산출물24개에서 현재 서버 비밀값 미검출. 포트 제한 실패는 허용 상태에서 재검증했고 생성된 Turbopack 오류 캐시만 정리.

## 2026-10-22 — M5-B 고정 Preview·실환경 차단 확인

- Preview 전용 alias `banguseok-film-festival-preview-mikechung0918.vercel.app` 설정, APP_ALLOWED_ORIGINS를 Preview에만 추가. 기존 원격 소스 재배포 READY 후 alias 이동, 로컬 Stitch 파일 업로드·수정 없음.
- Authentication 유지, 임시 메모리 접근 자격으로 API/공개 읽기503·다른 Origin403·개발 경로404 확인. 자격 폐기 후 비로그인302 및 최종 bypass 자격0개 확인.
- Production 도메인/기존 CANCELED target 유지. DB·RLS·CAPTCHA·운영 증명·Git 연결 변경 없음. hCaptcha 등록값과 증명 절차·503/위젯 순서 문제·등록 후 실패의 자동 철회 부재를 docs/M5_B_PREVIEW.md에 기록. 기능 검증과 증명 등록은 미완료.

## 2026-10-22 — M5-B 보호된 Preview READY

- 공식 Environments의 canceled-first 규칙 확인, 첫 CANCELED 기록을 보존한 채 --target=preview 재시도. 실제 preview→READY, 원격 빌드 성공.
- URL: https://banguseok-film-festival-fnacr47fm-mikechung0918.vercel.app (배포별 URL, Preview alias0개). 비로그인 /·영화API·세션API는302 Vercel 인증 차단, 앱 콘텐츠 없음.
- 첫 기록 CANCELED·Production READY0·Authentication 유지 확인. DB·CAPTCHA·Production 변수·운영 증명·APP_ALLOWED_ORIGINS·보안 코드 변경 없음. 공개 도메인 연결·승격·Git 자동 배포 없음.
- 내부 앱503은 플랫폼 인증 뒤라 직접 원격 관측하지 않았다. 고정 hostname·hCaptcha/origin 정합성·fingerprint 증명과 위젯 검증 순서는 다음 과제. 상세 docs/M5_B_PREVIEW.md.

## 2026-10-22 — M5-B 첫 CLI Preview 시도 취소·차단

- mikechung0918 팀의 프로젝트·Node24·Preview6개 변수·Vercel Authentication 보호 확인. .vercelignore 추가 후 dry run132개, .env.local/artifacts/캐시/의존성 제외와 비밀값 미포함 확인.
- --environment preview 명시 배포가 서버에서 production으로 분류돼 즉시 취소했다. CANCELED·aliasAssigned=false 확인. 취소된 URL은 비로그인302 Vercel 인증, 미배정 alias404, 앱 콘텐츠 없음.
- 성공한 Preview 없음. 취소된 production 레코드와 프로젝트 target 참조는 남아 있으므로 Production 상태 불변이라고 주장하지 않는다. 추가 배포·승격·공개 도메인 배정·Git 자동 연결 없음.
- 앱503·RLS·소유권·요청 제한 유지, Supabase/운영 증명/Production 환경 변수 변경 없음. hCaptcha·APP_ALLOWED_ORIGINS는 실제 Preview 보장 경로 확인 전 보류. 상세 docs/M5_B_PREVIEW.md.
- 로컬 변경은 .vercelignore와 문서뿐이며 commit/push하지 않았다. 앱 테스트·원격 런타임 검증은 미실행.

## 2026-10-21 — hCaptcha 사용자 실검증 통과·M5-B 사전 점검

- 사용자 실행 보고: hcaptcha REPLAY_REJECTED, 첫 가입200·동일 원본 replay400/captcha_failed, 독립 클라이언트, 신규 계정1개 정리 성공, release_activated=false. 이번 에이전트가 재실행한 결과와 구분한다.
- M5-A 로컬 CAPTCHA 정상 승인·재사용 거부 확인, M5-B는 Preview 준비 점검 상태. 실제 Preview hostname·환경/ingress·공유/PNG 런타임·preview 증명은 미검증. 임의 invalid hCaptcha 토큰 검사의 최신 결과는 별도 필요.
- docs/M5_B_PREVIEW.md에 콘솔 순서·환경 변수 이름·Origin/fingerprint·배포 보호·503 선행으로 인한 위젯 검증 순서 문제를 기록했다. docs/M5_A.md·M5_HCAPTCHA.md 상태 갱신.
- 문서만 변경, 앱 코드·DB·환경 변수·검증 기록·배포 변경 없음. 테스트는 재실행하지 않았으며 직전108/108·lint/typecheck/build 기록 유지.

## 2026-10-21 — M5-A hCaptcha 교체 준비

- hCaptcha 위젯·공개 Sitekey 환경 변수·실검증 수집기를 교체하고 fingerprint에 hcaptcha 제공자를 포함했다. 기존 Turnstile 검증 기록과 매칭되지 않으며 운영503과 기존 공유 요청 제한을 유지한다.
- 개발 수집 hostname은 captcha.banguseok.test로 고정하고 TCP loopback·Host/Origin 검사·dummy 키 거부를 유지했다. readiness/verify/replay 도구 갱신, 설정 순서는 docs/M5_HCAPTCHA.md.
- 기본108/108, lint·typecheck·production build 통과. 초기 테스트 더블 오류를 수정하고 sandbox 로컬 포트 제한과 Turbopack 오류 캐시를 제거한 재실행 결과다. 실제 hCaptcha 가입·재사용 거부는 아직 미실행.
- SQL·migration·DB·Supabase 콘솔·.env.local·운영 검증 기록 변경 및 Vercel 배포 없음. Secret은 Supabase 콘솔에만 등록한다.

## 2026-10-21 — M5-A 동일 CAPTCHA 토큰 재사용 진단

- 원본 문자열·UTF-8 바이트 일치와 실제 signup 전송 횟수를 계측했다. 독립 클라이언트 두 개, 각 HTTP 전송 1회, 관리자 Bearer/Cookie·재시도·위젯 재발급 없음 확인.
- 20:00:03~04 KST 실제 Supabase 응답 모두200, 서로 다른 신규 익명 계정2개 생성 재현. 두 계정 삭제 후404 확인. 재사용 거부 실패로 종료1, 운영 해제 증명 불변.
- 진단 스크립트·테스트만 추가. 기본105/105, lint/typecheck 통과. 외부 제공자 내부 원인은 미확정이며 콘솔 로그 확인 절차·비밀정보 없는 지원 문의 초안은 docs/M5_CAPTCHA_REPLAY_DIAGNOSIS.md.
- SQL·RLS·환경 설정·운영503 차단 변경 및 M5-B 배포 없음.

## 2026-10-21 — M5-A CAPTCHA 준비 상태 오진 수정

- 실제 invalid CAPTCHA 응답의 숫자 code=400이 문자열 error_code=captcha_failed를 가려 UNVERIFIED가 되던 오류 해석을 수정했다. HTTP 상태·인증·거부 정책 변경 없음.
- readiness에 단계/상태/허용목록 코드 진단을 추가했다. 실제 재검사 READY/REJECTED, 종료 0. 이 결과는 정상 토큰 승인·재사용 거부 검증과 구분한다.
- verify:m5의 --captcha-only 모드는 CAPTCHA 세 사례만 확인하고 운영 해제 레코드를 쓰지 않는다. 토큰·키·원문은 출력하지 않으며 생성 계정을 정리한다.
- 기본 테스트 101/101, lint·typecheck 통과. SQL·RLS·환경 설정·운영 게이트 변경이나 M5-B 배포 없음.

## 2026-10-21 — M5-A 운영 요청 보호 준비

- v1.1 PRD 8의 원자적 Supabase bucket 대안을 구현했다. IP/검증된 사용자/경로·비용 예산을 공유 DB에서 계산하고 429 Retry-After, 제공자 장애 시 503 차단을 유지한다. G1 SQL/RLS/권한 변경 없음, 추가 migration은 실제 미적용.
- Turnstile 지연 위젯과 Supabase CAPTCHA 흐름, 환경별 검증 fingerprint·실제 제공자 검증 도구를 준비했다. 단일 enable flag 없음. 공개 읽기 Proxy와 선택적 Preview PNG에도 보호를 적용했다.
- 실제 준비 상태: 새 RPC NOT_READY, 잘못된 CAPTCHA 익명 가입 NOT_ENFORCED. 임시 계정 정리. 실제 CAPTCHA 성공과 새 관리형 제한 검증은 미실행이며 운영 차단 유지.
- 기본 96/96, 실제 G1 10/10·G2 10/10·로컬 G3 11/11, M4 HTTP 12그룹, Chrome 기존 M1/M2 23·M3 10·M4 14그룹 통과. M5 오류 주입 포함 Chrome 15그룹, 로컬 production 차단 10건 통과.
- 외부 계정·키·도메인 설정·SQL 적용·Vercel 배포는 하지 않았다. 정확한 설정 순서와 차단 항목은 docs/M5_A.md.

## 2026-10-21 — M4 실제 저장·공개·소유자 관리

- G1 공통 서버 코어를 재사용해 익명 HttpOnly 세션/refresh, 비공개 저장, 동의 기반 공개 snapshot, 소유자 목록·수정·공유 갱신·중단·확인 삭제를 연결했다. SQL/RLS/기존 migration·환경 변수·의존성 변경 없음.
- 클라이언트 owner/result/메타데이터를 거부하고 서버 TMDB 확인·결정적 결과 계산을 사용한다. 공개 9필드/영화 6필드, revision409·응답 유실 재시도·로컬 보존·no-store/noindex/민감 URL 로그 제거를 유지한다.
- 86/86 기본 테스트, 실제 Supabase G1 10/10·M4 HTTP 12그룹·Chrome A/B 14그룹 통과. 기존 G2 10/10·G3 11/11·M1/M2 Chrome 23그룹·M3 Chrome 10그룹 회귀 통과. 로컬 IPv4 실행 조건과 초기 실패는 M4 문서에 구분했다.
- 운영 영화 API 503을 유지하고 M4 production 쓰기도 보호 검증 전 503 차단한다. 공개 배포·CAPTCHA·실제 휴대전화·분산 보호·Vercel은 미검증이다. PNG 통합 없음.
- 상세 변경/실행/스크린샷: `docs/M4.md`, `artifacts/m4/`.

# 방국제 CHANGELOG — v1.1

갱신일 2026-10-21 · 현재 상태: **G1·G2 실검증 통과 / G3 로컬 검증 / M1·M2·M3 로컬 구현 / 운영 요청 보호·Vercel 미검증**

## 2026-10-21 — M3 공식 HTML 결과·집행위원장 특별상

- 사용자 지시에 따라 v1.1의 7종×3변형, q≥3·2q+bonus·고정 우선순위, P1~P6, 관람량 문구를 순수 함수로 구현했다. 원문 템플릿과 기존 설문/후보/선정 규칙은 변경하지 않았다.
- `/create/result`에 확정 3~6부문과 특별상·심사평을 표시한다. pending/건너뜀 제외, 직접 URL 부족/초안 없음, 재편집·복원·결과 단계 이어쓰기를 연결했다. 결과는 현재 초안에서 재계산하며 시간/난수/CSV/닉네임으로 판정을 바꾸지 않는다.
- 아이보리·버건디·명조에 SVG 월계관·트로피·도장을 추가했다. 로컬/미게시 표시·noindex·텍스트 이스케이프를 유지했다. 장식이 제목과 겹친 첫 시각 검사를 수정하고 최종 화면을 재확인했다.
- 테스트 72/72, typecheck·lint·build 통과. Q01~Q12 전체 문구와 기대 결과 일치, 21변형·T01~T18·건너뜀 bonus 제외 검사 통과. M3 Chrome 10그룹과 기존 M1/M2 Chrome 23그룹 통과.
- 실제 로컬 production 결과 shell 200/noindex·운영 영화 API 503·G2 API 404 유지 확인. 토큰 검사 artifact 93개/로그 1개/기존 응답 6개 미검출. 결과 생성 중 API 호출 없음 확인.
- Supabase 게시·공개 URL·PNG·새 인증은 연결하지 않았다. 실제 기기/보조공학·사용자 반응·Vercel은 미검증이다. 상세는 `docs/M3.md`, 증거는 `artifacts/m3/` 참조.

## 2026-10-21 — M1·M2 모바일 UI 정리

- 사용자 요청 범위인 시각·상호작용 개선만 수행했다. 아이보리·명조·버건디·공식 브랜드/슬로건과 v1.1 문항·부문·후보·점수·선정/복원 로직은 유지했다. API/보안/초안 데이터 모델 변경 없음.
- 랜딩의 단독 개최 안내·여백·예시 계층, 설문 행간·60px 터치 영역·선택과 분리된 포커스 링을 조정했다.
- 후보 화면의 상단을 압축하고 검색을 후보 도구줄의 작은 보조 링크로 배치했다. 미선정 상태의 비활성 sticky 버튼을 제거하고 pending에서만 간결한 수여 영역을 고정했다. 완료 화면은 작은 도장과 부문/제목/연도의 계층을 보완했다. 공식 결과지는 준비 중이며 M3 기능은 추가하지 않았다.
- Chrome 360×800의 대상 미선정 화면에서 첫 포스터 497→319px(178px 위), 미선정 수여 영역 126→50.5px 및 일반 흐름으로 변경됨을 측정했다. 같은 후보 순서를 위해 UI 비교 러너에만 난수 seed를 적용했다.
- 기존 테스트 59/59, lint·typecheck·build, M1 HTTP 통과. Chrome 모바일/데스크톱 UI 23그룹 통과. 마지막 선택지·카드·검색 결과의 스크롤/가림과 검색 포커스 복귀를 확인했다. 오류 주입과 실제 TMDB 검색을 구분했다.
- 토큰 검사: artifact 89개·로그 1개·응답 6개 미검출. 실제 휴대전화/OS 키보드·스크린리더·사용자 비교 시험·Vercel은 미검증.
- 전후 화면과 측정은 `artifacts/ui-polish/`, 상세 변경은 `docs/UI_REFINEMENT.md` 참조.

## 2026-10-21 — M2 후보 추천·영화 검색·수상작 선정

- 사용자 지시에 따라 v1.1 6부문·순서·설명·그룹별 4편을 그대로 구현했다. B 확정 버튼 + 모바일 2열은 사용자 비교 시험 전 임시값으로 유지한다. 설문/점수·기준 문서는 변경하지 않았다.
- 72슬롯/고유 66편의 실제 TMDB 상세 ID·제목·원제·연도·포스터를 확인했다. 반딧불이의 묘는 2005년 실사판이 아닌 1988년 애니메이션 12477로 고정했다. 언더 더 스킨의 편집 연도 2013과 실제 TMDB 연도 2014 차이를 기록했다.
- 초안 생성 때만 그룹별 Fisher–Yates → 페이지별 2:2:2를 배치했다. 배열·page·pending·확정작·미시상·현재 부문을 M1 저장 키에 확장해 보존한다. 유효한 M1 UUID/설문을 유지하고 잘못된 후보 배열만 복구한다.
- 실제 포스터 후보 6장 우선 표시, IME/350ms/취소/오래된 응답 무시 검색, 상세 재확인, 수상작 변경·건너뛰기·최소 3부문 완료 화면을 연결했다. DB/특별상/공개/PNG 통합은 구현하지 않았다.
- 별도 제품 영화 POST 경로에 입력·Origin·로컬 한도·캐시를 적용했다. 운영 관리형 보호 미확인으로 production은 503 차단하며 기존 G2 API는 production 404를 유지한다. 보호 없이 공개하는 옵션은 추가하지 않았다.
- 테스트 59/59, typecheck·lint·build·M1 HTTP 통과. 실제 M2 HTTP 8그룹과 headless Chrome 360×800 15그룹 통과. 브라우저 429/0건/이미지 실패는 오류 주입으로 구분했다. 실제 휴대전화·사용자 비교 시험·Vercel은 미검증이다.
- 토큰 문자열 검사: browser artifact 85개·로그 1개·기존 응답 6개 미검출. M2 실제 응답도 별도 미검출 확인. G1 SQL/보안·G2/G3 기능 코드·환경변수·의존성 변경 없음.
- 상세 변경과 제한은 `docs/M2.md`, 실제 증거는 `artifacts/m2/`에 기록했다.

## 2026-10-21 — M1 랜딩·영화적 자아 설문·로컬 초안

- 사용자 지시에 따라 v1.1 PRD·SCREEN_CONTENT·CODEX_STEPS를 기준으로 M1만 구현했다. 기준 문서의 문항·선택지·규칙은 변경하지 않았다.
- 슬로건과 정적 결과 예시가 있는 랜딩, 모바일 우선 6문항 설문, 이전/다음·진행률·미응답 검증·명시적 null 건너뛰기, 완료 후 시상 진입점을 구현했다. q4 동의 5단계와 q6의 51~100/101 이상을 구분했다.
- 답변·진행·버전을 자체 localStorage 키에 저장하고 새로고침 복원·7일 만료·저장 실패 메모리 전환·손상/다른 버전 보존을 구성했다. M2의 전체 초안 모델 연결은 후속 작업이다.
- 테스트 45/45, typecheck·lint·build 통과. 로컬 HTTP 3경로 통과. Chrome 360×800에서 필수 응답·키보드 선택·0값 복원·이전/다음·건너뛰기·q4·q6·완료 복원·재편집을 확인하고 스크린샷을 보존했다.
- native 재시작 확인창 검사 중 자동화 연결이 멈췄다. 취소/승인 검사는 미완료로 분리했다. 실제 휴대전화·보조공학·배포 검사도 미실행이다.
- 기존 G2 노출 검사 재실행: browser artifact 71개·개발 로그 1개·응답 6개에서 실제 토큰 미검출. G1·G2·G3 기능/보안 코드와 환경변수/의존성은 변경하지 않았다. 실제 시상 선택·점수 계산·DB/공개 결과 연결은 구현하지 않았다.
- 상세 변경/검증/후속 조건은 `docs/M1.md`, 화면 증거는 `artifacts/m1/` 참조.

## 2026-10-20 — G3 한글 PNG 로컬 기술 검증

- 사용자 범위: 한글·실제 포스터 HTML/PNG의 안정성만 검사. 설문·시상·결과지 전체는 구현하지 않는다.
- PRD의 서버 ImageResponse를 사용하고 최소 HTML과 동일 JSX를 재사용했다. 클라이언트 canvas 방식은 문서로 비교했으며 구현/실행하지 않았다.
- 실제 1080×1920 PNG 8개 생성(텍스트, 실제 포스터, 없는/실패 포스터, 4/5/6개, 로컬 production). 포스터 3개 파일 455,224 bytes, 6개 768,776 bytes. 전체 PNG 디코딩 및 시각 검사 수행.
- 원문자 ①②③가 빠진 실제 오류를 발견했다. 초기 Google Fonts 파일의 글리프 부재를 확인하고, 라이선스를 보존한 나눔고딕 전체 TTF로 교체해 수정했다. 전체판 hash·글리프 검사 증거를 남겼다.
- CDN CORS는 Origin 헤더 요청에서 *로 확인. 서버가 안전한 TMDB 경로만 3초 내 로드하고 bytes/data URL을 제공하므로 browser canvas CORS에 의존하지 않는다. PNG 생성은 font·poster 로딩과 renderer 스트림 소비가 끝난 뒤 응답한다.
- 실제 로컬 HTTP 11/11 통과, 폰트/변환 오류의 PNG 503 후 HTML 200 유지. Chrome 360px viewport에서 실패 메시지와 HTML 유지 확인. 실제 휴대전화는 미검증.
- 테스트 35건·typecheck·lint·build 통과. font 파일 trace 및 로컬 production PNG 확인. 기본 production은 404, 제한된 preview 명시 활성화만 준비했다. 실제 Vercel 연결/배포는 없으므로 G3 전체 완료나 R11 완료로 기록하지 않는다.
- 변경/증거/배포 조건은 `docs/G3_PNG.md`, `artifacts/g3/` 참조. G1·G2 보안/기능 코드, PRD·SCREEN_CONTENT·CODEX_STEPS 규칙은 변경하지 않았다.

## 2026-10-20 — G2 실제 TMDB 검색·상세 검증

- 사용자 범위: 서버 토큰을 사용하는 한국어/영어 검색·정규화·상세·안전한 포스터·오류/노출 검사와 최소 개발용 화면. G1 보안 및 G3는 변경하지 않는다.
- 서버 전용 `src/lib/tmdb.ts`, 검색/상세 Route Handler, `/dev/tmdb`, 실검증 및 토큰 노출 검사 CLI, 오프라인 테스트를 추가했다. `server-only` 패키지로 클라이언트 import를 차단하고 기존 ESM 코드에 맞춰 package type을 module로 명시했다.
- ko-KR·adult 제외·1~100자·page 1~5·최대 20개·5초 timeout·자동 재시도 없음. ID/제목/원제/연도/포스터 경로·URL만 반환하며 upstream 원문은 전달하지 않는다.
- PRD 8의 관리형 요청 보호가 미확인이라 두 HTTP API와 검증 화면을 development 전용으로 제한했다. production 404를 실제 서버에서 확인했다. no-store로 실제 요청을 검증하며 제안된 캐시는 제품 연결 때 적용한다. 제품 명세 변경이 아니다.
- 실제 `기생충`(496243,2019), 영어 `Parasite`의 1982년 동명작(48311), `Inception`(27205,2010), `괴물`(1255,2006), 한국어 title 번역/포스터/개봉일 없는 `Untitled`(1647338) 확인. 기생충 이미지 다운로드 200.
- `npm run verify:g2`: 실제 10그룹 통과/종료 0. 0건·없는 양의 ID 404·잘못된 인증 거부도 실제 확인했다. 429/네트워크 장애/timeout은 오프라인으로 구분했으며 대량 요청하지 않았다.
- `npm test` 29건 통과, lint·typecheck·build 통과. 개발 HTTP와 Chrome 검색→상세→포스터 표시 확인. 실제 토큰 문자열은 client artifact 48개·개발 로그 1개·HTML/API 6응답에서 미검출.
- 자세한 실행·증거·미검증은 `docs/G2_TMDB.md` 참조. G1 SQL/소유권/CRUD/검증 코드는 변경하지 않았다. 후보 72슬롯 전체 검증·production 공개·전체 UI·G3는 범위 밖이다.

## 2026-10-20 — G1 공개 token 검증 실패 수정

- 실제 Supabase에서 기존 실패를 재현했다. 공개 스냅샷 최상위 허용목록 assertion은 통과했고, `denied(() => client.remove(share.token, row.id, 1), 401)`에서 실제 Auth 응답 403과 기대값 401이 달라 실패했다. 삭제 권한이 허용된 문제가 아니라 Auth 응답 매핑과 검증 계약의 불일치였다.
- 공통 Auth 사용자 확인에서만 upstream 401/403을 `401 UNAUTHENTICATED`로 정규화했다. Auth 검증 실패 시 service-role 요청은 실행하지 않는다. DB 403과 네트워크 503은 원래 상태를 유지한다.
- 오류 진단은 assertion의 소스 위치·숫자 HTTP 상태만 출력하도록 보강했다. 원문 오류/stack/응답/actual/expected/키/세션/token은 출력하지 않는다.
- 실검증에 수상작 내부 필드 허용목록, 공개 token의 원본 조회·공개 중단 차단, 공개 후 B 세션의 모든 소유 동작 차단, 실패 전후 원본/공개본 동일성을 추가했다.
- SQL migration·RLS·테이블/RPC 권한·공개 허용목록은 변경하지 않았으며 적용된 migration도 재실행하지 않았다.
- 수정 후 `G1_ALLOW_TEST_WRITES=yes npm run verify:g1`: 실제 Supabase 10항목 모두 PASS, 종료 0. 정리 실패 없음. `npm test`: 19건 통과/실패 0, `npm run lint` 통과. 수정 전 회귀 검사에서 실패함을 확인한 후 수정했다.
- G1 CLI 통과는 제품용 API·브라우저 세션·CAPTCHA·운영 요청 제한 검증 완료를 의미하지 않는다. G2·G3·전체 UI는 변경하지 않았다.

## 2026-10-20 — G1 소유권·CRUD 검증 준비

- 사용자 요청 범위: G1만 진행. 환경변수가 없으면 필요한 SQL과 직접 설정할 순서를 준비하며 실제 연결 없이 성공으로 보고하지 않는다.
- `.env.local`과 Supabase 환경변수 3개가 모두 없었다. 로컬 Docker daemon도 없어 실제 Supabase 세션을 만들지 않았다.
- `supabase/migrations/202610200001_g1.sql`: 원본/공개 2테이블, owner SELECT RLS, client 직접 쓰기·공개 조회·RPC 실행 권한 회수, service-role 전용 save/publish 함수, revision·재시도·공개본 분리·cascade 준비.
- `scripts/g1/`: 로그인 UI 없는 실제 익명 A/B 생성, Auth 사용자 검증 후 서버 소유 경로 CRUD, 다른 세션 접근 거부, 공개 token 편집 불가, 공개 갱신/중단/삭제를 검사하는 CLI. 비밀키는 로컬 Node 환경변수에서만 읽는다. 제품 경로는 열지 않았다.
- SCREEN_CONTENT T02 기반 합성 fixture만 사용한다. G2 없이 실제 영화 ID/메타데이터 확인이나 임의 입력의 결과 계산이 완료됐다고 주장하지 않는다. fixture를 제품용 저장 API로 노출하지 않는다.
- PRD 9.3에 따라 본인도 테이블 직접 쓰기는 금지하며, 서버가 Auth에서 얻은 owner를 전달한다. 사용자 요구를 브라우저 직접 쓰기 허용으로 해석하지 않았다. 제품 명세 변경 없음.
- 오프라인 SQL 검사를 위해 개발용 PGlite를 추가했다. Auth schema/uid와 역할은 모사하지만 PostgreSQL 엔진에서 실제 migration·RLS·권한·CRUD를 실행한다. 실제 Supabase 검증과 구분한다.
- 실행: `npm run verify:g1`는 설정 미비로 종료 2(`NOT RUN`). 실제 A/B Auth·PostgREST 권한 실패 검증은 미실행이다. 설정/검증 순서와 남은 위험은 `docs/G1_SUPABASE.md`에 기록한다.
- 로컬 결과: 테스트 16건 통과/실패 0, lint·typecheck·Next.js 빌드 통과. client source/static 청크에 service-role 환경변수 이름이나 G1 도구 참조 없음. Supabase 실검증과 제품 연결은 여전히 미완료다.

## 2026-10-20 — 초기 환경 구성

- 사용자 지시 근거: 현재 프로젝트의 docs 4종을 기준으로 개발을 시작하되, 이번에는 초기 환경 구성과 기술 검증 준비까지만 진행하도록 요청했다. 이를 이번 범위의 v1.1 개발 착수 승인으로 기록하며 제품 전체 구현·배포 승인으로 확대하지 않는다.
- 기존 폴더에는 docs 4종만 있었으며 앱 코드, 패키지 설정, Git 저장소는 없었다.
- Next.js App Router / TypeScript / Tailwind CSS와 최소 준비 화면, ESLint·타입 검사·Node.js 테스트 명령을 추가했다. 의존성은 정확한 버전과 lockfile로 고정한다.
- `.env.example`에는 이름과 빈 값만 기록했다. 실제 비밀키, 외부 서비스 연동, DB/RPC, 배포 설정은 추가하지 않았다.
- 실행 방법은 `README.md`, 다음 G1/G2/G3 설정과 통과 기준은 `docs/TECH_VALIDATION.md`에 기록한다.
- PRD·SCREEN_CONTENT의 제품 규칙과 문구, CODEX_STEPS의 개발 순서는 변경하지 않았다. 아래 명세 개정 당시 기록은 이력으로 유지한다.
- 구성 버전: Node.js 24.16.0 / Next.js 16.4.2 / React 19.3.1 / TypeScript 6.0.3 / Tailwind CSS 4.3.3.
- 실행 결과: 개발 서버 `http://127.0.0.1:3000` 준비 완료, GET `/` HTTP 200 및 한국어·브랜드·준비 상태 확인. `npm run lint`, `npm run typecheck`, `npm test`(1개), `npm run build` 통과. 빌드에서 `/`와 `/_not-found` 정적 생성 확인.
- 샌드박스의 포트 제한으로 첫 개발 서버/빌드가 실패했으나 동일 명령을 실행 권한 확장 후 통과했다. 설정 우회 코드는 추가하지 않았다. 실제 오류와 조치는 `docs/problem-log.md`에 기록했다.
- `npm audit --omit=dev`: 취약점 0건. 전체 audit: ESLint 전이 의존성의 high 5건(동일 braces 원인 포함). 수정된 braces 안정 버전은 조회 시 없었으며 강제 다운그레이드는 적용하지 않았다. 후속 도구 업데이트가 필요하다.
- Next.js 개발 서버가 생성한 `AGENTS.md`를 유지했다. 실제 브라우저 시각 검사는 사용 가능한 in-app browser가 없어 미실행이며 HTTP/빌드 검사와 구분한다. G1/G2/G3와 배포는 모두 미실행이다.

## 문서 사용

개발 기준 파일은 저장소 상대경로 `docs/PRD.md`, `docs/SCREEN_CONTENT.md`, `docs/CODEX_STEPS.md`, `docs/CHANGELOG.md`다. 다른 컴퓨터에서는 docs 폴더를 그대로 저장소 루트에 둔다. 기기별 절대경로는 프롬프트에 넣지 않는다.

이번 전달본 `방국제_PRD_v1.1.md`, `방국제_화면·콘텐츠명세_v1.1.md`, `방국제_Codex_구현프롬프트_v1.1.md`, `CHANGELOG.md`는 각각 위 문서와 동일한 내용이다. docs가 수정 기준, 전달본은 해당 버전 스냅샷이다.

사용자가 v1.1 기반 개발을 지시하면 승인일과 지시 근거를 이 문서에 기록하고 해당 버전으로 시작한다. 그전에는 ‘최종 승인됨’이라고 표시하지 않는다. v1.0은 이력용으로 보존하며 새 구현 입력에 섞지 않는다.

## v1.0 → v1.1 변경

| 번호 | 이전 | v1.1 | 이유/영향 |
|---|---|---|---|
| C01 | 초기6+예비6 고정순서 | 그룹별 한 번 셔플, 페이지별6개, 초안에 배열/page 저장 | 원래 무작위 요구 복원, 새로고침 시 점프 방지 |
| C02 | 친숙도 명시 없음, 일부 부문 전부 마니아 작품 | 각부문4/4/4 풀→한화면2/2/2 층화셔플 | 무작위와 친숙도 가설 동시 적용 |
| C03 | q1~q5 0~2의3단계 | 빈도형4문항+동의형1문항, 값0~4/null | 5단계 복원, 질문 의미에 맞는 응답 |
| C04 | q≥1/score≥3 | q≥3, score=2*q+bonus, 중간값 제외 | 가끔/보통을 강한 성향으로 단정하지 않음 |
| C05 | 51편이상 | 51~100/101이상 | 관람량 자기표현 세분화, 우열 점수 미사용 |
| C06 | 특별상당 고정1문구 | 기본5종+fallback2종 각각3변형, 실제부문/작품 연결 | 결과 반복 완화, 사용자 시상행위 반영 |
| C07 | 재현가능하지만 출력 사례 제한 | T01~T18 재작성, 합성12명 입력/출력/검토포인트 | 타입·점수·문구 경계 확인 |
| C08 | PNG와동적OG가P0의완료를막을수있음 | P0-Core HTML/URL과R11 PNG 분리, 동적OG P1 | 이미지 실패가 핵심 배포를 막지 않음 |
| C09 | 첫날 DB연결/PNG 중심 | 10/21 실제익명소유CRUD·TMDB검색상세·한글PNG 3게이트 | 가장 위험한 부분을 먼저 검증 |
| C10 | 여러 운영 요구가 같은우선순위 | 원본/공개2테이블,현재공개본1개,목적별RPC2개,관리형보호우선 | 보안은 유지하고 공개이력UI·별도인프라 배제 |
| C11 | 익명브라우저 편집한계 안내 | 저장전/관리화면에 기기변경·데이터삭제·공유링크복구불가 명시 | 공개URL과수정권한 혼동 방지 |
| C12 | Mac절대경로 | docs상대경로4종 | 다른기기/저장소 위치에서 같은 입력 사용 |
| C13 | B확정버튼+3열 사실상고정 | 선택A/B·2/3열 실제2~3명비교, 임시B+2열 | 문서만으로 UX효과 확정하지 않음 |
| C14 | 수상작을고르는시점에CSV섞임 가능 | 기본셔플상태와CSV세션구분, P1조건 유지 | 후보복원과2:2:2규칙 충돌 방지 |
| C15 | 사용자당20완성본상한 | 본인목록20개pagination, 생성보호는요청제한 | 불필요한보관상한·개수잠금 복잡도 제거 |
| C16 | ‘올해본몇편’과역대수상이혼동될여지 | 역대관람작선정, 올해관람량은보조문구만 | 원래 개인영화제 범위 보존 |
| C17 | v1.0척도그대로복원할여지 | 버전1.1 분리,3→5자동환산금지 | 의미가다른응답 혼합 방지 |

## 유지한 사항

브랜드·영문·슬로건·근엄한유머·크레용, 기본6부문, 최소3개고유부문, 동일영화복수수상, 사용자최종선정, 실제본영화안내, 로컬초안/완성DB저장, 비공개/공개분리, 공개동의, 읽기전용링크, 소유검증CRUD, 규칙기반결정성, CSV조건부P1, 실제문제만보고.

## 그대로 채택하지 않은 제안과 이유

- **모든 문항에 동의형5개를 일괄 적용하지 않음.** 경험4문항은 빈도5개가 자연스럽고, q4는 요청한 동의형 그대로 사용한다. 내부0~4로 통일한다.
- **12편을 무제약으로 한 번 섞지 않음.** 그 방식은 첫6편이 마니아작품으로 쏠릴 수 있어, 세그룹에서2편씩 뽑고 순서를 섞는다. 새초안무작위/같은초안안정성은 유지한다.
- **A즉시선정/3열을 최종 확정하지 않음.** 실제 비교 후 결정한다. 테스트가 없으면 B+2열을 임시 사용하고 미검증을 표시한다.
- **개인별 결과가 반드시 모두 달라지도록 강제하지 않음.** 동일입력결정성을 지키며 조건별변형·작품명·중복수상관계로 다양성을 만든다. 사용자ID나시간으로 차이를 꾸미지 않는다.
- **보안을 줄여 일정 맞추지 않음.** 인증/RLS/소유권/공개동의/비공개필드차단은 유지, 장식·OG·PNG지원수준을 줄인다.
- **PNG전체성공을 출시필수로 두지 않음.** 실패가계속되면 HTML/URL제한출시와미완료기록. 이미지완료를가장하지 않는다.

## 문서 교차 검토 기준

| 기준 | PRD | SCREEN_CONTENT | CODEX_STEPS |
|---|---|---|---|
| 5단계와VolumeV11 |5/9장|2장|단계2 |
| q≥3,2*q+bonus,동점순서 |5장|4/5장|단계2 |
| 7종×3변형 |5/9장|4장|단계2 |
| 부문순 grand/lifetime/sorry/once/dissent/rescue |3장|3장|단계2~3 |
| 4/4/4→2/2/2 셔플 |4장|3/9장|단계2~3 |
| 후보배열/page 로컬전용 |4/9장|1/9장|단계3 |
| R11실패시HTML/URL정상 |2/11/13장|1/9장|단계1/4/5/8 |
| ownerCRUD/공개snapshot |7~10장|S05~S09|단계1/4 |
| UX미확정·임시B+2열 |11장|8장|단계3/6 |
| 10/21 G1~G3 |13장|9장|단계1 |

이번 검수는 문서의 구조·수치·조건·기대출력 간 정합성을 보는 작업이다. 앱 테스트나 실제 사용자 테스트를 의미하지 않는다.

2026-10-20 문서 검사 결과: v1.0 원본3개 해시 일치, docs의 절대경로0개, 부문별 고유12편·그룹별4편, 특별상7종×3변형, T01~T18, 가상12명의 예상 상·점수 계산을 확인했다. 사용자 테스트·TMDB ID 검증·앱 실행은 하지 않았다.

## 아직 필요한 검증

1. G1: 실제 익명A/B CRUD·RLS·타인거부·공개링크수정불가.
2. G2: 실제 credential의 TMDB 검색/상세, 후보72슬롯의ID·연도·포스터 확인.
3. G3: 배포runtime 한글PNG·폰트·메모리/번들·다운로드.
4. 실제플랜 요청보호·CAPTCHA·사용량/비용한도, 운영자연락처.
5. 친구2~3명 선택A/B·2/3열·친숙도·유머 관찰.
6. 실제CSV샘플은P1진입조건. 샘플없으면 미지원.

## 현실적 착수·출시 판단

명세를 기준으로 **개발 착수 가능**. 시작점은10/21 G1~G3이다. 사용자최종승인과실제기술검증은별개이며, 승인했다고기술위험이사라지는것은아니다.

우선순위: 소유권CRUD/TMDB → 안정적초안·설문·선정 → 결정적HTML결과·동의기반공개URL → 실제모바일/권한회귀·보고서 → 기본PNG → 파일공유/장식 → 동적OG/CSV.

10/27출시고정,10/28내부목표20시제출준비. 가용시간과계정준비가미확인이므로날짜달성을보장하지않는다. PNG미완료는제한출시가능, 보안/CRUD오류는출시불가.

## v1.0 보존 확인

원문3개는 변경하지 않는다. 이번 작업 전 확인한 SHA-256:

```text
방국제_PRD_v1.0.md
2c4a645e57699cc2f68d210646a6627f8d163835e2592b5f0a6e99759cb67664
방국제_화면·콘텐츠명세_v1.0.md
a04d97f9d890801121ecab56f02083f171e9311492d6611ff0c76ebb8e507f62
방국제_Codex_구현프롬프트_v1.0.md
ab52b55abfa34cf57f84629e981d7e0dbf6a36a43db90c76da2df262e359df80
```

앱코드·migration·테스트코드·배포파일은 이번 개정에서 생성하지 않았다.

M5 CAPTCHA 실제 추가 결과: 정상 위젯 승인 성공, 동일 토큰 재사용으로 추가 계정 생성이 허용돼 전체 CAPTCHA 검증 실패. 최근 재검사의 임시 계정 2개 삭제, 운영 해제 증명 해시 동일 확인. 재사용 오류를 assertion이 가리지 않도록 진단 보강, 429/장애는 거부 성공으로 처리하지 않음.
