import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import { g3Enabled, g3Input } from "../src/lib/g3-fixture.ts";
import { g3Font, g3Poster } from "../src/lib/g3-assets.ts";

test("G3 remains closed in production; only explicit preview enablement opens it",()=>{
  assert.equal(g3Enabled({NODE_ENV:"development"}),true);
  assert.equal(g3Enabled({NODE_ENV:"production"}),false);
  assert.equal(g3Enabled({NODE_ENV:"production",VERCEL_ENV:"production",G3_PROBE_ENABLED:"yes"}),false);
  assert.equal(g3Enabled({NODE_ENV:"production",VERCEL_ENV:"preview"}),false);
  assert.equal(g3Enabled({NODE_ENV:"production",VERCEL_ENV:"preview",G3_PROBE_ENABLED:"yes"}),true);
});
test("PNG test cases and item counts are bounded, with no arbitrary URL input",()=>{
  assert.deepEqual(g3Input(new URLSearchParams()),{mode:"posters",count:3});
  assert.equal(g3Input(new URLSearchParams("count=6&mode=missing")).count,6);
  for(const query of ["count=0","count=7","count=3.5","mode=https://other.test/"]){
    assert.throws(()=>g3Input(new URLSearchParams(query)),/INVALID_G3_CASE/);
  }
});
test("poster fetch uses only TMDB, no credential, and a fully loaded data URL",async()=>{
  let calls=0;
  const asset=await g3Poster("/valid.jpg",async(url,options)=>{
    calls++;assert.equal(url,"https://image.tmdb.org/t/p/w500/valid.jpg");
    assert.equal(options.redirect,"error");assert.equal(options.headers,undefined);
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(new Uint8Array([1,2,3]),{headers:{"Content-Type":"image/jpeg"}});
  });
  assert.equal(asset,"data:image/jpeg;base64,AQID");assert.equal(calls,1);
  await g3Poster("https://other.test/a.jpg",()=>{throw new Error("must not fetch");});
});
test("missing, failed, non-image and oversized posters return a title-tile fallback",async()=>{
  assert.equal(await g3Poster(null),null);
  for(const fetcher of [
    async()=>{throw new TypeError("network failure");},
    async()=>new Response("missing",{status:404}),
    async()=>new Response("html",{headers:{"Content-Type":"text/html"}}),
    async()=>new Response(new Uint8Array(2*1024*1024+1),{headers:{"Content-Type":"image/png"}}),
  ])assert.equal(await g3Poster("/a.png",fetcher),null);
});
test("poster deadline is actually aborted at 3 seconds without blocking PNG fallback",async()=>{
  const keepAlive=setTimeout(()=>{},4500);
  try{
    const asset=await g3Poster("/slow.jpg",async(_url,options)=>new Promise((_resolve,reject)=>{
      options.signal.addEventListener("abort",()=>reject(options.signal.reason),{once:true});
    }));
    assert.equal(asset,null);
  }finally{clearTimeout(keepAlive);}
});
test("font asset retains the full glyph-tested face and distribution license",async()=>{
  const font=await g3Font();
  // This exact face was cmap-checked for Korean, punctuation and ①②③ after the smaller face dropped symbols.
  assert.equal(createHash("sha256").update(font).digest("hex"),"48a28e97b34fc8e5b157657633670cd1b7de126cfc414da65ce9c3d5bc8be733");
  assert.match(await readFile("public/fonts/OFL-NanumGothic.txt","utf8"),/SIL OPEN FONT LICENSE/);
});
