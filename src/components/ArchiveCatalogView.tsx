import { useMemo, useState } from 'react';
import { ExternalLink, Globe, Loader2, RotateCcw, Search } from 'lucide-react';
import {
  BranchId,
  GoreLevel,
  HORROR_FILMS,
  HORROR_TAXONOMY,
  HorrorFilm,
} from '../data/horrorTaxonomy';
import { FilmCard } from './FilmCard';

interface WebSource {
  uri: string;
  title: string;
}

interface ArchiveCatalogViewProps {
  savedIds: string[];
  posterMode?: 'official' | 'artistic';
  onToggleSave: (filmId: string) => void;
  onSelectFilm: (film: HorrorFilm) => void;
  discoveredFilms: HorrorFilm[];
  onAddDiscoveredFilms: (films: HorrorFilm[]) => void;
}

export function ArchiveCatalogView({
  savedIds,
  posterMode = 'official',
  onToggleSave,
  onSelectFilm,
  discoveredFilms,
  onAddDiscoveredFilms,
}: ArchiveCatalogViewProps) {
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<'all' | BranchId>('all');
  const [goreFilter, setGoreFilter] = useState<'Todos' | GoreLevel>('Todos');

  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [webSources, setWebSources] = useState<WebSource[]>([]);

  const allFilms = useMemo(
    () => [...HORROR_FILMS, ...discoveredFilms],
    [discoveredFilms]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allFilms
      .filter((film) => {
        if (branchFilter !== 'all' && film.branchId !== branchFilter) return false;
        if (goreFilter !== 'Todos' && film.fearProfile.gore !== goreFilter) return false;
        if (!q) return true;
        return (
          film.title.toLowerCase().includes(q) ||
          (film.originalTitle?.toLowerCase().includes(q) ?? false) ||
          film.director.toLowerCase().includes(q) ||
          film.country.toLowerCase().includes(q) ||
          String(film.year).includes(q)
        );
      })
      .sort((a, b) => a.year - b.year);
  }, [allFilms, query, branchFilter, goreFilter]);

  const handleDiscoverArchive = async () => {
    if (isSearchingWeb) return;
    setIsSearchingWeb(true);
    setWebError(null);

    const activeBranch =
      branchFilter === 'all'
        ? HORROR_TAXONOMY[Math.floor(Math.random() * HORROR_TAXONOMY.length)]
        : HORROR_TAXONOMY.find((b) => b.id === branchFilter) ?? HORROR_TAXONOMY[0];

    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: activeBranch.id,
          branchName: branchFilter === 'all' ? 'Cine de Terror Internacional' : activeBranch.name,
          subgenreId: 'general',
          subgenreName: '',
          focusId: 'general',
          focusName: '',
          era: 'Todas',
          pacing: 'Todos',
          gore: goreFilter,
          customQuery: query.trim(),
          excludeTitles: allFilms.map((f) => f.title),
        }),
      });

      const data = (await response.json()) as {
        films?: HorrorFilm[];
        sources?: WebSource[];
        error?: string;
      };

      if (!response.ok || data.error) {
        throw new Error(data.error || 'No se pudo completar la búsqueda en internet.');
      }

      if (Array.isArray(data.films) && data.films.length > 0) {
        onAddDiscoveredFilms(data.films);
      } else {
        setWebError('No se encontraron títulos nuevos con esos criterios.');
      }

      if (Array.isArray(data.sources)) {
        setWebSources(data.sources);
      }
    } catch (err) {
      setWebError(
        err instanceof Error ? err.message : 'Error de conexión al buscar en internet.'
      );
    } finally {
      setIsSearchingWeb(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#272730]">
        <div>
          <p className="text-xs font-mono text-[#DC2626] mb-1">
            Catálogo Curado · {allFilms.length} películas indexadas
            {discoveredFilms.length > 0 ? ` (+${discoveredFilms.length} desde internet)` : ''}
          </p>
          <h2 className="font-display text-4xl font-semibold text-[#F5F2EB]">
            Archivo Completo de Películas
          </h2>
          <p className="text-sm text-[#A1A1AA] mt-1 max-w-2xl">
            Busca directamente por título, dirección, país o año, o amplía el catálogo con recomendaciones reales buscadas en todo internet.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search
              className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar película, director o año..."
              aria-label="Buscar en el archivo de películas"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#121216] border border-[#272730] text-sm text-[#F5F2EB] placeholder:text-[#71717A] focus:outline-none focus:border-[#DC2626] transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={handleDiscoverArchive}
            disabled={isSearchingWeb}
            className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] sm:min-h-0 sm:py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            {isSearchingWeb ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Buscar nuevas en internet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#121216] border border-[#272730] overflow-x-auto max-w-full sm:flex-wrap">
          <button
            type="button"
            onClick={() => setBranchFilter('all')}
            className={`px-3 min-h-[38px] sm:min-h-0 sm:py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              branchFilter === 'all'
                ? 'bg-[#DC2626] text-white'
                : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
            }`}
          >
            Todos los géneros
          </button>
          {HORROR_TAXONOMY.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBranchFilter(b.id)}
              className={`px-3 min-h-[38px] sm:min-h-0 sm:py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                branchFilter === b.id
                  ? 'bg-[#DC2626] text-white'
                  : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121216] border border-[#272730] overflow-x-auto max-w-full">
            {(['Todos', 'Sutil', 'Moderado', 'Explícito'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoreFilter(g)}
                className={`px-3 min-h-[38px] sm:min-h-0 sm:py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  goreFilter === g
                    ? 'bg-[#272730] text-[#F5F2EB]'
                    : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
                }`}
              >
                {g === 'Todos' ? 'Todo nivel gráfico' : `Gore ${g.toLowerCase()}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {webError && (
        <p className="text-xs text-[#DC2626]" role="alert">
          {webError}
        </p>
      )}

      {webSources.length > 0 && (
        <div className="p-3.5 rounded-lg bg-[#121216] border border-[#272730] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#A1A1AA]">
          <span className="font-mono text-[#71717A]">Fuentes consultadas en internet:</span>
          {webSources.map((src) => (
            <a
              key={src.uri}
              href={src.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[#F5F2EB] underline decoration-[#272730] underline-offset-4 transition-colors"
            >
              <span>{src.title}</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          ))}
        </div>
      )}

      <div className="text-xs font-mono text-[#A1A1AA] tabular-nums">
        Mostrando {filtered.length} de {allFilms.length} películas
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 rounded-lg bg-[#121216] border border-[#272730] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-[#A1A1AA]">
            No se encontraron películas en el archivo local con ese filtro. Puedes buscar nuevas recomendaciones directamente en internet.
          </p>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDiscoverArchive}
              disabled={isSearchingWeb}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#DC2626] text-white text-xs font-medium hover:bg-[#B91C1C] transition-colors whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Buscar en internet</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setBranchFilter('all');
                setGoreFilter('Todos');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#18181D] border border-[#272730] text-[#F5F2EB] text-xs font-medium hover:border-[#DC2626] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Restablecer filtros</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((film, idx) => (
            <FilmCard
              key={film.id}
              film={film}
              index={idx}
              isSaved={savedIds.includes(film.id)}
              posterMode={posterMode}
              onToggleSave={onToggleSave}
              onSelectFilm={onSelectFilm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
