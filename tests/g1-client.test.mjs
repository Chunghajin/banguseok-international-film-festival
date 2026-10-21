import assert from "node:assert/strict";
import test from "node:test";
import { createG1Client, G1Error } from "../scripts/g1/client.mjs";
import { fixture } from "../scripts/g1/fixture.mjs";

const env = {NEXT_PUBLIC_SUPABASE_URL:"https://project.supabase.co",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"public-test",SUPABASE_SERVICE_ROLE_KEY:"server-test"};
test("missing config fails closed before a network request", () => {
  assert.throws(()=>createG1Client({}),/G1_CONFIG_MISSING/);
});
test("server credentials cannot be sent to another origin", async () => {
  const client=createG1Client(env,()=>{throw new Error("fetch must not run");});
  await assert.rejects(()=>client.request("https://other.example/",{admin:true}),error=>error.status===400);
});
test("verified Auth user overwrites an attacker-supplied owner", async () => {
  const calls=[];
  const client=createG1Client(env,async (url,options)=>{
    calls.push({url,options});
    return Response.json(calls.length===1?{id:"verified-owner",is_anonymous:true}:{id:"row"});
  });
  await client.save("user-token",{...fixture("draft"),p_owner:"attacker"});
  assert.equal(calls[0].options.headers.apikey,"public-test");
  assert.equal(calls[0].options.headers.Authorization,"Bearer user-token");
  assert.equal(JSON.parse(calls[1].options.body).p_owner,"verified-owner");
  assert.equal(calls[1].options.headers.apikey,"server-test");
  assert.ok(calls.every(call=>call.options.cache==="no-store"));
});
test("invalid bearer fails before service-role write; raw errors are not exposed", async () => {
  let count=0;
  const client=createG1Client(env,async ()=>{
    count++;
    return Response.json({message:"sensitive-details",code:"bad_jwt"},{status:401});
  });
  await assert.rejects(()=>client.save("invalid",fixture("draft")),error=>
    error instanceof G1Error && error.status===401 && !error.message.includes("sensitive-details"));
  assert.equal(count,1);
});
test("Auth 401/403 denies public-token reads and all mutations before any service request", async () => {
  for (const status of [401,403]) {
    const calls=[];
    const client=createG1Client(env,async (url,options)=>{
      calls.push({url,options});
      return Response.json({message:"private upstream details"},{status});
    });
    const publicToken="a".repeat(43);
    for (const action of [
      ()=>client.read(publicToken,"id"),
      ()=>client.save(publicToken,fixture("draft")),
      ()=>client.remove(publicToken,"id",1),
      ()=>client.publish(publicToken,"id",1),
      ()=>client.publish(publicToken,"id",1,true),
    ]) await assert.rejects(action,error=>error instanceof G1Error
      && error.status===401 && error.code==="UNAUTHENTICATED");
    assert.equal(calls.length,5);
    assert.ok(calls.every(({url,options})=>url.pathname==="/auth/v1/user"
      && options.headers.apikey==="public-test"));
  }
});
test("Auth network failures and database permission failures are not remapped to 401",async()=>{
  const unavailable=createG1Client(env,async()=>Response.json({},{status:503}));
  await assert.rejects(()=>unavailable.user("token"),error=>error.status===503);
  let count=0;
  const client=createG1Client(env,async()=>{
    count++;
    return count===1?Response.json({id:"verified-owner",is_anonymous:true}):Response.json({},{status:403});
  });
  await assert.rejects(()=>client.save("token",fixture("draft")),error=>error.status===403);
});
test("public read queries only a token-filtered public snapshot",async()=>{
  const client=createG1Client(env,async (url)=>{
    assert.equal(url.searchParams.get("select"),"public_snapshot");
    assert.equal(url.searchParams.get("token"),`eq.${"a".repeat(43)}`);
    return Response.json([{public_snapshot:{nickname:"공개"}}]);
  });
  assert.deepEqual(await client.publicRead("a".repeat(43)),{nickname:"공개"});
  await assert.rejects(()=>client.publicRead("not-a-token"),error=>error.status===404);
});

test('Auth numeric HTTP code does not hide captcha_failed or rate-limit error_code',async()=>{
 for(const [status,error_code] of [[400,'captcha_failed'],[429,'over_request_rate_limit']]){
  const client=createG1Client(env,async()=>Response.json({code:status,error_code,msg:'private-provider-details'},{status}));
  await assert.rejects(()=>client.signIn('private-captcha-token'),error=>error instanceof G1Error&&error.status===status&&error.code===error_code&&!error.message.includes('private'));
 }
});
test('PostgREST string codes stay unchanged; numeric-only errors stay unverified',async()=>{
 const postgres=createG1Client(env,async()=>Response.json({code:'PT409'},{status:409}));await assert.rejects(()=>postgres.request('/rest/v1/rpc/test'),e=>e.code==='PT409'&&e.status===409);
 const unknown=createG1Client(env,async()=>Response.json({code:400},{status:400}));await assert.rejects(()=>unknown.signIn('invalid'),e=>e.code==='REQUEST_FAILED'&&e.status===400);
});
