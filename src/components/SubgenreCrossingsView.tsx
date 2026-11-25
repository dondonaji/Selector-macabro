import { ArrowRight, GitMerge } from 'lucide-react';
import { motion } from 'motion/react';
import {
  BranchId,
  HORROR_FILMS,
  HORROR_TAXONOMY,
  HorrorFilm,
  SUBWAY_CROSSINGS,
} from '../data/horrorTaxonomy';
import { soundEngine } from '../utils/soundEffects';

interface SubgenreCrossingsViewProps {
  onSelectFilm: (film: HorrorFilm) => void;
  onExploreBranch: (branchId: BranchId, subgenreId?: string, focusId?: string) => void;
}

export function SubgenreCrossingsView({
  onSelectFilm,
  onExploreBranch,
}: SubgenreCrossingsViewProps) {
  return (
    <div className="space-y-12">
      <div className="max-w-3xl space-y-3">
        <p className="text-xs font-mono text-[#DC2626]">
          Líneas e intersecciones · Inspirado en el Horror Subway Map
        </p>
        <h2 className="font-display text-4xl sm:text-5xl font-semibold text-[#F5F2EB] leading-tight text-balance">
          Películas puente entre dos o más géneros de terror
        </h2>
        <p className="text-base text-[#A1A1AA] leading-relaxed">
          Muchas de las mejores películas de terror no pertenecen a una sola rama: funcionan como estaciones de transbordo donde se cruzan dos miedos distintos. Selecciona cualquier película para ver su ficha o salta directamente a una de las ramas conectadas.
        </p>
      </div>

      <div className="space-y-10">
        {SUBWAY_CROSSINGS.map((crossing, idx) => (
          <motion.section
            key={crossing.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="p-4 sm:p-8 rounded-lg bg-[#121216] border border-[#272730] space-y-5 sm:space-y-6"
          >
            {/* Crossing Header & Intersecting Branch Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-[#272730]">
              <div>
                <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F2EB]">
                  {crossing.title}
                </h3>
                <p className="text-sm text-[#A1A1AA] mt-1 max-w-2xl">
                  {crossing.summary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {crossing.lines.map((line) => (
                  <button
                    key={`${crossing.id}-${line.branchId}-${line.label}`}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick(210);
                      onExploreBranch(line.branchId);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 min-h-[40px] sm:min-h-0 sm:py-1.5 rounded bg-[#18181D] border border-[#272730] hover:border-[#DC2626] text-xs font-medium text-[#F5F2EB] transition-colors whitespace-nowrap shrink-0"
                  >
                    <GitMerge className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
                    <span>Ir a {line.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Station Films */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {crossing.stationFilmIds.map((filmId) => {
                const film = HORROR_FILMS.find((f) => f.id === filmId);
                if (!film) return null;
                const branch = HORROR_TAXONOMY.find((b) => b.id === film.branchId);

                return (
                  <button
                    key={film.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick(240);
                      onSelectFilm(film);
                    }}
                    className="group text-left p-4 rounded-lg bg-[#0C0C0F] border border-[#272730] hover:border-[#DC2626] transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 text-xs font-mono tabular-nums">
                        <span className="text-[#DC2626]">{film.year}</span>
                        <span className="text-[#A1A1AA] truncate">{branch?.name}</span>
                      </div>

                      <h4 className="font-display text-xl font-semibold text-[#F5F2EB] group-hover:text-[#DC2626] transition-colors leading-snug">
                        {film.title}
                      </h4>
                      <p className="text-xs text-[#A1A1AA] mt-0.5">{film.director}</p>

                      <p className="text-xs text-[#D4D4D8] mt-3 pt-3 border-t border-white/5 leading-relaxed line-clamp-3">
                        {film.whyWatch}
                      </p>
                    </div>

                    <div className="mt-4 pt-2 flex items-center justify-between text-xs font-medium text-[#D6C7B2] group-hover:text-[#F5F2EB]">
                      <span>Ver ficha completa</span>
                      <ArrowRight
                        className="w-3.5 h-3.5 text-[#DC2626] transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
