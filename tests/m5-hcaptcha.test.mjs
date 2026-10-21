import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {request} from 'node:http';
import vm from 'node:vm';
import ts from 'typescript';
import {validHCaptchaSiteKey} from '../src/lib/captcha-config.mjs';
import {captchaInput} from '../scripts/m5/captcha-input.mjs';
const siteKey='11111111-2222-4333-8444-555555555555';

test('hCaptcha real-format configuration rejects all official dummy sitekeys and Turnstile keys',()=>{
 assert.equal(validHCaptchaSiteKey(siteKey),true);
 for(const key of [undefined,'', '0x4old-turnstile-key','<script>','00000000-0000-0000-0000-000000000000',...['1','2','3'].map(n=>`${n}0000000-ffff-ffff-ffff-00000000000${n}`)])assert.equal(validHCaptchaSiteKey(key),false);
});

test('hCaptcha component handles delayed SDK, expiry, error, removal and remount without touching drafts (SDK double)',async()=>{
 const source=await readFile(new URL('../src/components/hcaptcha.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 let effects=[],states=[],options,removed=0,renders=0,tree;
 const window={},tokens=[];
 const react={useRef:initial=>({current:initial}),useCallback:fn=>fn,useState:initial=>[initial,value=>states.push(value)],useEffect:fn=>effects.push(fn)};
 const jsx=(type,props)=>{if(props?.ref)props.ref.current={};return {type,props};};
 const context={exports:{},window,process:{env:{NEXT_PUBLIC_HCAPTCHA_SITE_KEY:siteKey}},require:name=>{
  if(name==='react')return react;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='next/script')return 'Script';if(name==='@/lib/captcha-config.mjs')return {validHCaptchaSiteKey};throw Error('UNEXPECTED_IMPORT');
 }};
 vm.runInNewContext(code,context);const Component=context.exports.default;
 tree=Component({onToken:token=>tokens.push(token)});let cleanup=effects[0]();assert.equal(renders,0);
 window.hcaptcha={render:(element,o)=>{renders++;options=o;return 'widget';},remove:()=>removed++};
 window.banguseokHCaptchaReady();assert.equal(renders,1);window.banguseokHCaptchaReady();assert.equal(renders,1);
 options.callback('test-token');assert.equal(tokens.at(-1),'test-token');options['expired-callback']();assert.equal(tokens.at(-1),'');options.callback('fresh-test-token');options['chalexpired-callback']();assert.equal(tokens.at(-1),'');options['error-callback']();assert.equal(tokens.at(-1),'');assert.equal(states.at(-1),true);
 const script=tree.props.children.find(child=>child?.type==='Script');assert.match(script.props.src,/js\.hcaptcha\.com/);script.props.onError();assert.equal(tokens.at(-1),'');
 cleanup();assert.equal(removed,1);assert.equal(window.banguseokHCaptchaReady,undefined);
 effects=[];tree=Component({onToken:token=>tokens.push(token)});cleanup=effects[0]();tree.props.children.find(child=>child?.type==='Script').props.onReady();assert.equal(renders,2);cleanup();
 effects=[];context.process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY='';tree=Component({onToken:()=>{}});cleanup=effects[0]();assert.equal(tree.props.role,'alert');assert.equal(renders,2);cleanup();
});

test('collector accepts one original token only on exact development Host/Origin, bound to loopback',async()=>{
 let ready;const started=new Promise(resolve=>ready=resolve);
 const result=captchaInput(siteKey,{timeout:5000,onReady:ready});
 const origin=await Promise.race([started,result]),url=new URL(origin);assert.equal(url.hostname,'captcha.banguseok.test');
 function send(method,path,headers={},body=''){return new Promise((resolve,reject)=>{
  const req=request({hostname:'127.0.0.1',port:url.port,method,path,headers:{host:url.host,...headers}},res=>{let data='';res.on('data',chunk=>data+=chunk);res.on('end',()=>resolve({status:res.statusCode,data,headers:res.headers}));});req.on('error',reject);req.end(body);
 });}
 try{
  assert.equal((await send('GET','/',{host:`127.0.0.1:${url.port}`})).status,403);
  const page=await send('GET','/');assert.equal(page.status,200);assert.match(page.data,/js\.hcaptcha\.com/);assert.doesNotMatch(page.data,/turnstile/);assert.equal(page.headers['cache-control'],'no-store');
  assert.equal((await send('POST','/token',{origin:'http://attacker.test'},JSON.stringify({token:'rejected'}))).status,403);
  assert.equal((await send('POST','/token',{origin},JSON.stringify({token:''}))).status,400);
  const token='  original-token-kept-in-memory  ';assert.equal((await send('POST','/token',{origin},JSON.stringify({token}))).status,200);assert.equal(await result,token);
 }catch(error){await result.catch(()=>{});throw error;}
});
