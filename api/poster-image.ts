import { fetchPosterImageBytes } from '../lib/horrorBackend.ts';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url') || '';

  const result = await fetchPosterImageBytes(targetUrl);
  if (!result.ok || !result.buffer) {
    return new Response(result.error || 'No se pudo cargar el cartel', {
      status: result.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      'Content-Type': result.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  });
}
