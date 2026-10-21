# M1·M2 모바일 UI 정리

2026-10-21 · 기존 기능을 유지한 화면 개선. PRD/SCREEN_CONTENT/CODEX_STEPS v1.1의 문항·선택지·부문·후보·점수·선정/복원 규칙은 변경하지 않았다.

## 변경 내용

- 랜딩: 아이보리·명조·버건디·기존 슬로건을 유지했다. ‘나 혼자 여는 국제영화제’라는 짧은 안내, 좁힌 여백, 큰 두 번째 슬로건 행으로 콘셉트를 강조했다. 정적 결과 예시의 ‘예시’ 표시를 유지하고 이중 구분선·작은 기존 도장으로 도록 느낌을 보완했다. 오래된 ‘영화 선정 준비 중’ 안내를 현재 로컬 선정 구현 상태에 맞게 정정했다.
- 설문: 문항/선택지 데이터와 폼 동작은 그대로다. 질문 행간을 다듬고 선택지 최소 높이를 56→60px, 간격을 8→10px로 조정했다. native radio의 파란 테두리 대신 선택지 전체 바깥에 별도 파란 포커스 링을 표시해 버건디 선택 상태와 구분한다. 이전/다음은 일반 문서 흐름에 있어 마지막 선택지를 가리지 않는다.
- 영화 선정: 상단 여백·설명/안내 크기를 압축했다. 기존 전체 너비 검색 버튼을 후보 도구줄의 작은 ‘직접 검색’ 보조 링크로 바꿨다. 접근 이름 ‘영화 제목으로 직접 검색’과 기존 검색 기능은 유지했다. 열면 검색 입력에 포커스, 닫으면 링크로 포커스를 복귀시킨다.
- 후보 카드: 2열·2:3 비율을 유지하고 제목/연도 간격을 조정했다. ‘선택됨’/‘수상작’ 체크 배지를 포스터 위에 표시해 선택 시 카드 높이가 변하지 않게 했다. 이미지 실패 타일도 같은 크기를 유지한다.
- 수여 영역: 선정 전에는 비활성 버튼이 고정돼 화면을 차지하지 않는다. pending/확인 중에만 짧은 고정 영역을 사용하고 ‘선정 대기’, 전체 제목·연도와 ‘이 작품에 수여’를 표시한다. 후보/검색 결과의 스크롤 여유를 확보했다. 확정작·pending·최소 3부문 계산과 버튼 동작은 그대로다.
- 완료: 작은 ‘선정 완료’ 도장, 부문 → 영화 제목 → 연도의 계층, 부문별 접근 이름이 있는 ‘변경’ 링크를 적용했다. ‘다음은, 공식 결과지.’와 준비 중 안내를 명시했다. 동작하지 않는 결과지 버튼이나 M3 기능은 추가하지 않았다.

## 실제 측정 비교

실제 Google Chrome headless, 격리된 임시 프로필, 360×800 CSS px에서 측정했다. UI 비교 실행에만 난수 seed 42를 주입해 동일 후보 순서를 사용했다. 앱의 난수/초안 생성 로직은 변경하지 않았다. 대상 부문(grand), 미선정·page0·저장 오류 없음·스크롤 상단 기준이다.

| 항목 | 이전 | 이후 |
| --- | ---: | ---: |
| 첫 포스터의 문서 위쪽 위치 | 497px | **319px** |
| 첫 포스터 너비 | 154px | 154px |
| 미선정 수여 영역 높이 | 126px | 50.5px |
| 미선정 수여 영역 배치 | sticky | **일반 흐름** |
| 설문 선택지 최소 높이 | 56px | **60px** |

첫 포스터는 **178px 위**에서 시작한다. 검색을 열었을 때 입력은 화면 위에서 311px, 높이 54px로 측정됐다. 부문 이름 길이·기존 확정작·저장 경고가 있으면 위치는 달라진다. 이는 배치 측정이며 네트워크 로딩 속도 개선을 뜻하지 않는다.

## 변경 전후 스크린샷

| 화면 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 랜딩 360×800 | [이전](../artifacts/ui-polish/before/landing-360.png) | [이후](../artifacts/ui-polish/after/landing-360.png) |
| 설문 선택·포커스 | [이전](../artifacts/ui-polish/before/survey-focus-360.png) | [이후](../artifacts/ui-polish/after/survey-focus-360.png) |
| 첫 후보 | [이전](../artifacts/ui-polish/before/grand-candidates-360.png) | [이후](../artifacts/ui-polish/after/grand-candidates-360.png) |
| 검색·선정 대기 | [이전](../artifacts/ui-polish/before/search-360.png) | [이후](../artifacts/ui-polish/after/search-360.png) |
| 완료 | [이전](../artifacts/ui-polish/before/review-360.png) | [이후](../artifacts/ui-polish/after/review-360.png) |
| 데스크톱 후보 1280×900 | [이전](../artifacts/ui-polish/before/candidates-1280.png) | [이후](../artifacts/ui-polish/after/candidates-1280.png) |

데스크톱 랜딩·설문·완료도 각 before/after 폴더의 `*-1280.png`에 있다. 변경 전 첫 후보 캡처의 두 번째 이미지는 로딩 중이었다. 변경 후 캡처는 앞 두 이미지의 완료와 브라우저 페인트를 기다렸다. 두 경우 레이아웃 공간은 동일 비율로 예약돼 있다.

## 실행한 검증

- `npm test`: **59/59 통과**. G1/G2/G3/M1/M2의 기존 테스트 포함. 실제 Supabase 쓰기 실검증은 아님.
- `npm run lint`, `npm run typecheck`, `npm run build`: 모두 통과.
- `npm run verify:m1`: 기존 3경로 HTTP 검사 통과.
- `npm run verify:g2:secrets`: 브라우저 artifact 89개·개발 로그 1개·기존 HTML/API 응답 6개에서 실제 토큰 문자열 미검출.
- Chrome UI 회귀: 변경 전 16그룹, 변경 후 **23그룹 통과**. 모바일 360×800과 데스크톱 1280×900에서 확인했다.

브라우저 검사는 키보드 방향키 응답·포커스, 설문 이전/다음·새로고침 복원, 미응답 건너뛰기, 두 후보 페이지/순서 복원, pending·확정작 복원, 실제 TMDB 한국어 검색 선택, 수상작 변경·건너뛰기 취소, 3부문 완료를 포함한다. 실제 Chrome에 IME 이벤트와 키 입력을 주입했다. 검색 열기/닫기의 포커스 이동도 확인했다.

마지막 설문 선택지, 후보 카드, pending 상태의 마지막 카드 및 마지막 검색 결과를 실제 스크롤한 뒤 히트 테스트/사각형 측정으로 가림 여부를 확인했다. 이 검사 위치에서는 가려지지 않았다. [마지막 후보와 수여 영역](../artifacts/ui-polish/after/pending-last-card-360.png)을 보존했다. 모든 스크롤 위치에서 겹침이 전혀 없다는 뜻은 아니며 pending 영역은 의도적으로 sticky다.

이미지 오류 이벤트·검색 429/0건은 오류 주입 검사다. 이미지 대체 전후 높이 일치와 확정작/page 보존을 확인했다. 실제 TMDB 검색/상세 성공과 구분해 기록한다. 결과 JSON과 위치 측정은 각 폴더의 `browser-checks.json`, `ui-measurements.json`에 있다.

재실행:

```sh
# 개발 서버 실행 상태에서, 현재 UI를 검사하고 별도 증거 폴더에 기록
UI_PHASE=after M2_ARTIFACT_DIR=artifacts/ui-polish/after npm run verify:m2:browser
```

현재 코드에서 before 모드로 실행해도 이전 UI를 재현하지는 않는다. 이번에 보존한 before 파일은 실제 수정 전에 캡처한 증거다.

## 변경 파일과 제한

- `src/app/(festival)/page.tsx`
- `src/app/(festival)/festival.css`
- `src/app/(festival)/create/awards/[category_id]/picker.tsx`
- `src/app/(festival)/create/review/review.tsx`
- `scripts/m2/browser.mjs`: 기존 러너에 선택적 UI 증거 폴더·측정·모바일/데스크톱 검사 추가
- `artifacts/ui-polish/{before,after}/`, 이 문서, README·CHANGELOG·problem-log

API·RLS·서버 인증·운영 보호·후보/설문 데이터·저장 모델·의존성·환경변수는 변경하지 않았다. production 영화 API의 기존 보호 미확인 503 게이트도 유지한다.

실제 iOS/Android와 OS 한국어 키보드, 가상 키보드가 열린 상태, VoiceOver/TalkBack, 모든 화면 크기·모든 긴 제목 조합, 실제 사용자 비교 시험·Vercel 배포는 미검증이다. 이번 작업에서 G1 실제 DB 쓰기와 G3 PNG 전체 검증을 재실행하지 않았다. M3 특별상·결과지·DB 공개·PNG 통합은 추가하지 않았다.
