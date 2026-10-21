import {createFestivalHttp} from '@/lib/festival-http';
export const runtime='nodejs';
const handle=createFestivalHttp();
export function POST(request:Request){return handle(request,['session']);}
