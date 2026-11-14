import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Save,
  Search,
} from 'lucide-react';
import type {
  Insumo,
  ItemIngenieriaMenu,
  MovimientoKardex,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';
import { construirMapaCostosInsumos } from '@/utils/ingenieriaMenuUtils';

export interface CostosInsumosTabProps {
  insumos: Insumo[];
  movimientosKardex: MovimientoKardex[];
  items: ItemIngenieriaMenu[];
  onGuardarCostoInsumo: (insumoId: string, costoUnitarioCOP: number) => Promise<void>;
}

type FiltroEstadoInsumo = 'todos' | 'sin_costo_receta' | 'sin_costo' | 'kardex';

interface InsumoRowData {
  insumo: Insumo;
  costoEfectivoCOP: number;
  fuente: 'kardex' | 'insumo' | 'sin_costo';
  recetasUsan: number;
  nombresPlatos: string[];
}

export function CostosInsumosTab({
  insumos,
  movimientosKardex,
  items,
  onGuardarCostoInsumo,
}: CostosInsumosTabProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoInsumo>('todos');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  const costosMap = useMemo(
    () => construirMapaCostosInsumos(insumos, movimientosKardex),
    [insumos, movimientosKardex]
  );

  // Mapa de qué platos/combos usan cada insumo en su escandallo
  const usoPorInsumo = useMemo(() => {
    const mapa = new Map<string, { count: number; nombres: string[] }>();
    for (const item of items) {
      const vistos = new Set<string>();
      for (const ing of item.desgloseIngredientes) {
        if (ing.insumoId.startsWith('prod-ref:') || vistos.has(ing.insumoId)) continue;
        vistos.add(ing.insumoId);
        const actual = mapa.get(ing.insumoId) || { count: 0, nombres: [] };
        actual.count += 1;
        if (actual.nombres.length < 3) {
          actual.nombres.push(item.nombre);
        }
        mapa.set(ing.insumoId, actual);
      }
    }
    return mapa;
  }, [items]);

  const filas = useMemo<InsumoRowData[]>(() => {
    const lista: InsumoRowData[] = insumos.map((ins) => {
      const info = costosMap.get(ins.id);
      const uso = usoPorInsumo.get(ins.id);
      return {
        insumo: ins,
        costoEfectivoCOP: info?.costoUnitario ?? 0,
        fuente: info?.fuente ?? 'sin_costo',
        recetasUsan: uso?.count ?? 0,
        nombresPlatos: uso?.nombres ?? [],
      };
    });

    // Priorizar insumos sin costo que ya están en recetas, luego sin costo, luego el resto alfabéticamente
    return lista.sort((a, b) => {
      const score = (row: InsumoRowData): number => {
        if (row.fuente === 'sin_costo' && row.recetasUsan > 0) return 0;
        if (row.fuente === 'sin_costo') return 1;
        if (row.recetasUsan > 0) return 2;
        return 3;
      };
      const diff = score(a) - score(b);
      if (diff !== 0) return diff;
      return a.insumo.nombre.localeCompare(b.insumo.nombre, 'es-CO');
    });
  }, [insumos, costosMap, usoPorInsumo]);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    for (const ins of insumos) {
      nextDrafts[ins.id] =
        typeof ins.costoUnitario === 'number' && ins.costoUnitario > 0
          ? String(Math.round(ins.costoUnitario))
          : '';
    }
    setDrafts(nextDrafts);
  }, [insumos]);

  const stats = useMemo(() => {
    let sinCostoReceta = 0;
    let sinCostoTotal = 0;
    let conKardex = 0;
    for (const fila of filas) {
      if (fila.fuente === 'sin_costo') {
        sinCostoTotal += 1;
        if (fila.recetasUsan > 0) sinCostoReceta += 1;
      } else if (fila.fuente === 'kardex') {
        conKardex += 1;
      }
    }
    return { sinCostoReceta, sinCostoTotal, conKardex };
  }, [filas]);

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((row) => {
      if (filtroEstado === 'sin_costo_receta') {
        if (!(row.fuente === 'sin_costo' && row.recetasUsan > 0)) return false;
      } else if (filtroEstado === 'sin_costo') {
        if (row.fuente !== 'sin_costo') return false;
      } else if (filtroEstado === 'kardex') {
        if (row.fuente !== 'kardex') return false;
      }

      if (!q) return true;
      return (
        row.insumo.nombre.toLowerCase().includes(q) ||
        (row.insumo.proveedor || '').toLowerCase().includes(q) ||
        row.insumo.unidad.toLowerCase().includes(q)
      );
    });
  }, [filas, filtroEstado, busqueda]);

  const handleGuardar = async (row: InsumoRowData) => {
    const raw = (drafts[row.insumo.id] ?? '').trim();
    const valor = Number(raw);
    if (!raw || !Number.isFinite(valor) || valor < 0) {
      createToast({
        title: `Ingresa un costo válido en COP para ${row.insumo.nombre}`,
        type: 'error',
      });
      return;
    }

    const costoEntero = Math.round(valor);
    setGuardandoId(row.insumo.id);
    try {
      await onGuardarCostoInsumo(row.insumo.id, costoEntero);
      createToast({
        title: `Costo de ${row.insumo.nombre} actualizado a ${formatCOP(costoEntero)}/${row.insumo.unidad}`,
        type: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error guardando el costo';
      createToast({
        title: `No se pudo actualizar ${row.insumo.nombre}: ${msg}`,
        type: 'error',
      });
    } finally {
      setGuardandoId(null);
    }
  };

  if (insumos.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-6">
        <EmptyState
          icon={Package}
          title="No hay insumos registrados en bodega"
          description="Crea materias primas en Inventario y Kardex para costear tus recetas y calcular el Food Cost real."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner explicativo / alerta de insumos sin costo */}
      {stats.sinCostoReceta > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <div className="flex items-start gap-2.5 text-sm text-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-amber-100">
                {stats.sinCostoReceta} {stats.sinCostoReceta === 1 ? 'insumo usado' : 'insumos usados'} en recetas con costo $0
              </p>
              <p className="text-xs text-amber-200/80">
                Fija su costo unitario por unidad de medida abajo para completar el escandallo de tus platos. Las compras futuras en Kardex lo actualizarán automáticamente.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-[44px] shrink-0"
            onClick={() => setFiltroEstado('sin_costo_receta')}
          >
            Ver pendientes ({stats.sinCostoReceta})
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>
            Todos los insumos vinculados a tus recetas tienen un costo unitario asignado (por compras en Kardex o referencia en catálogo).
          </span>
        </div>
      )}

      {/* Controles de búsqueda y filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar insumo, unidad o proveedor..."
            aria-label="Buscar insumo en control de costos"
            className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-950 pl-9 pr-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar insumos por estado de costeo">
          {(
            [
              { id: 'todos', label: `Todos (${filas.length})` },
              { id: 'sin_costo_receta', label: `Sin costo en recetas (${stats.sinCostoReceta})` },
              { id: 'sin_costo', label: `Todos sin costo (${stats.sinCostoTotal})` },
              { id: 'kardex', label: `Con Kardex (${stats.conKardex})` },
            ] as Array<{ id: FiltroEstadoInsumo; label: string }>
          ).map((f) => {
            const active = filtroEstado === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFiltroEstado(f.id)}
                className={`min-h-[44px] rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#C9A84C] bg-[#C9A84C]/20 text-[#E5C158]'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla / Tarjetas de insumos */}
      {filasFiltradas.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-8 text-center text-sm text-neutral-400">
          No hay insumos que coincidan con el filtro aplicado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/70">
          <div className="hidden md:grid md:grid-cols-12 gap-3 border-b border-neutral-800 bg-neutral-950/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            <div className="col-span-4">Insumo &amp; Recetas</div>
            <div className="col-span-2 text-right">Stock actual</div>
            <div className="col-span-2">Fuente de costo</div>
            <div className="col-span-4">Costo unitario catálogo (COP)</div>
          </div>

          <div className="divide-y divide-neutral-800/80">
            {filasFiltradas.map((row) => {
              const draft = drafts[row.insumo.id] ?? '';
              const actualCatalogo =
                typeof row.insumo.costoUnitario === 'number' && row.insumo.costoUnitario > 0
                  ? Math.round(row.insumo.costoUnitario)
                  : 0;
              const parsedDraft = Number(draft);
              const hayCambio =
                draft.trim() !== '' &&
                Number.isFinite(parsedDraft) &&
                Math.round(parsedDraft) !== actualCatalogo;
              const isSaving = guardandoId === row.insumo.id;

              return (
                <div
                  key={row.insumo.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center px-4 py-3.5 hover:bg-neutral-800/30 transition-colors"
                >
                  {/* Nombre + Uso en recetas */}
                  <div className="md:col-span-4 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white truncate">
                        {row.insumo.nombre}
                      </span>
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[11px] font-mono text-neutral-300">
                        {row.insumo.unidad}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">
                      {row.recetasUsan > 0 ? (
                        <>
                          En <strong className="text-neutral-200">{row.recetasUsan}</strong>{' '}
                          {row.recetasUsan === 1 ? 'receta' : 'recetas'}
                          {row.nombresPlatos.length > 0 && (
                            <span className="text-neutral-500">
                              {' '}
                              ({row.nombresPlatos.join(', ')}
                              {row.recetasUsan > 3 ? '…' : ''})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-neutral-500">Sin vincular a recetas aún</span>
                      )}
                    </p>
                  </div>

                  {/* Stock actual */}
                  <div className="md:col-span-2 flex md:block justify-between items-center md:text-right">
                    <span className="text-xs text-neutral-500 md:hidden">Stock actual:</span>
                    <div>
                      <span className="text-sm font-medium text-neutral-200 font-mono tabular-nums">
                        {row.insumo.stockActual} {row.insumo.unidad}
                      </span>
                      {row.insumo.proveedor && (
                        <p className="text-[11px] text-neutral-500 truncate">
                          {row.insumo.proveedor}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fuente y costo efectivo */}
                  <div className="md:col-span-2 flex md:block justify-between items-center">
                    <span className="text-xs text-neutral-500 md:hidden">Costo efectivo:</span>
                    <div>
                      {row.fuente === 'kardex' && (
                        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                          Kardex · {formatCOP(row.costoEfectivoCOP)}
                        </span>
                      )}
                      {row.fuente === 'insumo' && (
                        <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                          Catálogo · {formatCOP(row.costoEfectivoCOP)}
                        </span>
                      )}
                      {row.fuente === 'sin_costo' && (
                        <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                          Sin costo ($0)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Input + Fijar costo de catálogo */}
                  <div className="md:col-span-4 flex items-center gap-2">
                    <div className="relative flex-1">
                      <span
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500"
                        aria-hidden="true"
                      >
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={draft}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.insumo.id]: e.target.value,
                          }))
                        }
                        placeholder="0"
                        aria-label={`Costo unitario en COP por ${row.insumo.unidad} de ${row.insumo.nombre}`}
                        className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-950 pl-6 pr-12 py-2 text-sm text-white font-mono tabular-nums placeholder:text-neutral-600 focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-neutral-500">
                        /{row.insumo.unidad}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant={hayCambio ? 'primary' : 'secondary'}
                      size="sm"
                      loading={isSaving}
                      disabled={isSaving || !hayCambio}
                      onClick={() => handleGuardar(row)}
                      className="min-h-[44px] shrink-0"
                    >
                      <Save className="h-4 w-4 mr-1" aria-hidden="true" />
                      Fijar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
