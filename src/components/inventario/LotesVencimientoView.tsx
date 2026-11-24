import { useMemo } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Lock,
  Package,
  Plus,
  RotateCcw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import type {
  EstadoLoteInventario,
  EstadoSemaforoSanitario,
  FiltrosLotesInventario,
  Insumo,
  LoteEvaluadoSanitario,
  LoteInventario,
  ResumenSanitarioBodega,
} from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import {
  formatearFechaVencimientoCorta,
  generarResumenSanitarioWhatsApp,
  SEMAFORO_SANITARIO_META,
  UBICACIONES_BODEGA_LOTE_META,
} from '@/utils/lotesInventarioUtils';

export interface LotesVencimientoViewProps {
  lotes: LoteInventario[];
  lotesFiltrados: LoteEvaluadoSanitario[];
  resumenSanitario: ResumenSanitarioBodega;
  insumos: Insumo[];
  nombreNegocio?: string;
  loading?: boolean;
  error?: string | null;
  filtros: FiltrosLotesInventario;
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosLotesInventario>>;
  resetFiltros: () => void;
  onAbrirRegistrarLote: (insumoId?: string) => void;
  onAbrirBajaLote: (lote: LoteEvaluadoSanitario) => void;
  onToggleCuarentena: (lote: LoteEvaluadoSanitario) => void;
  onVerKardexInsumo: (insumoId: string) => void;
  onExportarCsv: () => void;
  onReintentar?: () => void;
}

const FILTROS_SEMAFORO: Array<{
  id: EstadoSemaforoSanitario | 'todos' | 'en_riesgo';
  label: string;
}> = [
  { id: 'todos', label: 'Todos' },
  { id: 'en_riesgo', label: 'En Riesgo (≤7d + Venc.)' },
  { id: 'vencido', label: 'Vencidos' },
  { id: 'critico_3d', label: 'Críticos (≤ 3d)' },
  { id: 'proximo_7d', label: 'Próximos (4–7d)' },
  { id: 'vigente', label: 'Vigentes' },
  { id: 'sin_vencimiento', label: 'Sin caducidad' },
];

const FILTROS_ESTADO_LOTE: Array<{
  id: EstadoLoteInventario | 'todos';
  label: string;
}> = [
  { id: 'activo', label: 'Activos en Bodega' },
  { id: 'cuarentena', label: 'En Cuarentena' },
  { id: 'vencido_baja', label: 'Baja a Merma' },
  { id: 'agotado', label: 'Agotados (PEPS)' },
  { id: 'todos', label: 'Todo el Historial' },
];

export function LotesVencimientoView({
  lotes,
  lotesFiltrados,
  resumenSanitario,
  insumos,
  nombreNegocio = 'La Parada',
  loading = false,
  error = null,
  filtros,
  setFiltros,
  resetFiltros,
  onAbrirRegistrarLote,
  onAbrirBajaLote,
  onToggleCuarentena,
  onVerKardexInsumo,
  onExportarCsv,
  onReintentar,
}: LotesVencimientoViewProps) {
  const estiloBanner = useMemo(() => {
    switch (resumenSanitario.estadoGlobal) {
      case 'critico':
        return {
          container:
            'border-red-500/50 bg-gradient-to-r from-red-950/60 via-neutral-900 to-neutral-900',
          badge: 'border-red-500/60 bg-red-500/20 text-red-300',
          titulo: 'Alerta Sanitaria Crítica: Hay lotes vencidos en bodega',
          descripcion:
            'El consumo automático PEPS protege tus ventas omitiendo lotes vencidos. Retíralos a merma con 1 clic.',
          Icon: ShieldAlert,
        };
      case 'alerta':
        return {
          container:
            'border-orange-500/50 bg-gradient-to-r from-orange-950/50 via-neutral-900 to-neutral-900',
          badge: 'border-orange-500/60 bg-orange-500/20 text-orange-300',
          titulo: 'Atención Inmediata: Lotes por vencer en ≤ 3 días',
          descripcion:
            'Prioriza estos lotes al frente de cocina y neveras. Las ventas POS ya descuentan primero el próximo a vencer.',
          Icon: AlertTriangle,
        };
      case 'preventivo':
        return {
          container:
            'border-amber-500/45 bg-gradient-to-r from-amber-950/40 via-neutral-900 to-neutral-900',
          badge: 'border-amber-500/60 bg-amber-500/20 text-amber-300',
          titulo: 'Monitoreo Preventivo: Lotes con vencimiento entre 4 y 7 días',
          descripcion:
            'Planifica promociones o producción de lotes en cocina para rotar antes de la fecha límite.',
          Icon: CalendarClock,
        };
      case 'saludable':
      default:
        return {
          container:
            'border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900',
          badge: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
          titulo: 'Semáforo Sanitario Saludable (PEPS / FIFO Activo)',
          descripcion:
            'Todos los lotes perecederos en bodega cuentan con vida útil vigente y trazabilidad por fecha.',
          Icon: ShieldCheck,
        };
    }
  }, [resumenSanitario.estadoGlobal]);

  const handleCompartirWhatsApp = () => {
    const encoded = generarResumenSanitarioWhatsApp(lotes, nombreNegocio);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-neutral-800 bg-neutral-900 p-6">
        <EmptyState
          icon={AlertTriangle}
          title="No pudimos cargar el control de lotes y caducidad"
          description={error}
          action={{
            label: 'Reintentar',
            onClick: onReintentar || resetFiltros,
          }}
        />
      </Card>
    );
  }

  const BannerIcon = estiloBanner.Icon;

  return (
    <div className="space-y-6">
      {/* Banner Semáforo Sanitario Global */}
      <Card className={`border p-4 sm:p-5 ${estiloBanner.container}`}>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-3">
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${estiloBanner.badge}`}
            >
              <BannerIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-bold text-white sm:text-lg">
                  {estiloBanner.titulo}
                </h2>
                <Badge variant="outline" className={`border font-bold ${estiloBanner.badge}`}>
                  PEPS / FIFO
                </Badge>
              </div>
              <p className="text-xs text-neutral-300">{estiloBanner.descripcion}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCompartirWhatsApp}
              disabled={lotes.length === 0}
              className="min-h-[44px] gap-2 border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span>Resumen WhatsApp</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={onExportarCsv}
              disabled={lotes.length === 0}
              className="min-h-[44px] gap-2 border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Exportar Trazabilidad CSV</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => onAbrirRegistrarLote()}
              disabled={insumos.length === 0}
              className="min-h-[44px] gap-2 font-bold"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Registrar Lote</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 4 KPIs Semafóricos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center justify-between border-red-500/30 bg-neutral-900 p-4">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Lotes Vencidos</span>
            <div className="mt-1 font-display text-2xl font-bold text-red-400">
              {resumenSanitario.vencidosCount}
            </div>
            <p className="mt-0.5 text-[11px] text-red-300/80">
              Valor retenido: {formatCOP(resumenSanitario.valorVencidoCOP)}
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-400">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>

        <Card className="flex items-center justify-between border-orange-500/30 bg-neutral-900 p-4">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Críticos (≤ 3 días)</span>
            <div className="mt-1 font-display text-2xl font-bold text-orange-400">
              {resumenSanitario.criticos3dCount}
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              Prioridad #1 en cocina y neveras
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/15 text-orange-400">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>

        <Card className="flex items-center justify-between border-amber-500/30 bg-neutral-900 p-4">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Próximos (4–7 días)</span>
            <div className="mt-1 font-display text-2xl font-bold text-amber-300">
              {resumenSanitario.proximos7dCount}
            </div>
            <p className="mt-0.5 text-[11px] text-amber-200/80">
              En riesgo ≤7d: {formatCOP(resumenSanitario.valorProximo7dCOP)}
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>

        <Card className="flex items-center justify-between border-neutral-800 bg-neutral-900 p-4">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Lotes Activos PEPS</span>
            <div className="mt-1 font-display text-2xl font-bold text-gold-400">
              {resumenSanitario.totalLotesActivos}
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              Capital activo: {formatCOP(resumenSanitario.valorTotalLotesActivosCOP)}
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-400/10 text-gold-400">
            <Package className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="space-y-3 border-neutral-800 bg-neutral-900 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
              aria-hidden="true"
            />
            <input
              type="text"
              value={filtros.busqueda || ''}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))
              }
              placeholder="Buscar por código de lote, insumo, proveedor o registro..."
              className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-9 pr-3 text-xs text-white placeholder:text-neutral-500 focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrar lotes por insumo"
              value={filtros.insumoId || 'todos'}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, insumoId: e.target.value }))
              }
              className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-medium text-white focus:border-gold-400 focus:outline-none"
            >
              <option value="todos">Todos los insumos</option>
              {insumos.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.nombre}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar lotes por estado operativo"
              value={filtros.estadoLote || 'activo'}
              onChange={(e) =>
                setFiltros((prev) => ({
                  ...prev,
                  estadoLote: e.target.value as EstadoLoteInventario | 'todos',
                }))
              }
              className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-medium text-white focus:border-gold-400 focus:outline-none"
            >
              {FILTROS_ESTADO_LOTE.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetFiltros}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-semibold text-neutral-300 hover:border-gold-400 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>

        {/* Píldoras de semáforo */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filtrar por semáforo sanitario"
        >
          {FILTROS_SEMAFORO.map((f) => {
            const active = (filtros.estadoSemaforo || 'todos') === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setFiltros((prev) => ({ ...prev, estadoSemaforo: f.id }))
                }
                className={`min-h-[40px] rounded-xl border px-3 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Listado de Lotes (Tabla desktop + Tarjetas móvil) */}
      {lotesFiltrados.length === 0 ? (
        <Card className="border-neutral-800 bg-neutral-900 p-6">
          <EmptyState
            icon={CheckCircle2}
            title={lotes.length === 0 ? 'Sin lotes registrados todavía' : 'Ningún lote coincide con el filtro'}
            description={
              lotes.length === 0
                ? 'Registra un lote nuevo o agrega fecha de vencimiento al registrar entradas para activar la rotación automática PEPS / FIFO.'
                : 'Prueba limpiando los filtros o seleccionando "Todo el Historial" para revisar lotes agotados o dados de baja.'
            }
            action={{
              label: lotes.length === 0 ? 'Registrar Primer Lote' : 'Restablecer filtros',
              onClick: lotes.length === 0 ? () => onAbrirRegistrarLote() : resetFiltros,
            }}
          />
        </Card>
      ) : (
        <>
          {/* Vista Desktop */}
          <div className="hidden overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-800 bg-neutral-950/80 text-[11px] uppercase tracking-wider text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">Lote &amp; Prioridad PEPS</th>
                    <th className="px-4 py-3">Insumo</th>
                    <th className="px-4 py-3">Semáforo / Caducidad</th>
                    <th className="px-4 py-3">Saldo Disponible</th>
                    <th className="px-4 py-3">Ubicación &amp; Origen</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/70">
                  {lotesFiltrados.map((lote) => {
                    const meta = SEMAFORO_SANITARIO_META[lote.estadoSemaforo];
                    const ubicacionLabel = lote.ubicacionBodega
                      ? UBICACIONES_BODEGA_LOTE_META[lote.ubicacionBodega]?.shortLabel ||
                        lote.ubicacionBodega
                      : 'Bodega';
                    const operable =
                      (lote.estado === 'activo' || lote.estado === 'cuarentena') &&
                      lote.cantidadDisponible > 0;

                    return (
                      <tr
                        key={lote.id}
                        className="transition-colors hover:bg-neutral-800/35"
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="font-mono font-bold text-white">
                            {lote.codigoLote}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {lote.esPrimeroPeps && (
                              <span className="rounded-md border border-gold-400/50 bg-gold-400/15 px-1.5 py-0.5 text-[10px] font-black text-gold-300">
                                #1 PEPS
                              </span>
                            )}
                            {lote.estado === 'cuarentena' && (
                              <span className="rounded-md border border-purple-500/50 bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                                Cuarentena
                              </span>
                            )}
                            {lote.estado === 'vencido_baja' && (
                              <span className="rounded-md border border-red-500/50 bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                                Baja a Merma
                              </span>
                            )}
                            {lote.estado === 'agotado' && (
                              <span className="rounded-md border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400">
                                Agotado
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold text-white">
                            {lote.insumoNombre}
                          </div>
                          <div className="mt-0.5 text-[11px] text-neutral-400">
                            {lote.proveedor || 'Sin proveedor'}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${meta.dotClass}`}
                              aria-hidden="true"
                            />
                            {meta.shortLabel}
                          </span>
                          <div className="mt-1 text-[11px] text-neutral-300">
                            {formatearFechaVencimientoCorta(lote.fechaVencimiento)}
                            {lote.diasParaVencer !== null && (
                              <span className="ml-1 text-neutral-400">
                                (
                                {lote.diasParaVencer < 0
                                  ? `hace ${Math.abs(lote.diasParaVencer)}d`
                                  : lote.diasParaVencer === 0
                                  ? 'HOY'
                                  : `en ${lote.diasParaVencer}d`}
                                )
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <div className="font-bold text-white">
                            {lote.cantidadDisponible}{' '}
                            <span className="font-normal text-neutral-400">
                              / {lote.cantidadInicial} {lote.unidadMedida}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-neutral-800">
                            <div
                              className={`h-full ${
                                lote.estadoSemaforo === 'vencido'
                                  ? 'bg-red-500'
                                  : lote.estadoSemaforo === 'critico_3d'
                                  ? 'bg-orange-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${lote.porcentajeDisponible}%` }}
                            />
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-gold-400">
                            Saldo: {formatCOP(lote.valorDisponibleCOP)}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-[11px] text-neutral-300">
                          <div>{ubicacionLabel}</div>
                          {typeof lote.temperaturaRecepcionC === 'number' && (
                            <div className="text-sky-300">
                              Temp: {lote.temperaturaRecepcionC} °C
                            </div>
                          )}
                          {lote.registroSanitario && (
                            <div className="text-neutral-400">
                              Reg: {lote.registroSanitario}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            {operable && (
                              <button
                                type="button"
                                onClick={() => onAbrirBajaLote(lote)}
                                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                                title="Dar de baja rápida a merma operativa"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Baja a Merma</span>
                              </button>
                            )}

                            {operable && (
                              <button
                                type="button"
                                onClick={() => onToggleCuarentena(lote)}
                                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 text-xs font-semibold text-neutral-200 hover:border-purple-400 hover:text-purple-200"
                                title={
                                  lote.estado === 'cuarentena'
                                    ? 'Liberar lote a operación PEPS'
                                    : 'Aislar lote en cuarentena'
                                }
                              >
                                {lote.estado === 'cuarentena' ? (
                                  <>
                                    <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>Liberar</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>Cuarentena</span>
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onVerKardexInsumo(lote.insumoId)}
                              className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 text-xs font-semibold text-gold-400 hover:border-gold-400"
                              title="Ver Kardex del insumo"
                            >
                              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Kardex</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista Móvil (Tarjetas Táctiles) */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {lotesFiltrados.map((lote) => {
              const meta = SEMAFORO_SANITARIO_META[lote.estadoSemaforo];
              const operable =
                (lote.estado === 'activo' || lote.estado === 'cuarentena') &&
                lote.cantidadDisponible > 0;

              return (
                <Card
                  key={lote.id}
                  className={`space-y-3 border bg-neutral-900 p-4 ${meta.borderClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-gold-300">
                          {lote.codigoLote}
                        </span>
                        {lote.esPrimeroPeps && (
                          <span className="rounded bg-gold-400/20 px-1.5 py-0.5 text-[10px] font-black text-gold-300">
                            #1 PEPS
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 truncate text-sm font-bold text-white">
                        {lote.insumoNombre}
                      </h3>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                      {meta.shortLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-neutral-950/70 p-2.5 text-xs">
                    <div>
                      <span className="text-neutral-400">Disponible: </span>
                      <strong className="text-white">
                        {lote.cantidadDisponible} / {lote.cantidadInicial}{' '}
                        {lote.unidadMedida}
                      </strong>
                    </div>
                    <strong className="font-mono text-gold-400">
                      {formatCOP(lote.valorDisponibleCOP)}
                    </strong>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
                    <span>
                      Caducidad:{' '}
                      <strong className="text-neutral-200">
                        {formatearFechaVencimientoCorta(lote.fechaVencimiento)}
                      </strong>
                    </span>
                    <span>
                      {lote.ubicacionBodega
                        ? UBICACIONES_BODEGA_LOTE_META[lote.ubicacionBodega]?.shortLabel
                        : 'Bodega'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-2.5">
                    {operable && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => onAbrirBajaLote(lote)}
                        className="min-h-[44px] flex-1 gap-1.5 border-red-500/40 bg-red-500/15 text-xs text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Baja a Merma</span>
                      </Button>
                    )}
                    {operable && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => onToggleCuarentena(lote)}
                        className="min-h-[44px] flex-1 gap-1.5 text-xs"
                      >
                        {lote.estado === 'cuarentena' ? (
                          <>
                            <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Liberar</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Cuarentena</span>
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onVerKardexInsumo(lote.insumoId)}
                      className="min-h-[44px] gap-1.5 text-xs text-gold-400"
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Kardex</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
