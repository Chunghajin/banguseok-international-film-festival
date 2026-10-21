import {NextResponse,type NextRequest} from 'next/server';
import {createRequestProtection,protectionResponse} from './lib/request-protection';
export async function proxy(request:NextRequest){
 if(process.env.NODE_ENV==='development'||!/^\/f\/[A-Za-z0-9_-]{43}$/.test(request.nextUrl.pathname))return NextResponse.next();
 try{await createRequestProtection().start(request,'public');return NextResponse.next();}
 catch(error){return protectionResponse(error)??new Response(null,{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
export const config={matcher:'/f/:path*'};
