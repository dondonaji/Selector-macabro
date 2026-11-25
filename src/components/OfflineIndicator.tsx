import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 left-4 right-4 sm:left-auto sm:right-6 z-40 max-w-sm rounded-lg bg-[#121216]/95 border border-[#DC2626]/60 px-4 py-3 backdrop-blur-md shadow-xl flex items-start gap-3"
    >
      <WifiOff className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" aria-hidden="true" />
      <div className="text-xs leading-relaxed">
        <p className="font-medium text-[#F5F2EB]">Modo sin conexión activo</p>
        <p className="text-[#A1A1AA] mt-0.5">
          El árbol de géneros y las 90 películas curadas siguen disponibles; la búsqueda abierta en internet requiere red.
        </p>
      </div>
    </div>
  );
}
