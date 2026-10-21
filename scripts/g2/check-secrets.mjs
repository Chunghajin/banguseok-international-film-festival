import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const token=process.env.TMDB_READ_ACCESS_TOKEN;
if(!token){console.error("NOT RUN: TMDB_READ_ACCESS_TOKEN이 필요합니다.");process.exit(2);}
let chunks=0,logs=0;
async function scan(path,kind){
  let entries;
  try{entries=await readdir(path,{withFileTypes:true});}catch(error){if(error.code==="ENOENT")return;throw error;}
  for(const entry of entries){
    const full=`${path}/${entry.name}`;
    if(entry.isDirectory())await scan(full,kind);
    else{
      const bytes=await readFile(full);
      assert.ok(!bytes.includes(Buffer.from(token)),"TMDB_SECRET_FOUND");
      if(kind==="chunk")chunks++;else logs++;
    }
  }
}
try{
  await scan(".next/static","chunk");
  await scan(".next/dev/static","chunk");
  assert.ok(chunks>0,"BUILD_FIRST");
  for(const [path,status] of [["/dev/tmdb",200],["/api/movies/search?q=Inception",200],["/api/movies/496243",200],
    ["/api/movies/search?q=",400],["/api/movies/no-id",400],["/api/movies/2147483647",404]]){
    const response=await fetch(`http://127.0.0.1:3000${path}`,{signal:AbortSignal.timeout(10000)});
    assert.equal(response.status,status,"UNEXPECTED_HTTP_STATUS");
    assert.ok(!(await response.text()).includes(token),"TMDB_SECRET_FOUND_IN_RESPONSE");
  }
  await scan(".next/dev/logs","log");
  console.log(`PASS: 실제 토큰 문자열 미검출 — browser artifact ${chunks}개, 개발 로그 ${logs}개, 로컬 HTML/API 응답 6개.`);
}catch{console.error("FAIL: 토큰 노출 검사 실패. 값/원문은 출력하지 않습니다.");process.exitCode=1;}
