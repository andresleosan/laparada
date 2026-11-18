import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChefHat,
  CheckCircle2,
  FileSpreadsheet,
  Flame,
  Package,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  TrendingDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import type {
  EntradaInventario,
  Insumo,
  OrigenMermaOperativa,
} from '@/types';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import { formatCOP } from '@/utils/formatCOP';
import { construirMapaCostosInsumos } from '@/utils/ingenieriaMenuUtils';
import {
  determinarTipoMovimiento,
  MOTIVOS_MERMA,
} from '@/utils/kardexInventarioUtils';
import {
  calcularAnaliticaMermasOperativas,
  descargarMermasOperativasCsv,
  ESTACIONES_COCINA_MERMA_CATALOGO,
  inferirOrigenMerma,
  obtenerInfoMotivoMerma,
  ORIGENES_MERMA_CATALOGO,
  ORIGENES_MERMA_MAP,
} from '@/utils/mermasOperativasUtils';

export interface ControlMermasViewProps {
  insumos: Insumo[];
  movimientosKardex: EntradaInventario[];
  nombreNegocio?: string;
  ventasNetasReferencia?: number;
  onAbrirRegistroMerma: (modo?: 'insumo' | 'producto_terminado') => void;
}

export function ControlMermasView({
  insumos,
  movimientosKardex,
  nombreNegocio = 'La Parada',
  ventasNetasReferencia = 0,
  onAbrirRegistroMerma,
}: ControlMermasViewProps) {
  const [busqueda, setBusqueda] = useState('');
  const [origenFiltro, setOrigenFiltro] = useState<OrigenMermaOperativa | 'todos'>('todos');
  const [motivoFiltro, setMotivoFiltro] = useState<string>('todos');

  const movimientosMerma = useMemo(
    () => movimientosKardex.filter((m) => determinarTipoMovimiento(m) === 'merma'),
    [movimientosKardex]
  );

  const analitica = useMemo(
    () =>
      calcularAnaliticaMermasOperativas({
        movimientosKardex,
        insumos,
        ventasNetas: ventasNetasReferencia,
      }),
    [movimientosKardex, insumos, ventasNetasReferencia]
  );

  const costosMap = useMemo(
    () => construirMapaCostosInsumos(insumos, movimientosKardex),
    [insumos, movimientosKardex]
  );

  const mermasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return movimientosMerma.filter((mov) => {
      const origen = inferirOrigenMerma(mov);
      if (origenFiltro !== 'todos' && origen !== origenFiltro) {
        return false;
      }

      const motivoKey = (mov.motivo || 'otro').trim().toLowerCase() || 'otro';
      if (motivoFiltro !== 'todos' && motivoKey !== motivoFiltro) {
        return false;
      }

      if (q) {
        const haystack = [
          mov.insumoNombre,
          mov.productoMermaNombre || '',
          mov.motivo || '',
          mov.notas || '',
          mov.responsable || '',
          mov.comandaMermaId || '',
          mov.proveedor || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [movimientosMerma, origenFiltro, motivoFiltro, busqueda]);

  const estiloUmbral = useMemo(() => {
    switch (analitica.estadoUmbral) {
      case 'critico':
        return {
          container: 'border-red-500/50 bg-gradient-to-r from-red-950/60 via-neutral-900 to-neutral-900',
          badge: 'border-red-500/60 bg-red-500/20 text-red-300',
          bar: 'bg-red-500',
          label: 'Umbral Crítico Superado',
          Icon: ShieldAlert,
        };
      case 'alerta':
        return {
          container: 'border-amber-500/50 bg-gradient-to-r from-amber-950/50 via-neutral-900 to-neutral-900',
          badge: 'border-amber-500/60 bg-amber-500/20 text-amber-300',
          bar: 'bg-amber-500',
          label: 'Alerta Temprana de Merma',
          Icon: AlertTriangle,
        };
      case 'preventivo':
        return {
          container: 'border-sky-500/40 bg-gradient-to-r from-sky-950/40 via-neutral-900 to-neutral-900',
          badge: 'border-sky-500/50 bg-sky-500/15 text-sky-300',
          bar: 'bg-sky-400',
          label: 'Monitoreo Preventivo',
          Icon: TrendingDown,
        };
      case 'optimo':
      default:
        return {
          container: 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900',
          badge: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
          bar: 'bg-emerald-500',
          label: 'Umbral Saludable',
          Icon: CheckCircle2,
        };
    }
  }, [analitica.estadoUmbral]);

  const porcentajeBarraUmbral = useMemo(() => {
    if (analitica.presupuestoMaximoMermaCOP <= 0) return 0;
    return Math.min(
      100,
      Math.round((analitica.totalMermasCOP / analitica.presupuestoMaximoMermaCOP) * 100)
    );
  }, [analitica.totalMermasCOP, analitica.presupuestoMaximoMermaCOP]);

  const IconUmbral = estiloUmbral.Icon;

  return (
    <div className="space-y-6">
      {/* Banner Semáforo de Umbral de Merma */}
      <Card className={`p-4 sm:p-5 border ${estiloUmbral.container} space-y-4`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${estiloUmbral.badge}`}>
              <IconUmbral className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-bold text-white">
                  Control de Mermas Operativas, Cocina y Devoluciones
                </h2>
                <Badge variant="outline" className={`border font-bold ${estiloUmbral.badge}`}>
                  {estiloUmbral.label}
                </Badge>
              </div>
              <p className="text-xs text-neutral-300">{analitica.mensajeAlertaUmbral}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                descargarMermasOperativasCsv(movimientosKardex, insumos, nombreNegocio)
              }
              disabled={movimientosMerma.length === 0}
              className="min-h-[44px] gap-2 border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Exportar Forense CSV</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => onAbrirRegistroMerma('producto_terminado')}
              className="min-h-[44px] gap-2 bg-red-500 hover:bg-red-400 text-white font-bold border-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Registrar Merma / Devolución</span>
            </Button>
          </div>
        </div>

        {/* Barra de progreso frente al presupuesto de umbral */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-300">
            <span>
              Acumulado: <strong className="text-white">{formatCOP(analitica.totalMermasCOP)}</strong>
            </span>
            <span>
              Tope referencia ({analitica.umbralMaximoPct}% meta):{' '}
              <strong className="text-gold-400">{formatCOP(analitica.presupuestoMaximoMermaCOP)}</strong>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className={`h-full transition-all ${estiloUmbral.bar}`}
              style={{ width: `${porcentajeBarraUmbral}%` }}
            />
          </div>
        </div>
      </Card>

      {/* 4 KPIs Ejecutivos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 bg-neutral-900 border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Merma Total (P&amp;L)</span>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-red-400 truncate">
              {formatCOP(analitica.totalMermasCOP)}
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-400 truncate">
              {analitica.cantidadRegistrosMerma} registros · Hoy: {formatCOP(analitica.mermasHoyCOP)}
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-400">
            <TrendingDown className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Desperdicios de Cocina</span>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-orange-400 truncate">
              {formatCOP(analitica.mermasCocinaCOP)}
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-400 truncate">
              Cocción, fritura, armado y salón
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/15 text-orange-400">
            <Flame className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Devoluciones de Cliente</span>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-rose-400 truncate">
              {formatCOP(analitica.mermasDevolucionesCOP)}
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-400 truncate">
              Comandas canceladas o devueltas
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-400">
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Merma en Bodega</span>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-amber-400 truncate">
              {formatCOP(analitica.mermasBodegaCOP)}
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-400 truncate">
              Vencimiento o daño de almacenamiento
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
            <Package className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>
      </div>

      {/* Analítica Cruzada: Top Insumos Perdidos y Distribución por Motivo */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4 bg-neutral-900 border-neutral-800 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <h3 className="font-display text-sm font-bold text-white">
              Top Insumos con Mayor Pérdida Monetaria
            </h3>
            <span className="text-[11px] text-neutral-400">Impacto P&amp;L</span>
          </div>

          {analitica.topInsumosMerma.length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-500">
              No hay insumos con pérdidas registradas aún.
            </p>
          ) : (
            <div className="space-y-2.5">
              {analitica.topInsumosMerma.slice(0, 5).map((item, idx) => (
                <div
                  key={item.insumoId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-300">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-white truncate">{item.insumoNombre}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-neutral-400 truncate">
                      -{item.cantidadTotal} {item.unidad} ({item.registrosCount} reg.) · {item.motivoPrincipal}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold text-red-400">
                      {formatCOP(item.costoTotalCOP)}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {item.porcentajeDelTotalMerma}% del total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-800 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <h3 className="font-display text-sm font-bold text-white">
              Distribución por Motivo Gastronómico
            </h3>
            <span className="text-[11px] text-neutral-400">Causa raíz</span>
          </div>

          {analitica.desglosePorMotivo.length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-500">
              Sin motivos de merma registrados en el período.
            </p>
          ) : (
            <div className="space-y-2.5">
              {analitica.desglosePorMotivo.map((mot) => (
                <div key={mot.motivo} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-200">
                      {mot.label}{' '}
                      <span className="text-neutral-500">({mot.cantidadRegistros})</span>
                    </span>
                    <span className="font-mono font-bold text-red-300">
                      {formatCOP(mot.costoTotalCOP)} ({mot.porcentajeCosto}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className="h-full bg-red-500/80"
                      style={{ width: `${Math.min(100, Math.max(4, mot.porcentajeCosto))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Filtros de Bitácora de Mermas */}
      <Card className="p-4 bg-neutral-900 border-neutral-800 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              placeholder="Buscar por insumo, producto devuelto, comanda, notas o responsable..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>

          <div className="w-full lg:w-64">
            <select
              aria-label="Filtrar mermas por motivo"
              value={motivoFiltro}
              onChange={(e) => setMotivoFiltro(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
            >
              <option value="todos">Todos los motivos</option>
              {MOTIVOS_MERMA.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-800"
          role="group"
          aria-label="Filtrar mermas por origen operativo"
        >
          <button
            type="button"
            aria-pressed={origenFiltro === 'todos'}
            onClick={() => setOrigenFiltro('todos')}
            className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              origenFiltro === 'todos'
                ? 'bg-gold-400 text-neutral-950'
                : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            Todos ({movimientosMerma.length})
          </button>
          {ORIGENES_MERMA_CATALOGO.map((orig) => {
            const activo = origenFiltro === orig.id;
            const count = movimientosMerma.filter((m) => inferirOrigenMerma(m) === orig.id).length;
            return (
              <button
                key={orig.id}
                type="button"
                aria-pressed={activo}
                onClick={() => setOrigenFiltro(orig.id)}
                className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activo
                    ? 'bg-gold-400 text-neutral-950'
                    : 'bg-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                {orig.shortLabel} ({count})
              </button>
            );
          })}
        </div>
      </Card>

      {/* Listado Forense de Mermas */}
      {mermasFiltradas.length === 0 ? (
        <Card className="p-8 bg-neutral-900 border-neutral-800">
          <EmptyState
            icon={ChefHat}
            title="Sin mermas o devoluciones registradas"
            description="Registra desperdicios de cocina, devoluciones de producto terminado o bajas de bodega para monitorear su impacto en el Estado de Resultados."
            action={{
              label: 'Registrar Primera Merma',
              onClick: () => onAbrirRegistroMerma('insumo'),
            }}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {mermasFiltradas.map((mov) => {
            const date = toValidAdminDate(mov.fecha) || new Date();
            const fechaStr = date.toLocaleDateString('es-CO');
            const horaStr = date.toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const origen = inferirOrigenMerma(mov);
            const origenInfo = ORIGENES_MERMA_MAP[origen];
            const estacionLabel =
              ESTACIONES_COCINA_MERMA_CATALOGO.find((e) => e.id === mov.estacionCocina)?.label ||
              'General';
            const motivoInfo = obtenerInfoMotivoMerma(mov.motivo || 'otro');
            const cantAbs = Math.abs(Number(mov.cantidad) || 0);
            const costoUnit =
              typeof mov.costoUnitario === 'number' && mov.costoUnitario > 0
                ? mov.costoUnitario
                : costosMap.get(mov.insumoId)?.costoUnitario ?? 0;
            const impactoCOP =
              typeof mov.costo === 'number' && mov.costo > 0
                ? Math.round(mov.costo)
                : Math.round(cantAbs * costoUnit);

            return (
              <Card
                key={mov.id}
                className="p-4 bg-neutral-900 border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`border ${origenInfo.badgeClass}`}>
                      {origenInfo.shortLabel}
                    </Badge>
                    <span className="text-xs font-semibold text-gold-400">{motivoInfo.label}</span>
                    {mov.estacionCocina && (
                      <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300">
                        {estacionLabel}
                      </span>
                    )}
                    <span className="text-[11px] text-neutral-400">
                      {fechaStr} · {horaStr}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white">
                    {mov.insumoNombre}{' '}
                    <span className="text-red-400 font-mono">
                      (-{cantAbs} {mov.unidadMedida || 'unid'})
                    </span>
                    {mov.productoMermaNombre && (
                      <span className="ml-2 text-xs font-normal text-amber-300">
                        · Por plato/combo: {mov.productoMermaNombre}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-neutral-400 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Responsable: {mov.responsable || 'Sistema'}</span>
                    {mov.notas && <span className="italic text-neutral-300">&ldquo;{mov.notas}&rdquo;</span>}
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">
                    Pérdida P&amp;L
                  </span>
                  <span className="font-display text-lg font-bold text-red-400">
                    -{formatCOP(impactoCOP)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
