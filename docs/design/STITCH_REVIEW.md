# 방국제 Stitch 시안 비교

2026-10-22. **3방향×4화면,12개 생성 완료. 기존 앱 미적용.**

[화면 전환 비교 미리보기](../../artifacts/stitch-design/index.html) · [랜딩 비교 스크린샷](../../artifacts/stitch-design/compare-landing-1440.png) · [결과 비교](../../artifacts/stitch-design/compare-result-1440.png)

| 방향 | 특징 | Stitch | 디자인 시스템 |
| --- | --- | --- | --- |
| A 공식 도록 | 명조 슬로건·여백·얇은 괘선. 가장 절제된 인상 | [프로젝트](https://stitch.withgoogle.com/projects/3198517924477446615) | [DESIGN.md](../../artifacts/stitch-design/a/DESIGN.md) |
| B 집행위원회 공보 | 이중 프레임·문서 위계·작은 도장. 1인 집행위의 건조한 유머 | [프로젝트](https://stitch.withgoogle.com/projects/17420210123242644123) | [DESIGN.md](../../artifacts/stitch-design/b/DESIGN.md) |
| C 개막 포스터 | 큰 숫자1·비대칭 표제·버건디 대비. 가장 강한 첫인상 | [프로젝트](https://stitch.withgoogle.com/projects/7888252977364024473) | [DESIGN.md](../../artifacts/stitch-design/c/DESIGN.md) |

Stitch 프로젝트는 키를 발급한 Google 계정으로 접근해야 할 수 있다. 별도 공개 사이트나 서비스로 게시하지 않았다.

## 화면 원본

| 시안 | 랜딩 | 설문 | 영화 선택 | 결과 발표 |
| --- | --- | --- | --- | --- |
| A | [PNG](../../artifacts/stitch-design/a/landing.png) | [PNG](../../artifacts/stitch-design/a/survey.png) | [PNG](../../artifacts/stitch-design/a/selection.png) | [PNG](../../artifacts/stitch-design/a/result.png) |
| B | [PNG](../../artifacts/stitch-design/b/landing.png) | [PNG](../../artifacts/stitch-design/b/survey.png) | [PNG](../../artifacts/stitch-design/b/selection.png) | [PNG](../../artifacts/stitch-design/b/result.png) |
| C | [PNG](../../artifacts/stitch-design/c/landing.png) | [PNG](../../artifacts/stitch-design/c/survey.png) | [PNG](../../artifacts/stitch-design/c/selection.png) | [PNG](../../artifacts/stitch-design/c/result.png) |

## 실제 확인과 한계

- 공식 MCP16개 도구·인증 프로젝트 조회, Codex stdio 프록시17개 도구 조회 통과. 키는 Codex 설정에 없으며 생성 자료/도구/문서66개 파일에서도 일치0개였다.
- 모든 화면은 PNG780px 폭. 실제 높이·파일 크기는 [verification.json](../../artifacts/stitch-design/verification.json)에 기록했다. 초기 썸네일을 단순 확대하지 않고 공식 이미지 크기 옵션으로 다시 받았다.
- Chrome1440×1100/390×844에서 비교 페이지의 화면4종 전환·이미지 로딩·가로 넘침·포커스를 확인했다. 제품 기능이나 생성 HTML의 접근성 통과를 의미하지 않는다.
- 설문3개의 q2 원문·5개 빈도 선택지, 후보6개 제목·2열·확정 버튼, 결과의 미게시 표기·특별상·원문 심사평을 확인했다. 결과에 PNG/PDF 저장·게시 완료 표시는 탐지되지 않았다.
- 초기 랜딩의 중복 브랜드명·불필요한 정보·미측정 소요시간을 Stitch에서 한 차례 보정했다. 초기안은 landing-initial 파일로 보존했다.
- **일부 회차·연도·영문 약어·추가 문구·문서 번호는 모델이 만든 장식이다. 최종 문구로 채택하지 않는다.** 새 상·강제 선정·가짜 인증이나 역사를 뜻하는 표현은 실제 구현 전에 기존 명세로 교정한다.
- **포스터는 Stitch의 목업 이미지이며 실제 TMDB 자산 연결 검증이 아니다.** 실제 구현에서는 기존 TMDB 경로와 대체 UI를 유지한다.
- 실제 Stitch 테마는 시안별 stitch-theme.json에, 스타일 제안은 DESIGN.md에 기록했다. 색·간격 기준은 제안이며 자동 WCAG 통과를 뜻하지 않는다.
- src·앱 package/lockfile·next.config 변경0. Supabase/hCaptcha/RLS/요청 제한/Vercel 변경 없음. commit/push/서비스 배포·유료 플랜 활성화 없음.
- npm run lint 통과. 모델 출력 HTML을 앱에 실행하거나 전체 앱 회귀 테스트를 다시 수행하지 않았다.

## 사용자가 정할 것

1. 주 방향 A/B/C.
2. 랜딩과 결과지를 다른 방향으로 조합할지 여부.
3. 결과지의 월계관·도장을 현재 정도로 둘지 더 절제할지.

선택 전 프론트엔드 적용은 진행하지 않는다. [브랜드 브리프](STITCH_BRIEF.md) · [연결 설명](STITCH_CONNECTION.md).
