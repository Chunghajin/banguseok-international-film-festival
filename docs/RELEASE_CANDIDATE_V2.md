# 출시 후보 v2 — 통합·공유 브라우저 회귀 PASS

2026-10-23. 새 브랜치 `feature/release-candidate-v2`, worktree `/private/tmp/banguseok-release-candidate-v2`.

## 공유 품질 게이트 후속 검증 — 2026-10-23

**로컬 공유 브라우저 회귀 PASS, Preview 배포 준비 PASS.** 제품 결함은 발견되지 않아 제품 소스는 수정하지 않았다. 변경은 M6 검사 도구와 이 기록뿐이다. `38e0bae`의 미완료 항목은 화면이 표시되는 별도 프로필 Chrome으로 재실행해 해소했다. 기존 macOS headless 환경에서는 캡처/입력 정지가 있었고, headed Chrome에서는 전체 절차가 완료됐다. headless 정지의 내부 원인까지 확정하지 않는다.

| 실제 컴포넌트 UI 검사 | 결과 |
| --- | --- |
| PNG 생성 → Chrome 파일 다운로드 | PASS, 실제 PNG blob decode·다운로드 파일 1080×1920 확인 |
| 공유 성공 | 모킹된 share Promise resolve 후 성공 메시지·PNG File 전달 확인 |
| AbortError 취소 | 취소 메시지·다운로드 유지·실제 재다운로드 PASS |
| NotAllowedError / 일반 Error | 실패 안내·busy 해제·실제 재다운로드 PASS |
| navigator.share 없음 / canShare=false / canShare 예외 | 공유 버튼 숨김·정상 PNG decode·각 실제 다운로드 PASS |
| 360·390·1280px | 공유 버튼 포함 및 다운로드 대체 상태의 44px 터치 영역·화면 경계·버튼 상호 겹침·결과지와 분리 검사 PASS; 스크린샷 확인 |
| 공개 취소 후 기존 탭 재생성 | PNG404·오래된 다운로드 링크 제거; 이미 받은 HTML은 남음 |
| 공개 취소·삭제 후 새 요청 | production runtime HTML/PNG404·no-store, HTML 수상작 행 없음; 기존 격리 SQL의 공개 취소/삭제 cascade 검사 재실행 |

`npm run verify:m6`는 실제 Next HTTP/Chrome UI 14그룹을 검사한다. Supabase 응답과 Web Share API만 로컬 fixture/mock이며 실제 원격 계정·콘텐츠·증명은 생성하지 않는다. 관리 화면과 공개 화면이 같은 `ShareImageActions`를 사용하는 연결도 확인했다. 공개 결과 화면에서 상호작용을 실행했으며 실제 소유자 관리 화면의 원격 인증 흐름을 새로 실행한 것은 아니다.

전체 자동 테스트134/134(skip0), lint, typecheck, 기본 Turbopack production build 및 `verify:m6:build` 통과. 빌드는 실제 자격 없이 fixture 구성으로 실행했고 배포용 빌드가 아니다. 첫 빌드 시도는 필수 fixture service-role 설정 누락으로 실패했으며, fixture 설정을 완성한 재실행에서 통과했다. 보안 정책/제품 코드 변경은 없었다.

검증 산출물은 Git 제외 `artifacts/m6/{report,production-local,bundle}.json`, `downloads/banguseok-festival.png`, `artifacts/integration/{public-six-*-full,share-actions-*}.png`다. 새 실행마다 다운로드 파일을 지우고 실제 생성된 파일의 크기를 검사해 이전 파일로 통과하지 않도록 했다.

**실기기 확인은 별도:** Web Share 성공·취소·권한 거절은 API 모킹 결과다. 실제 iOS Safari/Android의 HTTPS native 공유 시트, 수신 앱 전달 및 파일 저장은 확인하지 않았다. 기존 Preview 증명을 재사용하지 않으며, 새 Preview 배포·사전 검사와 승인된 실제 E2E가 필요하다. 이번에는 배포/증명/원격 DB 쓰기/다른 브랜치 수정/push를 하지 않았다.

## 이전 실행 기록 (38e0bae 시점)

아래 BLOCKED 설명은 후속 검증 전 기록이다. 현재 판정은 위 후속 검증을 따른다.

## 통합과 원본 보존

- 원본 `feature/release-integration=3adb0e2`, `feature/rolling-candidates=e3ce8b8`는 시작 시 clean. merge-base는3adb0e2이며 후보 개선은 그 위의 단일 커밋이었다.
-3adb0e2에서 새 worktree/브랜치를 만들고 e3ce8b8만 `--no-ff`로 병합했다. merge commit은 `cccc6f25e0471c9b8846b949f90374db6ec07bc0`. 충돌0, 충돌 해결/제품 코드 보완0.
- 제품 소스/보안/DB/PNG/검색 구현은 e3ce8b8과 동일하다. 기존 main·통합·rolling·M5-B·M6·디자인 브랜치와 백업을 수정/삭제하지 않았다. push·main 병합·배포·환경 설정·증명·원격 DB 쓰기는 실행하지 않았다.

## 추천 품질 확인

고정12편/6+6 방식은 현행 실행 경로에서 제거됐다. 과거 배열의 page는 복원 시 보고 있던6편을 옮기는 데만 사용된다. 현재66편 전체에서 고유6편을 재추출하고 직전과 동일한 집합이면 외부1편으로 교체한다. 이미 본 영화는 재등장할 수 있고 이력을 무한 누적하지 않는다. 후보가 바뀌어도 확정작·저장 payload는 유지된다.

관련성은 실제 구현돼 있다. 부문 seed에0.4, 대응 답변(q1 grand/dissent, q2 sorry, q3 once, q4 lifetime, q5 rescue)에 최대0.2, q6 familiar/discovery 힌트에0.2를 더해 전체 가중치는1~1.8이다. 모든 영화는 양수확률이다. 이 연결은 편집 가설이며 취향/작품 수준/타인의 반응을 판정하는 모델은 아니다. 누락이 없어 추가 기능 보완은 하지 않았다.

고정 난수·각 프로필1,000배치(6,000노출) 비교에서 대응 답변0→4의 seed 노출은 grand1449→1580, lifetime1405→1540, sorry1385→1522, once1414→1543, dissent1436→1577, rescue1378→1526이었다. 약한 가중치가 실제 추출 결과에 영향을 주며 전체 풀의 양수확률을 유지함을 확인했다.

실제 TMDB66편을 읽기 전용으로 다시 확인해 제목·원제·연도·포스터 필드 불일치0개. 추천 버튼72회(각 해상도24회)는 추가 API/TMDB0회,61/58/59편 노출, 화면 내 중복/직전 동일 집합0이었다. 로컬 클릭+상태 읽기 최대6/5/4ms로 네트워크 SLA를 뜻하지 않는다. 최초 메타데이터 확인/명시 재시도는 콜드 최대6개 상세 요청이며 검색은 별도 예산을 사용한다. 로딩·503/빈 응답 fallback·재시도, 확정작·대기작·부문 이동·구형 초안 복원도 통과했다.

## 실제 로컬 검증 결과

| 항목 | 결과 |
| --- | --- |
| 전체 자동 테스트 |134/134 PASS, skip0, 격리 PostgreSQL RLS/M5/CAPTCHA/M6 회귀 포함 |
| lint/typecheck/기본 Turbopack production build |PASS; fixture 빌드, 배포용 아님 |
| Chrome 랜딩·설문 |4+7그룹 PASS;360/390/1280px |
| Chrome 추천·선정 |18그룹 PASS;72회 재추출·실제 검색/IME·확정/이동/복원·fallback |
| Chrome 결과·재편집 |24그룹 PASS; 실제 UI3→6부문·세 해상도·긴 제목·포스터 누락 |
| 기존 M2 Chrome |독립 실행15그룹 PASS. 연속 실행의 로컬429는 정책 그대로 두고 별도 실행해 확인 |
| M6 production runtime |7그룹 PASS; PNG200·TTF/WASM trace·platform/무증명/장애503·429·취소/삭제404 |
| M6 실제 HTTP PNG fixture |3/6부문·긴 한국어500자·포스터 누락/6포스터5종 모두200·1080×1920·Pillow 전체 decode PASS |
| 일반 Chrome 공유 UI |생성 클릭→처리 중→PNG 준비/다운로드/이미지 열기/공유 버튼 표시 확인 |
| 일반 Chrome 실제 다운로드 |338,870bytes·1080×1920 파일 확인·전체 decode/한글/포스터 시각 확인 |
| 기존 M6 headless 전체 UI 검사 |**미완료/BLOCKED**: Page.captureScreenshot timeout, 별도 캡처 없는 드라이버도 클릭 후 download link 확인 실패 |

### 확인된 한계와 확정하지 않은 원인

기존 M6 headless 도구의 화면 캡처는 여러 번 timeout됐다. 캡처를 분리한 임시 진단에서는 한 시점에 readyState=loading/React onClick 미준비가 관측됐다. 존재하는 React 속성만 확인하는 기존 준비 조건이 충분하지 않을 수 있으나, 이것만으로 원인을 확정할 수 없다. 경로 사전 로딩·실제 핸들러 준비 대기·포커스·native 입력 등도 전체 headless 검사를 끝내지 못했다. 실패를 PASS로 바꾸거나 제품/보안 기준을 낮추지 않았다. 검증 도구의 실험 변경은 원복했고 임시 진단 파일만 남겼다.

일반 Chrome 연결에서는 동일 제품 코드로 PNG 생성과 실제 파일 다운로드가 성공했다. 브라우저 도구의 download 완료 이벤트는 timeout됐으나, 이번 실행 이후 생성된 `Downloads/banguseok-festival.png`를 실제로 확인·복사·디코딩했다. 따라서 실제 파일 다운로드는 PASS지만 headless10그룹 전체나 native OS 공유 시트·전달·취소/권한거부의 통합 결과까지 PASS라고 확대하지 않는다. 코드 회귀라고도 확정하지 않는다.

**코드 통합과 로컬 사용자 플레이 준비는 PASS. 전체 공유 UI 자동화가 완료되지 않아 새 Preview E2E 전 품질 게이트는 BLOCKED로 보고한다.** 남은 항목은 headless 캡처/상호작용 도구의 안정화 또는 동등한 일반 Chrome의 공유·취소·실패 fallback 검증이다. 현재3adb0e2의 과거 Preview E2E를 새 소스의 E2E 결과로 재사용하지 않는다.

## 사용자 확인 주소

- 앱: **http://127.0.0.1:3133/** — 랜딩/설문/반복 추천/실제 TMDB 검색/로컬 결과/재편집.
- 읽기 전용 합성 공개본/PNG: **http://127.0.0.1:3133/f/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb**. 닉네임 ‘로컬 확인용’의 합성 공개본이며 실제 DB 게시 결과가 아니다.
- loopback에만 바인딩했다. 실제 Supabase 자격은 서버에 전달하지 않으며 mock은 해당 공개본 GET만 허용하고 나머지는503으로 거부한다. 실제 저장/계정 생성/CAPTCHA 검증은 이 환경에서 수행하지 않는다. TMDB 읽기 토큰만 메모리로 사용한다.
- 실행 helper: `/private/tmp/banguseok-rcv2-local.mjs`, PID파일 `/private/tmp/banguseok-rcv2-local.pid`, 로그 `/private/tmp/banguseok-rcv2-local-server.log`. 환경 비밀값은 파일에 쓰지 않았다. 분리 프로세스로 실행해 사용자 테스트용으로 유지한다.
- 증거: Git 제외 `artifacts/rcv2/{relevance,catalog}.json`, `chrome-downloaded.png`, `artifacts/design-de/*checks.json`, `artifacts/m2/browser-checks.json`, `artifacts/m6/*`. 화면 캡처 중단/다운로드 이벤트 실패도 보고서에서 구분했다.

후속 Preview는 별도 승인 후 실제 Preview 환경 변수로 새 빌드·v2 attestation·503/Origin/인증부터 다시 확인해야 한다. 이번에는 Vercel/Production 설정·증명·실제 사용자 데이터를 변경하지 않았다.
