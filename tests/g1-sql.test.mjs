import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { fixture } from "../scripts/g1/fixture.mjs";

test("G1 SQL: isolated PostgreSQL checks (not hosted Supabase verification)", async (t) => {
  const db = new PGlite();
  const a = randomUUID();
  const b = randomUUID();
  try {
    // Only the auth schema/uid and gateway roles are simulated; SQL/RLS execute in PostgreSQL.
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
    `);
    await db.query("insert into auth.users values ($1),($2)", [a,b]);
    await db.exec(await readFile(new URL("../supabase/migrations/202610200001_g1.sql", import.meta.url), "utf8"));

    async function as(role, uid, action) {
      await db.exec("begin");
      try {
        await db.exec(`set local role ${role}`);
        await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid ?? ""]);
        const result = await action();
        await db.exec("commit");
        return result;
      } catch (error) { await db.exec("rollback"); throw error; }
    }
    async function rpc(name, input) {
      const pairs = Object.entries(input);
      return (await db.query(`select * from public.${name}(${pairs.map(([key],i) => `${key} => $${i+1}`).join(",")})`,
        pairs.map(([,value]) => typeof value === "object" && value !== null ? JSON.stringify(value) : value))).rows[0];
    }
    const input = { ...fixture(randomUUID()), p_owner: a };
    let row;
    const save = (data) => as("service_role", null, () => rpc("save_festival",data));
    const publish = (data) => as("service_role", null, () => rpc("publish_festival",data));
    await t.test("create and identical retry; differing input conflicts", async () => {
      row = await save(input);
      assert.equal(row.owner_id, a);
      assert.equal(row.revision, 1);
      const retry = await save({...input,p_selections:[...input.p_selections].reverse()});
      assert.equal(retry.id,row.id);
      await assert.rejects(() => save({...input,p_nickname:"충돌"}), {code:"PT409"});
    });
    await t.test("RLS owner reads; second session gets zero rows; anon denied", async () => {
      const query = () => db.query("select id from public.festivals where id=$1",[row.id]);
      assert.equal((await as("authenticated",a,query)).rows.length,1);
      assert.equal((await as("authenticated",b,query)).rows.length,0);
      await assert.rejects(() => as("anon",null,query), {code:"42501"});
      const policies = await db.query("select cmd from pg_policies where tablename='festivals'");
      assert.deepEqual(policies.rows.map(r=>r.cmd),["SELECT"]);
    });
    await t.test("both sessions cannot write directly or invoke service RPCs", async () => {
      for (const uid of [a,b]) {
        for (const statement of [
          "update public.festivals set nickname='금지'",
          "delete from public.festivals",
          "insert into public.festivals select * from public.festivals",
        ]) await assert.rejects(() => as("authenticated",uid,()=>db.exec(statement)),{code:"42501"});
        await assert.rejects(() => as("authenticated",uid,()=>rpc("save_festival",input)),{code:"42501"});
        await assert.rejects(() => as("authenticated",uid,()=>rpc("publish_festival",{
          p_owner:a,p_id:row.id,p_expected_revision:1,p_token:"a".repeat(43),
        })),{code:"42501"});
      }
    });
    await t.test("service path rejects wrong owner on update and publication", async () => {
      await assert.rejects(()=>save({...input,p_owner:b,p_id:row.id,p_expected_revision:1}),{code:"PT404"});
      await assert.rejects(()=>publish({p_owner:b,p_id:row.id,p_expected_revision:1,p_token:"a".repeat(43)}),{code:"PT404"});
      const deleted = await as("service_role",null,()=>db.query(
        "delete from public.festivals where id=$1 and owner_id=$2 and revision=1 returning id",[row.id,b]));
      assert.equal(deleted.rows.length,0);
    });
    await t.test("RLS independently blocks writes even with temporary test-only grants",async()=>{
      // This transaction exists only in the isolated test DB and is always rolled back.
      await db.exec(`begin;
        grant insert,update,delete on public.festivals to authenticated;
        grant usage on schema g1_private to authenticated;
        grant execute on function g1_private.valid_payload(jsonb,jsonb,jsonb) to authenticated;
        set local role authenticated`);
      try {
        await db.query("select set_config('request.jwt.claim.sub',$1,true)",[b]);
        assert.equal((await db.query("update public.festivals set nickname='차단' returning id")).rows.length,0);
        assert.equal((await db.query("delete from public.festivals returning id")).rows.length,0);
        await assert.rejects(()=>db.query(`insert into public.festivals
          (owner_id,client_draft_id,nickname,survey,selections,result,survey_version,catalog_version,rules_version)
          values($1,$2,'차단',$3,$4,$5,'survey-v1.1','awards-v1.1','result-v1.1')`,
          [b,randomUUID(),JSON.stringify(input.p_survey),JSON.stringify(input.p_selections),JSON.stringify(input.p_result)]),
          error=>error.code==="42501" && /row-level security/.test(error.message));
      } finally {await db.exec("rollback");}
    });
    await t.test("DB rejects invalid q, category count/duplicates, poster URL and version", async () => {
      for (const patch of [
        {p_survey:{...input.p_survey,q1:5}}, {p_survey:{...input.p_survey,q2:"3"}},
        {p_survey:{...input.p_survey,q3:2.5}}, {p_survey:{...input.p_survey,q4:-1}},
        {p_selections:input.p_selections.slice(0,2)},
        {p_selections:[input.p_selections[0],input.p_selections[0],input.p_selections[2]]},
        {p_selections:input.p_selections.map(s=>({...s,poster_path:"https://example.com/x.jpg"}))},
        {p_rules_version:"result-v1.0"},
      ]) await assert.rejects(()=>save({...input,...patch,p_draft:randomUUID()}),{code:"23514"});
    });
    let share;
    await t.test("public snapshot is allowlisted; direct share reads blocked", async () => {
      share = await publish({p_owner:a,p_id:row.id,p_expected_revision:1,p_token:randomBytes(32).toString("base64url")});
      assert.deepEqual(Object.keys(share.public_snapshot).sort(),["nickname","special_award_title","award_sentence",
        "selection_sentence","volume_sentence","selections","awarded_count","brand_version","created_year"].sort());
      for (const role of ["anon","authenticated"]) await assert.rejects(
        ()=>as(role,b,()=>db.exec("select public_snapshot from public.festival_shares")),{code:"42501"});
    });
    await t.test("update increments revision; stale update/publish conflict; old share retained", async () => {
      row = await save({...input,p_id:row.id,p_expected_revision:1,p_nickname:"수정"});
      assert.equal(row.revision,2);
      await assert.rejects(()=>save({...input,p_id:row.id,p_expected_revision:1}),{code:"PT409"});
      await assert.rejects(()=>publish({p_owner:a,p_id:row.id,p_expected_revision:1,p_token:share.token}),{code:"PT409"});
      let stored = (await db.query("select * from public.festival_shares")).rows[0];
      assert.equal(stored.public_snapshot.nickname,input.p_nickname);
      const next = await publish({p_owner:a,p_id:row.id,p_expected_revision:2,p_token:randomBytes(32).toString("base64url")});
      assert.equal(next.token,share.token);
      assert.equal(next.public_snapshot.nickname,"수정");
      stored = (await db.query("select * from public.festival_shares")).rows[0];
      assert.equal(stored.published_revision,2);
    });
    await t.test("unpublish, republish with new token, owner delete cascades", async () => {
      await publish({p_owner:a,p_id:row.id,p_expected_revision:2,p_token:share.token,p_unpublish:true});
      assert.equal((await db.query("select * from public.festival_shares")).rows.length,0);
      const next = await publish({p_owner:a,p_id:row.id,p_expected_revision:2,p_token:randomBytes(32).toString("base64url")});
      assert.notEqual(next.token,share.token);
      await as("service_role",null,()=>db.query("delete from public.festivals where id=$1 and owner_id=$2 and revision=2",[row.id,a]));
      assert.equal((await db.query("select * from public.festivals")).rows.length,0);
      assert.equal((await db.query("select * from public.festival_shares")).rows.length,0);
    });
  } finally { await db.close(); }
});
