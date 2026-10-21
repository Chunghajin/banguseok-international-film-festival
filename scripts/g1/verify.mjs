import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createG1Client, G1Error } from "./client.mjs";
import { fixture } from "./fixture.mjs";
import { failureDetails } from "./failure.mjs";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
if (required.some((key) => !process.env[key])) {
  console.error(`NOT RUN: 필요한 설정: ${required.filter((key) => !process.env[key]).join(", ")}. docs/G1_SUPABASE.md 참고.`);
  process.exit(2);
}
if (process.env.G1_ALLOW_TEST_WRITES !== "yes") {
  console.error("NOT RUN: 전용 테스트 프로젝트 확인 후 G1_ALLOW_TEST_WRITES=yes로 실행하세요.");
  process.exit(2);
}

const client = createG1Client(process.env);
const sessions = [];
const drafts = [];
let failures = 0;
async function check(label, action) {
  try { await action(); console.log(`PASS: ${label}`); }
  catch (error) {
    failures++;
    console.error(`FAIL: ${label} (${failureDetails(error)})`);
  }
}
async function denied(action, status) {
  await assert.rejects(action, (error) => error instanceof G1Error && error.status === status);
}

try {
  sessions.push(await client.signIn(process.env.G1_CAPTCHA_TOKEN_A));
  sessions.push(await client.signIn(process.env.G1_CAPTCHA_TOKEN_B));
  const [a, b] = sessions.map((s) => s.access_token);
  assert.notEqual(sessions[0].user.id, sessions[1].user.id);
  console.log("PASS: 독립 익명 세션 A/B 생성 및 Auth 확인");
  const input = fixture(randomUUID());
  drafts.push({ owner: sessions[0].user.id, draft: input.p_draft });
  let row;
  await check("A 생성, 본인 조회, 소유자 위조 무시, create 재시도", async () => {
    row = await client.save(a, { ...input, p_owner: sessions[1].user.id });
    assert.equal(row.owner_id, sessions[0].user.id);
    assert.equal((await client.read(a, row.id)).revision, 1);
    const retry = await client.save(a, { ...input, p_selections: [...input.p_selections].reverse() });
    assert.equal(retry.id, row.id);
    await denied(() => client.save(a, { ...input, p_nickname: "다른입력" }), 409);
  });
  if (!row) throw new Error("CREATE_REQUIRED");
  await check("B도 본인 데이터 생성·조회·수정·삭제", async () => {
    const own = fixture(randomUUID());
    drafts.push({ owner: sessions[1].user.id, draft: own.p_draft });
    const first = await client.save(b, own);
    assert.equal((await client.read(b, first.id)).revision, 1);
    await denied(() => client.read(a, first.id), 404);
    const updated = await client.save(b, { ...own, p_id: first.id, p_expected_revision: 1, p_nickname: "B수정" });
    assert.equal(updated.revision, 2);
    await client.remove(b, first.id, 2);
  });
  await check("RLS: B의 A 원본 조회는 빈 목록", async () => {
    const rows = await client.request(`/rest/v1/festivals?id=eq.${row.id}&select=id`, { token: b });
    assert.equal(rows.length, 0);
  });
  await check("미인증 테이블 조회 거부", async () => {
    await assert.rejects(() => client.request(`/rest/v1/festivals?id=eq.${row.id}&select=id`),
      (error) => error instanceof G1Error && [401, 403].includes(error.status));
  });
  await check("B의 서버 경로 조회·수정·삭제·공개 모두 404", async () => {
    await denied(() => client.read(b, row.id), 404);
    await denied(() => client.save(b, { ...input, p_id: row.id, p_expected_revision: 1 }), 404);
    await denied(() => client.remove(b, row.id, 1), 404);
    await denied(() => client.publish(b, row.id, 1), 404);
  });
  await check("A/B 직접 INSERT·UPDATE·DELETE 및 RPC 실행 거부", async () => {
    for (const token of [a, b]) {
      for (const method of ["POST", "PATCH", "DELETE"]) {
        await denied(() => client.request(`/rest/v1/festivals${method === "POST" ? "" : `?id=eq.${row.id}`}`, {
          token, method, ...(method !== "DELETE" ? { body: method === "POST" ? row : { nickname: "위조" } } : {}),
        }), 403);
      }
      await denied(() => client.request("/rest/v1/rpc/save_festival", {
        token, method: "POST", body: { ...input, p_owner: sessions[0].user.id },
      }), 403);
      await denied(() => client.request("/rest/v1/rpc/publish_festival", { token, method: "POST",
        body: { p_owner: sessions[0].user.id, p_id: row.id, p_expected_revision: 1, p_token: "a".repeat(43) },
      }), 403);
    }
    assert.equal((await client.read(a, row.id)).nickname, input.p_nickname);
  });
  let share;
  await check("공개 스냅샷 허용목록·공개 token 편집 불가", async () => {
    share = await client.publish(a, row.id, 1);
    const snapshot = await client.publicRead(share.token);
    assert.deepEqual(Object.keys(snapshot).sort(), ["nickname", "special_award_title", "award_sentence",
      "selection_sentence", "volume_sentence", "selections", "awarded_count", "brand_version", "created_year"].sort());
    for (const selection of snapshot.selections) {
      assert.deepEqual(Object.keys(selection).sort(), ["category_id", "tmdb_id", "title",
        "original_title", "release_year", "poster_path"].sort());
    }
    const before = await client.read(a, row.id);
    await denied(() => client.read(share.token, row.id), 401);
    await denied(() => client.remove(share.token, row.id, 1), 401);
    await denied(() => client.save(share.token, { ...input, p_id: row.id, p_expected_revision: 1 }), 401);
    await denied(() => client.publish(share.token, row.id, 1), 401);
    await denied(() => client.publish(share.token, row.id, 1, true), 401);
    // B can possess the public URL and a valid session without acquiring ownership.
    await denied(() => client.read(b, row.id), 404);
    await denied(() => client.save(b, { ...input, p_id: row.id, p_expected_revision: 1 }), 404);
    await denied(() => client.remove(b, row.id, 1), 404);
    await denied(() => client.publish(b, row.id, 1), 404);
    await denied(() => client.publish(b, row.id, 1, true), 404);
    assert.deepEqual(await client.read(a, row.id), before);
    assert.deepEqual(await client.publicRead(share.token), snapshot);
    for (const token of [a, b]) {
      await denied(() => client.request("/rest/v1/festival_shares?select=public_snapshot", { token }), 403);
    }
  });
  await check("A 수정·이전 revision 충돌·공개본 유지·명시적 갱신", async () => {
    row = await client.save(a, { ...input, p_nickname: "G1수정", p_id: row.id, p_expected_revision: 1 });
    assert.equal(row.revision, 2);
    await denied(() => client.save(a, { ...input, p_id: row.id, p_expected_revision: 1 }), 409);
    await denied(() => client.remove(a, row.id, 1), 409);
    assert.equal((await client.publicRead(share.token)).nickname, input.p_nickname);
    const updated = await client.publish(a, row.id, 2);
    assert.equal(updated.token, share.token);
    assert.equal((await client.publicRead(share.token)).nickname, "G1수정");
  });
  await check("공개 중단·재공개 새 token·삭제 cascade", async () => {
    await client.publish(a, row.id, 2, true);
    await denied(() => client.publicRead(share.token), 404);
    const next = await client.publish(a, row.id, 2);
    assert.notEqual(next.token, share.token);
    await client.remove(a, row.id, 2);
    await denied(() => client.read(a, row.id), 404);
    await denied(() => client.publicRead(next.token), 404);
  });
} catch (error) {
  failures++;
  console.error(`FAIL: G1 진행 불가 (${failureDetails(error)}). 설정/익명 인증/CAPTCHA를 확인하세요.`);
} finally {
  for (const { owner, draft } of drafts) {
    try {
      await client.request(`/rest/v1/festivals?owner_id=eq.${owner}&client_draft_id=eq.${draft}`, { admin: true, method: "DELETE" });
    } catch { failures++; console.error("FAIL: 합성 fixture 정리 실패. 테스트 프로젝트의 G1 기록을 직접 확인하세요."); }
  }
  for (const session of sessions) {
    try {
      await client.request(`/auth/v1/admin/users/${session.user.id}`, { admin: true, method: "DELETE" });
    } catch { failures++; console.error("FAIL: 이번 실행에서 생성한 익명 사용자 정리 실패. Dashboard에서 확인하세요."); }
  }
}
console.log(`G1 ${failures ? `FAIL (${failures})` : "PASS"}: 실제 Supabase 요청 기준, 비밀·세션·token 출력 없음.`);
process.exitCode = failures ? 1 : 0;
