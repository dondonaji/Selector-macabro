import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portFlagIdx = process.argv.indexOf('--port');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const parsed = Number(process.argv[portFlagIdx + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  return Number(process.env.PORT) || 3000;
}

const PORT = resolvePort();
const WIKI_UA = 'LinajeMacabro/1.0 (horror-cinema-selector; educational-archive)';

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

interface CachedPoster {
  posterUrl: string | null;
  rawUrl: string | null;
  source: string | null;
  pageUrl: string | null;
}

const posterCache = new Map<string, CachedPoster>();
const CACHE_FILE = path.join(__dirname, 'poster-cache.json');

// Load pre-warmed poster cache if present
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as Record<string, CachedPoster>;
    for (const [key, val] of Object.entries(raw)) {
      posterCache.set(key, val);
    }
  }
} catch {
  // Ignore invalid cache file gracefully
}

function savePosterCacheEntry(key: string, value: CachedPoster) {
  posterCache.set(key, value);
}

interface FetchJsonResult {
  status: number;
  data: unknown;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<FetchJsonResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': WIKI_UA },
      signal: controller.signal,
    });
    if (!res.ok) return { status: res.status, data: null };
    return { status: res.status, data: await res.json() };
  } catch {
    return { status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
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

async function resolveWikiPoster(
  lang: 'en' | 'es',
  queries: string[],
  year?: number
): Promise<{ poster: CachedPoster | null; rateLimited: boolean }> {
  const baseApi = `https://${lang}.wikipedia.org/w/api.php`;
  let rateLimited = false;

  for (const query of queries) {
    if (!query.trim()) continue;
    const searchUrl =
      `${baseApi}?action=query&list=search&srsearch=${encodeURIComponent(query)}` +
      `&srlimit=4&format=json`;
    const searchRes = await fetchJsonWithTimeout(searchUrl);
    if (searchRes.status === 429) {
      rateLimited = true;
      break;
    }

    const searchData = searchRes.data as {
      query?: { search?: Array<{ title: string; snippet: string }> };
    } | null;

    const results = searchData?.query?.search ?? [];
    if (results.length === 0) continue;

    // Pick best matching film article
    const yearStr = year ? String(year) : '';
    const candidate =
      results.find((r) => {
        const lowerTitle = r.title.toLowerCase();
        const lowerSnippet = r.snippet.toLowerCase();
        const hasFilmWord =
          lowerTitle.includes('film') ||
          lowerTitle.includes('película') ||
          lowerSnippet.includes('film') ||
          lowerSnippet.includes('película') ||
          lowerSnippet.includes('directed by') ||
          lowerSnippet.includes('dirigida por');
        const hasYear = yearStr ? lowerTitle.includes(yearStr) || lowerSnippet.includes(yearStr) : true;
        return hasFilmWord && hasYear;
      }) ??
      results.find((r) => {
        const lower = (r.title + ' ' + r.snippet).toLowerCase();
        return lower.includes('film') || lower.includes('película') || lower.includes('horror');
      }) ??
      results[0];

    if (!candidate) continue;

    // Read Section 0 Infobox wikitext
    const contentUrl =
      `${baseApi}?action=query&titles=${encodeURIComponent(candidate.title)}` +
      `&prop=revisions&rvprop=content&rvsection=0&format=json`;
    const contentRes = await fetchJsonWithTimeout(contentUrl);
    if (contentRes.status === 429) {
      rateLimited = true;
      break;
    }

    const contentData = contentRes.data as {
      query?: { pages?: Record<string, { revisions?: Array<{ '*': string }> }> };
    } | null;

    const pages = contentData?.query?.pages ? Object.values(contentData.query.pages) : [];
    const wikitext = pages[0]?.revisions?.[0]?.['*'] ?? '';
    if (!wikitext) continue;

    // Extract infobox image field (almost always the theatrical poster)
    const imageMatch =
      wikitext.match(/\|\s*(?:image|imagen)\s*=\s*([^\n|\r}]+)/i) ??
      wikitext.match(/\[\[(?:File|Archivo|Image):([^|\]]+)/i);

    let fileName = imageMatch?.[1]?.trim() ?? '';
    // Strip wiki brackets or comments if present
    fileName = fileName
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^\[\[(?:File|Archivo|Image):/i, '')
      .replace(/\|.*$/, '')
      .replace(/\]\]$/, '')
      .trim();

    if (!fileName || fileName.toLowerCase().endsWith('.svg')) continue;

    const cleanFileTitle =
      fileName.startsWith('File:') || fileName.startsWith('Archivo:')
        ? fileName.replace(/^Archivo:/i, 'File:')
        : `File:${fileName}`;

    const infoUrl =
      `${baseApi}?action=query&titles=${encodeURIComponent(cleanFileTitle)}` +
      `&prop=imageinfo&iiprop=url|size&format=json`;
    const infoRes = await fetchJsonWithTimeout(infoUrl);
    if (infoRes.status === 429) {
      rateLimited = true;
      break;
    }

    const infoData = infoRes.data as {
      query?: {
        pages?: Record<
          string,
          { imageinfo?: Array<{ url?: string; width?: number; height?: number }> }
        >;
      };
    } | null;

    const filePages = infoData?.query?.pages ? Object.values(infoData.query.pages) : [];
    const imgInfo = filePages[0]?.imageinfo?.[0];
    if (!imgInfo?.url) continue;
    if (imgInfo.width && imgInfo.width < 160) continue;

    const rawUrl = imgInfo.url.split('?')[0];
    if (!rawUrl.startsWith('https://upload.wikimedia.org/')) continue;

    return {
      poster: {
        posterUrl: `/api/poster-image?url=${encodeURIComponent(rawUrl)}`,
        rawUrl,
        source: lang === 'en' ? 'Wikipedia (Cartel teatral)' : 'Wikipedia ES (Cartel teatral)',
        pageUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(candidate.title.replace(/ /g, '_'))}`,
      },
      rateLimited: false,
    };
  }

  return { poster: null, rateLimited };
}

export async function resolveFilmPoster(params: {
  id?: string;
  title: string;
  originalTitle?: string;
  year?: number;
  director?: string;
}): Promise<CachedPoster> {
  const cacheKey = (params.id || `${params.title}-${params.year ?? ''}`).toLowerCase();
  const cached = posterCache.get(cacheKey);
  if (cached) return cached;

  return enqueueWikiTask(async () => {
    const again = posterCache.get(cacheKey);
    if (again) return again;

    const primaryTitle = (params.originalTitle || params.title).trim();
    const yearSuffix = params.year ? ` ${params.year}` : '';

    const enQueries = [
      `${primaryTitle} (${params.year ?? ''} film)`.trim(),
      `${primaryTitle} film`,
      `${params.title} ${yearSuffix} horror film`,
    ];

    const enRes = await resolveWikiPoster('en', enQueries, params.year);
    let result = enRes.poster;
    let sawRateLimit = enRes.rateLimited;

    if (!result && !sawRateLimit) {
      const esQueries = [
        `${params.title} (película de ${params.year ?? ''})`.trim(),
        `${params.title} película`,
        `${primaryTitle} película`,
      ];
      const esRes = await resolveWikiPoster('es', esQueries, params.year);
      result = esRes.poster;
      sawRateLimit = esRes.rateLimited;
    }

    const finalResult: CachedPoster = result ?? {
      posterUrl: null,
      rawUrl: null,
      source: null,
      pageUrl: null,
    };

    // Only cache negative misses when Wikipedia didn't rate-limit us
    if (result || !sawRateLimit) {
      savePosterCacheEntry(cacheKey, finalResult);
    }
    return finalResult;
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Resolve official theatrical poster URL from Wikipedia / Wikimedia
  app.get('/api/poster', async (req, res) => {
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;
    const title = typeof req.query.title === 'string' ? req.query.title : '';
    const originalTitle =
      typeof req.query.originalTitle === 'string' ? req.query.originalTitle : undefined;
    const yearRaw = typeof req.query.year === 'string' ? Number(req.query.year) : undefined;
    const director = typeof req.query.director === 'string' ? req.query.director : undefined;

    if (!title) {
      res.status(400).json({ error: 'Falta el título de la película.' });
      return;
    }

    const result = await resolveFilmPoster({
      id,
      title,
      originalTitle,
      year: Number.isFinite(yearRaw) ? yearRaw : undefined,
      director,
    });

    res.json(result);
  });

  // 2. Proxy Wikimedia poster image bytes cleanly (avoids hotlink/CORS failures)
  app.get('/api/poster-image', async (req, res) => {
    const targetUrl = typeof req.query.url === 'string' ? req.query.url : '';
    if (!targetUrl.startsWith('https://upload.wikimedia.org/')) {
      res.status(400).send('URL no permitida');
      return;
    }

    try {
      const upstream = await fetch(targetUrl, {
        headers: { 'User-Agent': WIKI_UA },
      });

      if (!upstream.ok) {
        res.status(upstream.status).send('No se pudo cargar el cartel');
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch {
      res.status(502).send('Error al obtener el cartel');
    }
  });

  // 3. Internet-wide Horror Discovery via Gemini + Google Search Grounding
  app.post('/api/discover', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(500).json({
        error: 'No hay una clave GEMINI_API_KEY configurada en el servidor.',
      });
      return;
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
    } = req.body ?? {};

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
        res.status(502).json({
          error: 'No se pudo interpretar la búsqueda en internet. Intenta de nuevo.',
        });
        return;
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

      // Resolve theatrical posters for discovered films in parallel
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

      // Extract verifiable grounding sources
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources = chunks
        .map((c) => c.web)
        .filter((w): w is { uri: string; title: string } => Boolean(w?.uri && w?.title))
        .slice(0, 5);

      res.json({ films: enrichedFilms, sources });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      res.status(500).json({
        error: `Error al buscar sugerencias en internet: ${message}`,
      });
    }
  });

  // Vite dev middleware or static production build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Linaje Macabro server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
