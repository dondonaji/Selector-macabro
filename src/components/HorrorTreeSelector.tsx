import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  ExternalLink,
  Globe,
  Loader2,
  RotateCcw,
  Shuffle,
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
  onRandomDescent: () => void;
  onOpenArchive: () => void;
  savedIds: string[];
  onToggleSave: (filmId: string) => void;
  onSelectFilm: (film: HorrorFilm) => void;
  discoveredFilms: HorrorFilm[];
  onAddDiscoveredFilms: (films: HorrorFilm[]) => void;
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
  onRandomDescent,
  onOpenArchive,
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

  const [activePillar, setActivePillar] = useState<1 | 2 | 3>(() =>
    selectedSubgenreId ? 3 : selectedBranchId ? 2 : 1
  );

  const [customQuery, setCustomQuery] = useState('');
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [webSources, setWebSources] = useState<WebSource[]>([]);

  const pillarsTopRef = useRef<HTMLElement | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedBranchId) {
      setActivePillar(1);
    } else if (!selectedSubgenreId) {
      setActivePillar(2);
    } else {
      setActivePillar(3);
    }
  }, [selectedBranchId, selectedSubgenreId]);

  useEffect(() => {
    if (randomScrollToken === 0) return;
    setEraFilter('Todas');
    setPacingFilter('Todos');
    setGoreFilter('Todos');
    setActivePillar(3);
    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 110);
  }, [randomScrollToken]);

  const selectedBranch = HORROR_TAXONOMY.find((b) => b.id === selectedBranchId) ?? null;
  const selectedSubgenre =
    selectedBranch?.subgenres.find((s) => s.id === selectedSubgenreId) ?? null;
  const selectedFocus =
    selectedSubgenre?.focuses.find((f) => f.id === selectedFocusId) ?? null;

  const handleBranchClick = (branchId: BranchId) => {
    soundEngine.playClick(185);
    if (selectedBranchId === branchId) {
      setActivePillar(2);
      return;
    }
    onSelectBranch(branchId);
    onSelectSubgenre(null);
    onSelectFocus(null);
    setActivePillar(2);
  };

  const handleSubgenreClick = (subId: string) => {
    soundEngine.playClick(235);
    if (selectedSubgenreId === subId) {
      setActivePillar(3);
      return;
    }
    onSelectSubgenre(subId);
    onSelectFocus(null);
    setActivePillar(3);
  };

  const handleFocusClick = (focusId: string) => {
    soundEngine.playReveal();
    onSelectFocus(focusId);
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
    <div className="space-y-8 sm:space-y-12">
      {/* 3-PILLAR CINEMA DECK */}
      <section ref={pillarsTopRef} aria-label="Tres decisiones para elegir película" className="space-y-5 sm:space-y-7 scroll-mt-4">
        {/* Clean Editorial 3-Pillar Chapter Rail (No Breadcrumbs, No Form Tabs) */}
        <div className="grid grid-cols-3 gap-3 sm:gap-8 border-b border-[#272730]">
          {/* Pillar 1 Header */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick(170);
              setActivePillar(1);
            }}
            className="relative text-left pb-3 pt-1 group focus-visible:outline-2 focus-visible:outline-[#DC2626] min-h-[52px]"
          >
            <span
              className={`block font-mono text-[10px] sm:text-xs tabular-nums transition-colors ${
                activePillar === 1
                  ? 'text-[#DC2626]'
                  : selectedBranch
                    ? 'text-[#D6C7B2]'
                    : 'text-[#71717A]'
              }`}
            >
              01 · Género
            </span>
            <span
              className={`block text-xs sm:text-sm font-medium truncate mt-0.5 transition-colors ${
                activePillar === 1 || selectedBranch
                  ? 'text-[#F5F2EB]'
                  : 'text-[#71717A] group-hover:text-[#A1A1AA]'
              }`}
            >
              {selectedBranch ? selectedBranch.name : 'Por elegir'}
            </span>
            {activePillar === 1 && (
              <motion.span
                layoutId="pillar-active-underline"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#DC2626]"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </button>

          {/* Pillar 2 Header */}
          <button
            type="button"
            disabled={!selectedBranch}
            onClick={() => {
              if (!selectedBranch) return;
              soundEngine.playClick(190);
              setActivePillar(2);
            }}
            className="relative text-left pb-3 pt-1 group focus-visible:outline-2 focus-visible:outline-[#DC2626] min-h-[52px] disabled:cursor-not-allowed"
          >
            <span
              className={`block font-mono text-[10px] sm:text-xs tabular-nums transition-colors ${
                activePillar === 2
                  ? 'text-[#DC2626]'
                  : selectedSubgenre
                    ? 'text-[#D6C7B2]'
                    : 'text-[#71717A]'
              }`}
            >
              02 · Subgénero
            </span>
            <span
              className={`block text-xs sm:text-sm font-medium truncate mt-0.5 transition-colors ${
                activePillar === 2 || selectedSubgenre
                  ? 'text-[#F5F2EB]'
                  : selectedBranch
                    ? 'text-[#A1A1AA] group-hover:text-[#F5F2EB]'
                    : 'text-[#52525B]'
              }`}
            >
              {selectedSubgenre ? selectedSubgenre.name : selectedBranch ? 'Por elegir' : '—'}
            </span>
            {activePillar === 2 && (
              <motion.span
                layoutId="pillar-active-underline"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#DC2626]"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </button>

          {/* Pillar 3 Header */}
          <button
            type="button"
            disabled={!selectedSubgenre}
            onClick={() => {
              if (!selectedSubgenre) return;
              soundEngine.playClick(210);
              setActivePillar(3);
            }}
            className="relative text-left pb-3 pt-1 group focus-visible:outline-2 focus-visible:outline-[#DC2626] min-h-[52px] disabled:cursor-not-allowed"
          >
            <span
              className={`block font-mono text-[10px] sm:text-xs tabular-nums transition-colors ${
                activePillar === 3
                  ? 'text-[#DC2626]'
                  : selectedFocus
                    ? 'text-[#D6C7B2]'
                    : 'text-[#71717A]'
              }`}
            >
              03 · Atmósfera
            </span>
            <span
              className={`block text-xs sm:text-sm font-medium truncate mt-0.5 transition-colors ${
                activePillar === 3 || selectedFocus
                  ? 'text-[#F5F2EB]'
                  : selectedSubgenre
                    ? 'text-[#A1A1AA] group-hover:text-[#F5F2EB]'
                    : 'text-[#52525B]'
              }`}
            >
              {selectedFocus ? selectedFocus.name : selectedSubgenre ? 'Por elegir' : '—'}
            </span>
            {activePillar === 3 && (
              <motion.span
                layoutId="pillar-active-underline"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#DC2626]"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </button>
        </div>

        {/* Active Pillar Stage */}
        <AnimatePresence mode="wait">
          {/* PILLAR 1: 5 CINEMA PORTRAIT CARDS */}
          {activePillar === 1 && (
            <motion.div
              key="pillar-stage-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4 sm:space-y-5"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F2EB]">
                  ¿Qué tipo de terror te atrae hoy?
                </h2>
                <span className="lg:hidden text-[11px] font-mono text-[#71717A] whitespace-nowrap shrink-0">
                  Desliza →
                </span>
              </div>

              {/* Mobile: Swipeable Portrait Peek Deck | Desktop: 5-Column Portrait Gallery */}
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 -mx-4 px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-5 lg:gap-4 lg:mx-0 lg:px-0 lg:pb-0 lg:overflow-visible">
                {HORROR_TAXONOMY.map((branch) => {
                  const isSelected = selectedBranchId === branch.id;
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => handleBranchClick(branch.id)}
                      aria-pressed={isSelected}
                      className={`group relative w-[72vw] max-w-[275px] sm:w-[43vw] lg:w-auto aspect-[3/4] shrink-0 snap-start rounded-2xl overflow-hidden text-left border transition-all duration-300 focus-visible:outline-2 focus-visible:outline-[#DC2626] ${
                        isSelected
                          ? 'border-[#DC2626] shadow-[0_12px_36px_rgba(220,38,38,0.22)]'
                          : 'border-[#272730] hover:border-[#DC2626]/70'
                      }`}
                    >
                      <img
                        src={branch.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-[#08080A] via-[#08080A]/55 to-black/15"
                        aria-hidden="true"
                      />

                      <div className="relative h-full p-4 sm:p-5 flex flex-col justify-end">
                        <h3 className="font-display text-[1.65rem] sm:text-[1.75rem] font-semibold text-[#F5F2EB] leading-[1.05] text-balance group-hover:text-white">
                          {branch.name}
                        </h3>
                        <p className="text-xs text-[#D4D4D8]/85 mt-2 leading-relaxed line-clamp-2">
                          {branch.coreQuestion}
                        </p>
                        <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-xs font-medium text-[#F5F2EB]">
                          <span>{isSelected ? 'Explorar rama' : 'Elegir género'}</span>
                          <ArrowRight
                            className="w-4 h-4 text-[#DC2626] transition-transform group-hover:translate-x-1"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Clean Welcome Helper When Nothing Selected Yet */}
              {!selectedBranch && (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#272730]/60">
                  <p className="text-xs sm:text-sm text-[#A1A1AA]">
                    ¿Indeciso esta noche? Deja que el selector escoja una ruta completa por ti.
                  </p>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={onRandomDescent}
                      className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] sm:min-h-[38px] rounded-lg bg-[#18181D] border border-[#272730] hover:border-[#DC2626] text-xs font-medium text-[#F5F2EB] transition-colors whitespace-nowrap"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
                      <span>Elegir por mí</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenArchive}
                      className="inline-flex items-center justify-center gap-1.5 px-2 min-h-[44px] sm:min-h-[38px] text-xs font-medium text-[#D6C7B2] hover:text-[#F5F2EB] transition-colors whitespace-nowrap"
                    >
                      <span>Ver archivo</span>
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* PILLAR 2: 3 SUBGENRE ATMOSPHERIC CARDS */}
          {activePillar === 2 && selectedBranch && (
            <motion.div
              key={`pillar-stage-2-${selectedBranch.id}`}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4 sm:space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick(170);
                      setActivePillar(1);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-[#D6C7B2] hover:text-[#F5F2EB] transition-colors min-h-[36px] -ml-1 px-1 mb-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
                    <span>Cambiar género ({selectedBranch.name})</span>
                  </button>
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F2EB]">
                    Elige la vertiente dentro de {selectedBranch.name}
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5">
                {selectedBranch.subgenres.map((sub) => {
                  const isSelected = selectedSubgenreId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubgenreClick(sub.id)}
                      aria-pressed={isSelected}
                      className={`group relative overflow-hidden text-left p-5 sm:p-6 rounded-2xl border transition-all duration-200 min-h-[120px] sm:min-h-[170px] flex flex-col justify-between gap-4 focus-visible:outline-2 focus-visible:outline-[#DC2626] ${
                        isSelected
                          ? 'border-[#DC2626] bg-[#181215]'
                          : 'border-[#272730] bg-[#111115] hover:border-[#DC2626]/70'
                      }`}
                    >
                      <img
                        src={selectedBranch.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                          isSelected ? 'opacity-20' : 'opacity-10 group-hover:opacity-20'
                        }`}
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-[#0C0C10] via-[#0C0C10]/85 to-[#0C0C10]/70"
                        aria-hidden="true"
                      />

                      <div className="relative space-y-2">
                        <h3 className="font-display text-2xl sm:text-[1.7rem] font-semibold text-[#F5F2EB] leading-tight">
                          {sub.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                          {sub.description}
                        </p>
                      </div>

                      <div className="relative pt-2 border-t border-white/10 flex items-center justify-between text-xs font-medium text-[#F5F2EB]">
                        <span>{isSelected ? 'Vertiente activa' : 'Afinar atmósfera'}</span>
                        <ArrowRight
                          className="w-4 h-4 text-[#DC2626] transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* PILLAR 3: 2 FINAL ATMOSPHERE SPLIT CARDS */}
          {activePillar === 3 && selectedBranch && selectedSubgenre && (
            <motion.div
              key={`pillar-stage-3-${selectedSubgenre.id}`}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4 sm:space-y-5"
            >
              <div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick(190);
                    setActivePillar(2);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#D6C7B2] hover:text-[#F5F2EB] transition-colors min-h-[36px] -ml-1 px-1 mb-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
                  <span>Cambiar subgénero ({selectedSubgenre.name})</span>
                </button>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F2EB]">
                  Define la atmósfera final
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {selectedSubgenre.focuses.map((foc) => {
                  const isSelected = selectedFocusId === foc.id;
                  return (
                    <button
                      key={foc.id}
                      type="button"
                      onClick={() => handleFocusClick(foc.id)}
                      aria-pressed={isSelected}
                      className={`group relative overflow-hidden text-left p-5 sm:p-7 rounded-2xl border transition-all duration-200 min-h-[160px] flex flex-col justify-between gap-4 focus-visible:outline-2 focus-visible:outline-[#DC2626] ${
                        isSelected
                          ? 'border-[#DC2626] bg-[#1B1215] shadow-[0_12px_36px_rgba(220,38,38,0.18)]'
                          : 'border-[#272730] bg-[#111115] hover:border-[#DC2626]/70'
                      }`}
                    >
                      <img
                        src={selectedBranch.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                          isSelected ? 'opacity-25' : 'opacity-12 group-hover:opacity-22'
                        }`}
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-[#09090D]/95 via-[#09090D]/85 to-[#09090D]/70"
                        aria-hidden="true"
                      />

                      <div className="relative space-y-2">
                        <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F2EB] leading-tight">
                          {foc.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#D4D4D8] leading-relaxed">
                          {foc.subtitle}
                        </p>
                      </div>

                      <div className="relative pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <span className="text-xs text-[#A1A1AA] line-clamp-1">
                          {foc.atmosphereNote}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#DC2626] whitespace-nowrap shrink-0">
                          <span>{isSelected ? 'Seleccionada' : 'Ver películas'}</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* CURATED RESULTS & PREFERENCE FILTERS (Shown once a genre branch is active) */}
      {selectedBranch && (
        <section
          id="resultados"
          ref={resultsRef}
          aria-label="Películas recomendadas"
          className="pt-7 sm:pt-9 border-t border-[#272730] space-y-5 sm:space-y-6 scroll-mt-4"
        >
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 sm:gap-6">
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-xs font-mono text-[#DC2626]">
                  {selectedFocus
                    ? 'Selección final'
                    : selectedSubgenre
                      ? 'Selección del subgénero'
                      : 'Vista previa del género'}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    pillarsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  className="sm:hidden inline-flex items-center gap-1 text-xs text-[#D6C7B2] hover:text-[#F5F2EB]"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
                  <span>Pilares</span>
                </button>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#F5F2EB] text-balance">
                {selectedFocus
                  ? selectedFocus.name
                  : selectedSubgenre
                    ? selectedSubgenre.name
                    : selectedBranch.name}
              </h2>
              <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 max-w-2xl">
                {selectedFocus
                  ? selectedFocus.atmosphereNote
                  : 'Elige la atmósfera final arriba o ajusta los filtros de época, ritmo y gore.'}
              </p>
            </div>

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
          </div>

          {displayedFilms.length === 0 ? (
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
          <div className="mt-8 p-5 sm:p-6 rounded-xl bg-[#121216] border border-[#272730] space-y-4">
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
                placeholder="Opcional: ej. cine japonés de los 70, folk horror latinoamericano..."
                aria-label="Preferencia adicional para buscar películas en internet"
                className="flex-1 px-4 min-h-[44px] rounded-lg bg-[#08080A] border border-[#272730] text-sm text-[#F5F2EB] placeholder:text-[#71717A] focus:outline-none focus:border-[#DC2626] transition-colors"
              />
              <button
                type="submit"
                disabled={isSearchingWeb}
                className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
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
        </section>
      )}
    </div>
  );
}
