import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChefHat,
  Clock,
  Edit3,
  Flame,
  History,
  Layers,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import type { CategoriaSubReceta, Insumo, MovimientoKardex } from '@/types';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import { formatCOP } from '@/utils/formatCOP';
import {
  calculateInventoryStockPercentage,
  isInventoryLowStock,
} from '@/utils/inventoryStock';
import {
  CATEGORIAS_SUB_RECETA,
  CATEGORIAS_SUB_RECETA_MAP,
  calcularMetricasProduccionCocina,
  filtrarSubRecetas,
  reconstruirHistorialLotesProduccion,
  simularProduccionLoteSubReceta,
} from '@/utils/produccionCocinaUtils';

export interface ProduccionCocinaViewProps {
  insumos: Insumo[];
  movimientosKardex: MovimientoKardex[];
  onAbrirNuevaSubReceta: () => void;
  onEditarSubReceta: (subReceta: Insumo) => void;
  onAbrirProducirLote: (subReceta: Insumo) => void;
  onVerKardexSubReceta: (subReceta: Insumo) => void;
  onEliminarSubReceta?: (subReceta: Insumo) => void;
}

export function ProduccionCocinaView({
  insumos,
  movimientosKardex,
  onAbrirNuevaSubReceta,
  onEditarSubReceta,
  onAbrirProducirLote,
  onVerKardexSubReceta,
  onEliminarSubReceta,
}: ProduccionCocinaViewProps) {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaSubReceta | 'todas'>('todas');

  const subRecetas = useMemo(() => filtrarSubRecetas(insumos), [insumos]);

  const metricas = useMemo(
    () => calcularMetricasProduccionCocina(insumos, movimientosKardex),
    [insumos, movimientosKardex]
  );

  const historialLotes = useMemo(
    () => reconstruirHistorialLotesProduccion(movimientosKardex),
    [movimientosKardex]
  );

  const subRecetasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return subRecetas.filter((sub) => {
      if (
        categoriaFiltro !== 'todas' &&
        (sub.categoriaSubReceta || 'otro') !== categoriaFiltro
      ) {
        return false;
      }
      if (q) {
        const matchNombre = sub.nombre.toLowerCase().includes(q);
        const matchIng = (sub.recetaInsumos || []).some((ing) =>
          ing.nombreSnapshot.toLowerCase().includes(q)
        );
        if (!matchNombre && !matchIng) return false;
      }
      return true;
    });
  }, [subRecetas, categoriaFiltro, busqueda]);

  return (
    <div className="space-y-6">
      {/* 4 KPIs de Producción en Cocina */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 bg-neutral-900 border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Preparaciones Base</span>
            <div className="mt-1 font-display text-2xl font-bold text-white">
              {metricas.totalSubRecetas}
            </div>
            <p className="mt-0.5 text-[11px] text-amber-300 truncate">
              {metricas.subRecetasConStockBajo} en alerta mínima
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#C9A84C]/15 text-[#E5C158]">
            <ChefHat className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Listas para Producir</span>
            <div className="mt-1 font-display text-2xl font-bold text-emerald-400">
              {metricas.subRecetasListasParaProducir}
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-400 truncate">
              {metricas.subRecetasBloqueadasPorFaltaInsumo} con déficit de materia prima
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Lotes Producidos</span>
            <div className="mt-1 font-display text-2xl font-bold text-sky-400">
              {metricas.lotesProducidosPeriodo}
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-400 truncate">
              {metricas.lotesProducidosHoy} producidos hoy
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-400">
            <Flame className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Stock Preparados</span>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-gold-400 truncate">
              {formatCOP(metricas.valorInventarioPreparadosCOP)}
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-400 truncate">
              Invertido en lotes: {formatCOP(metricas.costoTotalProducidoPeriodoCOP)}
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>
      </div>

      {/* Filtros y CTA Nueva Sub-Receta */}
      <Card className="p-4 bg-neutral-900 border-neutral-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              placeholder="Buscar sub-receta o ingrediente primario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={onAbrirNuevaSubReceta}
            className="min-h-[44px] font-bold shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nueva Sub-Receta</span>
          </Button>
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-800"
          role="group"
          aria-label="Filtrar sub-recetas por categoría"
        >
          <button
            type="button"
            aria-pressed={categoriaFiltro === 'todas'}
            onClick={() => setCategoriaFiltro('todas')}
            className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              categoriaFiltro === 'todas'
                ? 'bg-gold-400 text-neutral-950'
                : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            Todas ({subRecetas.length})
          </button>

          {CATEGORIAS_SUB_RECETA.map((cat) => {
            const count = subRecetas.filter(
              (s) => (s.categoriaSubReceta || 'otro') === cat.id
            ).length;
            if (count === 0) return null;
            const activo = categoriaFiltro === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={activo}
                onClick={() => setCategoriaFiltro(cat.id)}
                className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activo
                    ? 'bg-gold-400 text-neutral-950'
                    : 'bg-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                {cat.emoji} {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </Card>

      {/* Catálogo de Sub-Recetas */}
      {subRecetas.length === 0 ? (
        <Card className="p-8 bg-neutral-900 border-neutral-800">
          <EmptyState
            icon={ChefHat}
            title="Aún no tienes preparaciones base configuradas"
            description="Crea tus salsas de la casa, carnes marinadas o masas artesanales para convertir insumos primarios en lotes listos para vender en POS."
            action={{
              label: 'Crear Primera Sub-Receta',
              onClick: onAbrirNuevaSubReceta,
            }}
          />
        </Card>
      ) : subRecetasFiltradas.length === 0 ? (
        <Card className="p-8 bg-neutral-900 border-neutral-800">
          <EmptyState
            icon={Search}
            title="Sin coincidencias"
            description="No encontramos preparaciones base para ese filtro."
            action={{
              label: 'Limpiar filtro',
              onClick: () => {
                setBusqueda('');
                setCategoriaFiltro('todas');
              },
            }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subRecetasFiltradas.map((sub) => {
            const catMeta = CATEGORIAS_SUB_RECETA_MAP[sub.categoriaSubReceta || 'otro'];
            const isLow = isInventoryLowStock(sub);
            const pctStock = calculateInventoryStockPercentage(sub);
            const sim = simularProduccionLoteSubReceta({
              subReceta: sub,
              insumos,
              movimientosKardex,
              multiplicadorLotes: 1,
            });

            return (
              <Card
                key={sub.id}
                className="p-4 bg-neutral-900 border-neutral-800 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#C9A84C]/35 bg-[#C9A84C]/10 px-2 py-0.5 text-[10px] font-bold text-[#E5C158] mb-1.5">
                        <span aria-hidden="true">{catMeta.emoji}</span>
                        <span>{catMeta.label}</span>
                      </span>
                      <h3 className="font-display text-base font-bold text-white leading-snug">
                        {sub.nombre}
                      </h3>
                    </div>

                    {isLow ? (
                      <Badge
                        variant="outline"
                        className="border-red-500/50 text-red-400 bg-red-500/10 shrink-0"
                      >
                        <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" /> Bajo stock
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 shrink-0"
                      >
                        Disponible
                      </Badge>
                    )}
                  </div>

                  {/* Stock y Lote Estándar */}
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-400">Preparado en bodega:</span>
                      <span
                        className={`font-display font-bold ${isLow ? 'text-red-400' : 'text-white'}`}
                      >
                        {sub.stockActual || 0} {sub.unidad}
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                      <div
                        className={`h-full transition-all ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(pctStock, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>
                        Lote estándar: <strong className="text-neutral-200">{sub.rendimientoLote || 1} {sub.unidad}</strong>
                      </span>
                      <span>
                        Mínimo: <strong className="text-neutral-200">{sub.stockMinimo} {sub.unidad}</strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-800/80">
                      <span className="text-neutral-400">
                        Lotes posibles hoy:{' '}
                        <strong
                          className={
                            sim.lotesMaximosPosibles >= 1
                              ? 'text-emerald-400'
                              : sim.lotesMaximosPosibles > 0
                                ? 'text-amber-300'
                                : 'text-red-400'
                          }
                        >
                          {sim.lotesMaximosPosibles}x
                        </strong>
                      </span>
                      {(sim.costoUnitarioResultanteCOP > 0 || (sub.costoUnitario ?? 0) > 0) && (
                        <span className="font-mono font-semibold text-[#E5C158]">
                          {formatCOP(
                            sim.costoUnitarioResultanteCOP > 0
                              ? sim.costoUnitarioResultanteCOP
                              : sub.costoUnitario || 0
                          )}{' '}
                          / {sub.unidad}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ingredientes base */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      Fórmula ({sub.recetaInsumos?.length || 0} insumos primarios):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(sub.recetaInsumos || []).map((ing) => (
                        <span
                          key={ing.insumoId}
                          className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[11px] text-neutral-300"
                        >
                          {ing.nombreSnapshot}: <strong className="text-white">{ing.cantidad}</strong>{' '}
                          {ing.unidadSnapshot || ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  {(sub.tiempoPreparacionMin || sub.vidaUtilHoras) && (
                    <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                      {sub.tiempoPreparacionMin && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-neutral-500" aria-hidden="true" />
                          {sub.tiempoPreparacionMin} min prep.
                        </span>
                      )}
                      {sub.vidaUtilHoras && (
                        <span>Vida útil: {sub.vidaUtilHoras} h</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => onAbrirProducirLote(sub)}
                    className="min-h-[44px] flex-1 font-bold"
                  >
                    <Flame className="h-4 w-4" aria-hidden="true" />
                    <span>Producir Lote</span>
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onEditarSubReceta(sub)}
                      aria-label={`Editar sub-receta ${sub.nombre}`}
                      title="Editar fórmula"
                      className="min-h-[44px] min-w-[44px] px-2.5"
                    >
                      <Edit3 className="h-4 w-4" aria-hidden="true" />
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onVerKardexSubReceta(sub)}
                      aria-label={`Ver Kardex de ${sub.nombre}`}
                      title="Ver movimientos en Kardex"
                      className="min-h-[44px] min-w-[44px] px-2.5 text-gold-400"
                    >
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                    </Button>

                    {onEliminarSubReceta && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => onEliminarSubReceta(sub)}
                        aria-label={`Eliminar sub-receta ${sub.nombre}`}
                        title="Eliminar sub-receta"
                        className="min-h-[44px] min-w-[44px] px-2.5"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Historial de Lotes Producidos */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[#C9A84C]" aria-hidden="true" />
          <h3 className="font-display text-lg font-bold text-white">
            Historial de Lotes Producidos ({historialLotes.length})
          </h3>
        </div>

        {historialLotes.length === 0 ? (
          <Card className="p-6 bg-neutral-900 border-neutral-800 text-center text-xs text-neutral-400">
            Aún no se han producido lotes en cocina. Usa <strong>&ldquo;Producir Lote&rdquo;</strong>{' '}
            en cualquier preparación base para convertir materias primas en stock listo.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {historialLotes.slice(0, 12).map((lote) => {
              const date = toValidAdminDate(lote.fecha) || new Date();
              const fechaStr = date.toLocaleDateString('es-CO');
              const horaStr = date.toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Card
                  key={lote.loteProduccionId}
                  className="p-4 bg-neutral-900 border-neutral-800 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                          #{lote.loteProduccionId.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {fechaStr} · {horaStr}
                        </span>
                      </div>
                      <h4 className="mt-1 font-semibold text-white text-sm">
                        {lote.subRecetaNombre}
                      </h4>
                    </div>

                    <div className="text-right">
                      <div className="font-display text-sm font-bold text-emerald-400">
                        +{lote.cantidadProducida} {lote.unidadSalida}
                      </div>
                      {lote.costoTotalLoteCOP > 0 && (
                        <div className="text-[11px] font-mono text-[#E5C158]">
                          {formatCOP(lote.costoTotalLoteCOP)} ({formatCOP(lote.costoUnitarioCOP)}/
                          {lote.unidadSalida})
                        </div>
                      )}
                    </div>
                  </div>

                  {lote.insumosConsumidos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-neutral-800/80">
                      {lote.insumosConsumidos.map((cons) => (
                        <span
                          key={`${lote.loteProduccionId}-${cons.insumoId}`}
                          className="rounded bg-neutral-950 border border-neutral-800 px-2 py-0.5 text-[11px] text-neutral-300"
                        >
                          -{cons.cantidad} {cons.unidadMedida} {cons.insumoNombre}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Responsable: {lote.responsable}</span>
                    {lote.notas && <span className="truncate max-w-[200px]">{lote.notas}</span>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
