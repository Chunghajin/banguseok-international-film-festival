# D+E 실제 앱 이식 진행

기준: feature/design-de / c2f4a7f. 기존 worktree에서만 작업. main·M5-B·M6와 병합/배포하지 않는다.

## 단계와 재개 위치

1. 랜딩 + 공통 타이포그래피·자체 SVG — 완료. Chrome 360/390/1280 및 실제 초안 생성·설문 이동 4그룹 PASS. lint/typecheck PASS. CTA 하단642/650px.
2. 설문 — 완료. E 서류·D 체크, 원문/척도/로컬 상태 유지. Chrome 7그룹(필수응답·복원·3폭·키보드·6문항 이동), lint/typecheck PASS.
3. 영화 선정 — 완료. E 2열·실물 포스터 contain·D 캡션 선택 표시. Chrome 실 TMDB 11그룹 PASS(페이지/배열 복원·한글 검색·IME 이벤트·404 대체·확정/건너뛰기·고정 바 스크롤). 첫 후보262px(360/390). lint/typecheck PASS.
4. 공식 결과 발표 — 완료. E 공식 도록·D 월계관/도장. 실제 3부문 선정→결과→복원→재편집 및 로컬 QA 6부문/긴 제목/404/진입 차단까지 Chrome 21그룹 PASS. lint/typecheck/production build PASS.

원칙: 문항 QUESTIONS, 부문 CATEGORIES, 특별상 규칙과 상태·라우팅·실제 영화 API는 유지한다. 별도 de-design.css에 디자인을 모아 기존 동작 CSS와 구분한다. public/design의 SVG는 자체 제작본이며 폰트는 전체 한글을 지원하는 OFL 로컬 파일이다. 시안 문자만 담긴 폰트·목업 영화 포스터는 이식하지 않는다.

FestivalPaper는 수상 기록과 특별상만 렌더링한다. 저장/관리/공유 조작은 각 페이지가 소유한다. M6의 ShareImageActions는 본문 바깥에 그대로 통합한다.

각 단계 커밋 후 다음 단계로 진행하며 검증 증거는 Git 제외 artifacts/design-de/에 기록한다. 초기 테스트는 누락된 공개 영화 QA fixture 때문에 실패했고, 기존 검증 metadata만 로컬 artifacts/m2에 복사해 재실행한다. 비밀키·실제 사용자 데이터는 복사하지 않는다.

재개 기록: Chrome 검증기의 DOM 직접 직렬화가 초기 false timeout을 만들었다. Boolean 검사로 수정해 재통과했다. 디자인 작업은 공통 스타일·순수 장식만 바꾸며 저장/보안 경로를 변경하지 않는다.

## 최종 검증과 재개 안내

- 랜딩 e1ab307 → 설문 3842fe8 → 영화 선정 4fde3d7 → 결과 단계의 순서로 보존했다. 현재 코드에서 네 단계 모두 구현됐다. 다음 작업은 새 디자인 구현이 아니라 사용자 검토와 M5-B/M6 통합 계획이다.
- 전체 단위·오프라인 회귀108/108 PASS. G1 RLS/접근 제어·G2·M1~M5의 기존 테스트를 포함하며, 실제 Supabase에 쓰기 요청을 한 결과는 아니다.
- 실제 격리 Chrome: 랜딩4, 설문7, 영화 선정11, 결과21 = 43개 단계별 그룹 PASS. 360×800 / 390×800 / 1280×900의 실제 Next.js React 화면을 캡처했다. 개발 오버레이만 캡처 전에 숨겼다.
- 실제 TMDB: 후보 메타데이터·포스터 조회, 한국어 검색 결과 선택, 세 부문 선정과 공식 결과 생성. IME는 Chrome 합성 composition 이벤트이며 실제 모바일 자판 실험은 아니다. 6부문/긴 제목은 기존 검증된 공개 영화 메타데이터로 만든 로컬 QA 초안이다. 이미지 실패는 브라우저의 로컬404를 강제로 발생시킨 사례다.
- G3 기존 로컬 PNG 엔드포인트11/11 PASS. M1 기존 HTTP3개 경로 PASS. G3 PNG 기능 또는 M6 공유 이미지는 수정하지 않았다.
- lint/typecheck PASS. 첫 build는 이 worktree에 Supabase 설정이 없어 G1_CONFIG_MISSING으로 실패했다. 기존 로컬 값 중 필요한6개만 빌드 프로세스 메모리로 전달해 재빌드 PASS. 환경 파일은 복사/생성하지 않았다. 브라우저 산출물24개에서 서버 비밀값 일치0개.
- 실행 근거: artifacts/design-de/{landing,survey,selection,result}-checks.json, final-{tests,lint,types,build}.log, build-checks.json 및 artifacts/g3/report.json. 스크린샷은 같은 폴더의 각 화면-{360,390,1280}[-full].png. 모두 Git 제외다.
- 로컬 확인 URL: http://127.0.0.1:3114 (이 디자인 worktree 전용). /create/survey → /create/awards → /create/review → /create/result. 초안이 없으면 결과 URL에서 복구 안내가 나온다.

## 컴포넌트와 병합 경계

- QUESTIONS(src/lib/survey.ts), CATEGORIES(src/lib/award-catalog.ts), 결정적 특별상/초안 상태/후보 배열/제품 API는 그대로 유지했다. 변경은 실제 React 마크업·별도 de-design.css·로컬 폰트·자체 SVG다.
- FestivalPaper의 PaperData/props는 유지한다. 로컬 미리보기·관리·공개 페이지는 같은 읽기 전용 본문을 사용한다. 저장/소유자/공유 조작은 각 호출 페이지에 남긴다.
- M5-B(2f9d161), M6(7793361)의 변경 파일과 이번 디자인 변경 파일은 현재 직접 겹치지 않는다. package.json/next.config.ts/보안 API/권한 함수/공개 token 페이지/관리 컴포넌트는 변경하지 않았다. 병합 후에는 공통 스타일과 FestivalPaper 주변의 M6 ShareImageActions 배치, 공개 읽기와 소유자 조작 분리를 실제로 재확인해야 한다.
- M6 PNG 디자인은 이 HTML 디자인에 자동 동기화되지 않는다. PNG 코드·렌더링·공유 버튼은 구현/재작성하지 않았다. 운영503도 해제하지 않았다.

## 미검증과 남은 디자인 판단

- Safari/iOS·Android 실기기, 실제 한국어 자판, 전체 스크린리더/WCAG 감사는 미실행이다. 현재 Chrome 키보드·네이티브 라디오·포커스 표시·필수 응답은 확인했다.
- 실제 Supabase 인증/저장/공개URL/수정/삭제, CAPTCHA, Vercel Preview/Production, M6 통합 PNG는 이번에 실행하지 않았다. 기능을 약화해 통과시키지 않았다.
- E 서류 구조의 긴 질문과 긴 결과지는 스크롤이 필요하다. 설문 다음 버튼을 고정하지 않아 마지막 선택지를 가리지 않으며, 영화 확정 바는 선정 대기 중에만 sticky다.
- 향후 편집 문구는 중앙 데이터에서 바꾸고 시안 HTML을 복사하지 않는다. 새 보안 또는 공유 로직을 디자인 컴포넌트 안에 넣지 않는다.
