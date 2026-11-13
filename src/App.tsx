import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ArchiveCatalogView } from './components/ArchiveCatalogView';
import { FilmDossierModal } from './components/FilmDossierModal';
import { HorrorTreeSelector } from './components/HorrorTreeSelector';
import { SessionDrawer } from './components/SessionDrawer';
import { SubgenreCrossingsView } from './components/SubgenreCrossingsView';
import { BranchId, HORROR_FILMS, HorrorFilm } from './data/horrorTaxonomy';
import { soundEngine } from './utils/soundEffects';

type ActiveTab = 'tree' | 'crossings' | 'archive';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tree');
  const [selectedBranchId, setSelectedBranchId] = useState<BranchId | null>('paranormal');
  const [selectedSubgenreId, setSelectedSubgenreId] = useState<string | null>('folclore-maldiciones');
  const [selectedFocusId, setSelectedFocusId] = useState<string | null>(null);

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [discoveredFilms, setDiscoveredFilms] = useState<HorrorFilm[]>([]);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [activeFilmDossier, setActiveFilmDossier] = useState<HorrorFilm | null>(null);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className="font-display text-2xl font-semibold tracking-tight text-[#F5F2EB] hover:text-[#DC2626] transition-colors whitespace-nowrap shrink-0"
          >
            Linaje Macabro
          </button>

          {/* Zone 2: 4 Clean Single-Line Nav Links */}
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#18181D] border border-[#272730] hover:border-[#DC2626] text-xs font-medium text-[#F5F2EB] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
              <span>Reiniciar</span>
            </button>
          </div>
        </div>

        {/* Mobile Secondary Nav Strip */}
        <div className="md:hidden border-t border-[#272730] px-4 py-2.5 flex items-center gap-5 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className={`whitespace-nowrap shrink-0 ${
              activeTab === 'tree' ? 'text-[#DC2626]' : 'text-[#A1A1AA]'
            }`}
          >
            Árbol Selector
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('crossings')}
            className={`whitespace-nowrap shrink-0 ${
              activeTab === 'crossings' ? 'text-[#DC2626]' : 'text-[#A1A1AA]'
            }`}
          >
            Cruces de Género
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`whitespace-nowrap shrink-0 ${
              activeTab === 'archive' ? 'text-[#DC2626]' : 'text-[#A1A1AA]'
            }`}
          >
            Archivo ({HORROR_FILMS.length + discoveredFilms.length})
          </button>
          <button
            type="button"
            onClick={() => setIsSessionOpen(true)}
            className="whitespace-nowrap shrink-0 text-[#D6C7B2] tabular-nums"
          >
            Mi Sesión ({savedIds.length})
          </button>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {activeTab === 'tree' && (
          <section aria-label="Introducción al selector" className="mb-10 max-w-3xl">
            <p className="text-xs font-mono text-[#DC2626] mb-2">
              Mapa de géneros y subgéneros · De mayor a menor ·{' '}
              {HORROR_FILMS.length + discoveredFilms.length} películas curadas y descubiertas
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#F5F2EB] leading-[1.08] text-balance">
              Encuentra qué película de terror ver según el miedo que buscas
            </h1>
            <p className="text-sm sm:text-base text-[#A1A1AA] mt-3 leading-relaxed">
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
      <footer className="relative z-10 border-t border-[#272730] bg-[#08080A] py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#71717A]">
          <p>
            Linaje Macabro · Seleccionador interactivo de cine de terror por géneros, subgéneros y atmósfera.
          </p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('crossings');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#F5F2EB] transition-colors"
            >
              Cruces de Género
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('archive');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#F5F2EB] transition-colors"
            >
              Catálogo completo
            </button>
            <button
              type="button"
              onClick={() => setIsSessionOpen(true)}
              className="hover:text-[#F5F2EB] transition-colors tabular-nums"
            >
              Mi Sesión ({savedIds.length})
            </button>
          </div>
        </div>
      </footer>

      {/* Film Dossier Modal */}
      <FilmDossierModal
        film={activeFilmDossier}
        isSaved={activeFilmDossier ? savedIds.includes(activeFilmDossier.id) : false}
        onClose={() => setActiveFilmDossier(null)}
        onToggleSave={handleToggleSave}
        onJumpToFilm={handleJumpToFilm}
        onExploreBranch={handleExploreBranch}
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
