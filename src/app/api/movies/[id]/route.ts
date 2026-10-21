import { createTmdbClient, movieErrorResponse } from "@/lib/tmdb";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  try {
    const { id } = await params;
    const movie = await createTmdbClient().detail(id, request.signal);
    return Response.json(movie, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return movieErrorResponse(error); }
}
