import { Bookmark, BookmarkCheck, Globe, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { HorrorFilm } from '../data/horrorTaxonomy';
import { PosterArt } from './PosterArt';

interface FilmCardProps {
  film: HorrorFilm;
  index: number;
  isSaved: boolean;
  posterMode?: 'official' | 'artistic';
  onToggleSave: (filmId: string) => void;
  onSelectFilm: (film: HorrorFilm) => void;
}

export function FilmCard({
  film,
  index,
  isSaved,
  posterMode = 'official',
  onToggleSave,
  onSelectFilm,
}: FilmCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2), ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col justify-between bg-[#121216] border border-[#272730] rounded-lg overflow-hidden transition-colors duration-200 hover:border-[#DC2626]/60"
    >
      <div className="flex flex-col sm:p-5 sm:space-y-4">
        {/* Top Split: Full-bleed theatrical showcase on mobile (< sm), 2:3 thumbnail + editorial split on sm+ */}
        <div className="flex flex-col sm:grid sm:grid-cols-[120px_1fr] sm:gap-4 sm:items-start">
          <button
            type="button"
            onClick={() => onSelectFilm(film)}
            aria-label={`Abrir ficha y cartel de ${film.title}`}
            className="relative block w-full focus-visible:outline-2 focus-visible:outline-[#DC2626] sm:rounded overflow-hidden"
          >
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
              className="rounded-none sm:rounded border-0 border-b border-[#272730] sm:border"
            />
            <div
              className="sm:hidden absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#121216] via-[#121216]/55 to-transparent pointer-events-none"
              aria-hidden="true"
            />
          </button>

          <div className="min-w-0 px-4 pt-2 sm:p-0">
            {/* Unboxed Metadata Line */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-mono text-[#D6C7B2] tabular-nums mb-1">
              <span>{film.year}</span>
              <span aria-hidden="true">·</span>
              <span>{film.duration} min</span>
              {film.isExternalDiscovery && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-[#DC2626]">
                    <Globe className="w-3 h-3" aria-hidden="true" />
                    Web
                  </span>
                </>
              )}
            </div>

            <h3 className="font-display text-2xl font-semibold text-[#F5F2EB] leading-tight tracking-tight mb-1">
              <button
                type="button"
                onClick={() => onSelectFilm(film)}
                className="text-left hover:text-[#DC2626] transition-colors"
              >
                {film.title}
              </button>
            </h3>

            <p className="text-xs text-[#A1A1AA] mb-2.5 truncate">
              {film.director} · {film.country}
            </p>

            <p className="text-sm sm:text-xs md:text-sm text-[#D4D4D8] leading-relaxed line-clamp-3 sm:line-clamp-4">
              {film.whyWatch}
            </p>
          </div>
        </div>

        {/* Key Elements + Fear Profile Table */}
        <div className="px-4 pb-4 pt-3 sm:p-0 space-y-3 sm:space-y-4">
          <p className="text-xs text-[#A1A1AA]">
            {film.keyElements.join(' · ')}
          </p>

          <div className="border-t border-[#272730] pt-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="block font-mono text-[#71717A] mb-0.5">Tensión</span>
              <span className="font-medium text-[#F5F2EB]">{film.fearProfile.tension}</span>
            </div>
            <div>
              <span className="block font-mono text-[#71717A] mb-0.5">Sustos</span>
              <span className="font-medium text-[#F5F2EB]">{film.fearProfile.jumpscares}</span>
            </div>
            <div>
              <span className="block font-mono text-[#71717A] mb-0.5">Gore</span>
              <span className="font-medium text-[#DC2626]">{film.fearProfile.gore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-[#272730] bg-[#0E0E12] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelectFilm(film)}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#F5F2EB] hover:text-[#DC2626] transition-colors whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-[34px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
          <span>Ver ficha y cruces</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleSave(film.id)}
          aria-pressed={isSaved}
          className={`inline-flex items-center gap-1.5 px-3.5 min-h-[44px] sm:min-h-[34px] rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626] ${
            isSaved
              ? 'bg-[#DC2626]/15 text-[#F5F2EB] border border-[#DC2626]/60'
              : 'bg-[#18181D] text-[#D4D4D8] border border-[#272730] hover:border-[#52525B] hover:text-[#F5F2EB]'
          }`}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
              <span>En tu sesión</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Guardar</span>
            </>
          )}
        </button>
      </div>
    </motion.article>
  );
}
