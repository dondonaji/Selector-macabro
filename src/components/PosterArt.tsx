import { useEffect, useRef, useState } from 'react';
import { BranchId, HORROR_TAXONOMY } from '../data/horrorTaxonomy';

export interface PosterResult {
  posterUrl: string | null;
  rawUrl?: string | null;
  source?: string | null;
  pageUrl?: string | null;
}

// Client-side deduplicated cache so posters never re-fetch on re-renders
const clientPosterCache = new Map<string, PosterResult>();
const inFlightRequests = new Map<string, Promise<PosterResult>>();

export async function fetchFilmPoster(params: {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  director: string;
  initialPoster?: PosterResult;
}): Promise<PosterResult> {
  if (params.initialPoster?.posterUrl) {
    clientPosterCache.set(params.id, params.initialPoster);
    return params.initialPoster;
  }

  const cached = clientPosterCache.get(params.id);
  if (cached) return cached;

  const existingPromise = inFlightRequests.get(params.id);
  if (existingPromise) return existingPromise;

  const qs = new URLSearchParams({
    id: params.id,
    title: params.title,
    year: String(params.year),
    director: params.director,
  });
  if (params.originalTitle) {
    qs.set('originalTitle', params.originalTitle);
  }

  const req = fetch(`/api/poster?${qs.toString()}`)
    .then(async (res) => {
      if (!res.ok) return { posterUrl: null };
      const data = (await res.json()) as PosterResult;
      clientPosterCache.set(params.id, data);
      return data;
    })
    .catch(() => ({ posterUrl: null }))
    .finally(() => {
      inFlightRequests.delete(params.id);
    });

  inFlightRequests.set(params.id, req);
  return req;
}

interface PosterArtProps {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  director: string;
  branchId: BranchId;
  keyMotif: string;
  initialPoster?: PosterResult;
  mode?: 'official' | 'artistic';
  className?: string;
}

function BranchGeometricEmblem({ branchId }: { branchId: BranchId }) {
  switch (branchId) {
    case 'paranormal':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 text-[#D6C7B2]/75" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
          <circle cx="32" cy="32" r="22" />
          <polygon points="32,12 49,44 15,44" />
          <circle cx="32" cy="34" r="5" className="text-[#DC2626]" />
        </svg>
      );
    case 'monstruos':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 text-[#D6C7B2]/75" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
          <rect x="20" y="10" width="24" height="44" />
          <line x1="12" y1="32" x2="52" y2="32" className="text-[#DC2626]" />
          <circle cx="32" cy="24" r="6" />
        </svg>
      );
    case 'humano':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 text-[#D6C7B2]/75" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
          <rect x="14" y="14" width="36" height="36" />
          <line x1="14" y1="50" x2="50" y2="14" className="text-[#DC2626]" />
          <circle cx="32" cy="32" r="7" />
        </svg>
      );
    case 'psicologico':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 text-[#D6C7B2]/75" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
          <circle cx="32" cy="32" r="22" />
          <circle cx="32" cy="32" r="14" />
          <circle cx="32" cy="32" r="6" className="text-[#DC2626]" />
        </svg>
      );
    case 'corporal':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 text-[#D6C7B2]/75" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
          <path d="M18 14 C28 24, 36 40, 46 50" className="text-[#DC2626]" />
          <path d="M46 14 C36 24, 28 40, 18 50" />
          <ellipse cx="32" cy="32" rx="18" ry="10" />
        </svg>
      );
  }
}

export function PosterArt({
  id,
  title,
  originalTitle,
  year,
  director,
  branchId,
  keyMotif,
  initialPoster,
  mode = 'official',
  className = '',
}: PosterArtProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(
    Boolean(initialPoster?.posterUrl || clientPosterCache.get(id)?.posterUrl)
  );
  const [posterUrl, setPosterUrl] = useState<string | null>(
    initialPoster?.posterUrl ?? clientPosterCache.get(id)?.posterUrl ?? null
  );
  const [imgError, setImgError] = useState(false);

  const branch = HORROR_TAXONOMY.find((b) => b.id === branchId);

  useEffect(() => {
    if (isNearViewport || mode === 'artistic') return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '260px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isNearViewport, mode]);

  useEffect(() => {
    let active = true;
    setImgError(false);

    if (mode === 'artistic' || !isNearViewport) {
      return;
    }

    fetchFilmPoster({ id, title, originalTitle, year, director, initialPoster }).then((res) => {
      if (active && res.posterUrl) {
        setPosterUrl(res.posterUrl);
      }
    });

    return () => {
      active = false;
    };
  }, [id, title, originalTitle, year, director, initialPoster, mode, isNearViewport]);

  const showOfficialPoster = mode === 'official' && Boolean(posterUrl) && !imgError;

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[2/3] w-full overflow-hidden bg-[#0A0A0D] border border-[#272730] rounded ${className}`}
    >
      {showOfficialPoster ? (
        <>
          <img
            src={posterUrl!}
            alt={`Cartel teatral de ${title} (${year})`}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15 pointer-events-none"
            aria-hidden="true"
          />
        </>
      ) : (
        /* Bespoke Criterion/Festival-style Artistic Poster Fallback */
        <div className="relative h-full w-full flex flex-col justify-between p-4 text-center">
          {branch?.image && (
            <img
              src={branch.image}
              alt=""
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
          )}
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#08080A]/85 via-[#08080A]/60 to-[#08080A]/95"
            aria-hidden="true"
          />

          <div className="relative z-10 text-[10px] font-mono tracking-widest text-[#D6C7B2]/80 tabular-nums">
            {year} · {branch?.name}
          </div>

          <div className="relative z-10 flex flex-col items-center gap-3 my-auto">
            <BranchGeometricEmblem branchId={branchId} />
            <p className="font-display text-lg sm:text-xl font-semibold text-[#F5F2EB] leading-tight px-1">
              {title}
            </p>
            <p className="font-display italic text-xs text-[#D6C7B2]/85 line-clamp-2 px-2">
              {keyMotif}
            </p>
          </div>

          <div className="relative z-10 border-t border-white/10 pt-2 text-[10px] font-mono text-[#A1A1AA] truncate">
            {director}
          </div>
        </div>
      )}
    </div>
  );
}
