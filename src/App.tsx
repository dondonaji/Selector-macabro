import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  Download,
  Film,
  GitFork,
  GitMerge,
  RotateCcw,
  Share2,
  Shuffle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import heroBackdropImg from './assets/images/hero_cinema_backdrop_1795575584534.jpg';
import { ArchiveCatalogView } from './components/ArchiveCatalogView';
import { FilmDossierModal } from './components/FilmDossierModal';
import { HorrorTreeSelector } from './components/HorrorTreeSelector';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallInstructionsModal } from './components/PWAInstallButton';
import { SessionDrawer } from './components/SessionDrawer';
import { SubgenreCrossingsView } from './components/SubgenreCrossingsView';
import {
  BranchId,
  HORROR_FILMS,
  HORROR_TAXONOMY,
  HorrorFilm,
} from './data/horrorTaxonomy';
import { usePWAInstall } from './hooks/usePWAInstall';
import { soundEngine } from './utils/soundEffects';

function MacabreHamburgerIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5 text-[#DC2626]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 5L19 19" />
        <path d="M19 5L5 19" />
        <polygon points="12,10 14,12 12,14 10,12" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 text-[#F5F2EB]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Top blade bar */}
      <path d="M3.5 6.5H17.5L20.5 5" />
      {/* Middle ritual spine bar with crimson fang diamond */}
      <path d="M3.5 12H9.5" />
      <polygon points="12,10.2 13.8,12 12,13.8 10.2,12" fill="#DC2626" stroke="none" />
      <path d="M14.5 12H20.5" />
      {/* Bottom notched bone bar */}
      <path d="M3.5 17.5L6.5 19H20.5" />
    </svg>
  );
}

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

  const [posterMode, setPosterMode] = useState<'official' | 'artistic'>('official');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(soundEngine.isEnabled());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copiedRoute, setCopiedRoute] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [randomScrollToken, setRandomScrollToken] = useState(0);

  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const { canPrompt, isInstalled, isIOS, promptInstall } = usePWAInstall();

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

  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleToggleAudio = () => {
    const next = soundEngine.toggle();
    setAudioEnabled(next);
  };

  const handleRandomDescent = () => {
    const randomBranch =
      HORROR_TAXONOMY[Math.floor(Math.random() * HORROR_TAXONOMY.length)];
    const randomSub =
      randomBranch.subgenres[Math.floor(Math.random() * randomBranch.subgenres.length)];
    const randomFocus =
      randomSub.focuses[Math.floor(Math.random() * randomSub.focuses.length)];

    soundEngine.playReveal();
    setActiveTab('tree');
    setSelectedBranchId(randomBranch.id);
    setSelectedSubgenreId(randomSub.id);
    setSelectedFocusId(randomFocus.id);
    setIsMenuOpen(false);
    setRandomScrollToken((t) => t + 1);
  };

  const handleInstallAppClick = async () => {
    soundEngine.playClick(230);
    setIsMenuOpen(false);
    if (canPrompt) {
      await promptInstall();
      return;
    }
    setShowInstallModal(true);
  };

  const handleResetTree = () => {
    soundEngine.playClick(150);
    setActiveTab('tree');
    setSelectedBranchId(null);
    setSelectedSubgenreId(null);
    setSelectedFocusId(null);
    setIsMenuOpen(false);
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

          {/* Zone 3: 3 Compact Icon Controls (Audio, Reset, Macabre Menu) */}
          <div ref={menuContainerRef} className="relative flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleAudio}
              aria-pressed={audioEnabled}
              aria-label={audioEnabled ? 'Silenciar audio ambiente' : 'Activar audio ambiente'}
              title={audioEnabled ? 'Silenciar audio ambiente' : 'Activar audio ambiente'}
              className={`min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center rounded-lg border transition-colors ${
                audioEnabled
                  ? 'bg-[#DC2626]/15 border-[#DC2626]/70 text-[#F5F2EB]'
                  : 'bg-[#18181D] border-[#272730] hover:border-[#DC2626] text-[#A1A1AA] hover:text-[#F5F2EB]'
              }`}
            >
              {audioEnabled ? (
                <Volume2 className="w-[18px] h-[18px] text-[#DC2626]" aria-hidden="true" />
              ) : (
                <VolumeX className="w-[18px] h-[18px]" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={handleResetTree}
              aria-label="Reiniciar selector"
              title="Reiniciar selector"
              className="min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center rounded-lg bg-[#18181D] border border-[#272730] hover:border-[#DC2626] text-[#F5F2EB] transition-colors"
            >
              <RotateCcw className="w-[18px] h-[18px] text-[#DC2626]" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(220);
                setIsMenuOpen((v) => !v);
              }}
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              aria-label={isMenuOpen ? 'Cerrar menú de opciones' : 'Abrir menú macabro de opciones'}
              title="Opciones del selector"
              className={`min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center rounded-lg border transition-colors ${
                isMenuOpen
                  ? 'bg-[#1D1215] border-[#DC2626]'
                  : 'bg-[#18181D] border-[#272730] hover:border-[#DC2626]'
              }`}
            >
              <MacabreHamburgerIcon open={isMenuOpen} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  key="macabre-header-menu"
                  role="menu"
                  aria-label="Opciones de Selector Macabro"
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl bg-[#121216]/95 backdrop-blur-md border border-[#272730] shadow-[0_24px_60px_rgba(0,0,0,0.9)] p-2.5 space-y-2 z-50"
                >
                  {/* Poster Visual Mode Switch */}
                  <div className="p-2 rounded-lg bg-[#0A0A0D] border border-[#272730]/80 space-y-2">
                    <span className="block text-[11px] font-mono text-[#A1A1AA] px-1">
                      Visualización de carteles
                    </span>
                    <div
                      role="group"
                      aria-label="Estilo visual de los carteles"
                      className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#121216] border border-[#272730]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick(240);
                          setPosterMode('official');
                        }}
                        className={`min-h-[40px] sm:min-h-[34px] px-2.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                          posterMode === 'official'
                            ? 'bg-[#DC2626] text-white'
                            : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
                        }`}
                      >
                        Cartel teatral
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick(240);
                          setPosterMode('artistic');
                        }}
                        className={`min-h-[40px] sm:min-h-[34px] px-2.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                          posterMode === 'artistic'
                            ? 'bg-[#272730] text-[#F5F2EB]'
                            : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
                        }`}
                      >
                        Lámina arte
                      </button>
                    </div>
                  </div>

                  {/* Menu Action Items */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleRandomDescent}
                      className="w-full flex items-center justify-between gap-3 px-3 min-h-[44px] rounded-lg hover:bg-[#18181D] text-left text-xs font-medium text-[#F5F2EB] transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Shuffle className="w-4 h-4 text-[#DC2626]" aria-hidden="true" />
                        <span>Elegir ruta al azar</span>
                      </span>
                      <span className="font-mono text-[10px] text-[#71717A]">3 niveles</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        soundEngine.playClick(250);
                        const ok = await handleShareUrl();
                        if (ok) {
                          setCopiedRoute(true);
                          window.setTimeout(() => setCopiedRoute(false), 2000);
                        }
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3 min-h-[44px] rounded-lg hover:bg-[#18181D] text-left text-xs font-medium text-[#F5F2EB] transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        {copiedRoute ? (
                          <Check className="w-4 h-4 text-[#DC2626]" aria-hidden="true" />
                        ) : (
                          <Share2 className="w-4 h-4 text-[#D6C7B2]" aria-hidden="true" />
                        )}
                        <span>{copiedRoute ? 'Enlace copiado' : 'Compartir esta ruta'}</span>
                      </span>
                    </button>

                    {!isInstalled && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleInstallAppClick}
                        className="w-full flex items-center justify-between gap-3 px-3 min-h-[44px] rounded-lg bg-[#18181D]/60 hover:bg-[#1D1215] border border-[#272730] hover:border-[#DC2626]/60 text-left text-xs font-medium text-[#F5F2EB] transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <Download className="w-4 h-4 text-[#DC2626]" aria-hidden="true" />
                          <span>Instalar app</span>
                        </span>
                        <span className="font-mono text-[10px] text-[#A1A1AA]">PWA</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'tree' && (
          <section
            aria-label="Introducción al selector"
            className="relative mb-6 sm:mb-9 rounded-xl overflow-hidden border border-[#272730] bg-[#0B0B0E]"
          >
            {/* Atmospheric Screening Room Backdrop */}
            <img
              src={heroBackdropImg}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-50 sm:opacity-45"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#08080A] via-[#08080A]/65 to-[#08080A]/45"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#08080A]/90 via-[#08080A]/55 to-transparent"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,_rgba(220,38,38,0.16),_transparent_58%)] pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10 px-5 py-7 sm:px-8 sm:py-11 lg:px-10 lg:py-12 max-w-3xl">
              <p className="text-[11px] sm:text-xs font-mono tracking-wider uppercase text-[#DC2626] mb-2">
                Mapa taxonómico · {HORROR_FILMS.length + discoveredFilms.length} obras
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#F5F2EB] leading-[1.03] tracking-tight text-balance drop-shadow-[0_2px_18px_rgba(0,0,0,0.85)]">
                Encuentra el terror exacto para esta noche
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA]/75 mt-2.5 sm:mt-3 max-w-xl leading-relaxed">
                Desciende por ramas desde los cinco troncos del género hasta tu atmósfera ideal.
              </p>
            </div>
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
                posterMode={posterMode}
                randomScrollToken={randomScrollToken}
                onSelectBranch={setSelectedBranchId}
                onSelectSubgenre={setSelectedSubgenreId}
                onSelectFocus={setSelectedFocusId}
                onResetAll={handleResetTree}
                savedIds={savedIds}
                onToggleSave={handleToggleSave}
                onSelectFilm={setActiveFilmDossier}
                discoveredFilms={discoveredFilms}
                onAddDiscoveredFilms={handleAddDiscoveredFilms}
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
                posterMode={posterMode}
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

      {/* PWA Install Instructions Modal */}
      <PWAInstallInstructionsModal
        isOpen={showInstallModal}
        isIOS={isIOS}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
}
