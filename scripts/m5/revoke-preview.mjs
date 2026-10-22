import {previewConfiguration} from '../../src/lib/m5-preview.ts';
import {createG1Client} from '../g1/client.mjs';
import {revokePreviewRun} from './preview-evidence.mjs';

const [mode,verifiedAt,...extra]=process.argv.slice(2);
if(extra.length||!['--check','--execute'].includes(mode)||!verifiedAt||process.env.M5_VERIFY_ENV!=='preview'||(mode==='--execute'&&process.env.M5_ALLOW_PREVIEW_REVOCATION!=='yes')){
 console.error('NOT RUN: --check|--execute <exact verified_at>, preview environment, and separate revocation consent for execution required.');process.exit(2);
}
try{
 const config=previewConfiguration(process.env),core=createG1Client(process.env);
 const result=await revokePreviewRun(core,config.fingerprint,verifiedAt,mode==='--execute');
 console.log(`PASS: exact Preview run rows=${result.matched}; deletion=${result.executed}; other evidence untouched.`);
}catch{console.error('FAIL: Preview run check/revocation; raw data and credentials suppressed.');process.exitCode=1;}
