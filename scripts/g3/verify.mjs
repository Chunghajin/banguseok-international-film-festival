import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const origin=process.env.G3_BASE_URL||"http://127.0.0.1:3000";
const base=new URL(origin);
if(!["localhost","127.0.0.1"].includes(base.hostname)&&base.protocol!=="https:"){
  console.error("NOT RUN: 원격 검증 URL에는 HTTPS가 필요합니다.");process.exit(2);
}
await mkdir("artifacts/g3",{recursive:true});
const report={environment:base.hostname==="localhost"||base.hostname==="127.0.0.1"?"local":"remote",images:[],checks:[]};
let failures=0;
async function check(label,action){
  try{await action();report.checks.push({label,passed:true});console.log(`PASS: ${label}`);}
  catch{failures++;report.checks.push({label,passed:false});console.error(`FAIL: ${label} (원문/비밀정보 출력 없음)`);}
}
async function get(path){return fetch(new URL(path,base),{signal:AbortSignal.timeout(30000),redirect:"error"});}

for(const [mode,count] of [["text",3],["posters",3],["missing",3],["poster-error",3],["posters",4],["posters",5],["posters",6]]){
  await check(`${mode} · ${count}개 · 실제 PNG 1080×1920`,async()=>{
    const start=performance.now();
    const response=await get(`/api/dev/png?mode=${mode}&count=${count}`);
    assert.equal(response.status,200);
    assert.equal(response.headers.get("content-type"),"image/png");
    assert.equal(Number(response.headers.get("x-g3-posters")),mode==="posters"?3:0);
    const png=Buffer.from(await response.arrayBuffer());
    assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1920);
    const filename=`${mode}${count===3?"":`-${count}`}.png`;
    await writeFile(`artifacts/g3/${filename}`,png);
    report.images.push({filename,bytes:png.length,width:1080,height:1920,posters:Number(response.headers.get("x-g3-posters")),milliseconds:Math.round(performance.now()-start)});
  });
}
for(const mode of ["font-error","render-error"]){
  await check(`${mode} 503 이후 HTML 200 유지`,async()=>{
    const response=await get(`/api/dev/png?mode=${mode}`);
    assert.equal(response.status,503);
    assert.equal((await response.json()).code,"PNG_PROBE_FAILED");
    const html=await get("/dev/png");assert.equal(html.status,200);
    const text=await html.text();assert.ok(text.includes("G3 한글·포스터 PNG 검증"));
    assert.ok(text.includes("PNG와 독립적인 HTML 시험 결과"));
  });
}
await check("임의 case/count 거부",async()=>{
  assert.equal((await get("/api/dev/png?mode=unknown")).status,400);
  assert.equal((await get("/api/dev/png?count=7")).status,400);
});
await check("실제 한글 font 파일·CDN CORS 응답",async()=>{
  const font=await get("/fonts/NanumGothic-Regular.ttf");assert.equal(font.status,200);
  assert.ok((await font.arrayBuffer()).byteLength>4000000);
  const cdn=await fetch("https://image.tmdb.org/t/p/w500/jjHccoFjbqlfr4VGLVLT7yek0Xn.jpg",{headers:{Origin:base.origin},signal:AbortSignal.timeout(5000),redirect:"error"});
  assert.equal(cdn.status,200);
  report.cdnAccessControlAllowOrigin=cdn.headers.get("access-control-allow-origin");
  await cdn.arrayBuffer();
});
await writeFile("artifacts/g3/report.json",JSON.stringify(report,null,2)+"\n");
console.log(`G3 ${failures?`FAIL (${failures})`:"LOCAL/ENDPOINT CHECKS PASS"}: artifacts/g3/report.json. 텍스트 시각 검사·실기기·Vercel 여부는 별도 기록.`);
process.exitCode=failures?1:0;
