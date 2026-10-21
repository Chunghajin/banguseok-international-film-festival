import {createFestivalHttp} from '@/lib/festival-http';
export const runtime='nodejs';
const handle=createFestivalHttp();
async function route(request:Request,{params}:{params:Promise<{path?:string[]}>}){const {path}=await params;return handle(request,path??[]);}
export {route as GET,route as POST,route as DELETE};
