import assert from "node:assert/strict";

const base=process.env.M1_BASE_URL||"http://127.0.0.1:3000";
try {
  for (const [path,marker] of [["/","심사위원 만장일치."],["/create/survey","영화적 자아 신고서"],["/create/awards","수상작 선정"]]) {
    const response=await fetch(new URL(path,base),{redirect:"error",signal:AbortSignal.timeout(10000)});
    assert.equal(response.status,200);
    const html=await response.text();
    assert.ok(html.includes('lang="ko"'));
    assert.ok(html.includes('id="main-content"'));
    assert.ok(html.includes(marker));
    console.log(`PASS: ${path} HTTP 200 · 한국어 · 본문 랜드마크`);
  }
  console.log("M1 HTTP PASS: 브라우저 상호작용·localStorage 복원 검사는 별도입니다.");
} catch { console.error("FAIL: M1 HTTP 검사. HTML·응답 원문은 출력하지 않습니다.");process.exitCode=1; }
