import {createHash} from 'node:crypto';

// Tokens stay in closures; only digests are retained to detect reuse across challenges.
export function createCaptchaTokens({now=Date.now,maxAge=90000}={}){
 const seen=new Set(),challenges=new Set();
 return {issue(token,{issuedAt,challenge}={}){
  if(typeof token!=='string'||!token.length||token.length>8000)throw Error('CAPTCHA_TOKEN_MISSING');
  if(!Number.isFinite(issuedAt)||now()-issuedAt<0||now()-issuedAt>maxAge)throw Error('CAPTCHA_TOKEN_EXPIRED');
  if(typeof challenge!=='string'||!challenge||challenges.has(challenge))throw Error('CAPTCHA_NEW_CHALLENGE_REQUIRED');
  const digest=createHash('sha256').update(token).digest('hex');if(seen.has(digest))throw Error('CAPTCHA_TOKEN_REUSED');
  seen.add(digest);challenges.add(challenge);let consumed=false,succeeded=false,replayed=false;
  return {
   async consume(send){
    if(consumed)throw Error('CAPTCHA_TOKEN_REUSED');consumed=true;
    if(now()-issuedAt<0||now()-issuedAt>maxAge)throw Error('CAPTCHA_TOKEN_EXPIRED');
    const result=await send(token);succeeded=true;return result;
   },
   async replay(send){
    // The one intentional negative replay is separate from any normal signup retry.
    if(!succeeded||replayed)throw Error('CAPTCHA_REPLAY_NOT_ALLOWED');replayed=true;
    if(now()-issuedAt<0||now()-issuedAt>maxAge)throw Error('CAPTCHA_TOKEN_EXPIRED');
    return send(token);
   },
  };
 }};
}
