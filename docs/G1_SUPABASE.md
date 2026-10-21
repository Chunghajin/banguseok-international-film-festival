# G1 — Supabase 익명 소유권·CRUD 검증

> 2026-10-21 후속: 아래는 G1 당시 기록이다. M4에서 공통 코어를 `src/lib/supabase-core.mjs`로 옮기고 제품용 서버 검증·HttpOnly 세션·소유자/공개 화면을 연결했다. scripts/g1/client.mjs는 같은 코어의 재수출이다. 기존 SQL은 수정·재적용하지 않았다. 현재 상태는 [M4](M4.md) 참고.

상태: **실제 Supabase CLI 10/10 통과** (2026-10-20). 아래 초기 준비 당시 기록과 구분한다. 제품용 API·운영 보호까지 완료한 상태는 아니다.

이번 작업은 G1에 한정한다. PRD 7~9장 및 SCREEN_CONTENT S05~S09의 소유권 경계를 유지한다. 제품용 API·브라우저 세션 보관/갱신·전체 UI는 아직 연결하지 않았다. G2·G3·전체 결과 알고리즘도 구현하지 않았다.

## 구현한 경계

| 경로 | 권한 |
|---|---|
| 익명 Auth 세션 생성 | 이메일/비밀번호 없이 Auth signup 호출. 검증 스크립트에서 A/B를 각각 생성 |
| 사용자 직접 원본 조회 | `authenticated` 역할, `owner_id = auth.uid()` RLS로 본인만 조회 |
| 사용자 직접 쓰기 | 본인도 INSERT/UPDATE/DELETE 불가. 권한 회수 + 쓰기 RLS 정책 없음 |
| 사용자 직접 RPC·공개 테이블 조회 | 미인증/인증 사용자 모두 불가 |
| 서버 저장·수정·공개 | Auth `/user`로 bearer 검증 → 검증한 ID를 owner로 전달 → service role 전용 RPC |
| 서버 삭제 | 검증된 owner + ID + revision의 단일 DELETE, 공개본 cascade |
| 서버 공개 조회 | token 조건으로 `public_snapshot`만 SELECT. 사용자 인증 없이 결과 읽기 가능. token은 수정 권한이 아님 |

Supabase 익명 사용자는 `anon`이 아니라 `authenticated` 역할이다. [공식 익명 인증 문서](https://supabase.com/docs/guides/auth/auth-anonymous). 브라우저 직접 쓰기를 허용하면 PRD 9.3과 충돌하므로 그렇게 변경하지 않았다. RLS뿐 아니라 테이블/RPC 권한 회수와 서버 소유 검사를 함께 사용한다. [공식 RLS 문서](https://supabase.com/docs/guides/database/postgres/row-level-security).

Node 전용 `scripts/g1/client.mjs`는 기술 검증 도구다. 실제 사용자 요청을 받는 Route Handler가 아니며 `src/app`에서 가져오지 않는다. `save()`의 입력은 검증 스크립트가 만든 합성 fixture만 사용한다. 클라이언트가 보낸 `owner_id`·result를 받는 제품 API로 노출해서는 안 된다.

## 사용자가 직접 할 순서

1. Supabase에서 **테스트 전용 프로젝트**를 만들고 DB 준비가 끝날 때까지 기다린다. 실제 사용자 데이터가 있는 프로젝트에는 이 검증을 실행하지 않는다.
2. Authentication의 Sign In / Providers 설정에서 **Allow anonymous sign-ins**를 활성화한다. 기존 CAPTCHA·보호 설정은 끄지 않는다. 프로젝트의 익명 가입 한도/사용량/비용 한도도 확인한다.
3. SQL Editor의 새 쿼리에 `supabase/migrations/202610200001_g1.sql` **전체 내용**을 붙여 넣고 한 번 실행한다. SQL은 트랜잭션이며 기존 테이블을 지우지 않는다. 같은 이름의 schema/table/function이 이미 있으면 중단되므로, 재실행 오류를 해결하려고 기존 데이터를 삭제하지 않는다. 이 프로젝트에 다른 구현이 있으면 먼저 충돌을 검토한다.
4. Project Settings / API Keys에서 프로젝트 URL, publishable key, **legacy `service_role` JWT**를 확인한다. 이 도구는 `SUPABASE_SERVICE_ROLE_KEY`를 bearer로 쓰므로 이 칸에 새 `sb_secret_...` 키를 대신 넣지 않는다. 공개 키 칸에는 `sb_publishable_...` 또는 legacy `anon` 키가 가능하다. 키 유형은 [공식 API key 문서](https://supabase.com/docs/guides/getting-started/api-keys)를 참고한다.
5. 프로젝트 루트에서 다음을 실행한다. `.env.local`이 이미 있다면 복사하지 말고 기존 파일을 편집한다.

   ```sh
   cp .env.example .env.local
   npm ci
   ```

6. `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`에 해당 값을 로컬 편집기로 입력한다. TMDB 항목은 빈 값으로 둔다. 비밀 키를 채팅·소스·스크린샷·명령행 인수에 붙이지 않는다. `.env.local`은 `.gitignore`로 제외된다.
7. CAPTCHA가 활성화된 프로젝트라면, 설정한 제공자의 정상 위젯에서 받은 서로 다른 1회용 토큰을 `G1_CAPTCHA_TOKEN_A/B`에 준비해야 한다. 이 작업은 CAPTCHA 위젯을 구현하지 않았으므로 **유효한 토큰을 준비할 수 없으면 익명 Auth 실검증은 보류**한다. 검증을 통과시키려고 CAPTCHA를 끄거나 우회하지 않는다. 토큰은 짧게 만료되므로 실행 직전에 설정하고 실행 후 지운다. CAPTCHA가 없는 새 검증 프로젝트의 기본 설정에서 테스트한 결과는 CAPTCHA 검증 완료로 간주하지 않는다.
8. 아래 명령을 실행한다. 첫 명령은 오프라인 검사, 두 번째가 **실제 Supabase 요청과 테스트 데이터 생성·변경·삭제**다. 서버를 켤 필요는 없다.

   ```sh
   npm test
   G1_ALLOW_TEST_WRITES=yes npm run verify:g1
   ```

9. `PASS/FAIL` 출력과 종료 코드를 확인한다. **종료 코드 0만 전체 실검증 성공**, 1은 실패, 2는 설정/실행 조건 미충족으로 미실행이다. 도구는 세션·키·공개 token·응답 원문을 출력하지 않는다. 출력에는 Supabase URL/키를 덧붙이지 않는다.
10. 정리 실패 메시지가 없었는지 확인한다. 도구는 `finally`에서 이번 실행의 owner+draft 기록과 새로 생성한 익명 A/B 사용자만 정리한다. 강제 종료/네트워크 장애로 실패하면 Dashboard의 테스트 프로젝트에서 `G1` 합성 기록과 해당 익명 사용자가 남았는지 확인한다. 다른 사용자 데이터는 삭제하지 않는다. 실제 사용자 데이터가 있는 프로젝트에서는 실행 자체를 하지 않는다.

## SQL 적용 후 확인 쿼리

SQL Editor에서 아래 결과를 확인한다. 원본·세션 값은 출력하지 않는다.

```sql
-- 두 행 모두 relrowsecurity=true
select relname, relrowsecurity from pg_class
where oid in ('public.festivals'::regclass, 'public.festival_shares'::regclass);

-- festivals에 owner_read SELECT만 존재, festival_shares 정책 없음
select tablename, policyname, roles, cmd, qual from pg_policies
where schemaname='public' and tablename in ('festivals','festival_shares');

-- authenticated 원본 SELECT=true, UPDATE/DELETE/INSERT=false, 공개 테이블 SELECT=false
select
  has_table_privilege('authenticated','public.festivals','SELECT') as owner_select,
  has_table_privilege('authenticated','public.festivals','INSERT') as direct_insert,
  has_table_privilege('authenticated','public.festivals','UPDATE') as direct_update,
  has_table_privilege('authenticated','public.festivals','DELETE') as direct_delete,
  has_table_privilege('authenticated','public.festival_shares','SELECT') as direct_share;

-- authenticated/anon RPC 실행은 false, service_role만 true
select rolname,
  has_function_privilege(rolname,
    'public.save_festival(uuid,uuid,text,jsonb,jsonb,jsonb,text,text,text,uuid,integer)',
    'EXECUTE') as can_save,
  has_function_privilege(rolname,
    'public.publish_festival(uuid,uuid,integer,text,boolean)', 'EXECUTE') as can_publish
from pg_roles where rolname in ('anon','authenticated','service_role');
```

## 실제 검증 스크립트가 확인하는 것

- 로그인 UI 없이 서로 다른 익명 A/B 생성, Auth 검증.
- A/B 각각 본인 생성·조회·수정·삭제. 제공된 owner 위조는 Auth ID로 대체.
- B의 A 원본 읽기는 RLS로 빈 목록, 서버 소유 경로는 조회·수정·삭제·공개 모두 404.
- A/B 모두 직접 테이블 INSERT/UPDATE/DELETE 및 두 RPC 실행 실패(403). 미인증 원본 접근 실패.
- create 재시도 동일 ID, 다른 입력 409, 수정 revision 증가와 이전 revision 수정/삭제 409.
- 공개본 허용목록만 반환, 공개 token으로 저장·삭제·공개 변경 실패.
- 수정 후 기존 공개본 보존, 명시적 공개 갱신 시 token 유지, 중단 후 재공개 새 token, 삭제 cascade 및 조회 404.

데이터는 SCREEN_CONTENT T02를 따른 합성 fixture다. 숫자 ID는 테스트용이며 실제 TMDB 영화 확인을 의미하지 않는다. 임의의 입력에 대해 결과를 계산하는 기능은 없다. DB 검증은 구조·타입·부문 수/중복·버전·revision을 확인하고, 제품 서버의 결과 계산/영화 확인을 대체하지 않는다.

## 공개 token 실패 수정 및 실제 재검증 — 2026-10-20

사용자가 보고한 9/10 통과 상태를 재현했다. 스냅샷 허용목록 검사는 통과했지만, 공개 token을 bearer로 넣은 첫 삭제 거부 검사에서 기대 401과 실제 Supabase Auth 403이 달랐다. 원본 삭제가 실행된 것이 아니며 SQL 정책 오류로 판단할 증거는 없었다.

`scripts/g1/client.mjs`의 Auth 사용자 확인에서만 401/403을 401 미인증으로 정규화했다. DB 권한 거부 403과 외부 장애 503은 그대로 유지한다. 권한·RLS·SQL·공개 허용목록은 수정하지 않았다. 오류 진단에는 소스 위치와 숫자 HTTP 상태만 남기고 실제 응답·assertion 값은 출력하지 않는다.

수정 후 `G1_ALLOW_TEST_WRITES=yes npm run verify:g1`를 실제 프로젝트에 실행해 10/10 PASS 및 종료 0을 확인했다. 공개 스냅샷 최상위 9개 필드와 selections 내부 6개 필드의 정확한 허용목록, 공개 token의 원본 조회·수정·삭제·공개/중단 거부, 공개본이 있는 상태에서 B의 소유 동작 404, 거부 전후 원본과 공개본 불변을 확인했다. 테스트 데이터와 새 익명 세션 정리도 오류 없이 끝났다.

로컬 회귀 검사 19건 통과/실패 0, lint 통과. Auth 거부 시 service-role 요청이 실행되지 않으며, 외부/DB 오류를 잘못 401로 바꾸지 않는 검사와 민감값 없는 오류 진단 검사를 추가했다.

## 초기 준비 당시 실행 결과 (이력)

| 검사 | 결과 | 의미 |
|---|---|---|
| Supabase 설정 존재 여부 | `.env.local` 없음, 필요한 환경변수 3개 없음 | 실제 연결할 수 없음 |
| 로컬 Docker | daemon socket 없음 | 로컬 Supabase도 미실행 |
| `npm run verify:g1` | 종료 2, `NOT RUN` | Supabase A/B 권한 실패 사례는 아직 실제 미검증 |
| `npm test` | 16건 통과, 실패 0 | PGlite PostgreSQL 엔진의 실제 SQL 실행, Auth schema/역할·uid는 테스트에서 모사. Supabase gateway/Auth 검증과 다름 |
| `npm run lint` / `npm run typecheck` | 통과 | G1 도구와 기존 앱 검사 |
| `npm run build` | 통과 | 기존 `/`, `/_not-found`만 생성, 검증용 제품 API 노출 없음 |
| `src`, `.next/static` 검색 | 서버 키 환경변수 이름 및 G1 도구 참조 없음 | 현재 클라이언트 소스·빌드 청크에 검증용 서버 코드 미포함. 실제 키를 넣은 배포 검증은 아님 |

SQL 검사는 별도 메모리 DB에서 owner 읽기·타인 숨김·직접 쓰기/RPC 차단·잘못된 입력·공개 분리·CRUD를 실행한다. 테스트 DB 안에서만 임시 쓰기 권한을 줘도 RLS가 쓰기를 막는지 확인한 뒤 트랜잭션을 되돌린다. 실제 프로젝트의 권한은 확대하지 않는다.

## 남은 보안·제품 연결 항목

- **G1 CLI 실검증은 통과했다.** CAPTCHA·학교 IP 요청 한도·운영 보호·실제 브라우저/제품 API는 별도로 검증해야 한다.
- service role은 RLS를 우회한다. 키가 유출되면 모든 소유권 경계가 무너진다. 서버에서 매번 Auth 사용자 확인과 owner 조건을 유지한다.
- 제품 경로를 추가할 때 16KB 입력 검증·12 grapheme 닉네임·TMDB 확인·결정적 결과 계산·기존 작품 스냅샷 유지·요청 보호를 연결해야 한다. 현재 CLI fixture를 제품 입력으로 확장하지 않는다.
- 브라우저 세션 저장/refresh, private/no-store HTTP 응답, Origin/JSON Content-Type 검사는 실제 Route Handler 연결 시 필요하다. 이번 도구는 쿠키나 외부 HTTP 요청을 받지 않는다.
- 공개 HTML `/f/{token}`와 실제 브라우저 간 시나리오는 아직 없다. 이번에는 서버 helper의 읽기 전용 스냅샷 경계까지만 준비했다.
- 병렬 경합·응답 유실·실제 배포 runtime은 미검증이며 제품 출시 전에 확인한다. 개발 도구의 기존 high 취약점 5건도 별도 미해결 상태다.


## M5-A 후속 보안 준비

공유 예산과 Turnstile 연결을 추가했으나 2026-10-21 실제 준비 상태 검사에서 CAPTCHA가 익명 가입에 강제되지 않았고 새 RPC도 준비되지 않았다. 기존 G1 SQL 재실행은 필요 없다. 별도 추가 migration과 CAPTCHA 콘솔 설정·실제 검증은 [M5_A.md](M5_A.md)의 순서를 따른다. CAPTCHA 활성화 후에는 G1 CLI에도 실제 A/B CAPTCHA 토큰을 준비해야 하며 테스트 때문에 보호를 끄지 않는다.
