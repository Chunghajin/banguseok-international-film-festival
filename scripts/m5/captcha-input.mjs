import {createServer} from 'node:http';
import {validHCaptchaSiteKey} from '../../src/lib/captcha-config.mjs';
// Local-only collection: a real widget sends its token to memory, never a log or file.
export function captchaInput(siteKey,{timeout=180000,onReady=origin=>console.log(`Open hCaptcha verification: ${origin}`)}={}){
 if(!validHCaptchaSiteKey(siteKey))throw Error('REAL_SITE_KEY_REQUIRED');
 return new Promise((resolve,reject)=>{
  let origin,timer,finished=false;
  const server=createServer(async(req,res)=>{
   res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
   if(req.headers.host!==new URL(origin).host){res.writeHead(403).end();return;}
   if(req.method==='GET'&&req.url==='/'){
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>방국제 hCaptcha 실검증</title><main><h1>실제 hCaptcha 확인</h1><p>hosts 파일에 127.0.0.1 captcha.banguseok.test를 추가하고 hCaptcha 개발용 Sitekey의 허용 hostname을 맞춰 주세요. 공개 dummy 키는 허용하지 않습니다. 토큰은 이 프로세스 메모리에만 전달됩니다.</p><div class="h-captcha" data-sitekey="${siteKey}" data-callback="verified" data-expired-callback="expired" data-chalexpired-callback="expired" data-error-callback="failed"></div><p id="status" role="status"></p></main><script>let submitted=false;function expired(){document.getElementById('status').textContent='확인이 만료됐어요. 다시 확인해 주세요.';}function failed(){document.getElementById('status').textContent='확인에 실패했어요. 연결과 hostname 설정을 확인해 주세요.';}async function verified(token){if(submitted)return;submitted=true;try{const r=await fetch('/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});document.getElementById('status').textContent=r.ok?'전달했습니다. 터미널의 검증 결과를 확인해 주세요.':'전달하지 못했습니다.';}catch{failed();}}</script><script src="https://js.hcaptcha.com/1/api.js?hl=ko&recaptchacompat=off" async defer></script></html>`);return;
   }
   if(req.method!=='POST'||req.url!=='/token'||req.headers.origin!==origin){res.writeHead(403).end();return;}
   try{let text='';for await(const part of req){text+=part.toString();if(Buffer.byteLength(text)>8192)throw Error();}const data=JSON.parse(text);if(typeof data.token!=='string'||data.token.length<1||data.token.length>8000)throw Error();res.writeHead(200,{'Content-Type':'application/json'}).end('{"received":true}');finish(null,data.token);}catch{res.writeHead(400).end();}
  });
  function finish(error,token){if(finished)return;finished=true;clearTimeout(timer);server.close();server.closeAllConnections();if(error)reject(error);else resolve(token);}
  server.on('error',()=>finish(Error('LOCAL_CAPTCHA_SERVER_FAILED')));
  server.listen(0,'127.0.0.1',()=>{origin=`http://captcha.banguseok.test:${server.address().port}`;timer=setTimeout(()=>finish(Error('CAPTCHA_INPUT_TIMEOUT')),timeout);onReady(origin);});
 });
}
