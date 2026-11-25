import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Film, GitFork, GitMerge, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ArchiveCatalogView } from './components/ArchiveCatalogView';
import { FilmDossierModal } from './components/FilmDossierModal';
import { HorrorTreeSelector } from './components/HorrorTreeSelector';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SessionDrawer } from './components/SessionDrawer';
import { SubgenreCrossingsView } from './components/SubgenreCrossingsView';
import {
  BranchId,
  HORROR_FILMS,
  HORROR_TAXONOMY,
  HorrorFilm,
} from './data/horrorTaxonomy';
import { soundEngine } from './utils/soundEffects';

type ActiveTab = 'tree' | 'crossings' | 'archive';

interface RouteState {
  activeTab: ActiveTab;
  branchId: BranchId | null;
  subgenreId: string | null;
  focusId: string | null;
  filmDossier: HorrorFilm | null;
}

function parseRouteFromSearch(search: string, extraFilms: HorrorFilm[] = []): RouteState {
  const params = new URLSearchParams(search);
  const hasAnyParam =
    params.has('vista') ||
    params.has('rama') ||
    params.has('sub') ||
    params.has('enfoque') ||
    params.has('pelicula');

  if (!hasAnyParam) {
    return {
      activeTab: 'tree',
      branchId: 'paranormal',
      subgenreId: 'folclore-maldiciones',
      focusId: null,
      filmDossier: null,
    };
  }

  const vistaParam = params.get('vista');
  const activeTab: ActiveTab =
    vistaParam === 'cruces'
      ? 'crossings'
      : vistaParam === 'archivo'
        ? 'archive'
        : 'tree';

  const ramaParam = params.get('rama');
  const branch = HORROR_TAXONOMY.find((b) => b.id === ramaParam) ?? null;

  const subParam = params.get('sub');
  const subgenre = branch?.subgenres.find((s) => s.id === subParam) ?? null;

  const focusParam = params.get('enfoque');
  const focus = subgenre?.focuses.find((f) => f.id === focusParam) ?? null;

  const filmParam = params.get('pelicula');
  const filmDossier = filmParam
    ? [...HORROR_FILMS, ...extraFilms].find((f) => f.id === filmParam) ?? null
    : null;

  return {
    activeTab,
    branchId: branch ? branch.id : null,
    subgenreId: subgenre ? subgenre.id : null,
    focusId: focus ? focus.id : null,
    filmDossier,
  };
}

export default function App() {
  const [initialRoute] = useState<RouteState>(() =>
    typeof window !== 'undefined'
      ? parseRouteFromSearch(window.location.search)
      : {
          activeTab: 'tree',
          branchId: 'paranormal',
          subgenreId: 'folclore-maldiciones',
          focusId: null,
          filmDossier: null,
        }
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialRoute.activeTab);
  const [selectedBranchId, setSelectedBranchId] = useState<BranchId | null>(initialRoute.branchId);
  const [selectedSubgenreId, setSelectedSubgenreId] = useState<string | null>(
    initialRoute.subgenreId
  );
  const [selectedFocusId, setSelectedFocusId] = useState<string | null>(initialRoute.focusId);

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [discoveredFilms, setDiscoveredFilms] = useState<HorrorFilm[]>([]);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [activeFilmDossier, setActiveFilmDossier] = useState<HorrorFilm | null>(
    initialRoute.filmDossier
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab === 'crossings') params.set('vista', 'cruces');
    else if (activeTab === 'archive') params.set('vista', 'archivo');
    else if (selectedBranchId || activeFilmDossier) params.set('vista', 'arbol');

    if (activeTab === 'tree') {
      if (selectedBranchId) params.set('rama', selectedBranchId);
      if (selectedSubgenreId) params.set('sub', selectedSubgenreId);
      if (selectedFocusId) params.set('enfoque', selectedFocusId);
    }
    if (activeFilmDossier) {
      params.set('pelicula', activeFilmDossier.id);
    }

    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [activeTab, selectedBranchId, selectedSubgenreId, selectedFocusId, activeFilmDossier]);

  useEffect(() => {
    const handlePopState = () => {
      const next = parseRouteFromSearch(window.location.search, discoveredFilms);
      setActiveTab(next.activeTab);
      setSelectedBranchId(next.branchId);
      setSelectedSubgenreId(next.subgenreId);
      setSelectedFocusId(next.focusId);
      setActiveFilmDossier(next.filmDossier);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [discoveredFilms]);

  const handleShareUrl = useCallback(async (film?: HorrorFilm): Promise<boolean> => {
    try {
      const shareUrl = new URL(window.location.href);
      if (film) {
        shareUrl.searchParams.set('pelicula', film.id);
      }
      const urlString = shareUrl.toString();
      const title = film ? `${film.title} (${film.year}) — Selector Macabro` : 'Selector Macabro';

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const isTouchViewport = window.matchMedia('(pointer: coarse)').matches;
        if (isTouchViewport) {
          await navigator.share({ title, url: urlString });
          return true;
        }
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(urlString);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const handleAddDiscoveredFilms = (incoming: HorrorFilm[]) => {
    setDiscoveredFilms((prev) => {
      const existingTitles = new Set(
        [...HORROR_FILMS, ...prev].map((f) => f.title.trim().toLowerCase())
      );
      const uniqueNew = incoming.filter((film) => {
        const key = film.title.trim().toLowerCase();
        if (existingTitles.has(key)) return false;
        existingTitles.add(key);
        return true;
      });
      return [...prev, ...uniqueNew];
    });
  };

  const handleToggleSave = (filmId: string) => {
    soundEngine.playClick(300);
    setSavedIds((prev) =>
      prev.includes(filmId) ? prev.filter((id) => id !== filmId) : [...prev, filmId]
    );
  };

  const handleResetTree = () => {
    soundEngine.playClick(150);
    setActiveTab('tree');
    setSelectedBranchId(null);
    setSelectedSubgenreId(null);
    setSelectedFocusId(null);
  };

  const handleExploreBranch = (
    branchId: BranchId,
    subgenreId?: string,
    focusId?: string
  ) => {
    setSelectedBranchId(branchId);
    setSelectedSubgenreId(subgenreId ?? null);
    setSelectedFocusId(focusId ?? null);
    setActiveTab('tree');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpToFilm = (film: HorrorFilm) => {
    soundEngine.playClick(240);
    setActiveFilmDossier(film);
  };

  return (
    <div className="relative min-h-screen bg-[#08080A] text-[#F5F2EB] flex flex-col">
      {/* Lightweight Atmospheric Vignette & Celluloid Film Grain */}
      <div
        className="fixed inset-0 pointer-events-none z-30 film-grain cinema-flicker"
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,_rgba(185,28,28,0.09)_0%,_rgba(8,8,10,0)_60%)]"
        aria-hidden="true"
      />

      {/* Top Navigation Bar — Strict 3-Zone Contract */}
      <header className="relative z-20 border-b border-[#272730] bg-[#08080A]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#F5F2EB] hover:text-[#DC2626] transition-colors whitespace-nowrap shrink-0 min-h-[44px] flex items-center"
          >
            Selector Macabro
          </button>

          {/* Zone 2: 4 Clean Single-Line Nav Links (Desktop) */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(200);
                setActiveTab('tree');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b ${
                activeTab === 'tree'
                  ? 'text-[#F5F2EB] border-[#DC2626]'
                  : 'text-[#A1A1AA] border-transparent hover:text-[#F5F2EB]'
              }`}
            >
              Árbol Selector
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(200);
                setActiveTab('crossings');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b ${
                activeTab === 'crossings'
                  ? 'text-[#F5F2EB] border-[#DC2626]'
                  : 'text-[#A1A1AA] border-transparent hover:text-[#F5F2EB]'
              }`}
            >
              Cruces de Género
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(200);
                setActiveTab('archive');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b ${
                activeTab === 'archive'
                  ? 'text-[#F5F2EB] border-[#DC2626]'
                  : 'text-[#A1A1AA] border-transparent hover:text-[#F5F2EB]'
              }`}
            >
              Archivo
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(220);
                setIsSessionOpen(true);
              }}
              className="py-1 text-[#A1A1AA] hover:text-[#F5F2EB] transition-colors whitespace-nowrap shrink-0 tabular-nums"
            >
              Mi Sesión ({savedIds.length})
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleResetTree}
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 min-h-[40px] sm:min-h-[36px] rounded-lg bg-[#18181D] border border-[#272730] hover:border-[#DC2626] text-xs font-medium text-[#F5F2EB] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
              <span>Reiniciar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {activeTab === 'tree' && (
          <section aria-label="Introducción al selector" className="mb-6 sm:mb-10 max-w-3xl">
            <p className="text-xs font-mono text-[#DC2626] mb-1.5 sm:mb-2">
              Mapa de géneros y subgéneros · De mayor a menor ·{' '}
              {HORROR_FILMS.length + discoveredFilms.length} películas
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-semibold text-[#F5F2EB] leading-[1.08] text-balance">
              Encuentra qué película de terror ver según el miedo que buscas
            </h1>
            <p className="text-sm sm:text-base text-[#A1A1AA] mt-2 sm:mt-3 leading-relaxed">
              Navega paso a paso desde los cinco troncos clásicos del terror hacia sus subgéneros y escenarios específicos, con indicadores claros de tensión, sustos y violencia gráfica.
            </p>
          </section>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'tree' && (
            <motion.div
              key="view-tree"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <HorrorTreeSelector
                selectedBranchId={selectedBranchId}
                selectedSubgenreId={selectedSubgenreId}
                selectedFocusId={selectedFocusId}
                onSelectBranch={setSelectedBranchId}
                onSelectSubgenre={setSelectedSubgenreId}
                onSelectFocus={setSelectedFocusId}
                onResetAll={handleResetTree}
                savedIds={savedIds}
                onToggleSave={handleToggleSave}
                onSelectFilm={setActiveFilmDossier}
                discoveredFilms={discoveredFilms}
                onAddDiscoveredFilms={handleAddDiscoveredFilms}
                onShareRoute={() => handleShareUrl()}
              />
            </motion.div>
          )}

          {activeTab === 'crossings' && (
            <motion.div
              key="view-crossings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <SubgenreCrossingsView
                onSelectFilm={setActiveFilmDossier}
                onExploreBranch={handleExploreBranch}
              />
            </motion.div>
          )}

          {activeTab === 'archive' && (
            <motion.div
              key="view-archive"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ArchiveCatalogView
                savedIds={savedIds}
                onToggleSave={handleToggleSave}
                onSelectFilm={setActiveFilmDossier}
                discoveredFilms={discoveredFilms}
                onAddDiscoveredFilms={handleAddDiscoveredFilms}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Quiet Footer */}
      <footer className="relative z-10 border-t border-[#272730] bg-[#08080A] pt-8 pb-24 md:pb-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#71717A]">
          <p>
            Selector Macabro · Seleccionador interactivo de cine de terror por géneros, subgéneros y atmósfera.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('crossings');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#F5F2EB] transition-colors min-h-[36px]"
            >
              Cruces de Género
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('archive');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#F5F2EB] transition-colors min-h-[36px]"
            >
              Catálogo completo
            </button>
            <button
              type="button"
              onClick={() => setIsSessionOpen(true)}
              className="hover:text-[#F5F2EB] transition-colors tabular-nums min-h-[36px]"
            >
              Mi Sesión ({savedIds.length})
            </button>
            <PWAInstallButton />
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Thumb-Zone Navigation Bar */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#272730] bg-[#08080A]/95 backdrop-blur-md"
      >
        <div className="grid grid-cols-4 h-16">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick(200);
              setActiveTab('tree');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'tree' ? 'text-[#DC2626]' : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
            }`}
          >
            <GitFork className="w-5 h-5" aria-hidden="true" />
            <span className="whitespace-nowrap">Selector</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick(200);
              setActiveTab('crossings');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'crossings' ? 'text-[#DC2626]' : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
            }`}
          >
            <GitMerge className="w-5 h-5" aria-hidden="true" />
            <span className="whitespace-nowrap">Cruces</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick(200);
              setActiveTab('archive');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'archive' ? 'text-[#DC2626]' : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
            }`}
          >
            <Film className="w-5 h-5" aria-hidden="true" />
            <span className="whitespace-nowrap">Archivo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick(220);
              setIsSessionOpen(true);
            }}
            className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-[#D6C7B2] hover:text-[#F5F2EB] transition-colors tabular-nums"
          >
            <Bookmark className="w-5 h-5 text-[#DC2626]" aria-hidden="true" />
            <span className="whitespace-nowrap">Sesión ({savedIds.length})</span>
          </button>
        </div>
      </nav>

      {/* Offline Status Notice */}
      <OfflineIndicator />

      {/* Film Dossier Modal */}
      <FilmDossierModal
        film={activeFilmDossier}
        isSaved={activeFilmDossier ? savedIds.includes(activeFilmDossier.id) : false}
        onClose={() => setActiveFilmDossier(null)}
        onToggleSave={handleToggleSave}
        onJumpToFilm={handleJumpToFilm}
        onExploreBranch={handleExploreBranch}
        onShareFilm={(f) => handleShareUrl(f)}
      />

      {/* Watchlist Session Drawer */}
      <SessionDrawer
        isOpen={isSessionOpen}
        savedIds={savedIds}
        extraFilms={discoveredFilms}
        onClose={() => setIsSessionOpen(false)}
        onRemove={handleToggleSave}
        onClearAll={() => setSavedIds([])}
        onSelectFilm={(film) => setActiveFilmDossier(film)}
      />
    </div>
  );
}
