import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Bell,
  Clock,
  Flame,
  Maximize2,
  Minimize2,
  Thermometer,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
} from 'lucide-react';
import type { EstacionFiltro } from '@/types';
import { ESTACIONES_COCINA_META } from '@/utils/estacionesCocinaUtils';

export interface KdsHeaderProps {
  totalPendientes: number;
  totalEnPreparacion: number;
  totalListos: number;
  tiempoMasAntiguoMin: number;
  sonidoHabilitado: boolean;
  onToggleSonido: () => void;
  onProbarSonido: () => void;
  onAbrirMermaCocina?: () => void;
  onAbrirBitacoraBpm?: () => void;
  onAbrirReporteFalla?: () => void;
  onAbrirControl86?: () => void;
  cantidadEn86?: number;
  cantidadUltimasPorciones?: number;
  estacionFiltro?: EstacionFiltro;
}

export const KdsHeader = ({
  totalPendientes,
  totalEnPreparacion,
  totalListos,
  tiempoMasAntiguoMin,
  sonidoHabilitado,
  onToggleSonido,
  onProbarSonido,
  onAbrirMermaCocina,
  onAbrirBitacoraBpm,
  onAbrirReporteFalla,
  onAbrirControl86,
  cantidadEn86 = 0,
  cantidadUltimasPorciones = 0,
  estacionFiltro = 'todas',
}: KdsHeaderProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [horaLocal, setHoraLocal] = useState('');

  // Reloj digital de cocina
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setHoraLocal(now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Control de pantalla completa (Fullscreen API) para tablets o monitores de cocina
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen no disponible o bloqueado:', err);
    }
  };

  return (
    <header className="rounded-2xl border border-white/10 bg-neutral-900/90 p-4 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Título e icono gastronómico */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Flame className="h-7 w-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-black uppercase tracking-wide text-white">
                Cocina / Pantalla KDS
              </h1>
              {estacionFiltro !== 'todas' && (
                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-black ${ESTACIONES_COCINA_META[estacionFiltro].badgeClass}`}
                >
                  <span aria-hidden="true">{ESTACIONES_COCINA_META[estacionFiltro].emoji}</span>
                  <span>Estación: {ESTACIONES_COCINA_META[estacionFiltro].shortLabel}</span>
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-neutral-400">
              Comandas en tiempo real · Control de tiempos y preparación
            </p>
          </div>
        </div>

        {/* Reloj digital y KPIs rápidos del turno */}
        <div className="flex flex-wrap items-center gap-2">
          {horaLocal && (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 font-mono text-sm font-bold text-white shadow-inner">
              <Clock className="h-4 w-4 text-neutral-400" />
              <span>{horaLocal}</span>
            </div>
          )}

          {/* KPI: Pendientes */}
          <div className="flex items-center gap-1.5 rounded-xl border border-yellow-500/40 bg-yellow-950/30 px-3 py-2 text-yellow-300 font-bold text-xs">
            <span className="flex h-2 w-2 rounded-full bg-yellow-400 animate-ping" />
            <span>Pendientes:</span>
            <span className="font-mono text-sm font-black text-white">{totalPendientes}</span>
          </div>

          {/* KPI: En Preparación */}
          <div className="flex items-center gap-1.5 rounded-xl border border-orange-500/40 bg-orange-950/30 px-3 py-2 text-orange-300 font-bold text-xs">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <span>En Fuego:</span>
            <span className="font-mono text-sm font-black text-white">{totalEnPreparacion}</span>
          </div>

          {/* KPI: Listas */}
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-emerald-300 font-bold text-xs">
            <span>Listas:</span>
            <span className="font-mono text-sm font-black text-white">{totalListos}</span>
          </div>

          {/* Alerta si hay demoras */}
          {tiempoMasAntiguoMin >= 15 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-red-500/60 bg-red-950/40 px-3 py-2 text-red-300 font-bold text-xs animate-pulse">
              <Zap className="h-3.5 w-3.5 text-red-400" />
              <span>Demora máx:</span>
              <span className="font-mono text-sm font-black text-white">{tiempoMasAntiguoMin}m</span>
            </div>
          )}
        </div>

        {/* Botones de control táctil (Control 86, Sonido, Probar timbre, BPM, Merma, Pantalla Completa) */}
        <div className="flex flex-wrap items-center gap-2">
          {onAbrirControl86 && (
            <button
              type="button"
              onClick={onAbrirControl86}
              aria-label="Abrir Control 86 en vivo y porciones disponibles"
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black min-h-[44px] transition-colors ${
                cantidadEn86 > 0
                  ? 'border-red-500/70 bg-red-950/60 text-red-200 hover:bg-red-900/60'
                  : cantidadUltimasPorciones > 0
                    ? 'border-orange-500/60 bg-orange-950/50 text-orange-200 hover:bg-orange-900/50'
                    : 'border-red-500/40 bg-neutral-800 text-red-300 hover:bg-neutral-700'
              }`}
            >
              <Ban className="h-4 w-4 text-red-400" aria-hidden="true" />
              <span>Control 86</span>
              {(cantidadEn86 > 0 || cantidadUltimasPorciones > 0) && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                  {cantidadEn86 > 0 ? cantidadEn86 : `!${cantidadUltimasPorciones}`}
                </span>
              )}
            </button>
          )}

          {onAbrirBitacoraBpm && (
            <button
              type="button"
              onClick={onAbrirBitacoraBpm}
              aria-label="Abrir registro rápido de Bitácora BPM (temperaturas, aceite y checklist)"
              className="flex items-center gap-1.5 rounded-xl border border-gold-400/40 bg-gold-400/15 hover:bg-gold-400/25 active:scale-[0.98] px-3 py-2 text-xs font-bold text-gold-300 min-h-[44px] transition-colors"
            >
              <Thermometer className="h-4 w-4 text-gold-400" aria-hidden="true" />
              <span>Bitácora BPM</span>
            </button>
          )}

          {onAbrirReporteFalla && (
            <button
              type="button"
              onClick={onAbrirReporteFalla}
              aria-label="Reportar falla o avería en equipo de cocina"
              className="flex items-center gap-1.5 rounded-xl border border-orange-500/40 bg-orange-950/40 hover:bg-orange-900/50 active:scale-[0.98] px-3 py-2 text-xs font-bold text-orange-300 min-h-[44px] transition-colors"
            >
              <Wrench className="h-4 w-4 text-orange-400" aria-hidden="true" />
              <span>Reportar Falla</span>
            </button>
          )}

          {onAbrirMermaCocina && (
            <button
              type="button"
              onClick={onAbrirMermaCocina}
              aria-label="Reportar merma o desperdicio en cocina"
              className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/40 hover:bg-red-900/50 active:scale-[0.98] px-3 py-2 text-xs font-bold text-red-300 min-h-[44px] transition-colors"
            >
              <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
              <span>Reportar Merma</span>
            </button>
          )}

          {/* Interruptor de sonido */}
          <button
            type="button"
            onClick={onToggleSonido}
            aria-label={sonidoHabilitado ? 'Silenciar sonido de comandas' : 'Activar sonido de comandas'}
            aria-pressed={sonidoHabilitado}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold min-h-[44px] transition-colors ${
              sonidoHabilitado
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
                : 'border-white/10 bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            {sonidoHabilitado ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span>{sonidoHabilitado ? 'Sonido ON' : 'Silenciado'}</span>
          </button>

          {/* Probar timbre */}
          <button
            type="button"
            onClick={onProbarSonido}
            aria-label="Probar campana de cocina"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-neutral-800 hover:bg-neutral-700 active:scale-[0.98] px-3 py-2 text-xs font-bold text-white min-h-[44px] transition-colors"
          >
            <Bell className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">Probar Timbre</span>
          </button>

          {/* Pantalla completa */}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Poner en pantalla completa'}
            aria-pressed={isFullscreen}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-neutral-800 hover:bg-neutral-700 active:scale-[0.98] px-3 py-2 text-xs font-bold text-white min-h-[44px] transition-colors"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Normal' : 'Pantalla Completa'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
