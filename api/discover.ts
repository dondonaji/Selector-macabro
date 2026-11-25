import { discoverHorrorFilms, type DiscoverRequestBody } from '../lib/horrorBackend.ts';

export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  let body: DiscoverRequestBody = {};
  try {
    body = (await request.json()) as DiscoverRequestBody;
  } catch {
    body = {};
  }

  const result = await discoverHorrorFilms(body);
  if (!result.ok || !result.data) {
    return Response.json(
      { error: result.error || 'Error al buscar sugerencias en internet.' },
      { status: result.status }
    );
  }

  return Response.json(result.data, { status: 200 });
}
