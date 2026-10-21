import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
export async function checkArtifacts(values){
 const needles=[...new Set(values.filter(v=>typeof v==='string'&&v.length>10))].map(v=>Buffer.from(v));let files=0;
 async function scan(path){let entries;try{entries=await readdir(path,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}
  for(const entry of entries){const name=`${path}/${entry.name}`;if(entry.isDirectory())await scan(name);else{const bytes=await readFile(name);for(const secret of needles)assert.ok(!bytes.includes(secret),'SENSITIVE_VALUE_IN_BROWSER_ARTIFACT_OR_LOG');files++;}}
 }
 await scan('.next/static');await scan('.next/dev/static');await scan('.next/dev/logs');assert.ok(files>0);return files;
}
