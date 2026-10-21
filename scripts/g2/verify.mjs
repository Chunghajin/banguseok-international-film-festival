import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createTmdbClient, MovieError } from "../../src/lib/tmdb.ts";

if (!process.env.TMDB_READ_ACCESS_TOKEN?.trim()) {
  console.error("NOT RUN: .env.local의 TMDB_READ_ACCESS_TOKEN 설정이 필요합니다.");
  process.exit(2);
}
const client=createTmdbClient();
let failures=0;
async function check(label,action){
  try{await action();console.log(`PASS: ${label}`);}
  catch(error){failures++;console.error(`FAIL: ${label} (${error instanceof MovieError?error.code:"ASSERTION_OR_RUNNER_ERROR"})`);}
}
const safePrint=movie=>console.log(JSON.stringify(movie));
for(const query of ["기생충","Parasite","Inception","괴물"]){
  await check(`실제 검색·상세: ${query}`,async()=>{
    const search=await client.search(query);
    assert.ok(search.items.length>0);
    const preferred=search.items.find(movie=>query==="기생충"||query==="Parasite"?movie.tmdb_id===496243:
      query==="Inception"?movie.tmdb_id===27205:movie.release_year===2006)??search.items[0];
    const movie=await client.detail(String(preferred.tmdb_id));
    assert.equal(movie.tmdb_id,preferred.tmdb_id);
    assert.ok(!JSON.stringify(movie).includes(process.env.TMDB_READ_ACCESS_TOKEN));
    safePrint(movie);
  });
}
await check("실제 검색 0건",async()=>{
  const result=await client.search(`G2-${randomUUID()}`);
  assert.equal(result.items.length,0);
});
await check("실제 포스터 없음·한국어 번역 없음",async()=>{
  const result=await client.search("Untitled");
  const candidate=result.items.find(movie=>movie.poster_path===null&&movie.title===movie.original_title);
  assert.ok(candidate);
  const movie=await client.detail(String(candidate.tmdb_id));
  assert.equal(movie.poster_path,null);
  assert.equal(movie.poster_url,null);
  assert.equal(movie.title,movie.original_title);
  const response=await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdb_id}/translations`,{
    headers:{Authorization:`Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`},
    signal:AbortSignal.timeout(5000),redirect:"error",cache:"no-store",
  });
  assert.ok(response.ok);
  const translations=await response.json();
  assert.ok(Array.isArray(translations.translations));
  assert.ok(!translations.translations.some(item=>item.iso_639_1==="ko"&&item.data?.title?.trim()));
  safePrint(movie);
});
await check("실제 TMDB 포스터 다운로드",async()=>{
  const movie=await client.detail("496243");
  assert.ok(movie.poster_url?.startsWith("https://image.tmdb.org/t/p/w500/"));
  const response=await fetch(movie.poster_url,{signal:AbortSignal.timeout(5000),redirect:"error"});
  assert.equal(response.status,200);
  assert.ok(response.headers.get("content-type")?.startsWith("image/"));
  assert.ok((await response.arrayBuffer()).byteLength>0);
});
await check("빈 검색어·잘못된 ID는 외부 요청 전 400",async()=>{
  await assert.rejects(()=>client.search(" "),error=>error.status===400);
  await assert.rejects(()=>client.detail("invalid"),error=>error.status===400);
});
await check("존재하지 않는 양의 ID: 실제 TMDB 404",async()=>{
  await assert.rejects(()=>client.detail("2147483647"),error=>error instanceof MovieError&&error.status===404);
});
await check("잘못된 인증: 실제 TMDB 거부 → 안전한 503",async()=>{
  await assert.rejects(()=>createTmdbClient({token:"g2-deliberately-invalid"}).detail("496243"),
    error=>error instanceof MovieError&&error.code==="TMDB_AUTH_FAILED"&&error.status===503);
});
console.log(`G2 ${failures?`FAIL (${failures})`:"PASS"}: 429·timeout·네트워크 단절은 오프라인 검사로만 확인. 토큰·응답 원문 출력 없음.`);
process.exitCode=failures?1:0;
