import { resolveFilmPoster } from '../lib/horrorBackend.ts';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || undefined;
  const title = url.searchParams.get('title') || '';
  const originalTitle = url.searchParams.get('originalTitle') || undefined;
  const yearParam = url.searchParams.get('year');
  const yearRaw = yearParam ? Number(yearParam) : undefined;
  const director = url.searchParams.get('director') || undefined;

  if (!title) {
    return Response.json(
      { error: 'Falta el título de la película.' },
      { status: 400 }
    );
  }

  const result = await resolveFilmPoster({
    id,
    title,
    originalTitle,
    year: yearRaw !== undefined && Number.isFinite(yearRaw) ? yearRaw : undefined,
    director,
  });

  return Response.json(result, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
