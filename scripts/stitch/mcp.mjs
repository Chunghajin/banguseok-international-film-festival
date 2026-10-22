// Official Google SDK stdio proxy; the credential file is excluded from Git and Vercel.
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {StitchProxy} from '../../artifacts/stitch-tools/node_modules/@google/stitch-sdk/dist/src/index.js';
import {StdioServerTransport} from '../../artifacts/stitch-tools/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';

try{
 const {STITCH_API_KEY:apiKey}=parseEnv(await readFile(new URL('../../.env.stitch.local',import.meta.url),'utf8'));
 if(!apiKey)throw Error();
 const proxy=new StitchProxy({apiKey});
 await proxy.start(new StdioServerTransport());
}catch{
 console.error('Stitch connection failed; check the ignored local credential file and SDK installation.');
 process.exitCode=1;
}
