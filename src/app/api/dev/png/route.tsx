import { createRequestProtection, protectionResponse } from "@/lib/request-protection";
import { ImageResponse } from "next/og";
import G3Card from "@/components/g3-card";
import { g3Font, g3Poster } from "@/lib/g3-assets";
import { g3Enabled, g3Input, G3_MOVIES } from "@/lib/g3-fixture";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(request: Request) {
  if (!g3Enabled()) return new Response(null, { status: 404 });
  if(process.env.NODE_ENV!=='development'){try{await createRequestProtection().start(request,'png');}catch(error){return protectionResponse(error)??new Response(null,{status:503});}}
  let input;
  try { input = g3Input(new URL(request.url).searchParams); }
  catch { return Response.json({ code: "INVALID_G3_CASE" }, { status: 400 }); }
  try {
    if (input.mode === "render-error") throw new Error("INTENTIONAL_RENDER_FAILURE");
    const font = input.mode === "font-error" ? new Uint8Array([0]).buffer : await g3Font();
    const posters = await Promise.all(G3_MOVIES.map(movie => {
      if (input.mode === "text" || input.mode === "missing") return null;
      return g3Poster(input.mode === "poster-error" ? "/g3-deliberately-missing-image.jpg" : movie.poster_path);
    }));
    // eslint-disable-next-line react-hooks/error-boundaries -- The renderer stream is consumed by arrayBuffer inside this catch.
    const image = new ImageResponse(<G3Card posters={posters} count={input.count} />, {
      width: 1080, height: 1920,
      fonts: [{ name: "G3Nanum", data: font, weight: 400, style: "normal" }],
    });
    // ImageResponse can fail while streaming; finish rendering before returning HTTP 200.
    const png = await image.arrayBuffer();
    return new Response(png, { headers: {
      "Content-Type": "image/png", "Content-Disposition": 'attachment; filename="banguseok-g3.png"',
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "X-G3-Posters": String(posters.filter(Boolean).length),
    } });
  } catch {
    return Response.json({ code: "PNG_PROBE_FAILED", message: "PNG 생성에 실패했어요. HTML 화면은 계속 볼 수 있어요.", retryable: true },
      { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
