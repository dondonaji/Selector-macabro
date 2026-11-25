import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ChevronRight,
  ExternalLink,
  Globe,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
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

interface WebSource {
  uri: string;
  title: string;
}

interface HorrorTreeSelectorProps {
  selectedBranchId: BranchId | null;
  selectedSubgenreId: string | null;
  selectedFocusId: string | null;
  posterMode: 'official' | 'artistic';
  randomScrollToken?: number;
  onSelectBranch: (id: BranchId | null) => void;
  onSelectSubgenre: (id: string | null) => void;
  onSelectFocus: (id: string | null) => void;
  onResetAll: () => void;
  savedIds: string[];
  onToggleSave: (filmId: string) => void;
  onSelectFilm: (film: HorrorFilm) => void;
  discoveredFilms: HorrorFilm[];
  onAddDiscoveredFilms: (films: HorrorFilm[]) => void;
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
  posterMode,
  randomScrollToken = 0,
  onSelectBranch,
  onSelectSubgenre,
  onSelectFocus,
  onResetAll,
  savedIds,
  onToggleSave,
  onSelectFilm,
  discoveredFilms,
  onAddDiscoveredFilms,
}: HorrorTreeSelectorProps) {
  const [eraFilter, setEraFilter] = useState<'Todas' | EraType>('Todas');
  const [pacingFilter, setPacingFilter] = useState<'Todos' | PacingType>('Todos');
  const [goreFilter, setGoreFilter] = useState<'Todos' | GoreLevel>('Todos');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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

  useEffect(() => {
    if (randomScrollToken === 0) return;
    setEraFilter('Todas');
    setPacingFilter('Todos');
    setGoreFilter('Todos');
    setMobileStep(3);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 90);
    }
  }, [randomScrollToken]);

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
    <div className="space-y-7 lg:space-y-10">
      {/* Clean Taxonomic Route Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#272730]">
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
            className={`px-2.5 min-h-[38px] sm:min-h-0 sm:py-1 rounded transition-colors ${
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
                className={`px-2.5 min-h-[38px] sm:min-h-0 sm:py-1 rounded transition-colors ${
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
                className={`px-2.5 min-h-[38px] sm:min-h-0 sm:py-1 rounded transition-colors ${
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

        {selectedBranch && (
          <button
            type="button"
            onClick={() =>
              resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            className="lg:hidden inline-flex items-center gap-1.5 text-xs font-mono text-[#DC2626] min-h-[38px] px-1 whitespace-nowrap"
          >
            <span>Ver {displayedFilms.length} títulos</span>
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* MOBILE VERTICAL BRANCHING LINEAGE TREE (< lg) */}
      <section aria-label="Árbol vertical de decisión en tres niveles" className="lg:hidden">
        {/* PILAR 1: GRAN GÉNERO */}
        <div>
          {!selectedBranch || mobileStep === 1 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex w-2.5 h-2.5 rotate-45 bg-[#DC2626]" aria-hidden="true" />
                  <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                    1. El Tronco del Miedo
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[#A1A1AA]">5 ramas</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {HORROR_TAXONOMY.map((branch, idx) => {
                  const isSelected = selectedBranchId === branch.id;
                  const isWide = idx === 0;
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => handleBranchClick(branch.id)}
                      aria-pressed={isSelected}
                      className={`group relative text-left rounded-xl overflow-hidden border transition-all ${
                        isWide ? 'col-span-2 min-h-[116px]' : 'min-h-[132px]'
                      } ${
                        isSelected
                          ? 'border-[#DC2626] bg-[#161215] shadow-[0_0_24px_rgba(220,38,38,0.18)]'
                          : 'border-[#272730] bg-[#121216] hover:border-[#52525B]'
                      }`}
                    >
                      <img
                        src={branch.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-active:scale-[1.03] ${
                          isSelected ? 'opacity-45' : 'opacity-30'
                        }`}
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-[#08080A] via-[#08080A]/75 to-[#08080A]/35"
                        aria-hidden="true"
                      />
                      <div className="relative h-full p-3.5 flex flex-col justify-between gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-[#DC2626]">
                            0{branch.index}
                          </span>
                          <span className="font-mono text-[10px] text-[#A1A1AA] tabular-nums">
                            18 obras
                          </span>
                        </div>
                        <div>
                          <p className="font-display text-xl font-semibold text-[#F5F2EB] leading-tight">
                            {branch.name}
                          </p>
                          <p className="text-[11px] text-[#A1A1AA] mt-1 line-clamp-2 leading-snug">
                            {branch.coreQuestion}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Compact Connected Node for Selected Level 1 Branch */
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(180);
                setMobileStep(1);
              }}
              aria-expanded={false}
              className="group relative w-full text-left rounded-xl overflow-hidden border border-[#DC2626]/70 bg-[#151114] transition-colors min-h-[68px]"
            >
              <img
                src={selectedBranch.image}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
              <div
                className="absolute inset-0 bg-gradient-to-r from-[#08080A]/95 via-[#08080A]/80 to-[#08080A]/65"
                aria-hidden="true"
              />
              <div className="relative px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-3 h-3 rotate-45 bg-[#DC2626] shrink-0 shadow-[0_0_12px_rgba(220,38,38,0.8)]" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-[#DC2626]">
                      1 · Gran Género
                    </span>
                    <p className="font-display text-xl font-semibold text-[#F5F2EB] truncate leading-tight">
                      {selectedBranch.name}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#D6C7B2] group-hover:text-[#F5F2EB] shrink-0 px-2 py-1 rounded border border-[#272730] bg-[#08080A]/80">
                  Cambiar
                </span>
              </div>
            </button>
          )}
        </div>

        {/* SVG LINEAGE STEM: PILAR 1 -> PILAR 2 */}
        <div className="flex items-center pl-5 h-7" aria-hidden="true">
          <svg viewBox="0 0 24 28" className="w-6 h-7 overflow-visible">
            <motion.line
              x1="12"
              y1="0"
              x2="12"
              y2="28"
              stroke={selectedBranch ? '#DC2626' : '#272730'}
              strokeWidth={selectedBranch ? 2 : 1.5}
              strokeDasharray={selectedBranch ? undefined : '3 3'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.25 }}
            />
            {selectedBranch && (
              <polygon points="12,11 15,14 12,17 9,14" fill="#DC2626" />
            )}
          </svg>
        </div>

        {/* PILAR 2: SUBGÉNERO */}
        <div>
          {!selectedBranch ? (
            <div className="rounded-xl border border-dashed border-[#272730] bg-[#0C0C0F]/80 px-4 py-3.5 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full border border-[#52525B] shrink-0" aria-hidden="true" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                  2 · Subgénero
                </p>
                <p className="text-xs text-[#A1A1AA]">
                  Elige uno de los cinco troncos arriba para desplegar sus subgéneros.
                </p>
              </div>
            </div>
          ) : mobileStep === 2 || !selectedSubgenre ? (
            <motion.div
              key={`lineage-sub-${selectedBranch.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex w-2.5 h-2.5 rotate-45 bg-[#DC2626]" aria-hidden="true" />
                  <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                    2. Ramificación
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[#D6C7B2]">3 subgéneros</span>
              </div>

              <div className="relative pl-5 space-y-2.5">
                {/* Continuous Vertical Crimson Rail */}
                <div
                  className="absolute left-[19px] top-0 bottom-5 w-0.5 bg-gradient-to-b from-[#DC2626] via-[#DC2626]/70 to-[#272730]"
                  aria-hidden="true"
                />

                {selectedBranch.subgenres.map((sub, idx) => {
                  const isSelected = selectedSubgenreId === sub.id;
                  return (
                    <div key={sub.id} className="relative pl-5">
                      {/* Horizontal Curved Branch Twig */}
                      <svg
                        viewBox="0 0 24 24"
                        className="absolute -left-0.5 top-6 w-6 h-6 pointer-events-none"
                        aria-hidden="true"
                      >
                        <path
                          d="M 1 0 Q 1 12 22 12"
                          fill="none"
                          stroke={isSelected ? '#DC2626' : '#52525B'}
                          strokeWidth={isSelected ? 2 : 1.5}
                        />
                        <circle
                          cx="20"
                          cy="12"
                          r="2.5"
                          fill={isSelected ? '#DC2626' : '#52525B'}
                        />
                      </svg>

                      <button
                        type="button"
                        onClick={() => handleSubgenreClick(sub.id)}
                        aria-pressed={isSelected}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 min-h-[76px] ${
                          isSelected
                            ? 'border-[#DC2626] bg-[#191215] shadow-[0_0_20px_rgba(220,38,38,0.14)]'
                            : 'border-[#272730] bg-[#121216] hover:border-[#52525B]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[11px] text-[#DC2626]">
                              {selectedBranch.index}.{idx + 1}
                            </span>
                            <span className="font-mono text-[10px] text-[#71717A]">· 6 títulos</span>
                          </div>
                          <p className="font-display text-xl font-semibold text-[#F5F2EB] leading-snug">
                            {sub.name}
                          </p>
                          <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed line-clamp-2">
                            {sub.description}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#D6C7B2] shrink-0" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            /* Compact Connected Node for Selected Level 2 Subgenre */
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(200);
                setMobileStep(2);
              }}
              aria-expanded={false}
              className="group w-full text-left rounded-xl border border-[#DC2626]/70 bg-[#151114] px-4 py-3 flex items-center justify-between gap-3 min-h-[64px] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-3 h-3 rotate-45 bg-[#DC2626] shrink-0 shadow-[0_0_12px_rgba(220,38,38,0.8)]" aria-hidden="true" />
                <div className="min-w-0">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-[#DC2626]">
                    2 · Subgénero
                  </span>
                  <p className="font-display text-xl font-semibold text-[#F5F2EB] truncate leading-tight">
                    {selectedSubgenre.name}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-[#D6C7B2] group-hover:text-[#F5F2EB] shrink-0 px-2 py-1 rounded border border-[#272730] bg-[#08080A]/80">
                Cambiar
              </span>
            </button>
          )}
        </div>

        {/* SVG LINEAGE Y-FORK: PILAR 2 -> PILAR 3 */}
        <div className="flex items-center pl-5 h-7" aria-hidden="true">
          <svg viewBox="0 0 120 28" className="w-32 h-7 overflow-visible">
            <motion.path
              d="M 12 0 L 12 10 Q 12 18 22 28"
              fill="none"
              stroke={selectedSubgenre ? '#DC2626' : '#272730'}
              strokeWidth={selectedSubgenre ? 2 : 1.5}
              strokeDasharray={selectedSubgenre ? undefined : '3 3'}
            />
            <motion.path
              d="M 12 10 Q 12 18 52 20 L 96 20 Q 108 20 108 28"
              fill="none"
              stroke={selectedSubgenre ? '#DC2626' : '#272730'}
              strokeWidth={selectedSubgenre ? 1.5 : 1.25}
              strokeDasharray={selectedSubgenre ? undefined : '3 3'}
              opacity={selectedSubgenre ? 0.65 : 0.5}
            />
          </svg>
        </div>

        {/* PILAR 3: ENFOQUE / ATMÓSFERA */}
        <div>
          {!selectedSubgenre ? (
            <div className="rounded-xl border border-dashed border-[#272730] bg-[#0C0C0F]/80 px-4 py-3.5 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full border border-[#52525B] shrink-0" aria-hidden="true" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                  3 · Enfoque o Escenario
                </p>
                <p className="text-xs text-[#A1A1AA]">
                  Bifurca un subgénero para elegir entre dos atmósferas finales.
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              key={`lineage-foc-${selectedSubgenre.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex w-2.5 h-2.5 rotate-45 bg-[#DC2626]" aria-hidden="true" />
                  <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                    3. Enfoque Final
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[#D6C7B2]">A o B · 3 películas</span>
              </div>

              <div className="space-y-2.5">
                {selectedSubgenre.focuses.map((foc, idx) => {
                  const isSelected = selectedFocusId === foc.id;
                  return (
                    <button
                      key={foc.id}
                      type="button"
                      onClick={() => handleFocusClick(foc.id)}
                      aria-pressed={isSelected}
                      className={`group relative w-full text-left p-4 rounded-xl overflow-hidden border transition-all ${
                        isSelected
                          ? 'border-[#DC2626] bg-[#1C1215] shadow-[0_0_26px_rgba(220,38,38,0.2)]'
                          : 'border-[#272730] bg-[#121216] hover:border-[#52525B]'
                      }`}
                    >
                      {selectedBranch && (
                        <img
                          src={selectedBranch.image}
                          alt=""
                          referrerPolicy="no-referrer"
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                            isSelected ? 'opacity-20' : 'opacity-10'
                          }`}
                        />
                      )}
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-[#08080A]/95 via-[#08080A]/85 to-[#08080A]/75"
                        aria-hidden="true"
                      />
                      <div className="relative">
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
                        <div className="mt-2.5 pt-2.5 border-t border-white/10 text-xs text-[#A1A1AA]">
                          <span className="font-mono text-[#D6C7B2]">Atmósfera: </span>
                          {foc.atmosphereNote}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedFocus && (
                <div className="pt-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                    className="inline-flex items-center gap-2 px-4 min-h-[40px] rounded-lg border border-[#DC2626]/50 bg-[#181215] text-xs font-mono text-[#F5F2EB] hover:border-[#DC2626] transition-colors"
                  >
                    <span>Ver selección de {selectedFocus.name}</span>
                    <ArrowDown className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
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
        id="resultados"
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
