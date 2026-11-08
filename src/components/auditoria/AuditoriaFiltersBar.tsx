import React from 'react';
import {
  Search,
  RotateCcw,
  Filter,
  DollarSign,
  Calendar,
  UserCheck,
} from 'lucide-react';
import { CATEGORIAS_AUDITORIA_CATALOGO } from '@/utils/auditoriaUtils';
import type {
  CategoriaEventoAuditoria,
  FiltrosAuditoria,
  RangoFechaAuditoria,
  SeveridadAuditoria,
} from '@/types';

interface AuditoriaFiltersBarProps {
  filtros: FiltrosAuditoria;
  responsablesUnicos: string[];
  totalResultados: number;
  onActualizarFiltro: <K extends keyof FiltrosAuditoria>(
    campo: K,
    valor: FiltrosAuditoria[K]
  ) => void;
  onLimpiarFiltros: () => void;
}

const CATEGORIAS_OPCIONES: Array<{
  id: CategoriaEventoAuditoria | 'todas';
  label: string;
}> = [
  { id: 'todas', label: 'Todas las categorías' },
  { id: 'anulacion_venta', label: CATEGORIAS_AUDITORIA_CATALOGO.anulacion_venta.shortLabel },
  { id: 'cortesia_descuento', label: CATEGORIAS_AUDITORIA_CATALOGO.cortesia_descuento.shortLabel },
  { id: 'merma_inventario', label: CATEGORIAS_AUDITORIA_CATALOGO.merma_inventario.shortLabel },
  { id: 'ajuste_inventario', label: CATEGORIAS_AUDITORIA_CATALOGO.ajuste_inventario.shortLabel },
  { id: 'cancelacion_comanda', label: CATEGORIAS_AUDITORIA_CATALOGO.cancelacion_comanda.shortLabel },
  { id: 'descuadre_caja', label: CATEGORIAS_AUDITORIA_CATALOGO.descuadre_caja.shortLabel },
  { id: 'acceso_personal', label: CATEGORIAS_AUDITORIA_CATALOGO.acceso_personal.shortLabel },
];

const RANGOS_FECHA: Array<{ id: RangoFechaAuditoria; label: string }> = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7dias', label: '7 días' },
  { id: '30dias', label: '30 días' },
  { id: 'todo', label: 'Todo el historial' },
];

const SEVERIDADES: Array<{ id: SeveridadAuditoria | 'todas'; label: string }> = [
  { id: 'todas', label: 'Todas las severidades' },
  { id: 'critica', label: '🔴 Crítica' },
  { id: 'alta', label: '🟠 Alta' },
  { id: 'media', label: '🟡 Media' },
  { id: 'informativa', label: '🟢 Informativa' },
];

export const AuditoriaFiltersBar: React.FC<AuditoriaFiltersBarProps> = ({
  filtros,
  responsablesUnicos,
  totalResultados,
  onActualizarFiltro,
  onLimpiarFiltros,
}) => {
  const hayFiltrosActivos =
    filtros.busqueda.trim() !== '' ||
    filtros.categoria !== 'todas' ||
    filtros.severidad !== 'todas' ||
    filtros.responsable !== 'todos' ||
    filtros.rangoFecha !== '30dias' ||
    filtros.soloImpactoFinanciero;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 space-y-4">
      {/* Fila 1: Buscador Forense, Rango de Fecha y Toggle Impacto Financiero */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={filtros.busqueda}
            onChange={(e) => onActualizarFiltro('busqueda', e.target.value)}
            placeholder="Buscar por huella AUD-XXXX, código #ticket, motivo, insumo u operador..."
            aria-label="Buscar eventos en la bitácora forense"
            className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
          />
        </div>

        {/* Selector de Período Temporal */}
        <div
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950 p-1"
          role="group"
          aria-label="Rango de fecha de auditoría"
        >
          <span className="hidden sm:inline-flex items-center gap-1 px-2 text-xs text-neutral-400">
            <Calendar className="h-3.5 w-3.5 text-gold-400" />
            Período:
          </span>
          {RANGOS_FECHA.map((rango) => {
            const activo = filtros.rangoFecha === rango.id;
            return (
              <button
                key={rango.id}
                type="button"
                aria-pressed={activo}
                onClick={() => onActualizarFiltro('rangoFecha', rango.id)}
                className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activo
                    ? 'bg-gold-400 text-neutral-950 shadow-sm'
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                {rango.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fila 2: Píldoras Táctiles de Categorías Auditadas */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filtrar por categoría de auditoría"
      >
        {CATEGORIAS_OPCIONES.map((cat) => {
          const activo = filtros.categoria === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={activo}
              onClick={() => onActualizarFiltro('categoria', cat.id)}
              className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                activo
                  ? 'border-gold-400 bg-gold-400/20 text-gold-300 shadow-sm'
                  : 'border-neutral-800 bg-neutral-950/70 text-neutral-300 hover:border-neutral-700 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Fila 3: Severidad, Operador Responsable, Solo con Impacto COP y Limpiar */}
      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between border-t border-neutral-800/80">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Severidad */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-400 shrink-0" />
            <select
              aria-label="Filtrar por nivel de severidad"
              value={filtros.severidad}
              onChange={(e) =>
                onActualizarFiltro(
                  'severidad',
                  e.target.value as SeveridadAuditoria | 'todas'
                )
              }
              className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-medium text-white focus:border-gold-400 focus:outline-none"
            >
              {SEVERIDADES.map((sev) => (
                <option key={sev.id} value={sev.id}>
                  {sev.label}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Operador Responsable */}
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-neutral-400 shrink-0" />
            <select
              aria-label="Filtrar por operador responsable"
              value={filtros.responsable}
              onChange={(e) => onActualizarFiltro('responsable', e.target.value)}
              className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-medium text-white focus:border-gold-400 focus:outline-none"
            >
              <option value="todos">Todos los operadores</option>
              {responsablesUnicos.map((resp) => (
                <option key={resp} value={resp}>
                  {resp}
                </option>
              ))}
            </select>
          </div>

          {/* Botón Toggle: Solo con impacto monetario en COP */}
          <button
            type="button"
            aria-pressed={filtros.soloImpactoFinanciero}
            onClick={() =>
              onActualizarFiltro('soloImpactoFinanciero', !filtros.soloImpactoFinanciero)
            }
            className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
              filtros.soloImpactoFinanciero
                ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Solo con impacto $ COP</span>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs text-neutral-400">
            Mostrando <strong className="text-white">{totalResultados}</strong> registros
          </span>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={onLimpiarFiltros}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restablecer filtros</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
