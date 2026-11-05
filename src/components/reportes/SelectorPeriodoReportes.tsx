// src/components/reportes/SelectorPeriodoReportes.tsx
import React, { useState } from 'react';
import type { TipoPeriodoReporte } from '@/types';
import { Calendar, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SelectorPeriodoReportesProps {
  periodoActual: TipoPeriodoReporte;
  etiquetaPeriodo: string;
  onCambiarPeriodo: (tipo: TipoPeriodoReporte, customInicio?: Date, customFin?: Date) => void;
  disabled?: boolean;
}

const OPCIONES_PERIODO: Array<{ id: TipoPeriodoReporte; label: string; shortLabel: string }> = [
  { id: 'hoy', label: 'Hoy', shortLabel: 'Hoy' },
  { id: '7dias', label: 'Últimos 7 días', shortLabel: '7 días' },
  { id: '30dias', label: 'Últimos 30 días', shortLabel: '30 días' },
  { id: 'mes_actual', label: 'Este Mes', shortLabel: 'Mes Actual' },
  { id: 'mes_anterior', label: 'Mes Anterior', shortLabel: 'Mes Ant.' },
  { id: 'personalizado', label: 'Personalizado', shortLabel: 'Custom' },
];

export function SelectorPeriodoReportes({
  periodoActual,
  etiquetaPeriodo,
  onCambiarPeriodo,
  disabled = false,
}: SelectorPeriodoReportesProps) {
  const [mostrarCustom, setMostrarCustom] = useState(periodoActual === 'personalizado');
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return d.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const handleSeleccionar = (tipo: TipoPeriodoReporte) => {
    if (tipo === 'personalizado') {
      setMostrarCustom(true);
    } else {
      setMostrarCustom(false);
      onCambiarPeriodo(tipo);
    }
  };

  const handleAplicarCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechaInicio || !fechaFin) return;
    const [yIni, mIni, dIni] = fechaInicio.split('-').map(Number);
    const [yFin, mFin, dFin] = fechaFin.split('-').map(Number);
    const iniDate = new Date(yIni, mIni - 1, dIni, 0, 0, 0, 0);
    const finDate = new Date(yFin, mFin - 1, dFin, 23, 59, 59, 999);
    onCambiarPeriodo('personalizado', iniDate, finDate);
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 sm:p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gold-400" aria-hidden="true" />
          <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Ventana de Análisis:
          </span>
          <span className="text-xs font-bold text-white font-display px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700">
            {etiquetaPeriodo}
          </span>
        </div>
      </div>

      {/* Botones de selección rápida táctiles */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
        {OPCIONES_PERIODO.map((opcion) => {
          const activo = periodoActual === opcion.id;
          return (
            <button
              key={opcion.id}
              type="button"
              disabled={disabled}
              onClick={() => handleSeleccionar(opcion.id)}
              aria-pressed={activo}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activo
                  ? 'bg-gold-500/20 text-gold-300 border border-gold-500/50 shadow-inner'
                  : 'bg-neutral-800/70 text-neutral-400 border border-neutral-700/60 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              {activo && <Check className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />}
              <span>{opcion.label}</span>
            </button>
          );
        })}
      </div>

      {/* Formulario desplegable para fechas personalizadas */}
      {mostrarCustom && (
        <form
          onSubmit={handleAplicarCustom}
          className="mt-3.5 pt-3 border-t border-neutral-800/80 flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="fecha-inicio-analitica" className="text-[11px] font-medium text-neutral-400">
              Fecha Inicio:
            </label>
            <input
              id="fecha-inicio-analitica"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-gold-400 focus:outline-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="fecha-fin-analitica" className="text-[11px] font-medium text-neutral-400">
              Fecha Fin:
            </label>
            <input
              id="fecha-fin-analitica"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-gold-400 focus:outline-none"
              required
            />
          </div>

          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={disabled}
            className="min-h-[44px] px-4 text-xs font-bold"
          >
            Aplicar Rango
          </Button>
        </form>
      )}
    </div>
  );
}

