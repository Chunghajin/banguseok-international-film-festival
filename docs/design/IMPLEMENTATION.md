# D+E 실제 앱 이식 진행

기준: feature/design-de / c2f4a7f. 기존 worktree에서만 작업. main·M5-B·M6와 병합/배포하지 않는다.

## 단계와 재개 위치

1. 랜딩 + 공통 타이포그래피·자체 SVG — 완료. Chrome 360/390/1280 및 실제 초안 생성·설문 이동 4그룹 PASS. lint/typecheck PASS. CTA 하단642/650px.
2. 설문 — 대기.
3. 영화 선정 — 대기.
4. 공식 결과 발표 — 대기.

원칙: 문항 QUESTIONS, 부문 CATEGORIES, 특별상 규칙과 상태·라우팅·실제 영화 API는 유지한다. 별도 de-design.css에 디자인을 모아 기존 동작 CSS와 구분한다. public/design의 SVG는 자체 제작본이며 폰트는 전체 한글을 지원하는 OFL 로컬 파일이다. 시안 문자만 담긴 폰트·목업 영화 포스터는 이식하지 않는다.

FestivalPaper는 수상 기록과 특별상만 렌더링한다. 저장/관리/공유 조작은 각 페이지가 소유한다. M6의 ShareImageActions는 본문 바깥에 그대로 통합한다.

각 단계 커밋 후 다음 단계로 진행하며 검증 증거는 Git 제외 artifacts/design-de/에 기록한다. 초기 테스트는 누락된 공개 영화 QA fixture 때문에 실패했고, 기존 검증 metadata만 로컬 artifacts/m2에 복사해 재실행한다. 비밀키·실제 사용자 데이터는 복사하지 않는다.

재개 기록: Chrome 검증기의 DOM 직접 직렬화가 초기 false timeout을 만들었다. Boolean 검사로 수정해 재통과했다. 디자인 작업은 공통 스타일·순수 장식만 바꾸며 저장/보안 경로를 변경하지 않는다.
