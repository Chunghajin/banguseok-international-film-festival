# 출시 후보 통합 — M5-B + M6 + D/E

통합 브랜치 `feature/release-integration`, 기존 main(cf51cf0)을 기준으로 새 worktree에서 작업했다. 위치: `/Users/chunghajin/Desktop/Banguseok-preservation-20261022-200249/worktrees/release-integration`.

## 보존과 병합

| 순서 | 원본 | 통합 merge commit |
| --- | --- | --- |
| 1 | feature/m5-b-v2 / 2f9d161 | e68b987 |
| 2 | feature/share-image / 7793361 | 4a287c9 |
| 3 | feature/design-de / c65d83c | 9f7705d |

충돌은 없었다. package.json은 Git이 자동 병합했으며 verify:m5:preview, verify:m6, verify:m6:build를 모두 보존했다. main과 세 원본 worktree의 HEAD·Git 상태·파일586개를 전후 비교해 동일함을 확인했다. 원래 main의 미커밋 사본도 그대로다. merge/rebase/push/배포를 원본 브랜치에 실행하지 않았다.

## 실제 통합된 동작

- D+E 실제 React 랜딩·설문·후보 선정·결과지, 실제 TMDB 검색/상세/포스터, 로컬 초안 복원·수정 흐름을 유지한다. QUESTIONS/CATEGORIES/점수/선정/최소3부문 규칙은 바꾸지 않았다.
- 로컬 결과에서 먼저 비공개로 저장하고, 소유자 관리 화면에서 명시적으로 공개 링크를 만든다. PNG는 기존 M6 정책대로 **공개 스냅샷만** 사용한다. 로컬 초안이나 비공개 저장본을 바로 이미지로 보내는 우회 경로는 추가하지 않았다.
- 결과 미리보기에 저장→공개 링크→이미지 저장 안내를 추가했다. 공개 결과와 내 영화제의 M6 작업 영역을 D+E 편집 스타일로 정리했다. 생성·다운로드·native share를 별도 제스처로 유지하며 실패해도 HTML은 유지한다.
- PNG는 기존1080×1920 레이아웃과 전체 텍스트 fitting을 유지한다. 버건디 괘선·실제 HTML과 같은 자체 월계관을 적용하고 포스터를 contain으로 표시한다. 월계관은 고정 로컬 파일만 읽어 data URI로 넣으며 next.config tracing에 포함한다. 임의 이미지 URL이나 클라이언트 결과 JSON을 받지 않는다.
- HTML은 기존 D+E 명조, PNG는 Satori가 지원하는 기존 G3 전체 한글 TTF/나눔고딕이다. 시안용 폰트 서브셋이나 미지원 WOFF2를 PNG에 강제로 넣지 않았다.
- 사용자 공개 동의·owner/session·RLS·Origin·hCaptcha·공유 DB budget·fingerprint·503 코드는 M5-B 원본과 동일하다. 공개 PNG HTTP 권한/허용목록/렌더링 후 재조회 코드는 M6 원본과 동일하다. SQL/migration/데이터 모델 변경 없음.

## 검증 구분

| 검사 | 실제 결과 | 범위 |
| --- | --- | --- |
| npm test | 129/129 PASS | 로컬 단위/오프라인/SQL RLS/HTTP test doubles |
| npm run lint / typecheck | PASS | 통합 코드 전체 |
| npm run build | PASS, 기본 Turbopack | **로컬 fixture 환경 변수**로 빌드, 배포용 증명 아님 |
| D+E Chrome | 43개 그룹 PASS | 360×800·390×800·1280×900, 실제 React 및 실제 TMDB |
| M6 HTTP/Chrome | 10개 그룹 PASS | 로컬 Supabase fixture + 실제 Next PNG + 실제 Chrome 파일 다운로드 |
| M6 production runtime | 7개 그룹 PASS | next start + 로컬 DB/budget fixture, Vercel 실검증 아님 |
| 기존 G3 | 11/11 PASS | 기존 로컬 PNG endpoint 및 오류/HTML 유지 |
| 기존 M1 HTTP | 3/3 PASS | 랜딩·설문·선정 HTTP/한국어/landmark |
| 실제 Preview 증명 조회 | 전후0개 | 실제 Supabase에 GET만, 쓰기0 |
| 비밀값 검사 | 일치0 | 추적/업로드 대상 소스와 production/development 브라우저 산출물 |

단위 테스트 수: 현재 main 기준108개 + M5-B의 m5-preview6개·m5-stability8개 + M6의7개 =129개다. 기존 테스트 삭제·skip으로 개수를 맞추지 않았다. D+E의43그룹은 node:test 수와 별도의 브라우저 검사다. M6 HTTP/Chrome은 기존8그룹에 통합 공개페이지와 이미지 버튼의3폭 검사2그룹을 보강했고, production runtime은 기존6그룹에 ‘증명 없음503’1그룹을 보강했다.

### 확인한 사용자 흐름

- 실제 설문6문항 → 실제 후보 API/포스터 → 한국어 검색·IME composition 이벤트 → 선택 대기·확정 →3부문 결과 → 새로고침·설문 재편집.
- 후보2페이지·배열 보존, 건너뛰기와 미방문 구분, 하단 확정 바 위 마지막 카드 접근, 로컬404 이미지 대체의 크기 유지.
- 실제 검증 영화 메타데이터로 구성한 로컬6부문/긴 제목 QA 초안, 제목과 포스터 caption 간격·월계관 표제 폭·가로 넘침 검사. 6부문 QA는 실제 DB 게시 결과라는 뜻이 아니다.
- 로컬 공개 스냅샷 fixture의3/6부문·500자 stress title·누락 포스터 PNG 생성, Chrome decode로1080×1920 확인, 실제 PNG 파일 다운로드.
- Web Share에 PNG File 전달·성공·취소·권한 거절·미지원·canShare 예외는 **브라우저 API test double**이다. 실패 후 실제 fallback 다운로드도 검사했다. 실제 휴대전화 share sheet는 미검증이다.
- 로컬 production의 잘못된 플랫폼 요청503, 증명 없음503, 초과429/Retry-After, budget 장애503, 공개 중단/삭제404/no-store·조건부 요청에서도 과거 PNG 미반환. 느린 생성 중 취소·갱신은 기존 M6 단위 회귀로 검증했다.
- 다운로드 완료된 파일은 공개 중단으로 회수할 수 없다. 기존 UI의 안내를 유지했다.

## 화면과 PNG

| 화면 | 모바일 | 데스크톱 |
| --- | --- | --- |
| 랜딩 | [390px](../artifacts/design-de/landing-390-full.png) | [1280px](../artifacts/design-de/landing-1280-full.png) |
| 설문 | [390px](../artifacts/design-de/survey-390-full.png) | [1280px](../artifacts/design-de/survey-1280-full.png) |
| 영화 선정 | [390px](../artifacts/design-de/selection-390-full.png) | [1280px](../artifacts/design-de/selection-1280-full.png) |
| 로컬 결과 | [390px](../artifacts/design-de/result-390-full.png) | [1280px](../artifacts/design-de/result-1280-full.png) |
| 공개 결과 fixture | [390px](../artifacts/integration/public-six-390-full.png) | [1280px](../artifacts/integration/public-six-1280-full.png) |
| PNG 작업 영역 | [390px](../artifacts/integration/share-actions-390.png) | [1280px](../artifacts/integration/share-actions-1280.png) |

360px도 같은 폴더에 있다. [3부문 PNG](../artifacts/m6/three.png), [6부문 PNG](../artifacts/m6/six-posters.png), [production 로컬 PNG](../artifacts/m6/production-local.png). 모든 증거는 Git/Vercel 제외 artifacts에 있다. 공개 HTML 예시는 로컬 fixture이며 실제 게시 URL이나 실제 사용자 자료가 아니다. 포스터·영화 ID·연도는 검증된 G3 메타데이터로 일치시켰다. 누락 포스터와500자 제목은 명시적 테스트 조건이다.

로컬 UI: `http://127.0.0.1:3117`. 이 확인용 서버는 TMDB 토큰만 메모리로 받고 Supabase는 로컬 fixture 주소를 사용한다. fixture 테스트 서버는 검사 종료 시 닫으므로 이 URL에서 실제 DB 저장·공개가 된다고 해석하지 않는다. 원격 가입·쓰기를 실수로 실행하지 않기 위한 검증 환경이며 제품 코드의 보호 정책을 바꾼 것이 아니다.

## Preview 준비 판정

**코드·로컬 검증 기준, 보호된 Preview 배포 준비 PASS. 실제 서비스 개방은 BLOCKED.** 배포는 이번에 실행하지 않았다. Production/GitHub/main/기존 Preview 설정 변경 없음.

- 실제 Supabase Preview 증명은 GET으로 전후0개를 확인했고 등록·철회·계정 생성·DB 쓰기를 실행하지 않았다. 운영503을 유지한다. ‘로컬 production fixture 통과’를 실제 검증 증명으로 등록하지 않는다.
- 배포 실행 전 연결 프로젝트/target=preview/Authentication 보호, 실제 hostname·hCaptcha·APP_ALLOWED_ORIGINS·Preview 환경 변수와 새 통합 빌드의 정합성을 기존 M5-B 절차로 재확인한다. 이번에는 Vercel 콘솔 설정을 새로 검사하거나 변경하지 않았다.
- 현재 .next는 fixture 값으로 만든 검증 산출물이다. 이것을 prebuilt 배포하지 않는다. 후속 승인된 Preview는 실제 Preview 환경 변수로 새로 빌드해야 한다.
- 후속 승인 범위에서 실제 Preview의 CAPTCHA·A/B 소유권·게시/갱신·공개 중단/삭제·PNG·budget/fingerprint와 Vercel 함수 폰트/SVG/WASM·cold start·30초/메모리 한계를 확인한다. 그 전에는 공개 서비스 준비 완료가 아니다.
- iOS/Android 실제 브라우저 및 native share sheet, 전체 접근성 감사는 미검증이다. 극단적500자 제목은 PNG 글씨가 작아진다.

근거: artifacts/integration의 로그·audit.json·isolation-before.json·evidence-before/after.json, artifacts/m6/report.json·production-local.json·bundle.json, artifacts/g3/report.json, artifacts/design-de/*-checks.json.
