import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { CachedPoster, WIKI_UA, resolveFilmPoster } from '../lib/horrorBackend.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_FILE = path.join(ROOT_DIR, 'poster-cache.json');

interface FilmRef {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  director: string;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BatchPage {
  title?: string;
  missing?: boolean;
  canonicalurl?: string;
  categories?: Array<{ title?: string }>;
  original?: { source?: string; width?: number; height?: number };
}

interface BatchResponse {
  query?: {
    normalized?: Array<{ from: string; to: string }>;
    redirects?: Array<{ from: string; to: string }>;
    pages?: BatchPage[];
  };
}

async function queryEnBatch(titles: string[], withCategories = false): Promise<Map<string, BatchPage>> {
  const map = new Map<string, BatchPage>();
  if (titles.length === 0) return map;

  const props = withCategories ? 'pageimages|categories|info' : 'pageimages|info';
  const extraParams = withCategories ? '&cllimit=500' : '';
  const url =
    `https://en.wikipedia.org/w/api.php?action=query` +
    `&titles=${encodeURIComponent(titles.join('|'))}` +
    `&redirects=1&prop=${props}&pilicense=any&piprop=original&pilimit=50${extraParams}&inprop=url&format=json&formatversion=2`;

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': WIKI_UA } });
    if (res.status === 429) {
      const waitSec = Number(res.headers.get('retry-after')) || 15 * (attempt + 1);
      console.log(`Wikipedia 429 en lote; esperando ${waitSec}s...`);
      await sleep(waitSec * 1000);
      continue;
    }
    if (!res.ok) return map;

    const data = (await res.json()) as BatchResponse;
    const pages = data.query?.pages ?? [];
    const byTitle = new Map<string, BatchPage>();
    for (const p of pages) {
      if (p.title && !p.missing) {
        byTitle.set(p.title, p);
      }
    }

    const normMap = new Map<string, string>();
    for (const n of data.query?.normalized ?? []) {
      normMap.set(n.from, n.to);
    }
    const redirMap = new Map<string, string>();
    for (const r of data.query?.redirects ?? []) {
      redirMap.set(r.from, r.to);
    }

    for (const originalQuery of titles) {
      const step1 = normMap.get(originalQuery) ?? originalQuery;
      const step2 = redirMap.get(step1) ?? step1;
      const step3 = redirMap.get(step2) ?? step2;
      const page = byTitle.get(step3) ?? byTitle.get(step2) ?? byTitle.get(step1);
      if (page) {
        map.set(originalQuery, page);
      }
    }
    return map;
  }

  return map;
}

function isMatchingFilmPage(page: BatchPage, film: FilmRef, requireCategoryCheck: boolean): boolean {
  const rawUrl = page.original?.source?.split('?')[0] ?? '';
  if (!rawUrl.startsWith('https://upload.wikimedia.org/')) return false;
  const lowerUrl = rawUrl.toLowerCase();
  if (lowerUrl.endsWith('.svg') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.ogv')) return false;
  if (page.original?.width && page.original.width < 150) return false;

  const titleLower = (page.title || '').toLowerCase();
  if (
    titleLower.includes('(franchise)') ||
    titleLower.includes('(novel)') ||
    titleLower.includes('(soundtrack)') ||
    titleLower.includes('(video game)') ||
    titleLower.includes('(disambiguation)')
  ) {
    return false;
  }

  if (!requireCategoryCheck) {
    return true;
  }

  const cats = (page.categories ?? []).map((c) => (c.title || '').toLowerCase());
  const isFilmCat = titleLower.includes('film') || cats.some((c) => c.includes('films'));
  if (!isFilmCat) return false;

  const yearStr = String(film.year);
  const decadeStr = `${yearStr.slice(0, 3)}0s`;
  return (
    titleLower.includes(yearStr) ||
    cats.some((c) => c.includes(yearStr) || c.includes(decadeStr))
  );
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

  const pendingCount = films.filter((f) => !cache[f.id.toLowerCase()]?.posterUrl).length;
  console.log(`Películas totales: ${films.length}. Ya en caché: ${films.length - pendingCount}. Pendientes: ${pendingCount}`);

  const WIKI_OVERRIDES: Record<string, string> = {
    'eyes-without-a-face': 'Eyes Without a Face (film)',
    tetsuo: 'Tetsuo: The Iron Man',
  };

  // Pass 1: Fast batched title lookup (pageimages + categories)
  const patterns: Array<{ build: (f: FilmRef) => string; requireCategory: boolean }> = [
    {
      build: (f) => WIKI_OVERRIDES[f.id] || `${(f.originalTitle || f.title).trim()} (${f.year} film)`,
      requireCategory: false,
    },
    { build: (f) => `${(f.originalTitle || f.title).trim()} (film)`, requireCategory: false },
    { build: (f) => `${(f.originalTitle || f.title).trim()}`, requireCategory: true },
    { build: (f) => `${f.title.trim()} (${f.year} film)`, requireCategory: false },
    { build: (f) => `${f.title.trim()}`, requireCategory: true },
  ];

  for (const { build, requireCategory } of patterns) {
    const stillMissing = films.filter((f) => !cache[f.id.toLowerCase()]?.posterUrl);
    if (stillMissing.length === 0) break;

    const batchSize = requireCategory ? 15 : 40;
    for (let i = 0; i < stillMissing.length; i += batchSize) {
      const slice = stillMissing.slice(i, i + batchSize);
      const queries = slice.map(build);
      const results = await queryEnBatch(queries, requireCategory);

      for (let j = 0; j < slice.length; j++) {
        const film = slice[j];
        const page = results.get(queries[j]);
        if (page && isMatchingFilmPage(page, film, requireCategory)) {
          const rawUrl = page.original!.source!.split('?')[0];
          cache[film.id.toLowerCase()] = {
            posterUrl: `/api/poster-image?url=${encodeURIComponent(rawUrl)}`,
            rawUrl,
            source: 'Wikipedia (Cartel teatral)',
            pageUrl:
              page.canonicalurl ||
              `https://en.wikipedia.org/wiki/${encodeURIComponent((page.title || '').replace(/ /g, '_'))}`,
          };
        }
      }

      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
      await sleep(800);
    }
  }

  // Pass 2: Gentle fallback for any remaining stragglers
  const stragglers = films.filter((f) => !cache[f.id.toLowerCase()]?.posterUrl);
  if (stragglers.length > 0) {
    console.log(`Resolviendo ${stragglers.length} títulos restantes...`);
    for (const film of stragglers) {
      const res = await resolveFilmPoster({
        id: film.id,
        title: film.title,
        originalTitle: film.originalTitle,
        year: film.year,
        director: film.director,
        retryOnRateLimit: true,
      });
      if (res.posterUrl) {
        cache[film.id.toLowerCase()] = res;
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
      }
      await sleep(1200);
    }
  }

  const totalResolved = films.filter((f) => cache[f.id.toLowerCase()]?.posterUrl).length;
  console.log(`Listo. Carteles almacenados en poster-cache.json: ${totalResolved}/${films.length}`);
}

main();
