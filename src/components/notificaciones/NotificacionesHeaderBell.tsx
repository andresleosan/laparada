import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useNotificaciones } from '@/hooks/useNotificaciones';
import {
  getBadgeUrgenciaInfo,
  formatearTiempoRelativoNotificacion,
} from '@/utils/notificacionesUtils';

export function NotificacionesHeaderBell() {
  const [abierto, setAbierto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notificaciones,
    noLeidasCount,
    criticasCount,
    sonidoHabilitado,
    toggleSonido,
    marcarLeida,
    marcarTodasLeidas,
  } = useNotificaciones();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setAbierto(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAbierto(false);
      }
    }

    if (abierto) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [abierto]);

  const recientes = notificaciones.slice(0, 6);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Botón Campana Flotante */}
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        aria-expanded={abierto}
        aria-haspopup="true"
        aria-label={
          noLeidasCount > 0
            ? `Campana de notificaciones, ${noLeidasCount} alertas no leídas`
            : 'Campana de notificaciones, sin alertas pendientes'
        }
        title="Bandeja de alertas operativas"
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition-all ${
          abierto
            ? 'border-amber-400 bg-amber-500/20 text-amber-300'
            : noLeidasCount > 0
              ? 'border-amber-500/40 bg-white/[0.04] text-amber-400 hover:bg-amber-500/10'
              : 'border-[#ddd7ca] bg-white text-[#5f5a50] hover:bg-[#f4f1e8] lg:border-white/10 lg:bg-white/[0.04] lg:text-white lg:hover:bg-white/[0.08]'
        }`}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />

        {/* Badge Flotante de Alertas */}
        {noLeidasCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-black text-white shadow-md ring-2 ring-[#171713] ${
              criticasCount > 0
                ? 'bg-rose-600 animate-pulse'
                : 'bg-amber-600'
            }`}
          >
            {noLeidasCount > 99 ? '99+' : noLeidasCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable Flotante */}
      {abierto && (
        <div
          role="region"
          aria-label="Panel de alertas operativas recientes"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-neutral-900 border border-amber-500/30 shadow-2xl shadow-black/80 z-50 overflow-hidden text-white backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header del Dropdown */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/60">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-black uppercase text-amber-400 tracking-wide">
                Alertas
              </span>
              {noLeidasCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {noLeidasCount} nuevas
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Botón Silenciar / Activar Timbre */}
              <button
                type="button"
                onClick={toggleSonido}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                aria-label={
                  sonidoHabilitado
                    ? 'Silenciar alertas sonoras'
                    : 'Activar alertas sonoras'
                }
                title={
                  sonidoHabilitado
                    ? 'Sonido: Activado (clic para silenciar)'
                    : 'Sonido: Silenciado (clic para activar)'
                }
              >
                {sonidoHabilitado ? (
                  <Volume2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                )}
              </button>

              {/* Botón Marcar Todas Leídas */}
              {noLeidasCount > 0 && (
                <button
                  type="button"
                  onClick={marcarTodasLeidas}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                  aria-label="Marcar todas las alertas como leídas"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de Alertas Recientes */}
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-800/60">
            {recientes.length === 0 ? (
              <div className="p-6 text-center">
                <Sparkles className="h-8 w-8 text-amber-400/50 mx-auto mb-2" aria-hidden="true" />
                <p className="text-xs font-bold text-neutral-300">
                  No hay alertas pendientes
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  La cocina, bodega y mesas operan sin incidencias
                </p>
              </div>
            ) : (
              recientes.map((n) => {
                const uInfo = getBadgeUrgenciaInfo(n.urgencia);
                const relTime = formatearTiempoRelativoNotificacion(n.fecha);

                return (
                  <div
                    key={n.id}
                    className={`p-3 transition-colors hover:bg-neutral-800/40 flex items-start gap-2.5 ${
                      !n.leida ? 'bg-amber-500/[0.04]' : 'opacity-70'
                    }`}
                  >
                    {/* Indicador de Urgencia */}
                    <span
                      className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1.5 ${uInfo.dotClass} ${
                        n.urgencia === 'critica' && !n.leida ? 'animate-ping' : ''
                      }`}
                      aria-hidden="true"
                    />

                    {/* Contenido */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">
                          {n.modulo}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-medium">
                          {relTime}
                        </span>
                      </div>

                      <p
                        className={`text-xs font-bold leading-tight truncate ${
                          n.leida ? 'text-neutral-300' : 'text-white'
                        }`}
                      >
                        {n.titulo}
                      </p>
                      <p className="text-[11px] text-neutral-400 leading-snug line-clamp-2 mt-0.5">
                        {n.mensaje}
                      </p>

                      {/* Enlace al módulo si existe */}
                      {n.enlace && (
                        <button
                          type="button"
                          onClick={() => {
                            setAbierto(false);
                            if (n.enlace) navigate(n.enlace);
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          <span>Atender en módulo</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    {/* Marcar leída individual */}
                    {!n.leida && (
                      <button
                        type="button"
                        onClick={() => marcarLeida(n.id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:text-emerald-400 hover:bg-neutral-800 transition-colors"
                        aria-label={`Marcar ${n.titulo} como leída`}
                        title="Marcar como leída"
                      >
                        <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer: Ver Todas */}
          <div className="p-2 border-t border-neutral-800 bg-neutral-950/80 text-center">
            <Link
              to="/notificaciones"
              onClick={() => setAbierto(false)}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <span>Ver todas las alertas operativas</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
