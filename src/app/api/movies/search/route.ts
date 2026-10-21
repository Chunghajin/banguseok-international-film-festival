import { createTmdbClient, movieErrorResponse } from "@/lib/tmdb";

export async function GET(request: Request) {
  // shortcut: managed request protection is unverified; enable production only after PRD 8 checks.
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  try {
    const params = new URL(request.url).searchParams;
    const result = await createTmdbClient().search(params.get("q") ?? "", params.get("page") ?? "1", request.signal);
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return movieErrorResponse(error); }
}
