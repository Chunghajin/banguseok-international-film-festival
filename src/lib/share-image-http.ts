import 'server-only';
import {createFestivalService, publicSnapshot, type PublicFestival} from './festivals-server.ts';
import {G1Error} from './supabase-core.mjs';
import {createRequestProtection, protectionResponse} from './request-protection.ts';

const headers = {'Cache-Control':'private, no-store, max-age=0', 'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff', 'X-Robots-Tag':'noindex, nofollow'};

export function createShareImageHttp({render, read = (token:string) => createFestivalService().publicRead(token),
  protection = createRequestProtection(), environment = process.env.NODE_ENV}: {
  render:(snapshot:PublicFestival)=>Promise<ArrayBuffer>;
  read?:(token:string)=>Promise<PublicFestival>;
  protection?:Pick<ReturnType<typeof createRequestProtection>, 'start'>;
  environment?:string;
}) {
  return async (request:Request, token:string) => {
    try {
      if (environment !== 'development') {
        await protection.start(request, 'png');
        await protection.start(request, 'public');
      }
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new G1Error(404, 'NOT_FOUND');
      // Only the published allowlist crosses into the renderer; never accept browser result data.
      const snapshot = publicSnapshot(await read(token));
      const png = await render(snapshot);
      // A slow render must not outlive revocation, deletion or replacement of its published snapshot.
      const current = publicSnapshot(await read(token));
      if (JSON.stringify(current) !== JSON.stringify(snapshot)) {
        return Response.json({code:'PUBLIC_RESULT_CHANGED', message:'공개 결과가 바뀌었어요. PNG를 다시 만들어 주세요.'}, {status:409, headers});
      }
      return new Response(png, {headers:{...headers, 'Content-Type':'image/png',
        'Content-Disposition':'attachment; filename="banguseok-festival.png"'}});
    } catch (error) {
      const protectedResponse = protectionResponse(error);
      if (protectedResponse) return protectedResponse;
      if (error instanceof G1Error && error.status === 404) {
        return Response.json({code:'NOT_FOUND', message:'공개 중인 결과를 찾을 수 없어요.'}, {status:404, headers});
      }
      return Response.json({code:'PNG_FAILED', message:'이미지를 만들지 못했어요. 결과 화면은 계속 볼 수 있어요. 잠시 후 다시 시도해 주세요.'}, {status:503, headers});
    }
  };
}
