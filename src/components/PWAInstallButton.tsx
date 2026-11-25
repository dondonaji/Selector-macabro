import { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundEngine } from '../utils/soundEffects';

export function PWAInstallButton() {
  const { canPrompt, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    soundEngine.playClick(230);
    if (canPrompt) {
      await promptInstall();
      return;
    }
    setShowInstructions(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center justify-center gap-2 px-3.5 min-h-[44px] sm:min-h-0 sm:py-2 rounded-lg bg-[#18181D] border border-[#272730] hover:border-[#DC2626] text-xs font-medium text-[#F5F2EB] transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
        <span>Instalar app</span>
      </button>

      {showInstructions && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          onClick={() => setShowInstructions(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#121216] border border-[#272730] rounded-t-2xl sm:rounded-lg p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-[#DC2626] mb-1">
                  Aplicación instalable (PWA)
                </p>
                <h2
                  id="pwa-install-title"
                  className="font-display text-2xl font-semibold text-[#F5F2EB]"
                >
                  Instalar Selector Macabro
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                aria-label="Cerrar instrucciones de instalación"
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 flex items-center justify-center rounded-lg bg-[#08080A] border border-[#272730] text-[#D4D4D8] hover:text-[#F5F2EB] hover:border-[#DC2626] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-3 text-sm text-[#D4D4D8] leading-relaxed">
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs text-[#DC2626] pt-0.5">01.</span>
                  <span>
                    En Safari, pulsa el icono de{' '}
                    <span className="inline-flex items-center gap-1 text-[#F5F2EB] font-medium">
                      Compartir <Share className="w-3.5 h-3.5 inline" aria-hidden="true" />
                    </span>{' '}
                    en la barra inferior.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs text-[#DC2626] pt-0.5">02.</span>
                  <span>
                    Desplázate y elige{' '}
                    <span className="text-[#F5F2EB] font-medium">
                      Añadir a pantalla de inicio
                    </span>
                    .
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono text-xs text-[#DC2626] pt-0.5">03.</span>
                  <span>Pulsa Añadir para abrir Selector Macabro en pantalla completa.</span>
                </li>
              </ol>
            ) : (
              <div className="space-y-3 text-sm text-[#D4D4D8] leading-relaxed">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0C0C0F] border border-[#272730]">
                  <Smartphone className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" aria-hidden="true" />
                  <p>
                    Abre el menú de tu navegador (Chrome, Edge o Brave) y selecciona{' '}
                    <span className="text-[#F5F2EB] font-medium">
                      Instalar aplicación
                    </span>{' '}
                    o{' '}
                    <span className="text-[#F5F2EB] font-medium">
                      Añadir a pantalla de inicio
                    </span>{' '}
                    para usar el catálogo sin conexión.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="px-4 min-h-[44px] sm:min-h-0 sm:py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-medium transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
