export const CAPTCHA_PROVIDER='hcaptcha';
// Published dummy keys give no bot protection and cannot establish release readiness.
export function validHCaptchaSiteKey(value){
 return typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)&&!/^([123])0000000-ffff-ffff-ffff-00000000000\1$/i.test(value)&&value!=='00000000-0000-0000-0000-000000000000';
}
