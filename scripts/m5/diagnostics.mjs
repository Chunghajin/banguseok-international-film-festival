import {G1Error} from '../g1/client.mjs';
const known=new Set(['captcha_failed','over_request_rate_limit','over_email_send_rate_limit','anonymous_provider_disabled','signup_disabled','unexpected_failure','validation_failed','NETWORK_OR_TIMEOUT','ANONYMOUS_SESSION_REQUIRED','UNAUTHENTICATED','REQUEST_FAILED']);
const previewCodes=new Set(['CAPTCHA_TOKEN_MISSING','CAPTCHA_TOKEN_EXPIRED','CAPTCHA_TOKEN_REUSED','CAPTCHA_NEW_CHALLENGE_REQUIRED','CAPTCHA_REPLAY_NOT_ALLOWED','PREVIEW_ORIGIN_MISMATCH','PREVIEW_SITEKEY_MISMATCH','PREVIEW_CONFIG_MISMATCH','PREVIEW_PROBE_ACCESS_REJECTED','PREVIEW_PROBE_VERSION_MISMATCH','PREVIEW_WIDGET_EXPIRED','PREVIEW_WIDGET_ERROR','PREVIEW_WIDGET_SITEKEY_ERROR','PREVIEW_WIDGET_NETWORK_ERROR','PREVIEW_WIDGET_RATE_LIMITED','PREVIEW_WIDGET_PROVIDER_ERROR','PREVIEW_SESSION_MISSING','PREVIEW_SESSION_INVALID','CAPTCHA_REQUIRED','CAPTCHA_FAILED','ORIGIN_REJECTED','RATE_LIMITED','INVALID_INPUT','INVALID_NICKNAME','INVALID_SELECTION','INVALID_SURVEY','INVALID_VERSION','PROTECTION_REQUIRED']);
export function authDiagnostic(error){
 if(error instanceof Error&&previewCodes.has(error.message))return {http_status:null,safe_code:error.message,reason:error.message};
 if(!(error instanceof G1Error)&&error instanceof Error&&error.message==='CAPTCHA_REPLAY_ACCEPTED')return {http_status:null,safe_code:'CAPTCHA_REPLAY_ACCEPTED',reason:'CAPTCHA_REPLAY_ACCEPTED'};
 if(!(error instanceof G1Error)&&error instanceof Error&&['CAPTCHA_INPUT_TIMEOUT','REAL_SITE_KEY_REQUIRED','LOCAL_CAPTCHA_SERVER_FAILED'].includes(error.message))return {http_status:null,safe_code:error.message,reason:'LOCAL_CAPTCHA_INPUT_UNAVAILABLE'};
 if(!(error instanceof G1Error)&&error instanceof Error&&['PREVIEW_WIDGET_TIMEOUT','PREVIEW_BROWSER_FAILED','PREVIEW_WIDGET_EVALUATION_FAILED','CDP_CONNECTION_FAILED','CDP_COMMAND_FAILED','CDP_NAVIGATION_CONTEXT','CDP_TIMEOUT','CHROME_TIMEOUT','CHROME_START_FAILED','OPERATOR_INTERRUPTED'].includes(error.message))return {http_status:null,safe_code:error.message,reason:'PREVIEW_WIDGET_UNAVAILABLE'};
 const status=error instanceof G1Error&&Number.isInteger(error.status)?error.status:null;
 const code=error instanceof G1Error&&(known.has(error.code)||previewCodes.has(error.code))?error.code:'UNRECOGNIZED';
 const reason=code==='ORIGIN_REJECTED'?'ORIGIN_REJECTED':status===429?(code==='RATE_LIMITED'?'APP_RATE_LIMITED':'AUTH_RATE_LIMITED'):['captcha_failed','CAPTCHA_FAILED'].includes(code)?'CAPTCHA_REJECTED':code==='NETWORK_OR_TIMEOUT'?'NETWORK_OR_TIMEOUT':['signup_disabled','anonymous_provider_disabled'].includes(code)?'ANONYMOUS_SIGNUP_DISABLED':[401,403].includes(status)?'AUTH_CONFIG_OR_SESSION_REJECTED':code==='unexpected_failure'?'AUTH_PROVIDER_OR_CONFIG_FAILURE':status>=500?'PROVIDER_OR_SERVICE_UNAVAILABLE':previewCodes.has(code)?code:'UNVERIFIED_AUTH_FAILURE';
 return {http_status:status,safe_code:code,reason};
}

const phases=new Set(['fixture','preflight','browser-start','budget-shared','budget-window','public-rpc-denial','invalid-captcha','provider-challenge','provider-signup','provider-session','provider-replay','provider-cleanup','activation','session-challenge','session-create','session-verify','session-replay','flow','flow-cleanup','final-checks']);
export function createPreviewSteps({emit=event=>console.log(JSON.stringify(event)),fetcher=fetch,now=Date.now}={}){
 let phase='preflight',failure=null;
 const diagnostic=e=>({...authDiagnostic(e),...(['captcha_failed','CAPTCHA_FAILED'].includes(authDiagnostic(e).safe_code)?{unconfirmed_causes:['expired','already-consumed','hostname-or-sitekey','provider-rejection']}: {})});
 return {
  get failure(){return failure;},
  async run(name,action){
   if(!phases.has(name))throw Error('INVALID_DIAGNOSTIC_PHASE');const previous=phase;phase=name;emit({phase,event:'start'});
   try{const value=await action();emit({phase,event:'complete'});return value;}
   catch(error){const event={phase,event:'failed',...diagnostic(error)};failure??=event;emit(event);throw error;}
   finally{phase=previous;}
  },
  async fetch(input,options){
   const current=phase,start=now();emit({phase:current,event:'request-start'});
   try{const response=await fetcher(input,options);emit({phase:current,event:'response',http_status:response.status,elapsed_ms:Math.max(0,now()-start)});return response;}
   catch(error){const raw=error?.cause?.code??error?.name;const type=['AbortError','TimeoutError','ENOTFOUND','ECONNRESET','ECONNREFUSED','ETIMEDOUT'].includes(raw)?raw:'TRANSPORT_ERROR';emit({phase:current,event:'transport-failed',http_status:null,error_type:type,elapsed_ms:Math.max(0,now()-start)});throw error;}
  },
 };
}

export function requireCaptchaReplayRejection(error){
 if(!error)throw Error('CAPTCHA_REPLAY_ACCEPTED');
 if(!(error instanceof G1Error&&error.code==='captcha_failed'))throw error;
}
