import { useState } from 'react';
import { Gift, Award, Plus, Minus, Sparkles, CheckCircle2 } from 'lucide-react';
import type { Cliente } from '@/types';
import { calcularProgresoTarjetaSellos, evaluarNivelFidelizacion } from '@/utils/fidelizacionUtils';

interface TarjetaSellosDigitalProps {
  cliente: Cliente;
  onCanjearRecompensa?: (clienteId: string) => Promise<void>;
  onAjustarSellos?: (clienteId: string, delta: number) => Promise<void>;
  compacto?: boolean;
  soloLectura?: boolean;
}

export function TarjetaSellosDigital({
  cliente,
  onCanjearRecompensa,
  onAjustarSellos,
  compacto = false,
  soloLectura = false,
}: TarjetaSellosDigitalProps) {
  const [procesando, setProcesando] = useState(false);
  const nivel = evaluarNivelFidelizacion(cliente);
  const progreso = calcularProgresoTarjetaSellos(
    cliente.sellosActuales,
    cliente.metaSellos,
    cliente.recompensasDisponibles,
    cliente.recompensasRedimidas
  );

  const handleCanjear = async () => {
    if (!onCanjearRecompensa || progreso.recompensasDisponibles <= 0 || procesando) return;
    const confirmado = window.confirm(
      `¿Deseas canjear 1 recompensa de fidelización para ${cliente.nombre}? Esta acción descontará la recompensa disponible.`
    );
    if (!confirmado) return;

    setProcesando(true);
    try {
      await onCanjearRecompensa(cliente.id);
    } finally {
      setProcesando(false);
    }
  };

  const handleDelta = async (delta: number) => {
    if (!onAjustarSellos || procesando) return;
    setProcesando(true);
    try {
      await onAjustarSellos(cliente.id, delta);
    } finally {
      setProcesando(false);
    }
  };

  // En modo compacto (ej. POS o tarjetas resumidas)
  if (compacto) {
    return (
      <div className="rounded-xl border border-gold-400/30 bg-neutral-950/80 p-2.5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Award className="h-4 w-4 text-gold-400" aria-hidden="true" />
            <span>Tarjeta de Sellos</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${nivel.badgeCls}`}>
              {nivel.label}
            </span>
          </div>
          <span className="font-display text-xs font-bold text-gold-400">
            {progreso.sellosActuales} / {progreso.metaSellos} sellos
          </span>
        </div>

        {/* Sellos visuales compactos */}
        <div className="flex items-center gap-1.5 mb-2">
          {Array.from({ length: progreso.metaSellos }).map((_, i) => {
            const sellado = i < progreso.sellosActuales;
            return (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full transition-all ${
                  sellado
                    ? 'bg-gradient-to-r from-gold-400 to-amber-500 shadow-sm shadow-gold-400/30'
                    : 'bg-neutral-800'
                }`}
                title={`Sello ${i + 1} de ${progreso.metaSellos}`}
              />
            );
          })}
        </div>

        {/* Banner Recompensa Lista */}
        {progreso.recompensasDisponibles > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-950/50 border border-emerald-500/40 px-2 py-1.5 text-xs text-emerald-300">
            <span className="flex items-center gap-1 font-semibold truncate text-[11px]">
              <Gift className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              ¡{progreso.recompensasDisponibles} recompensa(s) para canjear!
            </span>
            {onCanjearRecompensa && !soloLectura && (
              <button
                type="button"
                onClick={handleCanjear}
                disabled={procesando}
                className="min-h-[32px] px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-500 hover:bg-emerald-400 text-base-dark transition-all shrink-0 active:scale-95"
              >
                {procesando ? 'Canjeando...' : 'Canjear'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Tarjeta Completa Interactiva
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-400/40 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black p-4 sm:p-5 shadow-xl">
      {/* Fondo decorativo gastronómico */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold-400/5 blur-2xl pointer-events-none" />

      {/* Cabecera de la Tarjeta */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gold-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-gold-400 border border-gold-400/30 flex items-center gap-1">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Club de Fidelización
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${nivel.badgeCls}`}>
              {nivel.icono} {nivel.label}
            </span>
          </div>
          <h3 className="font-display text-base sm:text-lg font-black text-white mt-1">
            Tarjeta Digital de Sellos
          </h3>
          <p className="text-xs text-neutral-400">
            1 sello por cada visita o compra completada en La Parada.
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Progreso</p>
          <p className="font-display text-lg font-black text-gold-400">
            {progreso.sellosActuales}
            <span className="text-xs text-neutral-500"> / {progreso.metaSellos}</span>
          </p>
        </div>
      </div>

      {/* Cuadrícula de Sellos Físicos Troquelados */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3 my-4">
        {Array.from({ length: progreso.metaSellos }).map((_, index) => {
          const numeroSello = index + 1;
          const sellado = index < progreso.sellosActuales;
          const esUltimo = numeroSello === progreso.metaSellos;

          return (
            <div
              key={numeroSello}
              className={`relative flex flex-col items-center justify-center rounded-xl p-2.5 min-h-[70px] border transition-all ${
                sellado
                  ? 'border-gold-400/60 bg-gold-400/15 text-gold-400 shadow-md shadow-gold-400/10 scale-[1.02]'
                  : esUltimo
                    ? 'border-dashed border-emerald-500/50 bg-emerald-950/20 text-emerald-400/70'
                    : 'border-dashed border-neutral-800 bg-neutral-900/50 text-neutral-600'
              }`}
              title={
                sellado
                  ? `Sello #${numeroSello} sellado`
                  : esUltimo
                    ? `Sello final #${numeroSello} ¡Premio de la casa!`
                    : `Sello #${numeroSello} pendiente`
              }
            >
              {sellado ? (
                <>
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-gold-400 text-base-dark shadow-sm">
                    <CheckCircle2 className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
                  </div>
                  <span className="font-display text-[10px] font-bold text-gold-300 mt-1">
                    Sello {numeroSello}
                  </span>
                </>
              ) : esUltimo ? (
                <>
                  <Gift className="h-7 w-7 text-emerald-400 animate-pulse" aria-hidden="true" />
                  <span className="font-display text-[9px] font-bold text-emerald-300 mt-1 uppercase">
                    ¡Premio!
                  </span>
                </>
              ) : (
                <>
                  <div className="h-7 w-7 rounded-full border border-neutral-700/60 grid place-items-center text-xs text-neutral-500">
                    {numeroSello}
                  </div>
                  <span className="text-[9px] text-neutral-500 mt-1">Falta</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Barra de progreso visual */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
          <span>
            {progreso.faltantesParaRecompensa > 0
              ? `Falta(n) ${progreso.faltantesParaRecompensa} compra(s) para ganar premio`
              : '¡Tarjeta completa! Recompensa desbloqueada'}
          </span>
          <span className="font-bold text-neutral-300">{progreso.porcentajeProgreso}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-400 via-amber-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${progreso.porcentajeProgreso}%` }}
          />
        </div>
      </div>

      {/* Banner de Recompensas Disponibles para Canje */}
      {progreso.recompensasDisponibles > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 sm:p-4 text-emerald-300">
          <div className="flex items-start gap-2.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Gift className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                ¡{progreso.recompensasDisponibles} Recompensa(s) Disponible(s)!
              </p>
              <p className="text-xs text-emerald-300/90 mt-0.5">
                Válida por un plato o cortesía de la casa en el restaurante.
              </p>
            </div>
          </div>

          {onCanjearRecompensa && !soloLectura && (
            <button
              type="button"
              onClick={handleCanjear}
              disabled={procesando}
              className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-bold text-base-dark transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] shrink-0"
            >
              <Gift className="h-4 w-4" aria-hidden="true" />
              {procesando ? 'Canjeando...' : 'Canjear Recompensa'}
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 text-xs text-neutral-400 flex items-center justify-between">
          <span>Recompensas canjeadas históricas:</span>
          <span className="font-display font-bold text-white">
            {progreso.recompensasRedimidas} reclamada(s)
          </span>
        </div>
      )}

      {/* Controles de Administración de Sellos */}
      {onAjustarSellos && !soloLectura && (
        <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <span>Ajuste manual de sellos:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDelta(-1)}
              disabled={procesando || (progreso.sellosActuales === 0 && progreso.recompensasDisponibles === 0)}
              className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 disabled:opacity-40 transition-colors flex items-center gap-1"
              aria-label="Quitar un sello al cliente"
              title="Quitar un sello"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              -1 Sello
            </button>
            <button
              type="button"
              onClick={() => handleDelta(1)}
              disabled={procesando}
              className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-gold-400/30 bg-gold-400/10 hover:bg-gold-400/20 text-gold-400 transition-colors flex items-center gap-1 font-semibold"
              aria-label="Agregar un sello al cliente"
              title="Sumar un sello"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              +1 Sello
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
