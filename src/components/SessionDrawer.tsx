import { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { HORROR_FILMS, HorrorFilm } from '../data/horrorTaxonomy';

interface SessionDrawerProps {
  isOpen: boolean;
  savedIds: string[];
  extraFilms: HorrorFilm[];
  onClose: () => void;
  onRemove: (filmId: string) => void;
  onClearAll: () => void;
  onSelectFilm: (film: HorrorFilm) => void;
}

export function SessionDrawer({
  isOpen,
  savedIds,
  extraFilms,
  onClose,
  onRemove,
  onClearAll,
  onSelectFilm,
}: SessionDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const allKnownFilms = [...HORROR_FILMS, ...extraFilms];
  const savedFilms = savedIds
    .map((id) => allKnownFilms.find((f) => f.id === id))
    .filter((f): f is HorrorFilm => Boolean(f));

  const totalMinutes = savedFilms.reduce((acc, f) => acc + f.duration, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Mi Sesión de Medianoche"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md bg-[#121216] border-l border-[#272730] h-full flex flex-col"
          >
            <div className="px-6 py-5 border-b border-[#272730] flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                  Mi Sesión de Medianoche
                </h2>
                <p className="text-xs font-mono text-[#A1A1AA] mt-0.5 tabular-nums">
                  {savedFilms.length} {savedFilms.length === 1 ? 'película' : 'películas'} ·{' '}
                  {hours > 0 ? `${hours} h ${mins} min` : `${mins} min`} totales
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar panel de sesión"
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 flex items-center justify-center rounded-lg bg-[#18181D] border border-[#272730] text-[#A1A1AA] hover:text-[#F5F2EB] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {savedFilms.length === 0 ? (
                <div className="p-6 rounded-lg border border-dashed border-[#272730] bg-[#0C0C0F] text-sm text-[#A1A1AA] leading-relaxed">
                  Tu programa está vacío. Recorre el árbol de géneros de mayor a menor o busca nuevas películas en internet y pulsa{' '}
                  <span className="text-[#F5F2EB]">Guardar</span> para armar tu maratón nocturno.
                </div>
              ) : (
                savedFilms.map((film, idx) => (
                  <div
                    key={film.id}
                    className="p-4 rounded-lg bg-[#0C0C0F] border border-[#272730] flex items-start justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectFilm(film);
                      }}
                      className="text-left min-w-0 flex-1 group"
                    >
                      <p className="text-xs font-mono text-[#DC2626] tabular-nums mb-0.5">
                        Película {String(idx + 1).padStart(2, '0')} · {film.year} · {film.duration} min
                      </p>
                      <p className="font-display text-xl font-semibold text-[#F5F2EB] group-hover:text-[#DC2626] transition-colors truncate">
                        {film.title}
                      </p>
                      <p className="text-xs text-[#A1A1AA] mt-0.5">
                        {film.director} · Tensión {film.fearProfile.tension.toLowerCase()} · Gore {film.fearProfile.gore.toLowerCase()}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemove(film.id)}
                      aria-label={`Quitar ${film.title} de la sesión`}
                      className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 flex items-center justify-center rounded text-[#71717A] hover:text-[#DC2626] transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {savedFilms.length > 0 && (
              <div className="px-6 py-4 border-t border-[#272730] bg-[#0E0E12] flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs text-[#A1A1AA] hover:text-[#DC2626] transition-colors min-h-[44px] px-1"
                >
                  Vaciar programa
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 min-h-[44px] rounded-lg bg-[#DC2626] text-white text-xs font-medium hover:bg-[#B91C1C] transition-colors"
                >
                  Seguir explorando
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
