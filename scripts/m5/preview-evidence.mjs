import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';

export async function revokePreviewRun(core,fingerprint,verifiedAt,execute=false){
 assert.match(fingerprint,/^[a-f0-9]{64}$/);
 assert.match(verifiedAt,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
 assert.ok(Number.isFinite(Date.parse(verifiedAt)));
 const path=`/rest/v1/request_protection_checks?environment=eq.preview&fingerprint=eq.${fingerprint}&verified_at=eq.${encodeURIComponent(verifiedAt)}`;
 const rows=await core.request(path+'&select=verified_at',{admin:true});assert.ok(Array.isArray(rows)&&rows.length<=1);
 if(execute){await core.request(path,{admin:true,method:'DELETE'});assert.deepEqual(await core.request(path+'&select=verified_at',{admin:true}),[]);}
 return {matched:rows.length,executed:execute};
}

// No upsert: refuse existing evidence, including another operator's concurrent run.
export async function withPreviewEvidence(core,fingerprint,check){
 assert.match(fingerprint,/^[a-f0-9]{64}$/);
 const base=`/rest/v1/request_protection_checks?environment=eq.preview&fingerprint=eq.${fingerprint}`;
 assert.deepEqual(await core.request(base+'&select=verified_at',{admin:true}),[],'Existing Preview evidence; do not overwrite');
 const verifiedAt=new Date().toISOString().slice(0,-1)+String(randomBytes(2).readUInt16BE()%1000).padStart(3,'0')+'Z';
 const owned=base+`&verified_at=eq.${encodeURIComponent(verifiedAt)}`;
 console.log(`EVIDENCE ATTEMPT: preview verified_at=${verifiedAt}; retain this timestamp for recovery.`);
 let completed=false;
 try{
  // Mark ownership before POST: a transport timeout may hide a successful insert.
  await core.request('/rest/v1/request_protection_checks',{admin:true,method:'POST',body:{environment:'preview',fingerprint,policy_version:'m5a-v1',verified_at:verifiedAt},prefer:'return=minimal'});
  await check();completed=true;
 }finally{
  if(!completed){
   let revoked=false;
   for(let attempt=0;attempt<3;attempt++){
    try{await core.request(owned,{admin:true,method:'DELETE'});assert.deepEqual(await core.request(owned+'&select=verified_at',{admin:true}),[]);revoked=true;break;}catch{ /* Retry only this run's exact Preview row. */ }
   }
   if(!revoked)throw Error('PREVIEW_REVOCATION_FAILED_MANUAL_RECOVERY_REQUIRED');
  }
 }
}
