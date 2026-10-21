# G3 — 한글·영화 포스터 PNG 검증

2026-10-20 · 기준: PRD 11.1/13.1, SCREEN_CONTENT S06 및 PNG 실패 분리, CODEX_STEPS 단계 1.

**로컬 기술 검증 성공 / 실제 Vercel runtime 검증 대기**. 명세상 G3 최종 통과에는 배포 runtime에서 생성·시각 확인이 필요하므로 전체 G3나 R11 완료로 기록하지 않는다. 이번 화면은 고정 예시이며 실제 결과지 UI·설문·시상·저장 구현이 아니다. G1·G2 코드와 보안 경계는 바꾸지 않았다.

## 선택: 서버 ImageResponse

| 방식 | 장점 | 비용·위험 | 이번 결정 |
|---|---|---|---|
| 브라우저 DOM→canvas | 화면의 DOM을 재사용 가능, 서버 연산 감소 | 폰트/이미지 decode 완료 대기, CORS와 canvas 오염, 모바일 메모리/DPR·라이브러리 CSS 지원 차이 | 구현하지 않고 문서 검토만 함 |
| 서버 Next.js ImageResponse | 1080×1920 고정, 폰트 파일·이미지 bytes를 명시적으로 제공, 모바일은 완성된 파일만 받음, 기존 명세/의존성 재사용 | Flexbox/CSS 부분집합, 일반 DOM 스크린샷과 차이, 서버 메모리·시간·배포 자산 검증 필요 | MVP 후보로 선택하고 실제 구현/검사 |

같은 `G3Card` JSX와 고정 데이터가 HTML 및 PNG를 만든다. 임의의 HTML/CSS·브라우저 DOM을 그대로 캡처하는 범용 변환기는 아니다. CSS는 Flexbox와 지원되는 인라인 속성으로 제한했다. [ImageResponse 공식 문서](https://nextjs.org/docs/app/api-reference/functions/image-response), [Satori 지원 범위](https://github.com/vercel/satori#css).

## 실행과 화면

```sh
npm ci
npm run dev -- --hostname 127.0.0.1
```

`http://127.0.0.1:3000/dev/png`에서 조건과 작품 수를 선택하고 **PNG 만들기 → PNG 다운로드/이미지 열기**를 사용한다. native 파일 공유는 구현하지 않았다. 링크를 통한 별도 이미지 열기를 모바일 대체 경로로 제공한다.

```sh
npm run verify:g3
npm test
npm run typecheck
npm run lint
npm run build
```

`verify:g3`는 실제 로컬 HTTP와 TMDB 이미지 CDN을 호출하고 `artifacts/g3`에 PNG 및 `report.json`을 저장한다. 원격 URL 지정은 `G3_BASE_URL`로 가능하지만 인증이 필요한 preview에 대한 인증 우회는 제공하지 않는다. 접근 제어를 끄면서 시험하지 않는다.

조건: `text`(포스터 없이 한글 먼저), `posters`(실제 3종 포스터), `missing`(경로 없음), `poster-error`(실제 이미지 404), `font-error`(잘못된 폰트로 실제 변환 실패), `render-error`(강제 생성 오류). 작품 수 3~6만 허용한다. 4~6개는 같은 검증 영화 3종을 반복 배치한 레이아웃 시험이다.

## 폰트·포스터 로딩과 CORS

- 글꼴: 수정하지 않은 나눔고딕 Regular 전체 TTF 4,691,820 bytes. Node에서 `readFile`을 await한 후 renderer에 직접 전달한다. 브라우저의 폰트 로딩 시점은 PNG 생성에 영향을 주지 않는다.
- 브라우저 HTML은 같은 자체 제공 TTF를 `@font-face`로 사용한다. font 파일 HTTP 200과 실제 화면 표시를 확인했다. 브라우저 `document.fonts.ready` 대기를 캡처 전제로 쓰는 클라이언트 변환 방식은 이번에 구현/검증하지 않았다.
- 최초 Google Fonts 2,054,744-byte 파일에는 ①②③ 글리프가 없었고 실제 PNG에서 사라졌다. 전체 TTF로 교체해 문자 매핑과 실제 시각 표시를 확인했다. glyph-tested face SHA-256을 테스트로 고정해 축소판 회귀를 막는다.
- 글꼴의 출처·저작권·OFL 전문은 `public/fonts/README.md`, `OFL-NanumGothic.txt`에 보존했다. [NAVER 배포/재배포 안내](https://hangeul.naver.com/font).
- 포스터는 서버에서 검증된 TMDB 상대 경로만 사용한다. HTTPS `image.tmdb.org/t/p/w500` 고정, redirect 거부, 3초 timeout, 이미지 MIME 및 2MB 상한 검사 후 **전체 bytes를 읽어 data URL로** 제공한다. 요청에 TMDB API token을 넣지 않는다.
- 세 이미지의 로딩이 끝나거나 null fallback으로 결정된 뒤 렌더링한다. 개별 포스터 404/timeout/잘못된 응답은 제목이 있는 카드의 대체 타일로 처리한다. HTML의 원격 이미지 실패도 별도 `onError` 대체 타일로 처리한다.
- 실제 CDN에 localhost Origin 헤더를 보낸 요청은 `Access-Control-Allow-Origin: *`였다. Origin 없는 요청에서는 해당 헤더가 없었다. CDN의 미래 정책을 가정하지 않으며 서버 data URL 방식은 canvas CORS에 의존하지 않는다.
- `ImageResponse`의 스트림까지 `arrayBuffer()`로 끝까지 소비한 후 PNG 200을 반환한다. 스트림 중 오류도 JSON 503으로 분리한다.

실제 포스터: 기생충(496243, 2019), 에브리씽 에브리웨어 올 앳 원스(545611, 2022), 인셉션(27205, 2010). 긴 제목용 별도 스트레스 문구는 TMDB 메타데이터로 사용하지 않는다.

## 실제 생성 파일과 검사

모두 **PNG / 1080×1920**, Pillow로 8개 파일을 끝까지 디코딩해 형식·해상도를 확인했다.

| 파일 | bytes | 포스터·목적 |
|---|---:|---|
| `artifacts/g3/text.png` | 165,295 | 텍스트만 먼저 |
| `artifacts/g3/posters.png` | 455,224 | 실제 3종 포스터 |
| `artifacts/g3/missing.png` | 165,295 | 없는 포스터 대체 |
| `artifacts/g3/poster-error.png` | 165,295 | 실제 CDN 404 대체 |
| `artifacts/g3/posters-4.png` | 540,697 | 4카드 |
| `artifacts/g3/posters-5.png` | 669,282 | 5카드 |
| `artifacts/g3/posters-6.png` | 768,776 | 6카드 |
| `artifacts/g3/posters-production-local.png` | 455,224 | 로컬 production 빌드, preview flag 모사 |

텍스트·포스터·6카드 PNG를 직접 열어 한글 제목/본문/명시적 줄바꿈, 〈〉·“”·—·①②③·&·% 및 긴 제목의 자동 줄바꿈을 확인했다. 원문자 누락은 수정 후 재확인했다. HTML/PNG는 같은 JSX지만 글자 폭·브라우저 안티앨리어싱까지 픽셀 단위로 동일하다고 주장하지 않는다.

증거: `report.json`(로컬 HTTP 11/11, 종료 0), `production-local.json`, `decode-and-glyphs.json`. 글리프와 이미지 전체 디코딩 QA는 임시 Python venv의 FontTools/Pillow로 실행했고 제품 의존성에는 추가하지 않았다.

## HTML과 PNG 실패의 분리

HTML 경로 `/dev/png`는 PNG 생성 API를 호출하지 않고 고정 fixture를 렌더링한다. PNG는 버튼을 눌렀을 때만 `/api/dev/png`에서 별도로 만든다. DB 쓰기나 결과 저장 요청도 없다.

실제 `font-error`, `render-error`에서 PNG 503을 확인하고 각각 HTML을 다시 요청해 200과 HTML 결과 영역 유지를 확인했다. Chrome의 360×800 viewport 시험에서도 생성 실패 메시지와 기존 HTML/포스터 유지가 확인됐다. 스크린샷: `/tmp/banguseok-g3-mobile.jpg`. 이는 실제 휴대전화/Safari 검사가 아니다.

오프라인 검사 **35건 통과 / 실패 0**, typecheck·lint·build 통과. G3 추가 검사는 production gate·입력 범위·이미지 URL/bytes/MIME·실패 fallback·실제 3초 timeout·폰트 파일 회귀를 포함한다. G1/G2의 기존 오프라인 검사도 통과했다. G2 토큰 검사도 유지됐으며 현재 client artifact 52개·개발 로그 1개·HTML/API 6응답에서 실제 token이 검출되지 않았다.

## Vercel과 미검증 위험

로컬에 Vercel 연결 기록/배포 URL이 없어 새 프로젝트나 배포를 만들지 않았다. 배포 runtime 검증은 **미실행**이다.

- 일반 production에서 화면·PNG API는 기본 404다. preview에서만 `G3_PROBE_ENABLED=yes`로 명시적으로 열 수 있다. 실제 배포 시험 전 접근 제한된 preview와 요청 보호/비용 한도를 준비한다. 일반 사용자에게 이 시험 경로를 공개하지 않는다.
- Vercel preview 환경에 설정을 적용하고 권한 있는 브라우저로 `/dev/png`를 열어 텍스트 → 포스터 → 실패 조건을 확인한다. PNG 다운로드를 열어 한글/해상도를 다시 확인해야 G3 배포 검증을 통과할 수 있다. 인증 보호를 해제해서 CLI에 맞추지 않는다.
- Node runtime, `maxDuration=15`, 폰트 파일 tracing 설정을 준비했다. 빌드의 `.nft.json`에 전체 TTF 포함을 확인했고, 로컬 production 빌드에서도 PNG가 생성됐다. 이는 Vercel cold start·메모리·동시 요청·timeout·파일 포함을 실제 확인한 증거가 아니다.
- 공식 ImageResponse 문서의 500KB 번들 안내에 비해 전체 TTF는 4.69MB다. JS import/base64로 번들에 넣지 않고 runtime 파일로 읽지만, 실제 배포의 자산/번들 한도를 통과한다고 보장하지 않는다. 실배포에서 제한에 걸리면 지원 문자를 보존하는 폰트 최적화 또는 로딩 경로 재검토가 필요하다. 임의 사용자 제목을 고정 fixture 문자만으로 subset하지 않는다.
- iOS Safari/Android 실기기 메모리, 파일 다운로드/이미지 열기, 실제 Instagram 업로드는 미검증이다. viewport 시험은 실기기 검사를 대체하지 않는다.
- fixture 밖의 emoji·희귀 한자·모든 유니코드 지원, 사용자별 다양한 길이, 추가 장식, native 공유는 미검증/미구현이다. 이번 고정 예시에서 글리프가 있다는 사실만 모든 사용자 입력을 보장하지 않는다.

PNG가 안정화되지 않으면 PRD대로 HTML/URL 개발을 계속하고 R11은 보류한다.
