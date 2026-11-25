import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const WIKI_UA = 'SelectorMacabro/1.0 (horror-cinema-selector; educational-archive)';

export interface CachedPoster {
  posterUrl: string | null;
  rawUrl: string | null;
  source: string | null;
  pageUrl: string | null;
}

export interface DiscoverRequestBody {
  branchId?: string;
  branchName?: string;
  subgenreId?: string;
  subgenreName?: string;
  focusId?: string;
  focusName?: string;
  era?: string;
  pacing?: string;
  gore?: string;
  customQuery?: string;
  excludeTitles?: string[];
}

const posterCache = new Map<string, CachedPoster>();

// Load pre-warmed poster cache if present (works in both Node local server and Vercel)
const cacheCandidates = [
  path.join(process.cwd(), 'poster-cache.json'),
  path.resolve(__dirname, '..', 'poster-cache.json'),
];

for (const candidatePath of cacheCandidates) {
  try {
    if (fs.existsSync(candidatePath)) {
      const raw = JSON.parse(fs.readFileSync(candidatePath, 'utf8')) as Record<string, CachedPoster>;
      for (const [key, val] of Object.entries(raw)) {
        if (val?.posterUrl) {
          posterCache.set(key, val);
        }
      }
      break;
    }
  } catch {
    // Ignore invalid cache file gracefully
  }
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface FetchJsonResult {
  status: number;
  data: unknown;
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs = 5000,
  retryOnRateLimit = false
): Promise<FetchJsonResult> {
  const maxAttempts = retryOnRateLimit ? 2 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': WIKI_UA },
        signal: controller.signal,
      });
      if (res.status === 429 && retryOnRateLimit && attempt < maxAttempts - 1) {
        clearTimeout(timer);
        const retryAfterSec = Math.min(Number(res.headers.get('retry-after')) || 3, 5);
        await new Promise((r) => setTimeout(r, retryAfterSec * 1000));
        continue;
      }
      if (!res.ok) return { status: res.status, data: null };
      return { status: res.status, data: await res.json() };
    } catch {
      return { status: 0, data: null };
    } finally {
      clearTimeout(timer);
    }
  }

  return { status: 429, data: null };
}

// Polite sequential queue for Wikipedia API lookups to avoid 429 bursts
let wikiQueue: Promise<unknown> = Promise.resolve();
function enqueueWikiTask<T>(fn: () => Promise<T>): Promise<T> {
  const next = wikiQueue.then(async () => {
    const res = await fn();
    await new Promise((r) => setTimeout(r, 180));
    return res;
  });
  wikiQueue = next.catch(() => {});
  return next;
}

function isDisallowedArticleTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes('(franchise)') ||
    lower.includes('(disambiguation)') ||
    lower.includes('(desambiguación)') ||
    lower.includes('(soundtrack)') ||
    lower.includes('(banda sonora)') ||
    lower.includes('(novel)') ||
    lower.includes('(novela)') ||
    lower.includes('(video game)') ||
    lower.includes('(videojuego)') ||
    lower.includes('(tv series)') ||
    lower.includes('(serie de televisión)') ||
    lower.includes('(album)') ||
    lower.includes('(book)') ||
    lower.includes('(band)') ||
    lower.includes('(character)')
  );
}

interface WikiSearchPage {
  pageid?: number;
  title?: string;
  index?: number;
  canonicalurl?: string;
  extract?: string;
  original?: {
    source?: string;
    width?: number;
    height?: number;
  };
}

function isValidPosterUrl(url: string, width?: number, height?: number): boolean {
  const clean = url.split('?')[0].toLowerCase();
  if (!clean.startsWith('https://upload.wikimedia.org/')) return false;
  if (
    clean.endsWith('.svg') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.ogv') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.pdf')
  ) {
    return false;
  }
  if (clean.includes('logo') && width && height && width > height * 1.4) return false;
  if (width && width < 150) return false;
  return true;
}

function scoreWikiCandidate(
  page: WikiSearchPage,
  filmTitles: string[],
  year?: number,
  director?: string
): number {
  const title = (page.title || '').toLowerCase();
  const extract = (page.extract || '').toLowerCase();
  if (!title || isDisallowedArticleTitle(title)) return -1000;

  let score = 0;
  const yearStr = year ? String(year) : '';
  const directorLast = director ? director.trim().split(/\s+/).pop()?.toLowerCase() || '' : '';

  const isFilmPage =
    title.includes('(film)') ||
    title.includes('film)') ||
    title.includes('(película') ||
    extract.includes(' film') ||
    extract.includes('película') ||
    extract.includes('directed by') ||
    extract.includes('dirigida por') ||
    extract.includes('dirigido por');

  if (!isFilmPage) score -= 40;
  else score += 30;

  if (yearStr) {
    if (title.includes(yearStr)) score += 35;
    if (extract.includes(yearStr)) score += 30;
    else if (year && (extract.match(/\b(19\d\d|20\d\d)\b/)?.[0] ?? yearStr) !== yearStr) {
      // Different release year mentioned prominently
      score -= 15;
    }
  }

  if (directorLast.length >= 3 && extract.includes(directorLast)) {
    score += 35;
  }

  for (const candidateTitle of filmTitles) {
    const cleanTarget = candidateTitle.toLowerCase().trim();
    if (!cleanTarget) continue;
    const basePageTitle = title.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (basePageTitle === cleanTarget) {
      score += 45;
      break;
    }
    if (basePageTitle.includes(cleanTarget) || cleanTarget.includes(basePageTitle)) {
      score += 20;
    }
  }

  if (page.original?.source && isValidPosterUrl(page.original.source, page.original.width, page.original.height)) {
    score += 15;
    if (page.original.height && page.original.width && page.original.height >= page.original.width) {
      score += 10;
    }
  }

  return score;
}

async function resolveInfoboxPosterFallback(
  baseApi: string,
  pageTitle: string,
  retryOnRateLimit = false
): Promise<{ rawUrl: string | null; rateLimited: boolean }> {
  const contentUrl =
    `${baseApi}?action=query&titles=${encodeURIComponent(pageTitle)}` +
    `&prop=revisions&rvprop=content&rvslots=main&rvsection=0&format=json&formatversion=2`;
  const contentRes = await fetchJsonWithTimeout(contentUrl, 5500, retryOnRateLimit);
  if (contentRes.status === 429) return { rawUrl: null, rateLimited: true };

  const contentData = contentRes.data as {
    query?: {
      pages?: Array<{
        revisions?: Array<{ slots?: { main?: { content?: string } } }>;
      }>;
    };
  } | null;

  const wikitext = contentData?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content ?? '';
  if (!wikitext) return { rawUrl: null, rateLimited: false };

  const imageMatch =
    wikitext.match(/\|\s*(?:image|imagen)\s*=\s*([^\n|\r}]+)/i) ??
    wikitext.match(/\[\[(?:File|Archivo|Image):([^|\]]+)/i);

  let fileName = imageMatch?.[1]?.trim() ?? '';
  fileName = fileName
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\[\[(?:File|Archivo|Image):/i, '')
    .replace(/\|.*$/, '')
    .replace(/\]\]$/, '')
    .trim();

  if (!fileName || fileName.toLowerCase().endsWith('.svg')) {
    return { rawUrl: null, rateLimited: false };
  }

  const cleanFileTitle =
    fileName.startsWith('File:') || fileName.startsWith('Archivo:')
      ? fileName.replace(/^Archivo:/i, 'File:')
      : `File:${fileName}`;

  const infoUrl =
    `${baseApi}?action=query&titles=${encodeURIComponent(cleanFileTitle)}` +
    `&prop=imageinfo&iiprop=url|size&format=json&formatversion=2`;
  const infoRes = await fetchJsonWithTimeout(infoUrl, 5500, retryOnRateLimit);
  if (infoRes.status === 429) return { rawUrl: null, rateLimited: true };

  const infoData = infoRes.data as {
    query?: {
      pages?: Array<{ imageinfo?: Array<{ url?: string; width?: number; height?: number }> }>;
    };
  } | null;

  const imgInfo = infoData?.query?.pages?.[0]?.imageinfo?.[0];
  if (!imgInfo?.url) return { rawUrl: null, rateLimited: false };

  const rawUrl = imgInfo.url.split('?')[0];
  if (!isValidPosterUrl(rawUrl, imgInfo.width, imgInfo.height)) {
    return { rawUrl: null, rateLimited: false };
  }

  return { rawUrl, rateLimited: false };
}

async function resolveWikiPoster(
  lang: 'en' | 'es',
  queries: string[],
  filmTitles: string[],
  year?: number,
  director?: string,
  retryOnRateLimit = false
): Promise<{ poster: CachedPoster | null; rateLimited: boolean }> {
  const baseApi = `https://${lang}.wikipedia.org/w/api.php`;
  let rateLimited = false;

  for (const query of queries) {
    if (!query.trim()) continue;
    const searchUrl =
      `${baseApi}?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}` +
      `&gsrlimit=5&prop=pageimages|extracts|info&pilicense=any&piprop=original` +
      `&exintro=1&explaintext=1&exsentences=2&exlimit=5&inprop=url&format=json`;
    const searchRes = await fetchJsonWithTimeout(searchUrl, 5500, retryOnRateLimit);
    if (searchRes.status === 429) {
      rateLimited = true;
      break;
    }

    const searchData = searchRes.data as {
      query?: { pages?: Record<string, WikiSearchPage> };
    } | null;

    const pages = searchData?.query?.pages ? Object.values(searchData.query.pages) : [];
    if (pages.length === 0) continue;

    const ranked = pages
      .map((page) => ({
        page,
        score: scoreWikiCandidate(page, filmTitles, year, director),
      }))
      .filter((item) => item.score >= 15)
      .sort((a, b) => b.score - a.score);

    for (const { page } of ranked.slice(0, 2)) {
      if (!page.title) continue;
      let rawUrl: string | null = null;

      if (
        page.original?.source &&
        isValidPosterUrl(page.original.source, page.original.width, page.original.height)
      ) {
        rawUrl = page.original.source.split('?')[0];
      } else {
        const fallback = await resolveInfoboxPosterFallback(baseApi, page.title, retryOnRateLimit);
        if (fallback.rateLimited) {
          rateLimited = true;
          break;
        }
        rawUrl = fallback.rawUrl;
      }

      if (rawUrl) {
        return {
          poster: {
            posterUrl: `/api/poster-image?url=${encodeURIComponent(rawUrl)}`,
            rawUrl,
            source: lang === 'en' ? 'Wikipedia (Cartel teatral)' : 'Wikipedia ES (Cartel teatral)',
            pageUrl:
              page.canonicalurl ||
              `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
          },
          rateLimited: false,
        };
      }
    }

    if (rateLimited) break;
  }

  return { poster: null, rateLimited };
}

interface WikiRestSummary {
  type?: string;
  title?: string;
  extract?: string;
  wikibase_item?: string;
  originalimage?: {
    source?: string;
    width?: number;
    height?: number;
  };
  thumbnail?: {
    source?: string;
    width?: number;
    height?: number;
  };
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
}

async function resolveWikiRestSummary(
  lang: 'en' | 'es',
  titleCandidates: string[],
  year?: number,
  director?: string,
  retryOnRateLimit = false
): Promise<{ poster: CachedPoster | null; wikibaseItem?: string; rateLimited: boolean }> {
  const baseRest = `https://${lang}.wikipedia.org/api/rest_v1/page/summary`;
  const yearStr = year ? String(year) : '';
  const directorLast = director ? director.trim().split(/\s+/).pop()?.toLowerCase() || '' : '';
  let matchedWikibaseItem: string | undefined;

  for (const candidate of titleCandidates) {
    const slug = candidate.trim().replace(/\s+/g, '_');
    if (!slug || isDisallowedArticleTitle(candidate)) continue;

    const res = await fetchJsonWithTimeout(
      `${baseRest}/${encodeURIComponent(slug)}`,
      4500,
      retryOnRateLimit
    );
    if (res.status === 429) return { poster: null, rateLimited: true };
    if (!res.data) continue;

    const data = res.data as WikiRestSummary;
    if (data.type === 'disambiguation' || !data.title || isDisallowedArticleTitle(data.title)) {
      continue;
    }

    const extractLower = (data.extract || '').toLowerCase();
    const titleLower = data.title.toLowerCase();
    const looksLikeFilm =
      titleLower.includes('film') ||
      titleLower.includes('película') ||
      extractLower.includes('film') ||
      extractLower.includes('película') ||
      extractLower.includes('directed by') ||
      extractLower.includes('dirigida por') ||
      extractLower.includes('dirigido por');

    if (!looksLikeFilm) continue;

    if (yearStr) {
      const mentionsYear = titleLower.includes(yearStr) || extractLower.includes(yearStr);
      const mentionsDirector = directorLast.length >= 3 && extractLower.includes(directorLast);
      if (!mentionsYear && !mentionsDirector) continue;
    }

    if (!matchedWikibaseItem && data.wikibase_item) {
      matchedWikibaseItem = data.wikibase_item;
    }

    const img = data.originalimage ?? data.thumbnail;
    if (!img?.source) continue;
    const rawUrl = img.source.split('?')[0];
    if (!isValidPosterUrl(rawUrl, img.width, img.height)) continue;

    return {
      poster: {
        posterUrl: `/api/poster-image?url=${encodeURIComponent(rawUrl)}`,
        rawUrl,
        source: lang === 'en' ? 'Wikipedia (Cartel teatral)' : 'Wikipedia ES (Cartel teatral)',
        pageUrl:
          data.content_urls?.desktop?.page ||
          `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(data.title.replace(/ /g, '_'))}`,
      },
      wikibaseItem: matchedWikibaseItem,
      rateLimited: false,
    };
  }

  return { poster: null, wikibaseItem: matchedWikibaseItem, rateLimited: false };
}

async function resolveEnTitleFromWikidata(
  wikibaseItem: string,
  retryOnRateLimit = false
): Promise<string | null> {
  const res = await fetchJsonWithTimeout(
    `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(wikibaseItem)}.json`,
    4500,
    retryOnRateLimit
  );
  if (!res.data) return null;
  const data = res.data as {
    entities?: Record<string, { sitelinks?: { enwiki?: { title?: string } } }>;
  };
  return data.entities?.[wikibaseItem]?.sitelinks?.enwiki?.title ?? null;
}

export async function resolveFilmPoster(params: {
  id?: string;
  title: string;
  originalTitle?: string;
  year?: number;
  director?: string;
  retryOnRateLimit?: boolean;
}): Promise<CachedPoster> {
  const cacheKey = (params.id || `${params.title}-${params.year ?? ''}`).toLowerCase();
  const cached = posterCache.get(cacheKey);
  if (cached?.posterUrl) return cached;

  return enqueueWikiTask(async () => {
    const again = posterCache.get(cacheKey);
    if (again?.posterUrl) return again;

    const primaryTitle = (params.originalTitle || params.title).trim();
    const yearSuffix = params.year ? ` ${params.year}` : '';
    const filmTitles = Array.from(new Set([params.title, params.originalTitle || ''].filter(Boolean)));
    const retry = Boolean(params.retryOnRateLimit);

    // Fast path: CDN-cached Wikipedia REST summary lookup (zero search rate-limit)
    const enRestSlugs = Array.from(
      new Set([
        params.year ? `${primaryTitle} (${params.year} film)` : '',
        `${primaryTitle} (film)`,
        primaryTitle,
        params.year && params.title !== primaryTitle ? `${params.title} (${params.year} film)` : '',
        params.title !== primaryTitle ? `${params.title} (film)` : '',
      ].filter(Boolean))
    );

    const enRest = await resolveWikiRestSummary('en', enRestSlugs, params.year, params.director, retry);
    let result = enRest.poster;
    let sawRateLimit = enRest.rateLimited;

    if (!result && !sawRateLimit) {
      const esRestSlugs = Array.from(
        new Set([
          params.year ? `${params.title} (película de ${params.year})` : '',
          `${params.title} (película)`,
          params.title,
          params.originalTitle && params.originalTitle !== params.title ? params.originalTitle : '',
        ].filter(Boolean))
      );
      const esRest = await resolveWikiRestSummary('es', esRestSlugs, params.year, params.director, retry);
      result = esRest.poster;
      sawRateLimit = esRest.rateLimited;

      if (!result && !sawRateLimit && esRest.wikibaseItem) {
        const enTitle = await resolveEnTitleFromWikidata(esRest.wikibaseItem, retry);
        if (enTitle) {
          const bridged = await resolveWikiRestSummary('en', [enTitle], params.year, params.director, retry);
          result = bridged.poster;
          sawRateLimit = bridged.rateLimited;
        }
      }
    }

    // Fallback path: MediaWiki generator=search
    if (!result && !sawRateLimit) {
      const enQueries = Array.from(
        new Set([
          `${primaryTitle} (${params.year ?? ''} film)`.trim(),
          `${primaryTitle} ${yearSuffix} horror film`.trim(),
        ])
      );

      const enRes = await resolveWikiPoster(
        'en',
        enQueries,
        filmTitles,
        params.year,
        params.director,
        retry
      );
      result = enRes.poster;
      sawRateLimit = enRes.rateLimited;
    }

    if (!result && !sawRateLimit) {
      const esQueries = Array.from(
        new Set([
          `${params.title} (película de ${params.year ?? ''})`.trim(),
          `${params.title} ${yearSuffix} película`.trim(),
        ])
      );
      const esRes = await resolveWikiPoster(
        'es',
        esQueries,
        filmTitles,
        params.year,
        params.director,
        retry
      );
      result = esRes.poster;
      sawRateLimit = esRes.rateLimited;
    }

    const finalResult: CachedPoster = result ?? {
      posterUrl: null,
      rawUrl: null,
      source: null,
      pageUrl: null,
    };

    if (result) {
      posterCache.set(cacheKey, finalResult);
    }
    return finalResult;
  });
}

export async function fetchPosterImageBytes(targetUrl: string): Promise<{
  ok: boolean;
  status: number;
  contentType?: string;
  buffer?: Buffer;
  error?: string;
}> {
  if (!targetUrl.startsWith('https://upload.wikimedia.org/')) {
    return { ok: false, status: 400, error: 'URL no permitida' };
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: { 'User-Agent': WIKI_UA },
    });

    if (!upstream.ok) {
      return { ok: false, status: upstream.status, error: 'No se pudo cargar el cartel' };
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    return { ok: true, status: 200, contentType, buffer };
  } catch {
    return { ok: false, status: 502, error: 'Error al obtener el cartel' };
  }
}

export async function discoverHorrorFilms(body: DiscoverRequestBody): Promise<{
  ok: boolean;
  status: number;
  data?: { films: unknown[]; sources: Array<{ uri: string; title: string }> };
  error?: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      ok: false,
      status: 500,
      error: 'No hay una clave GEMINI_API_KEY configurada en el servidor.',
    };
  }

  const {
    branchId = 'paranormal',
    branchName = 'Cine de Terror',
    subgenreId = 'general',
    subgenreName = '',
    focusId = 'general',
    focusName = '',
    era = 'Todas',
    pacing = 'Todos',
    gore = 'Todos',
    customQuery = '',
    excludeTitles = [],
  } = body ?? {};

  const excludedList = Array.isArray(excludeTitles)
    ? excludeTitles.slice(0, 120).join(', ')
    : '';

  const prompt = `
Eres un programador de cine de terror de archivo internacional (como MUBI, Sitges o Criterion).
Usa la herramienta de búsqueda web (Google Search) para encontrar exactamente 3 películas REALES de terror de cualquier país o época que encajen con la ruta seleccionada por el usuario y que NO estén en la lista de exclusión.

Ruta seleccionada:
- Gran género: ${branchName}
- Subgénero: ${subgenreName || 'Abierto dentro del género'}
- Enfoque o atmósfera: ${focusName || 'Cualquiera dentro del subgénero'}
- Preferencia de época: ${era === 'Todas' ? 'Cualquiera (clásicas o contemporáneas)' : era}
- Preferencia de ritmo: ${pacing === 'Todos' ? 'Cualquiera' : pacing}
- Nivel de gore aceptado: ${gore === 'Todos' ? 'Cualquiera' : gore}
${customQuery ? `- Petición adicional del usuario: "${customQuery}"` : ''}

Películas que YA se mostraron (PROHIBIDO repetirlas):
${excludedList || 'Ninguna'}

Prioriza joyas de culto, cine internacional (japonés, europeo, latinoamericano, coreano, independiente) o títulos esenciales reales verificables en internet.
Responde ÚNICAMENTE con un objeto JSON válido (sin texto adicional fuera del JSON) con este formato exacto:
{
  "films": [
    {
      "title": "Título en español o título más conocido",
      "originalTitle": "Título original si difiere del español",
      "year": 2001,
      "director": "Nombre del director o directora",
      "country": "País",
      "duration": 98,
      "era": "Clásico" o "Moderno" (Clásico si es anterior a 1995, Moderno si es 1995 en adelante),
      "pacing": "Lento" | "Equilibrado" | "Frenético",
      "fearProfile": {
        "tension": "Media" | "Alta" | "Asfixiante",
        "jumpscares": "Nulos" | "Moderados" | "Frecuentes",
        "gore": "Sutil" | "Moderado" | "Explícito"
      },
      "whyWatch": "Razón directa y honesta de por qué elegirla hoy (1-2 frases en español).",
      "keyElements": ["Elemento 1", "Elemento 2", "Elemento 3"],
      "keyMotif": "Imagen o motivo visual distintivo de la película.",
      "synopsis": "Sinopsis concisa sin spoilers (2 frases en español)."
    }
  ]
}
`.trim();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = (response.text ?? '').trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        ok: false,
        status: 502,
        error: 'No se pudo interpretar la búsqueda en internet. Intenta de nuevo.',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      films?: Array<{
        title: string;
        originalTitle?: string;
        year: number;
        director: string;
        country: string;
        duration?: number;
        era?: 'Clásico' | 'Moderno';
        pacing?: 'Lento' | 'Equilibrado' | 'Frenético';
        fearProfile?: {
          tension?: 'Media' | 'Alta' | 'Asfixiante';
          jumpscares?: 'Nulos' | 'Moderados' | 'Frecuentes';
          gore?: 'Sutil' | 'Moderado' | 'Explícito';
        };
        whyWatch?: string;
        keyElements?: string[];
        keyMotif?: string;
        synopsis?: string;
      }>;
    };

    const rawFilms = Array.isArray(parsed.films) ? parsed.films.slice(0, 3) : [];

    const enrichedFilms = await Promise.all(
      rawFilms.map(async (item, idx) => {
        const slug = item.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const id = `web-${slug || 'film'}-${item.year || idx}-${Date.now().toString(36)}`;
        const poster = await resolveFilmPoster({
          id,
          title: item.title,
          originalTitle: item.originalTitle,
          year: item.year,
          director: item.director,
        });

        return {
          id,
          title: item.title,
          originalTitle: item.originalTitle,
          year: Number(item.year) || 2000,
          director: item.director || 'Dirección desconocida',
          country: item.country || 'Internacional',
          duration: Number(item.duration) || 95,
          branchId,
          subgenreId,
          focusId,
          era: item.era === 'Clásico' ? 'Clásico' : 'Moderno',
          pacing:
            item.pacing === 'Lento' || item.pacing === 'Frenético'
              ? item.pacing
              : 'Equilibrado',
          fearProfile: {
            tension: item.fearProfile?.tension || 'Alta',
            jumpscares: item.fearProfile?.jumpscares || 'Moderados',
            gore: item.fearProfile?.gore || 'Moderado',
          },
          whyWatch:
            item.whyWatch ||
            'Recomendación descubierta en internet afín a esta rama del género.',
          keyElements: [
            item.keyElements?.[0] || subgenreName || 'Cine de terror',
            item.keyElements?.[1] || branchName,
            item.keyElements?.[2] || 'Descubrimiento web',
          ] as [string, string, string],
          keyMotif: item.keyMotif || 'Atmósfera nocturna',
          synopsis: item.synopsis || 'Obra recomendada mediante búsqueda web.',
          bridgeIds: [],
          isExternalDiscovery: true,
          poster,
        };
      })
    );

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = chunks
      .map((c) => c.web)
      .filter((w): w is { uri: string; title: string } => Boolean(w?.uri && w?.title))
      .slice(0, 5);

    return {
      ok: true,
      status: 200,
      data: { films: enrichedFilms, sources },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return {
      ok: false,
      status: 500,
      error: `Error al buscar sugerencias en internet: ${message}`,
    };
  }
}
