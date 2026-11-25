import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Loader2,
  RotateCcw,
  Share2,
  Shuffle,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BranchId,
  EraType,
  GoreLevel,
  HORROR_FILMS,
  HORROR_TAXONOMY,
  HorrorFilm,
  PacingType,
} from '../data/horrorTaxonomy';
import { soundEngine } from '../utils/soundEffects';
import { FilmCard } from './FilmCard';
import { PWAInstallButton } from './PWAInstallButton';

interface WebSource {
  uri: string;
  title: string;
}

interface HorrorTreeSelectorProps {
  selectedBranchId: BranchId | null;
  selectedSubgenreId: string | null;
  selectedFocusId: string | null;
  onSelectBranch: (id: BranchId | null) => void;
  onSelectSubgenre: (id: string | null) => void;
  onSelectFocus: (id: string | null) => void;
  onResetAll: () => void;
  savedIds: string[];
  onToggleSave: (filmId: string) => void;
  onSelectFilm: (film: HorrorFilm) => void;
  discoveredFilms: HorrorFilm[];
  onAddDiscoveredFilms: (films: HorrorFilm[]) => void;
  onShareRoute: () => Promise<boolean>;
}

interface CurvePath {
  id: string;
  d: string;
  active: boolean;
}

export function HorrorTreeSelector({
  selectedBranchId,
  selectedSubgenreId,
  selectedFocusId,
  onSelectBranch,
  onSelectSubgenre,
  onSelectFocus,
  onResetAll,
  savedIds,
  onToggleSave,
  onSelectFilm,
  discoveredFilms,
  onAddDiscoveredFilms,
  onShareRoute,
}: HorrorTreeSelectorProps) {
  const [eraFilter, setEraFilter] = useState<'Todas' | EraType>('Todas');
  const [pacingFilter, setPacingFilter] = useState<'Todos' | PacingType>('Todos');
  const [goreFilter, setGoreFilter] = useState<'Todos' | GoreLevel>('Todos');
  const [posterMode, setPosterMode] = useState<'official' | 'artistic'>('official');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(soundEngine.isEnabled());
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [copiedRoute, setCopiedRoute] = useState(false);

  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(() =>
    selectedSubgenreId ? 3 : selectedBranchId ? 2 : 1
  );

  const [customQuery, setCustomQuery] = useState('');
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [webSources, setWebSources] = useState<WebSource[]>([]);

  const resultsRef = useRef<HTMLElement | null>(null);
  const treeGridRef = useRef<HTMLDivElement | null>(null);
  const branchRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const subgenreRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const focusRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [paths1to2, setPaths1to2] = useState<CurvePath[]>([]);
  const [paths2to3, setPaths2to3] = useState<CurvePath[]>([]);

  useEffect(() => {
    if (!selectedBranchId) {
      setMobileStep(1);
    } else if (!selectedSubgenreId) {
      setMobileStep(2);
    } else {
      setMobileStep(3);
    }
  }, [selectedBranchId, selectedSubgenreId]);

  const selectedBranch = HORROR_TAXONOMY.find((b) => b.id === selectedBranchId) ?? null;
  const selectedSubgenre =
    selectedBranch?.subgenres.find((s) => s.id === selectedSubgenreId) ?? null;
  const selectedFocus =
    selectedSubgenre?.focuses.find((f) => f.id === selectedFocusId) ?? null;

  const computeConnectors = useCallback(() => {
    const container = treeGridRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    if (selectedBranchId && selectedBranch) {
      const parentEl = branchRefs.current[selectedBranchId];
      if (parentEl) {
        const pRect = parentEl.getBoundingClientRect();
        const x1 = pRect.right - containerRect.left;
        const y1 = pRect.top + pRect.height / 2 - containerRect.top;

        const nextPaths: CurvePath[] = [];
        selectedBranch.subgenres.forEach((sub) => {
          const childEl = subgenreRefs.current[sub.id];
          if (!childEl) return;
          const cRect = childEl.getBoundingClientRect();
          const x2 = cRect.left - containerRect.left;
          const y2 = cRect.top + cRect.height / 2 - containerRect.top;
          const midX = x1 + (x2 - x1) * 0.52;

          nextPaths.push({
            id: `${selectedBranchId}-${sub.id}`,
            d: `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`,
            active: sub.id === selectedSubgenreId,
          });
        });
        setPaths1to2(nextPaths);
      }
    } else {
      setPaths1to2([]);
    }

    if (selectedSubgenreId && selectedSubgenre) {
      const parentEl = subgenreRefs.current[selectedSubgenreId];
      if (parentEl) {
        const pRect = parentEl.getBoundingClientRect();
        const x1 = pRect.right - containerRect.left;
        const y1 = pRect.top + pRect.height / 2 - containerRect.top;

        const nextPaths: CurvePath[] = [];
        selectedSubgenre.focuses.forEach((foc) => {
          const childEl = focusRefs.current[foc.id];
          if (!childEl) return;
          const cRect = childEl.getBoundingClientRect();
          const x2 = cRect.left - containerRect.left;
          const y2 = cRect.top + cRect.height / 2 - containerRect.top;
          const midX = x1 + (x2 - x1) * 0.52;

          nextPaths.push({
            id: `${selectedSubgenreId}-${foc.id}`,
            d: `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`,
            active: foc.id === selectedFocusId,
          });
        });
        setPaths2to3(nextPaths);
      }
    } else {
      setPaths2to3([]);
    }
  }, [selectedBranchId, selectedBranch, selectedSubgenreId, selectedSubgenre, selectedFocusId]);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(computeConnectors);
    return () => cancelAnimationFrame(raf);
  }, [computeConnectors]);

  useEffect(() => {
    const container = treeGridRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      computeConnectors();
    });
    observer.observe(container);
    window.addEventListener('resize', computeConnectors);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', computeConnectors);
    };
  }, [computeConnectors]);

  const handleToggleAudio = () => {
    const next = soundEngine.toggle();
    setAudioEnabled(next);
  };

  const handleBranchClick = (branchId: BranchId) => {
    soundEngine.playClick(185);
    if (selectedBranchId === branchId) {
      setMobileStep(2);
      return;
    }
    onSelectBranch(branchId);
    onSelectSubgenre(null);
    onSelectFocus(null);
    setMobileStep(2);
  };

  const handleSubgenreClick = (subId: string) => {
    soundEngine.playClick(235);
    if (selectedSubgenreId === subId) {
      setMobileStep(3);
      return;
    }
    onSelectSubgenre(subId);
    onSelectFocus(null);
    setMobileStep(3);
  };

  const handleFocusClick = (focusId: string) => {
    soundEngine.playReveal();
    onSelectFocus(focusId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const handleRandomDescent = () => {
    const randomBranch =
      HORROR_TAXONOMY[Math.floor(Math.random() * HORROR_TAXONOMY.length)];
    const randomSub =
      randomBranch.subgenres[Math.floor(Math.random() * randomBranch.subgenres.length)];
    const randomFocus =
      randomSub.focuses[Math.floor(Math.random() * randomSub.focuses.length)];

    soundEngine.playReveal();
    onSelectBranch(randomBranch.id);
    onSelectSubgenre(randomSub.id);
    onSelectFocus(randomFocus.id);
    setMobileStep(3);
    setEraFilter('Todas');
    setPacingFilter('Todos');
    setGoreFilter('Todos');
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const allFilms = [...HORROR_FILMS, ...discoveredFilms];

  const handleDiscoverFromInternet = async () => {
    if (!selectedBranch || isSearchingWeb) return;
    soundEngine.playClick(210);
    setIsSearchingWeb(true);
    setWebError(null);

    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedBranch.id,
          branchName: selectedBranch.name,
          subgenreId: selectedSubgenre?.id ?? 'general',
          subgenreName: selectedSubgenre?.name ?? '',
          focusId: selectedFocus?.id ?? 'general',
          focusName: selectedFocus?.name ?? '',
          era: eraFilter,
          pacing: pacingFilter,
          gore: goreFilter,
          customQuery: customQuery.trim(),
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
        soundEngine.playReveal();
      } else {
        setWebError('No se encontraron títulos nuevos para esa combinación. Prueba otra petición.');
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

  const branchFilms = allFilms.filter((film) => {
    if (selectedFocusId) {
      return (
        film.focusId === selectedFocusId ||
        (film.isExternalDiscovery &&
          film.branchId === selectedBranchId &&
          (film.subgenreId === selectedSubgenreId || film.subgenreId === 'general') &&
          film.focusId === 'general')
      );
    }
    if (selectedSubgenreId) {
      return (
        film.subgenreId === selectedSubgenreId ||
        (film.isExternalDiscovery &&
          film.branchId === selectedBranchId &&
          film.subgenreId === 'general')
      );
    }
    if (selectedBranchId) return film.branchId === selectedBranchId;
    return false;
  });

  const filteredFilms = branchFilms.filter((film) => {
    if (eraFilter !== 'Todas' && film.era !== eraFilter) return false;
    if (pacingFilter !== 'Todos' && film.pacing !== pacingFilter) return false;
    if (goreFilter !== 'Todos' && film.fearProfile.gore !== goreFilter) return false;
    return true;
  });

  const curatedSlice = selectedFocusId
    ? filteredFilms.filter((f) => !f.isExternalDiscovery)
    : filteredFilms.filter((f) => !f.isExternalDiscovery).slice(0, 6);
  const externalMatching = filteredFilms.filter((f) => f.isExternalDiscovery);
  const displayedFilms = [...curatedSlice, ...externalMatching];

  const activeFilterCount =
    (eraFilter !== 'Todas' ? 1 : 0) +
    (pacingFilter !== 'Todos' ? 1 : 0) +
    (goreFilter !== 'Todos' ? 1 : 0);

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Stage Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#272730]">
        <nav
          aria-label="Ruta actual en el árbol de géneros"
          className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm"
        >
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick(160);
              onResetAll();
              setMobileStep(1);
            }}
            className={`px-2.5 min-h-[36px] sm:min-h-0 sm:py-1 rounded transition-colors ${
              !selectedBranch
                ? 'text-[#F5F2EB] font-medium bg-[#18181D]'
                : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
            }`}
          >
            Todo el terror
          </button>

          {selectedBranch && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[#52525B]" aria-hidden="true" />
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick(180);
                  onSelectSubgenre(null);
                  onSelectFocus(null);
                  setMobileStep(2);
                }}
                className={`px-2.5 min-h-[36px] sm:min-h-0 sm:py-1 rounded transition-colors ${
                  !selectedSubgenre
                    ? 'text-[#F5F2EB] font-medium bg-[#18181D]'
                    : 'text-[#D6C7B2] hover:text-[#F5F2EB]'
                }`}
              >
                {selectedBranch.name}
              </button>
            </>
          )}

          {selectedSubgenre && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[#52525B]" aria-hidden="true" />
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick(200);
                  onSelectFocus(null);
                  setMobileStep(3);
                }}
                className={`px-2.5 min-h-[36px] sm:min-h-0 sm:py-1 rounded transition-colors ${
                  !selectedFocus
                    ? 'text-[#F5F2EB] font-medium bg-[#18181D]'
                    : 'text-[#D6C7B2] hover:text-[#F5F2EB]'
                }`}
              >
                {selectedSubgenre.name}
              </button>
            </>
          )}

          {selectedFocus && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[#52525B]" aria-hidden="true" />
              <span className="px-2.5 py-1 rounded bg-[#DC2626]/15 text-[#F5F2EB] font-medium">
                {selectedFocus.name}
              </span>
            </>
          )}
        </nav>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Poster Art Mode Toggle */}
          <div
            role="group"
            aria-label="Estilo visual de los carteles"
            className="flex items-center gap-1 p-1 rounded-lg bg-[#121216] border border-[#272730]"
          >
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(240);
                setPosterMode('official');
              }}
              className={`px-2.5 min-h-[38px] sm:min-h-0 sm:py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
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
              className={`px-2.5 min-h-[38px] sm:min-h-0 sm:py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                posterMode === 'artistic'
                  ? 'bg-[#272730] text-[#F5F2EB]'
                  : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
              }`}
            >
              Lámina arte
            </button>
          </div>

          <button
            type="button"
            onClick={handleRandomDescent}
            className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 min-h-[44px] sm:min-h-0 sm:py-2 rounded-lg bg-[#18181D] border border-[#272730] hover:border-[#DC2626] text-xs font-medium text-[#F5F2EB] transition-colors whitespace-nowrap shrink-0"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
            <span>Al azar</span>
          </button>

          <button
            type="button"
            onClick={handleToggleAudio}
            aria-pressed={audioEnabled}
            className={`inline-flex items-center justify-center gap-2 px-3.5 min-h-[44px] sm:min-h-0 sm:py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              audioEnabled
                ? 'bg-[#DC2626]/15 border-[#DC2626]/60 text-[#F5F2EB]'
                : 'bg-[#121216] border-[#272730] text-[#A1A1AA] hover:text-[#F5F2EB]'
            }`}
          >
            {audioEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{audioEnabled ? 'Audio activo' : 'Audio ambiente'}</span>
            <span className="sm:hidden">{audioEnabled ? 'Audio' : 'Sonido'}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              soundEngine.playClick(250);
              const ok = await onShareRoute();
              if (ok) {
                setCopiedRoute(true);
                window.setTimeout(() => setCopiedRoute(false), 2000);
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-3.5 min-h-[44px] sm:min-h-0 sm:py-2 rounded-lg bg-[#18181D] border border-[#272730] hover:border-[#DC2626] text-xs font-medium text-[#F5F2EB] transition-colors whitespace-nowrap shrink-0"
          >
            {copiedRoute ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
                <span>Enlace copiado</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#D6C7B2]" aria-hidden="true" />
                <span>Compartir</span>
              </>
            )}
          </button>

          <PWAInstallButton />
        </div>
      </div>

      {/* MOBILE PROGRESSIVE STEPPER (< lg): 1 Level at a Time */}
      <section aria-label="Selector paso a paso móvil" className="lg:hidden space-y-4">
        {/* Stepper Tabs */}
        <div
          role="tablist"
          aria-label="Pasos de selección"
          className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#121216] border border-[#272730]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileStep === 1}
            onClick={() => {
              soundEngine.playClick(180);
              setMobileStep(1);
            }}
            className={`min-h-[44px] px-2 rounded text-xs font-medium transition-colors truncate ${
              mobileStep === 1
                ? 'bg-[#DC2626] text-white'
                : 'text-[#D4D4D8] hover:text-[#F5F2EB]'
            }`}
          >
            1. Género
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileStep === 2}
            disabled={!selectedBranch}
            onClick={() => {
              if (!selectedBranch) return;
              soundEngine.playClick(200);
              setMobileStep(2);
            }}
            className={`min-h-[44px] px-2 rounded text-xs font-medium transition-colors truncate disabled:opacity-40 ${
              mobileStep === 2
                ? 'bg-[#DC2626] text-white'
                : 'text-[#D4D4D8] hover:text-[#F5F2EB]'
            }`}
          >
            2. Subgénero
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileStep === 3}
            disabled={!selectedSubgenre}
            onClick={() => {
              if (!selectedSubgenre) return;
              soundEngine.playClick(220);
              setMobileStep(3);
            }}
            className={`min-h-[44px] px-2 rounded text-xs font-medium transition-colors truncate disabled:opacity-40 ${
              mobileStep === 3
                ? 'bg-[#DC2626] text-white'
                : 'text-[#D4D4D8] hover:text-[#F5F2EB]'
            }`}
          >
            3. Enfoque
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mobileStep === 1 && (
            <motion.div
              key="mobile-step-1"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
              className="space-y-2.5"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl font-semibold text-[#F5F2EB]">
                  Elige el gran género
                </h2>
                <span className="text-xs font-mono text-[#A1A1AA]">Paso 1 de 3</span>
              </div>

              {HORROR_TAXONOMY.map((branch) => {
                const isSelected = selectedBranchId === branch.id;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => handleBranchClick(branch.id)}
                    aria-pressed={isSelected}
                    className={`group relative w-full text-left rounded-lg overflow-hidden border transition-all min-h-[72px] ${
                      isSelected
                        ? 'border-[#DC2626] bg-[#161215]'
                        : 'border-[#272730] bg-[#121216] hover:border-[#52525B]'
                    }`}
                  >
                    <img
                      src={branch.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      className={`absolute inset-0 w-full h-full object-cover ${
                        isSelected ? 'opacity-35' : 'opacity-20'
                      }`}
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-[#08080A]/95 via-[#08080A]/80 to-[#08080A]/60"
                      aria-hidden="true"
                    />
                    <div className="relative p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-mono text-[11px] text-[#DC2626] block">
                          {branch.index}. Rama principal · 18 títulos
                        </span>
                        <p className="font-display text-xl font-semibold text-[#F5F2EB] leading-snug">
                          {branch.name}
                        </p>
                        <p className="text-xs text-[#A1A1AA] mt-0.5 line-clamp-1">
                          {branch.coreQuestion}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#D6C7B2] shrink-0" aria-hidden="true" />
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}

          {mobileStep === 2 && selectedBranch && (
            <motion.div
              key={`mobile-step-2-${selectedBranch.id}`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setMobileStep(1)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#D6C7B2] hover:text-[#F5F2EB] min-h-[44px] pr-2"
                >
                  <ChevronLeft className="w-4 h-4 text-[#DC2626]" aria-hidden="true" />
                  <span>Cambiar género ({selectedBranch.name})</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  className="text-xs font-mono text-[#DC2626] underline underline-offset-4 min-h-[44px] px-1 whitespace-nowrap"
                >
                  Ver películas ({displayedFilms.length})
                </button>
              </div>

              {selectedBranch.subgenres.map((sub, idx) => {
                const isSelected = selectedSubgenreId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubgenreClick(sub.id)}
                    aria-pressed={isSelected}
                    className={`w-full text-left p-4 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-[#DC2626] bg-[#181215]'
                        : 'border-[#272730] bg-[#121216] hover:border-[#52525B]'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-[#D6C7B2] block mb-0.5">
                        Subgénero {selectedBranch.index}.{idx + 1} · 6 títulos
                      </span>
                      <p className="font-display text-xl font-semibold text-[#F5F2EB]">
                        {sub.name}
                      </p>
                      <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                        {sub.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#D6C7B2] shrink-0" aria-hidden="true" />
                  </button>
                );
              })}
            </motion.div>
          )}

          {mobileStep === 3 && selectedBranch && selectedSubgenre && (
            <motion.div
              key={`mobile-step-3-${selectedSubgenre.id}`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setMobileStep(2)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#D6C7B2] hover:text-[#F5F2EB] min-h-[44px] pr-2"
                >
                  <ChevronLeft className="w-4 h-4 text-[#DC2626]" aria-hidden="true" />
                  <span>Cambiar subgénero ({selectedSubgenre.name})</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  className="text-xs font-mono text-[#DC2626] underline underline-offset-4 min-h-[44px] px-1 whitespace-nowrap"
                >
                  Ir a resultados ({displayedFilms.length})
                </button>
              </div>

              {selectedSubgenre.focuses.map((foc, idx) => {
                const isSelected = selectedFocusId === foc.id;
                return (
                  <button
                    key={foc.id}
                    type="button"
                    onClick={() => handleFocusClick(foc.id)}
                    aria-pressed={isSelected}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-[#DC2626] bg-[#1D1215]'
                        : 'border-[#272730] bg-[#121216] hover:border-[#52525B]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs text-[#DC2626]">
                        Enfoque {idx === 0 ? 'A' : 'B'}
                      </span>
                      <span className="text-xs font-mono text-[#A1A1AA] tabular-nums">
                        3 películas
                      </span>
                    </div>
                    <p className="font-display text-2xl font-semibold text-[#F5F2EB] leading-snug">
                      {foc.name}
                    </p>
                    <p className="text-xs text-[#D4D4D8] mt-1 leading-relaxed">
                      {foc.subtitle}
                    </p>
                    <div className="mt-2.5 pt-2.5 border-t border-white/5 text-xs text-[#A1A1AA]">
                      <span className="font-mono text-[#D6C7B2]">Atmósfera: </span>
                      {foc.atmosphereNote}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* DESKTOP 3-Column Branching Genre Taxonomy (lg+) */}
      <section aria-label="Árbol de géneros y subgéneros del terror" className="hidden lg:block">
        <div
          ref={treeGridRef}
          className="relative grid grid-cols-3 gap-14 items-start"
        >
          {/* Animated SVG Bézier Connectors */}
          <svg
            className="hidden lg:block pointer-events-none absolute inset-0 w-full h-full z-0"
            aria-hidden="true"
          >
            {paths1to2.map((path) => (
              <motion.path
                key={path.id}
                d={path.d}
                fill="none"
                stroke={path.active ? '#DC2626' : '#272730'}
                strokeWidth={path.active ? 2 : 1.25}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: path.active ? 1 : 0.7 }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
            {paths2to3.map((path) => (
              <motion.path
                key={path.id}
                d={path.d}
                fill="none"
                stroke={path.active ? '#DC2626' : '#272730'}
                strokeWidth={path.active ? 2 : 1.25}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: path.active ? 1 : 0.7 }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
          </svg>

          {/* LEVEL 1: 5 PRIMARY HORROR BRANCHES */}
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-xl font-semibold text-[#F5F2EB]">
                1. Gran Género
              </h2>
              <span className="text-xs font-mono text-[#A1A1AA]">De mayor</span>
            </div>

            <div className="space-y-2.5">
              {HORROR_TAXONOMY.map((branch) => {
                const isSelected = selectedBranchId === branch.id;
                const isDimmed = selectedBranchId !== null && !isSelected;

                return (
                  <button
                    key={branch.id}
                    ref={(el) => {
                      branchRefs.current[branch.id] = el;
                    }}
                    type="button"
                    onClick={() => handleBranchClick(branch.id)}
                    aria-pressed={isSelected}
                    className={`group relative w-full text-left rounded-lg overflow-hidden border transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#DC2626] ${
                      isSelected
                        ? 'border-[#DC2626] bg-[#161215]'
                        : 'border-[#272730] bg-[#121216] hover:border-[#52525B]'
                    } ${isDimmed ? 'opacity-50 hover:opacity-85' : 'opacity-100'}`}
                  >
                    <img
                      src={branch.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                        isSelected ? 'opacity-35' : 'opacity-20 group-hover:opacity-30'
                      }`}
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-[#08080A]/95 via-[#08080A]/80 to-[#08080A]/60"
                      aria-hidden="true"
                    />

                    <div className="relative p-3.5">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-mono text-xs text-[#DC2626]">
                          {branch.index}. Rama principal
                        </span>
                        <span className="text-xs font-mono text-[#A1A1AA] tabular-nums">
                          18 títulos
                        </span>
                      </div>
                      <p className="font-display text-xl font-semibold text-[#F5F2EB] leading-snug">
                        {branch.name}
                      </p>
                      <p className="text-xs text-[#A1A1AA] mt-0.5 line-clamp-1">
                        {branch.coreQuestion}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LEVEL 2: SUBGENRES */}
          <div className="relative z-10 space-y-3">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-xl font-semibold text-[#F5F2EB]">
                2. Subgénero
              </h2>
              <span className="text-xs font-mono text-[#A1A1AA]">Ramificación</span>
            </div>

            <AnimatePresence mode="wait">
              {!selectedBranch ? (
                <motion.div
                  key="empty-subgenre"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 rounded-lg border border-dashed border-[#272730] bg-[#0C0C0F] text-sm text-[#A1A1AA]"
                >
                  Elige uno de los cinco troncos principales a la izquierda para desplegar sus subgéneros.
                </motion.div>
              ) : (
                <motion.div
                  key={selectedBranch.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-3"
                >
                  {selectedBranch.subgenres.map((sub, idx) => {
                    const isSelected = selectedSubgenreId === sub.id;
                    const isDimmed = selectedSubgenreId !== null && !isSelected;

                    return (
                      <button
                        key={sub.id}
                        ref={(el) => {
                          subgenreRefs.current[sub.id] = el;
                        }}
                        type="button"
                        onClick={() => handleSubgenreClick(sub.id)}
                        aria-pressed={isSelected}
                        className={`w-full text-left p-4 rounded-lg border transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#DC2626] ${
                          isSelected
                            ? 'border-[#DC2626] bg-[#181215]'
                            : 'border-[#272730] bg-[#121216] hover:border-[#52525B]'
                        } ${isDimmed ? 'opacity-50 hover:opacity-85' : 'opacity-100'}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-xs text-[#D6C7B2]">
                            Subgénero {selectedBranch.index}.{idx + 1}
                          </span>
                          <span className="text-xs font-mono text-[#A1A1AA] tabular-nums">
                            6 títulos
                          </span>
                        </div>
                        <p className="font-display text-xl font-semibold text-[#F5F2EB]">
                          {sub.name}
                        </p>
                        <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                          {sub.description}
                        </p>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* LEVEL 3: SPECIFIC FOCUS / TROPES */}
          <div className="relative z-10 space-y-3">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-xl font-semibold text-[#F5F2EB]">
                3. Enfoque o Escenario
              </h2>
              <span className="text-xs font-mono text-[#A1A1AA]">A menor</span>
            </div>

            <AnimatePresence mode="wait">
              {!selectedSubgenre ? (
                <motion.div
                  key="empty-focus"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 rounded-lg border border-dashed border-[#272730] bg-[#0C0C0F] text-sm text-[#A1A1AA]"
                >
                  Selecciona un subgénero para elegir el enfoque o atmósfera exacta y ver las películas recomendadas.
                </motion.div>
              ) : (
                <motion.div
                  key={selectedSubgenre.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-3"
                >
                  {selectedSubgenre.focuses.map((foc, idx) => {
                    const isSelected = selectedFocusId === foc.id;
                    const isDimmed = selectedFocusId !== null && !isSelected;

                    return (
                      <button
                        key={foc.id}
                        ref={(el) => {
                          focusRefs.current[foc.id] = el;
                        }}
                        type="button"
                        onClick={() => handleFocusClick(foc.id)}
                        aria-pressed={isSelected}
                        className={`w-full text-left p-5 rounded-lg border transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#DC2626] ${
                          isSelected
                            ? 'border-[#DC2626] bg-[#1D1215]'
                            : 'border-[#272730] bg-[#121216] hover:border-[#52525B]'
                        } ${isDimmed ? 'opacity-50 hover:opacity-85' : 'opacity-100'}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-xs text-[#DC2626]">
                            Enfoque {idx === 0 ? 'A' : 'B'}
                          </span>
                          <span className="text-xs font-mono text-[#A1A1AA] tabular-nums">
                            3 películas
                          </span>
                        </div>
                        <p className="font-display text-2xl font-semibold text-[#F5F2EB] leading-snug">
                          {foc.name}
                        </p>
                        <p className="text-xs text-[#D4D4D8] mt-1.5 leading-relaxed">
                          {foc.subtitle}
                        </p>
                        <div className="mt-3 pt-3 border-t border-white/5 text-xs text-[#A1A1AA]">
                          <span className="font-mono text-[#D6C7B2]">Atmósfera: </span>
                          {foc.atmosphereNote}
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Preference Filters & Curated Results */}
      <section
        ref={resultsRef}
        aria-label="Películas recomendadas"
        className="pt-6 sm:pt-8 border-t border-[#272730] space-y-5 sm:space-y-6 scroll-mt-4"
      >
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 sm:gap-6">
          <div>
            <p className="text-xs font-mono text-[#DC2626] mb-1">
              {selectedFocus
                ? 'Selección final'
                : selectedBranch
                  ? 'Vista previa de la rama'
                  : 'Elige una ruta para empezar'}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F2EB] text-balance">
              {selectedFocus
                ? selectedFocus.name
                : selectedSubgenre
                  ? `Películas en ${selectedSubgenre.name}`
                  : selectedBranch
                    ? `Explorando ${selectedBranch.name}`
                    : 'Selecciona un género arriba para obtener recomendaciones'}
            </h2>
            <p className="text-sm text-[#A1A1AA] mt-1 max-w-2xl">
              {selectedFocus
                ? `${selectedFocus.subtitle}. Atmósfera predominante: ${selectedFocus.atmosphereNote.toLowerCase()}.`
                : selectedBranch
                  ? 'Afina bajando al siguiente nivel o ajusta tus preferencias de época, ritmo y nivel gráfico.'
                  : 'Navega paso a paso arriba o pulsa en Al azar.'}
            </p>
          </div>

          {selectedBranch && (
            <div className="space-y-3">
              {/* Mobile Filter Toggle Button */}
              <div className="sm:hidden flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowMobileFilters((v) => !v)}
                  aria-expanded={showMobileFilters}
                  className="inline-flex items-center gap-2 px-3.5 min-h-[44px] rounded-lg bg-[#121216] border border-[#272730] text-xs font-medium text-[#F5F2EB]"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
                  <span>
                    {showMobileFilters ? 'Ocultar filtros' : 'Filtrar época, ritmo o gore'}
                    {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                  </span>
                </button>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEraFilter('Todas');
                      setPacingFilter('Todos');
                      setGoreFilter('Todos');
                    }}
                    className="text-xs text-[#DC2626] min-h-[44px] px-2"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div
                className={`${
                  showMobileFilters ? 'flex' : 'hidden sm:flex'
                } flex-wrap items-center gap-2.5`}
              >
                {/* Era Filter */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121216] border border-[#272730] overflow-x-auto max-w-full">
                  {(['Todas', 'Clásico', 'Moderno'] as const).map((era) => (
                    <button
                      key={era}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick(250);
                        setEraFilter(era);
                      }}
                      className={`px-2.5 min-h-[38px] sm:min-h-0 sm:py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        eraFilter === era
                          ? 'bg-[#DC2626] text-white'
                          : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
                      }`}
                    >
                      {era === 'Todas' ? 'Cualquier época' : era}
                    </button>
                  ))}
                </div>

                {/* Pacing Filter */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121216] border border-[#272730] overflow-x-auto max-w-full">
                  {(['Todos', 'Lento', 'Equilibrado', 'Frenético'] as const).map((pace) => (
                    <button
                      key={pace}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick(265);
                        setPacingFilter(pace);
                      }}
                      className={`px-2.5 min-h-[38px] sm:min-h-0 sm:py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        pacingFilter === pace
                          ? 'bg-[#272730] text-[#F5F2EB]'
                          : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
                      }`}
                    >
                      {pace === 'Todos' ? 'Cualquier ritmo' : pace}
                    </button>
                  ))}
                </div>

                {/* Gore Filter */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121216] border border-[#272730] overflow-x-auto max-w-full">
                  {(['Todos', 'Sutil', 'Moderado', 'Explícito'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick(280);
                        setGoreFilter(g);
                      }}
                      className={`px-2.5 min-h-[38px] sm:min-h-0 sm:py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
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
          )}
        </div>

        {/* Results */}
        {!selectedBranch ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {HORROR_TAXONOMY.slice(0, 3).map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleBranchClick(b.id)}
                className="text-left p-5 rounded-lg bg-[#121216] border border-[#272730] hover:border-[#DC2626] transition-colors group"
              >
                <p className="text-xs font-mono text-[#DC2626] mb-1.5">
                  Punto de partida 0{i + 1}
                </p>
                <p className="font-display text-2xl font-semibold text-[#F5F2EB] group-hover:text-[#DC2626] transition-colors">
                  {b.name}
                </p>
                <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">{b.description}</p>
              </button>
            ))}
          </div>
        ) : displayedFilms.length === 0 ? (
          <div className="p-8 rounded-lg bg-[#121216] border border-[#272730] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-display text-2xl font-semibold text-[#F5F2EB]">
                No hay coincidencias con todos esos filtros combinados
              </p>
              <p className="text-sm text-[#A1A1AA] mt-1">
                Restablece los filtros de época, ritmo o nivel gráfico para ver todas las películas de esta selección.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEraFilter('Todas');
                setPacingFilter('Todos');
                setGoreFilter('Todos');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#DC2626] text-white text-xs font-medium hover:bg-[#B91C1C] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Mostrar todas de esta rama</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedFilms.map((film, idx) => (
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

        {/* Open Internet Discovery Bar */}
        {selectedBranch && (
          <div className="mt-8 p-6 rounded-lg bg-[#121216] border border-[#272730] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-mono text-[#DC2626] mb-1">
                  Búsqueda abierta en internet
                </p>
                <h3 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                  ¿Quieres ir más allá del archivo curado?
                </h3>
                <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 leading-relaxed">
                  Explora recomendaciones reales de todo el cine internacional afines a{' '}
                  <span className="text-[#F5F2EB]">
                    {selectedFocus?.name || selectedSubgenre?.name || selectedBranch.name}
                  </span>{' '}
                  sin repetir las ya mostradas.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDiscoverFromInternet();
              }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Opcional: ej. cine japonés de los 70, folk horror latinoamericano, sin sobresaltos..."
                aria-label="Preferencia adicional para buscar películas en internet"
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#08080A] border border-[#272730] text-sm text-[#F5F2EB] placeholder:text-[#71717A] focus:outline-none focus:border-[#DC2626] transition-colors"
              />
              <button
                type="submit"
                disabled={isSearchingWeb}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                {isSearchingWeb ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Buscando en internet...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {externalMatching.length > 0
                        ? 'Buscar 3 películas más'
                        : 'Sugerir desde internet'}
                    </span>
                  </>
                )}
              </button>
            </form>

            {webError && (
              <p className="text-xs text-[#DC2626]" role="alert">
                {webError}
              </p>
            )}

            {webSources.length > 0 && (
              <div className="pt-3 border-t border-[#272730] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#A1A1AA]">
                <span className="font-mono text-[#71717A]">Fuentes consultadas:</span>
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
          </div>
        )}
      </section>
    </div>
  );
}
