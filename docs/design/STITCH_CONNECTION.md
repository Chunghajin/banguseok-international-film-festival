# Stitch 연결 및 디자인 탐색

2026-10-22. Google Labs 공식 MCP·SDK를 사용한다. 별도 Stitch 플러그인은 연결된 카탈로그에서 찾지 못해 공식 SDK 경로를 선택했다.

## 실제 확인

- 공식 HTTP MCP endpoint: `https://stitch.googleapis.com/mcp`.
- npm 배포된 공식 `@google/stitch-sdk`는0.3.5였다. GitHub main의0.4.0 문서와 차이가 있어 설치 버전의 타입·실제 tools/list 스키마로 확인했다.
- 직접 공식 MCP 연결에서16개 도구 조회와 인증된 프로젝트 조회 성공. 프로젝트의 내용·타이틀·다른 사용자 정보는 출력하지 않았다.
- Codex CLI0.158.0에 `banguseok_stitch` stdio 서버 등록. 공식 SDK StitchProxy를 실제 MCP 클라이언트로 테스트해17개 도구(프록시 가상 도구 포함) 조회 성공.
- 새 Codex/VS Code 세션에서 등록된 MCP를 사용할 수 있다. 현재 진행 중인 세션에 새 MCP 도구가 자동으로 주입됐다고 주장하지 않으며, 이번 디자인 생성은 같은 공식 SDK로 직접 수행한다.

## 비밀값과 앱 분리

- 키는 사용자가 `.env.stitch.local`에 보관한다. 이 파일은 기존 `.env*` 규칙으로 Git/Vercel 업로드에서 제외된다. 키를 Codex 설정·명령행 인자·소스·보고서에 넣지 않는다.
- `scripts/stitch/mcp.mjs`는 위 파일에서 키를 메모리로 읽어 공식 SDK stdio 프록시를 실행한다. 이 스크립트의 stdout은 MCP 프로토콜 전용이다. 키 파일을 cat하거나 프록시 프로토콜 원문을 로그에 저장하지 않는다.
- SDK는 Git/Vercel 제외 경로인 `artifacts/stitch-tools/node_modules`에만 설치했다. 앱 package.json/package-lock.json·프론트엔드 의존성은 변경하지 않는다.
- 다른 환경에서 재설치할 때: `npm install --prefix artifacts/stitch-tools --no-save --package-lock=false --ignore-scripts --no-audit --no-fund @google/stitch-sdk@0.3.5`. 사용자 키는 별도로 안전하게 설정한다.
- 생성 프롬프트·HTML·스크린샷·비교 미리보기는 `artifacts/stitch-design/`에 둔다. 생성 HTML은 미검수 자료이며 앱으로 복사하거나 실행·배포하지 않는다. 비교 미리보기는 스크린샷만 표시한다.
- Supabase·hCaptcha·RLS·공유 요청 제한·Vercel 환경/배포·공개 결과지·PNG 통합은 변경하지 않는다. 결제/유료 플랜/Cloud Billing/추가 유료 크레딧은 활성화하지 않는다. 결제나 quota 문제가 있으면 통과로 처리하지 않는다.

## 범위와 선택

사용자 최종 지시:3가지 방향×랜딩·설문·후보·결과 화면, 모바일 중심, 진지한 독립국제영화제80%와 손그림·건조한 유머20%. 기준은 [STITCH_BRIEF.md](STITCH_BRIEF.md). 생성 완료 여부·실제 프로젝트 링크·파일은 artifacts/stitch-design/manifest.json과 비교 미리보기에 기록한다. 생성이 끝나기 전 계획을 실제 결과로 표기하지 않는다.

선택 전 앱 프론트엔드를 덮어쓰지 않는다. 선택 후에도 명세 문구·척도·후보·B안 확정 동작·보안/로컬 상태를 유지하는 별도 구현 검토가 필요하다.

## 공식 근거

- [Google Labs Stitch SDK](https://github.com/google-labs-code/stitch-sdk)
- [Stitch MCP 설정](https://stitch.withgoogle.com/docs/mcp/setup)
- [Codex MCP 설정](https://developers.openai.com/codex/mcp/)
- [Google의 DESIGN.md 소개](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/)
