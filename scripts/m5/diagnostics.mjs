import {G1Error} from '../g1/client.mjs';
const known=new Set(['captcha_failed','over_request_rate_limit','over_email_send_rate_limit','anonymous_provider_disabled','signup_disabled','unexpected_failure','validation_failed','NETWORK_OR_TIMEOUT','ANONYMOUS_SESSION_REQUIRED','UNAUTHENTICATED','REQUEST_FAILED']);
export function authDiagnostic(error){
 if(!(error instanceof G1Error)&&error instanceof Error&&error.message==='CAPTCHA_REPLAY_ACCEPTED')return {http_status:null,safe_code:'CAPTCHA_REPLAY_ACCEPTED',reason:'CAPTCHA_REPLAY_ACCEPTED'};
 if(!(error instanceof G1Error)&&error instanceof Error&&['CAPTCHA_INPUT_TIMEOUT','REAL_SITE_KEY_REQUIRED','LOCAL_CAPTCHA_SERVER_FAILED'].includes(error.message))return {http_status:null,safe_code:error.message,reason:'LOCAL_CAPTCHA_INPUT_UNAVAILABLE'};
 const status=error instanceof G1Error&&Number.isInteger(error.status)?error.status:null;
 const code=error instanceof G1Error&&known.has(error.code)?error.code:'UNRECOGNIZED';
 const reason=code==='captcha_failed'?'CAPTCHA_REJECTED':status===429?'AUTH_RATE_LIMITED':code==='NETWORK_OR_TIMEOUT'?'NETWORK_OR_TIMEOUT':['signup_disabled','anonymous_provider_disabled'].includes(code)?'ANONYMOUS_SIGNUP_DISABLED':[401,403].includes(status)?'AUTH_CONFIG_OR_SESSION_REJECTED':code==='unexpected_failure'?'AUTH_PROVIDER_OR_CONFIG_FAILURE':'UNVERIFIED_AUTH_FAILURE';
 return {http_status:status,safe_code:code,reason};
}

export function requireCaptchaReplayRejection(error){
 if(!error)throw Error('CAPTCHA_REPLAY_ACCEPTED');
 if(!(error instanceof G1Error&&error.code==='captcha_failed'))throw error;
}
