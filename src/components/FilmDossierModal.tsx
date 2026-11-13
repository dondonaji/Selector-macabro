import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  GitFork,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { BranchId, HORROR_FILMS, HORROR_TAXONOMY, HorrorFilm } from '../data/horrorTaxonomy';
import { PosterArt, PosterResult, fetchFilmPoster } from './PosterArt';

interface FilmDossierModalProps {
  film: HorrorFilm | null;
  isSaved: boolean;
  onClose: () => void;
  onToggleSave: (filmId: string) => void;
  onJumpToFilm: (film: HorrorFilm) => void;
  onExploreBranch: (branchId: BranchId, subgenreId?: string, focusId?: string) => void;
}

export function FilmDossierModal({
  film,
  isSaved,
  onClose,
  onToggleSave,
  onJumpToFilm,
  onExploreBranch,
}: FilmDossierModalProps) {
  const [posterMode, setPosterMode] = useState<'official' | 'artistic'>('official');
  const [posterMeta, setPosterMeta] = useState<PosterResult | null>(null);

  useEffect(() => {
    if (!film) return;
    setPosterMeta(film.poster ?? null);
    fetchFilmPoster({
      id: film.id,
      title: film.title,
      originalTitle: film.originalTitle,
      year: film.year,
      director: film.director,
      initialPoster: film.poster,
    }).then((res) => setPosterMeta(res));
  }, [film]);

  useEffect(() => {
    if (!film) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [film, onClose]);

  if (!film) return null;

  const branch = HORROR_TAXONOMY.find((b) => b.id === film.branchId);
  const subgenre = branch?.subgenres.find((s) => s.id === film.subgenreId);
  const focus = subgenre?.focuses.find((f) => f.id === film.focusId);

  const bridgeFilms = film.bridgeIds
    .map((id) => HORROR_FILMS.find((f) => f.id === id))
    .filter((f): f is HorrorFilm => Boolean(f));

  return (
    <AnimatePresence>
      <motion.div
        key="dossier-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-title"
      >
        <motion.div
          key={film.id}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl bg-[#121216] border border-[#272730] rounded-lg overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ficha de película"
            className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-[#08080A]/85 border border-[#272730] text-[#D4D4D8] hover:text-[#F5F2EB] hover:border-[#DC2626] transition-colors focus-visible:outline-2 focus-visible:outline-[#DC2626]"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Scrollable Body */}
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Hero Split: 2:3 Poster + Title & Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-[175px_1fr] gap-6 items-start pb-6 border-b border-[#272730]">
              <div className="space-y-2.5 max-w-[180px] mx-auto sm:mx-0 w-full">
                <PosterArt
                  id={film.id}
                  title={film.title}
                  originalTitle={film.originalTitle}
                  year={film.year}
                  director={film.director}
                  branchId={film.branchId}
                  keyMotif={film.keyMotif}
                  initialPoster={film.poster}
                  mode={posterMode}
                />

                {/* Toggle between Official Theatrical Poster & Artistic Plate */}
                <div className="flex items-center gap-1 p-1 rounded bg-[#0C0C0F] border border-[#272730]">
                  <button
                    type="button"
                    onClick={() => setPosterMode('official')}
                    className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${
                      posterMode === 'official'
                        ? 'bg-[#DC2626] text-white'
                        : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
                    }`}
                  >
                    Cartel
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosterMode('artistic')}
                    className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${
                      posterMode === 'artistic'
                        ? 'bg-[#272730] text-[#F5F2EB]'
                        : 'text-[#A1A1AA] hover:text-[#F5F2EB]'
                    }`}
                  >
                    Lámina arte
                  </button>
                </div>
              </div>

              <div className="space-y-4 pr-6">
                <div>
                  <p className="text-xs text-[#D6C7B2] mb-1.5">
                    {branch?.name}
                    {subgenre ? ` / ${subgenre.name}` : ''}
                    {focus ? ` / ${focus.name}` : ''}
                  </p>
                  <h2
                    id="dossier-title"
                    className="font-display text-3xl sm:text-4xl font-semibold text-[#F5F2EB] leading-tight"
                  >
                    {film.title}
                  </h2>
                  {film.originalTitle && film.originalTitle !== film.title && (
                    <p className="font-display italic text-base text-[#A1A1AA] mt-0.5">
                      Título original: {film.originalTitle}
                    </p>
                  )}
                </div>

                {/* Tabular Metadata Strip */}
                <dl className="grid grid-cols-2 gap-3 pt-2 text-sm tabular-nums">
                  <div>
                    <dt className="text-xs text-[#A1A1AA] mb-0.5">Dirección</dt>
                    <dd className="font-medium text-[#F5F2EB]">{film.director}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#A1A1AA] mb-0.5">Año y Duración</dt>
                    <dd className="font-mono text-[#F5F2EB]">
                      {film.year} · {film.duration} min
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#A1A1AA] mb-0.5">País</dt>
                    <dd className="font-medium text-[#F5F2EB]">{film.country}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#A1A1AA] mb-0.5">Ritmo y Época</dt>
                    <dd className="font-medium text-[#F5F2EB]">
                      {film.pacing} · {film.era}
                    </dd>
                  </div>
                </dl>

                {posterMeta?.pageUrl && (
                  <a
                    href={posterMeta.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#F5F2EB] transition-colors"
                  >
                    <span>Fuente del cartel teatral: {posterMeta.source}</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>

            {/* Why Watch + Synopsis */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono text-[#DC2626] mb-1.5">Por qué elegirla hoy</h3>
                <p className="text-base text-[#F5F2EB] leading-relaxed">{film.whyWatch}</p>
              </div>

              <div>
                <h3 className="text-xs font-mono text-[#A1A1AA] mb-1.5">Sinopsis</h3>
                <p className="text-sm text-[#D4D4D8] leading-relaxed">{film.synopsis}</p>
                <p className="text-sm font-display italic text-[#D6C7B2] mt-2">
                  Imagen distintiva: {film.keyMotif}
                </p>
              </div>
            </div>

            {/* Fear Profile Breakdown */}
            <div className="border-t border-[#272730] pt-5">
              <div className="mb-3">
                <h3 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                  Qué esperar en pantalla
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Elementos clave: {film.keyElements.join(' · ')}
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-[#0C0C0F] border border-[#272730]">
                  <p className="text-xs font-mono text-[#A1A1AA] mb-1">Tensión atmosférica</p>
                  <p className="font-display text-2xl font-semibold text-[#F5F2EB]">
                    {film.fearProfile.tension}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[#0C0C0F] border border-[#272730]">
                  <p className="text-xs font-mono text-[#A1A1AA] mb-1">Sustos repentinos</p>
                  <p className="font-display text-2xl font-semibold text-[#F5F2EB]">
                    {film.fearProfile.jumpscares}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[#0C0C0F] border border-[#272730]">
                  <p className="text-xs font-mono text-[#A1A1AA] mb-1">Violencia gráfica / Gore</p>
                  <p className="font-display text-2xl font-semibold text-[#DC2626]">
                    {film.fearProfile.gore}
                  </p>
                </div>
              </div>
            </div>

            {/* Connected Bridge Films */}
            {bridgeFilms.length > 0 && (
              <div className="border-t border-[#272730] pt-5">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h3 className="text-xs font-mono text-[#A1A1AA]">
                    Si te atrae esta línea, explora estos cruces
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onExploreBranch(film.branchId, film.subgenreId, film.focusId);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-[#D6C7B2] hover:text-[#DC2626] transition-colors"
                  >
                    <GitFork className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Ver su rama en el árbol</span>
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {bridgeFilms.map((rel) => {
                    const relBranch = HORROR_TAXONOMY.find((b) => b.id === rel.branchId);
                    return (
                      <button
                        key={rel.id}
                        type="button"
                        onClick={() => onJumpToFilm(rel)}
                        className="flex items-center justify-between p-3.5 rounded-lg bg-[#18181D] border border-[#272730] hover:border-[#DC2626] text-left transition-colors group"
                      >
                        <div className="min-w-0 pr-3">
                          <p className="font-display text-lg font-semibold text-[#F5F2EB] truncate group-hover:text-[#DC2626] transition-colors">
                            {rel.title}
                          </p>
                          <p className="text-xs text-[#A1A1AA] tabular-nums truncate">
                            {rel.year} · {relBranch?.name}
                          </p>
                        </div>
                        <ArrowRight
                          className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#DC2626] shrink-0 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="px-6 py-4 border-t border-[#272730] bg-[#0E0E12] flex items-center justify-between gap-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F5F2EB] transition-colors"
            >
              Volver al selector
            </button>

            <button
              type="button"
              onClick={() => onToggleSave(film.id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isSaved
                  ? 'bg-[#18181D] text-[#F5F2EB] border border-[#DC2626]'
                  : 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
              }`}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-[#DC2626]" aria-hidden="true" />
                  <span>Guardada en tu sesión</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" aria-hidden="true" />
                  <span>Añadir a mi sesión</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
