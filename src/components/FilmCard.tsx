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
      <div className="p-4 sm:p-5 space-y-4">
        {/* Top Split: 2:3 Theatrical Poster + Core Editorial Info */}
        <div className="grid grid-cols-[108px_1fr] sm:grid-cols-[116px_1fr] gap-4 items-start">
          <button
            type="button"
            onClick={() => onSelectFilm(film)}
            aria-label={`Abrir ficha y cartel de ${film.title}`}
            className="block w-full focus-visible:outline-2 focus-visible:outline-[#DC2626] rounded"
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
            />
          </button>

          <div className="min-w-0">
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

            <p className="text-xs sm:text-sm text-[#D4D4D8] leading-relaxed line-clamp-4">
              {film.whyWatch}
            </p>
          </div>
        </div>

        {/* Key Elements as unboxed inline text */}
        <p className="text-xs text-[#A1A1AA]">
          {film.keyElements.join(' · ')}
        </p>

        {/* Fear Profile Table */}
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

      {/* Card Footer Actions */}
      <div className="px-4 sm:px-5 py-3 border-t border-[#272730] bg-[#0E0E12] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelectFilm(film)}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#F5F2EB] hover:text-[#DC2626] transition-colors whitespace-nowrap shrink-0 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
          <span>Ver ficha y cruces</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleSave(film.id)}
          aria-pressed={isSaved}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626] ${
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
