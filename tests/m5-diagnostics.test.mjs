import test from 'node:test';
import assert from 'node:assert/strict';
import {G1Error} from '../scripts/g1/client.mjs';
import {authDiagnostic,requireCaptchaReplayRejection} from '../scripts/m5/diagnostics.mjs';
test('CAPTCHA diagnostics distinguish rejection, rate limits, network and disabled signups',()=>{
 for(const [status,code,reason] of [[400,'captcha_failed','CAPTCHA_REJECTED'],[429,'over_request_rate_limit','AUTH_RATE_LIMITED'],[503,'NETWORK_OR_TIMEOUT','NETWORK_OR_TIMEOUT'],[422,'anonymous_provider_disabled','ANONYMOUS_SIGNUP_DISABLED'],[500,'unexpected_failure','AUTH_PROVIDER_OR_CONFIG_FAILURE']])assert.equal(authDiagnostic(new G1Error(status,code)).reason,reason);
});
test('unrecognized diagnostics never expose upstream messages, keys or arbitrary error codes',()=>{
 assert.equal(authDiagnostic(Error('CAPTCHA_REPLAY_ACCEPTED')).reason,'CAPTCHA_REPLAY_ACCEPTED');
 assert.equal(authDiagnostic(Error('CAPTCHA_INPUT_TIMEOUT')).reason,'LOCAL_CAPTCHA_INPUT_UNAVAILABLE');
 for(const code of ['PREVIEW_WIDGET_TIMEOUT','PREVIEW_BROWSER_FAILED','CDP_COMMAND_FAILED','OPERATOR_INTERRUPTED'])assert.deepEqual(authDiagnostic(Error(code)),{http_status:null,safe_code:code,reason:'PREVIEW_WIDGET_UNAVAILABLE'});
 for(const error of [new G1Error(400,'private-token-like-value'),Error('private session or provider details')]){const d=authDiagnostic(error);assert.equal(d.safe_code,'UNRECOGNIZED');assert.ok(!JSON.stringify(d).includes('private'));assert.notEqual(d.reason,'CAPTCHA_REJECTED');}
});

test('replay diagnostics keep the actual refusal and never count a rate limit or accepted replay as CAPTCHA rejection',()=>{
 assert.doesNotThrow(()=>requireCaptchaReplayRejection(new G1Error(400,'captcha_failed')));
 assert.throws(()=>requireCaptchaReplayRejection(undefined),/CAPTCHA_REPLAY_ACCEPTED/);
 for(const error of [new G1Error(429,'over_request_rate_limit'),new G1Error(503,'NETWORK_OR_TIMEOUT'),new G1Error(500,'unexpected_failure')])assert.throws(()=>requireCaptchaReplayRejection(error),e=>e===error);
});
