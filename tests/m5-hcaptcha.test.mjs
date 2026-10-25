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

async function componentHarness(){
 const source=await readFile(new URL('../src/components/hcaptcha.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const window={location:{reload:()=>reloads++}},tokens=[],logs=[],hooks=[];
 let cursor=0,pending=[],tasks=[],tree,dirty=false,reloads=0,props={onToken:token=>tokens.push(token)};
 const react={
  useRef:initial=>{const i=cursor++;return hooks[i]??(hooks[i]={current:initial});},
  useState:initial=>{const i=cursor++;if(!hooks[i])hooks[i]={value:initial};return [hooks[i].value,value=>{if(!Object.is(hooks[i].value,value)){hooks[i].value=value;dirty=true;}}];},
  useEffect:(setup,deps)=>{const i=cursor++,previous=hooks[i];if(!previous||deps.some((d,j)=>!Object.is(d,previous.deps[j]))){hooks[i]={setup,deps,cleanup:previous?.cleanup};pending.push(i);}},
 };
 const jsx=(type,props)=>{if(props?.ref&&!props.ref.current)props.ref.current={};return {type,props};};
 const log=(...args)=>{assert.equal(args.length,1);assert.equal(typeof args[0],'string');logs.push(args[0]);};
 const context={exports:{},window,queueMicrotask:fn=>tasks.push(fn),console:{warn:log,info:log},process:{env:{NEXT_PUBLIC_HCAPTCHA_SITE_KEY:siteKey}},require:name=>{
  if(name==='react')return react;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='next/script')return 'Script';if(name==='@/lib/captcha-config.mjs')return {validHCaptchaSiteKey};throw Error('UNEXPECTED_IMPORT');
 }};
 vm.runInNewContext(code,context);const Component=context.exports.default;
 function paint(next=props){props=next;cursor=0;dirty=false;tree=Component(props);return tree;}
 function effects(){const queued=pending;pending=[];for(const i of queued){hooks[i].cleanup?.();hooks[i].cleanup=hooks[i].setup();}for(const task of tasks.splice(0))task();}
 function flush(){do{paint();effects();}while(dirty);return tree;}
 function find(type,node=tree){if(!node||typeof node!=='object')return undefined;if(node.type===type)return node;for(const child of [node.props?.children].flat(Infinity)){const result=child==null?undefined:find(type,child);if(result)return result;}}
 function unmount(){for(const hook of hooks)hook?.cleanup?.();}
 function remount(){unmount();hooks.length=0;pending=[];flush();}
 function strictReplay(){for(const hook of hooks)if(hook?.setup){hook.cleanup?.();hook.cleanup=hook.setup();}flush();}
 let renders=0,removed=[],options=[];
 function sdk(render){window.hcaptcha={render:(element,o)=>{renders++;options.push(o);return render?render(element,o):`widget-${renders}`;},remove:id=>removed.push(id)};}
 return {window,tokens,logs,paint,effects,flush,find,unmount,remount,strictReplay,sdk,context,get renders(){return renders;},removed,options,get reloads(){return reloads;}};
}

test('hCaptcha waits for provider onload even when Script load/ready fires first and SDK is slow',async()=>{
 const h=await componentHarness();h.paint();assert.equal(h.find('Script'),undefined);h.effects();
 assert.equal(typeof h.window.banguseokHCaptchaReady,'function');h.flush();const script=h.find('Script');
 assert.match(script.props.src,/render=explicit&onload=banguseokHCaptchaReady/);assert.equal(script.props.onReady,undefined);assert.equal(script.props.onLoad,undefined);
 h.sdk();h.flush();assert.equal(h.renders,0); // window.hcaptcha alone is not a readiness signal.
 const ready=h.window.banguseokHCaptchaReady;ready();assert.equal(h.renders,1);ready();assert.equal(h.renders,1);
 h.flush();assert.equal(h.renders,1);h.unmount();assert.deepEqual(h.removed,['widget-1']);
});

test('hCaptcha handles provider onload before Script mount, StrictMode replay and stale widget callbacks',async()=>{
 const h=await componentHarness();h.paint();h.effects();h.sdk();h.window.banguseokHCaptchaReady();
 h.flush();assert.equal(h.renders,1);const old=h.options[0];
 h.strictReplay();assert.equal(h.renders,2);assert.deepEqual(h.removed,['widget-1']);
 old.callback('stale-token');old['error-callback']('secret');assert.equal(h.tokens.length,0);
 const current=h.options[1];current.callback('fresh-token');assert.equal(h.tokens.at(-1),'fresh-token');current['expired-callback']();assert.equal(h.tokens.at(-1),'');
 current.callback('fresh-token');current['chalexpired-callback']();assert.equal(h.tokens.at(-1),'');
 h.unmount();const count=h.tokens.length;current.callback('late-token');assert.equal(h.tokens.length,count);assert.deepEqual(h.removed,['widget-1','widget-2']);
});

test('hCaptcha remembers readiness across route remount without retaining component listeners',async()=>{
 const h=await componentHarness();h.flush();const ready=h.window.banguseokHCaptchaReady;h.unmount();h.sdk();ready();assert.equal(h.renders,0);
 // A new component instance shares the loaded module, just as a route remount does.
 h.remount();assert.equal(h.renders,1);h.unmount();ready();assert.equal(h.renders,1);
 assert.equal(h.window.banguseokHCaptchaReady,undefined);
});

test('hCaptcha reports render failures without credentials and recovers on a ready retry',async()=>{
 const h=await componentHarness();h.flush();h.sdk(()=>{throw Error('DO-NOT-LOG-token-or-credentials');});
 const ready=h.window.banguseokHCaptchaReady;ready();h.flush();assert.ok(h.find('button'));assert.equal(h.tokens.at(-1),'');
 assert.ok(h.logs.includes('[hCaptcha] stage=render code=exception'));assert.doesNotMatch(JSON.stringify(h.logs),/DO-NOT-LOG/);
 h.find('button').props.onClick();assert.equal(h.reloads,1);
 h.sdk();ready();h.flush();assert.equal(h.renders,2);assert.equal(h.find('button'),undefined);h.unmount();assert.deepEqual(h.removed,['widget-2']);
});

test('hCaptcha rejects invalid widget IDs, reports provider/script failures and ignores late script events',async()=>{
 const h=await componentHarness();h.flush();const script=h.find('Script');script.props.onError({message:'DO-NOT-LOG'});h.flush();assert.ok(h.find('button'));
 h.sdk(()=>undefined);const ready=h.window.banguseokHCaptchaReady;ready();h.flush();assert.ok(h.find('button'));
 h.sdk();ready();h.flush();h.options.at(-1)['error-callback']('DO-NOT-LOG');h.flush();assert.ok(h.find('button'));assert.equal(h.logs.at(-1),'[hCaptcha] stage=provider code=unknown');
 h.options.at(-1).callback('recovered-token');h.flush();assert.equal(h.find('button'),undefined);
 h.unmount();const length=h.logs.length;script.props.onError();assert.equal(h.logs.length,length);assert.doesNotMatch(JSON.stringify(h.logs),/DO-NOT-LOG|recovered-token/);
});

test('hCaptcha invalid sitekey does not load the SDK',async()=>{
 const h=await componentHarness();h.context.process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY='';h.flush();assert.equal(h.find('Script'),undefined);assert.equal(h.find('p').props.role,'alert');assert.equal(h.window.banguseokHCaptchaReady,undefined);h.unmount();
});

test('diagnostics distinguish SDK readiness and valid render return from a verification callback',async()=>{
 const h=await componentHarness();h.flush();
 assert.deepEqual(h.logs,['[hCaptcha] stage=lifecycle code=mounted','[hCaptcha] stage=script code=requested']);
 h.sdk(()=> 'private-widget-id');h.window.banguseokHCaptchaReady();h.flush();
 assert.deepEqual(h.logs.slice(-3),['[hCaptcha] stage=sdk code=ready','[hCaptcha] stage=render code=started','[hCaptcha] stage=render code=returned-awaiting-callback']);
 assert.equal(h.tokens.length,0);assert.equal(h.logs.some(l=>l.includes('stage=widget')),false);
 h.options[0].callback('PRIVATE-CAPTCHA-TOKEN');h.flush();assert.equal(h.logs.at(-1),'[hCaptcha] stage=widget code=token-received');
 assert.doesNotMatch(JSON.stringify(h.logs),/PRIVATE|private-widget-id/);h.unmount();
});

test('diagnostics distinguish script failure, render exceptions and invalid return values without logging payloads',async()=>{
 const script=await componentHarness();script.flush();script.find('Script').props.onError({message:'PRIVATE-CREDENTIAL',url:'https://private.invalid/?cookie=PRIVATE'});
 assert.equal(script.logs.at(-1),'[hCaptcha] stage=script code=load-error');assert.doesNotMatch(JSON.stringify(script.logs),/PRIVATE|https/);script.unmount();
 const thrown=await componentHarness();thrown.flush();thrown.sdk(()=>{throw {message:'PRIVATE-TOKEN',url:'https://private.invalid/?key=PRIVATE'};});thrown.window.banguseokHCaptchaReady();
 assert.equal(thrown.logs.at(-1),'[hCaptcha] stage=render code=exception');assert.doesNotMatch(JSON.stringify(thrown.logs),/PRIVATE|https/);thrown.unmount();
 for(const value of [undefined,null,'',0,{},Symbol('PRIVATE')]){
  const h=await componentHarness();h.flush();h.sdk(()=>value);h.window.banguseokHCaptchaReady();
  assert.equal(h.logs.at(-1),'[hCaptcha] stage=render code=invalid-widget-id');assert.equal(h.logs.some(l=>l.includes('returned-awaiting-callback')),false);h.unmount();
 }
});

test('provider diagnostics preserve only exact official error codes and never inspect unknown objects',async()=>{
 const h=await componentHarness();h.flush();h.sdk();h.window.banguseokHCaptchaReady();
 const callback=h.options[0]['error-callback'];
 for(const code of ['rate-limited','network-error','invalid-data','challenge-error','challenge-closed','challenge-expired','missing-captcha','invalid-captcha-id','internal-error','script-error']){
  callback(code);assert.equal(h.logs.at(-1),'[hCaptcha] stage=provider code='+code);
 }
 const hostile=new Proxy({}, {get:()=>{throw Error('OBJECT_MUST_NOT_BE_INSPECTED');}});
 for(const value of [undefined,null,1,{},['network-error'],Object('network-error'),hostile,Error('PRIVATE'),{code:'network-error',token:'PRIVATE'},'network-error\nPRIVATE','NETWORK-ERROR','https://private.invalid/?token=PRIVATE','PRIVATE']){
  assert.doesNotThrow(()=>callback(value));assert.equal(h.logs.at(-1),'[hCaptcha] stage=provider code=unknown');
 }
 assert.doesNotMatch(JSON.stringify(h.logs),/PRIVATE|private\.invalid|11111111-2222|OBJECT_MUST/);h.unmount();
});

test('diagnostics survive ready remounts and ignore all obsolete widget callbacks',async()=>{
 const h=await componentHarness();h.flush();h.sdk();h.window.banguseokHCaptchaReady();const old=h.options[0];h.remount();
 assert.ok(h.logs.includes('[hCaptcha] stage=lifecycle code=unmounted'));assert.ok(h.logs.includes('[hCaptcha] stage=script code=already-ready'));assert.equal(h.renders,2);
 const length=h.logs.length;old.callback('PRIVATE');old['error-callback']('network-error');old['expired-callback']();assert.equal(h.logs.length,length);
 h.options[1]['error-callback']('network-error');assert.equal(h.logs.at(-1),'[hCaptcha] stage=provider code=network-error');h.unmount();
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
