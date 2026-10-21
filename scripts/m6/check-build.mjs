import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {protectionConfig,POLICY_VERSION} from '../../src/lib/request-protection.ts';
const env={...process.env,VERCEL:'1',VERCEL_ENV:'preview',APP_ALLOWED_ORIGINS:'https://127.0.0.1:3198',PROTECTION_HMAC_KEY:'a'.repeat(64),NEXT_PUBLIC_HCAPTCHA_SITE_KEY:'11111111-2222-4333-8444-555555555555',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3199',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-only',SUPABASE_SERVICE_ROLE_KEY:'fixture-only'};
const fingerprint=protectionConfig(env).fingerprint,token='a'.repeat(43),snapshot={nickname:'로컬 빌드 검증',special_award_title:'단독 개최 공로상',award_sentence:'심사, 선정, 시상을 한 분이 담당하셨습니다.',selection_sentence:'총 3개 부문을 시상했습니다.',volume_sentence:null,selections:['grand','lifetime','once'].map((category_id,i)=>({category_id,tmdb_id:i+1,title:`실제 렌더링 검증 ${i+1}`,original_title:null,release_year:2026,poster_path:null})),awarded_count:3,brand_version:'1.1',created_year:2026};
let mode='allow',reads=0,budgets=0,violations=0,app;
const mock=createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');
 if(req.url==='/rest/v1/rpc/consume_request_budget'){
  let body='';for await(const part of req)body+=part;const input=JSON.parse(body);budgets++;
  if(input.p_environment!=='preview'||input.p_fingerprint!==fingerprint){violations++;res.statusCode=500;res.end('{}');return;}
  if(mode==='outage'){res.statusCode=503;res.end('{}');return;}
  res.end(JSON.stringify({policy_version:POLICY_VERSION,allowed:mode!=='limit',retry_after:mode==='limit'?23:0}));return;
 }
 reads++;res.end(JSON.stringify(mode==='revoked'?[]:[{public_snapshot:snapshot}]));
});
await mkdir('artifacts/m6',{recursive:true});
try {
 const files=new Set();
 for(const path of ['.next/server/app/api/share-image/[token]/route.js.nft.json','.next/next-server.js.nft.json']){
  const trace=JSON.parse(await readFile(path,'utf8'));for(const f of trace.files)files.add(resolve(dirname(path),f));
 }
 const font=[...files].filter(f=>f.endsWith('NanumGothic-Regular.ttf')),wasm=[...files].filter(f=>f.endsWith('resvg.wasm'));
 assert.equal(font.length,1);assert.equal(wasm.length,1);let totalBytes=0;for(const path of files)totalBytes+=(await stat(path)).size;
 const bundle={files:files.size,totalBytes,font,wasm};await writeFile('artifacts/m6/bundle.json',JSON.stringify(bundle,null,2)+'\n');
 await new Promise((resolve,reject)=>{mock.once('error',reject);mock.listen(3199,'127.0.0.1',resolve);});
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3198'],{env,stdio:['ignore','ignore','pipe']});let logs='';app.stderr.on('data',d=>{logs+=d;});
 const url=`http://127.0.0.1:3198/api/share-image/${token}`,headers={Host:'127.0.0.1:3198','x-vercel-forwarded-for':'127.0.0.1',Origin:'https://127.0.0.1:3198'};
 for(let i=0;;i++){try{const r=await fetch(url);if(r.status===503)break;}catch{}if(i>50)throw Error(`START_FAILED ${logs.slice(-300)}`);await new Promise(r=>setTimeout(r,100));}
 assert.equal(reads,0);assert.equal(budgets,0);console.log('PASS: production runtime rejects untrusted platform/Host before DB/render');
 const response=await fetch(url,{headers});assert.equal(response.status,200,JSON.stringify({body:await response.clone().text(),budgets,reads,violations,logs}));assert.equal(budgets,2);assert.equal(reads,1);
 const png=Buffer.from(await response.arrayBuffer());assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1920);await writeFile('artifacts/m6/production-local.png',png);console.log('PASS: built Node runtime renders PNG through both real M5 guards with local budget RPC fixture');
 for(const [state,status] of [['limit',429],['outage',503],['revoked',404]]){mode=state;const before=reads,r=await fetch(url,{headers});assert.equal(r.status,status);if(state==='limit')assert.equal(r.headers.get('retry-after'),'23');if(state!=='revoked')assert.equal(reads,before);console.log(`PASS: built runtime ${state} → ${status}`);}
 assert.equal(violations,0);await writeFile('artifacts/m6/production-local.json',JSON.stringify({environment:'local production build with mock Supabase, NOT Vercel',width:1080,height:1920,budgets,reads,bundle,checks:['platform rejected','PNG 200','429 Retry-After','outage 503','revoked 404']},null,2)+'\n');
} finally {app?.kill();mock.closeAllConnections();await new Promise(resolve=>mock.close(resolve));}
