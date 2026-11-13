import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_FILE = path.join(ROOT_DIR, 'poster-cache.json');
const WIKI_UA = 'LinajeMacabro/1.0 (horror-cinema-selector; educational-archive)';

interface FilmRef {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
}

function loadHorrorFilms(): FilmRef[] {
  const taxonomyPath = path.join(ROOT_DIR, 'src/data/horrorTaxonomy.ts');
  const source = fs.readFileSync(taxonomyPath, 'utf8');
  const startMarker = 'export const HORROR_FILMS: HorrorFilm[] = ';
  const endMarker = '\nexport const SUBWAY_CROSSINGS';
  const startIdx = source.indexOf(startMarker);
  const endIdx = source.indexOf(endMarker, startIdx);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('No se pudo localizar HORROR_FILMS en src/data/horrorTaxonomy.ts');
  }
  const arrayLiteral = source.slice(startIdx + startMarker.length, endIdx).trim().replace(/;$/, '');
  return vm.runInNewContext(`(${arrayLiteral})`) as FilmRef[];
}

interface CachedPoster {
  posterUrl: string | null;
  rawUrl: string | null;
  source: string | null;
  pageUrl: string | null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string, attempt = 0): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': WIKI_UA },
      signal: controller.signal,
    });
    if (res.status === 429 && attempt < 3) {
      clearTimeout(timer);
      const retryAfter = Number(res.headers.get('retry-after')) || 3 * (attempt + 1);
      await sleep(retryAfter * 1000);
      return fetchJson(url, attempt + 1);
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveWikiPoster(
  lang: 'en' | 'es',
  queries: string[],
  year?: number
): Promise<CachedPoster | null> {
  const baseApi = `https://${lang}.wikipedia.org/w/api.php`;

  for (const query of queries) {
    if (!query.trim()) continue;
    const searchUrl = `${baseApi}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=4&format=json`;
    const searchData = (await fetchJson(searchUrl)) as {
      query?: { search?: Array<{ title: string; snippet: string }> };
    } | null;

    const results = searchData?.query?.search ?? [];
    if (results.length === 0) continue;

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
        const hasYear = yearStr
          ? lowerTitle.includes(yearStr) || lowerSnippet.includes(yearStr)
          : true;
        return hasFilmWord && hasYear;
      }) ??
      results.find((r) => {
        const lower = (r.title + ' ' + r.snippet).toLowerCase();
        return lower.includes('film') || lower.includes('película') || lower.includes('horror');
      }) ??
      results[0];

    if (!candidate) continue;

    const contentUrl = `${baseApi}?action=query&titles=${encodeURIComponent(candidate.title)}&prop=revisions&rvprop=content&rvsection=0&format=json`;
    const contentData = (await fetchJson(contentUrl)) as {
      query?: { pages?: Record<string, { revisions?: Array<{ '*': string }> }> };
    } | null;

    const pages = contentData?.query?.pages ? Object.values(contentData.query.pages) : [];
    const wikitext = pages[0]?.revisions?.[0]?.['*'] ?? '';
    if (!wikitext) continue;

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

    if (!fileName || fileName.toLowerCase().endsWith('.svg')) continue;

    const cleanFileTitle =
      fileName.startsWith('File:') || fileName.startsWith('Archivo:')
        ? fileName.replace(/^Archivo:/i, 'File:')
        : `File:${fileName}`;

    const infoUrl = `${baseApi}?action=query&titles=${encodeURIComponent(cleanFileTitle)}&prop=imageinfo&iiprop=url|size&format=json`;
    const infoData = (await fetchJson(infoUrl)) as {
      query?: {
        pages?: Record<string, { imageinfo?: Array<{ url?: string; width?: number }> }>;
      };
    } | null;

    const filePages = infoData?.query?.pages ? Object.values(infoData.query.pages) : [];
    const imgInfo = filePages[0]?.imageinfo?.[0];
    if (!imgInfo?.url) continue;
    if (imgInfo.width && imgInfo.width < 160) continue;

    const rawUrl = imgInfo.url.split('?')[0];
    if (!rawUrl.startsWith('https://upload.wikimedia.org/')) continue;

    return {
      posterUrl: `/api/poster-image?url=${encodeURIComponent(rawUrl)}`,
      rawUrl,
      source: lang === 'en' ? 'Wikipedia (Cartel teatral)' : 'Wikipedia ES (Cartel teatral)',
      pageUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(candidate.title.replace(/ /g, '_'))}`,
    };
  }

  return null;
}

async function main() {
  const films = loadHorrorFilms();
  let cache: Record<string, CachedPoster> = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch {
      cache = {};
    }
  }

  console.log(`Resolviendo carteles teatrales para ${films.length} películas...`);
  let foundCount = 0;

  for (let i = 0; i < films.length; i++) {
    const film = films[i];
    const key = film.id.toLowerCase();
    if (cache[key]?.posterUrl) {
      foundCount++;
      continue;
    }

    const primaryTitle = (film.originalTitle || film.title).trim();
    let res = await resolveWikiPoster(
      'en',
      [`${primaryTitle} (${film.year} film)`, `${primaryTitle} film`, `${film.title} ${film.year} horror film`],
      film.year
    );

    if (!res) {
      res = await resolveWikiPoster(
        'es',
        [`${film.title} (película de ${film.year})`, `${film.title} película`, `${primaryTitle} película`],
        film.year
      );
    }

    if (res) {
      cache[key] = res;
      foundCount++;
    }

    if ((i + 1) % 5 === 0 || i === films.length - 1) {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
      console.log(`Progreso: ${i + 1}/${films.length} (${foundCount} carteles resueltos)`);
    }

    await sleep(300);
  }

  console.log(`Listo. Carteles almacenados en poster-cache.json: ${foundCount}/${films.length}`);
}

main();
