import { useMemo, useState } from 'react';
import { Sparkles, Target } from 'lucide-react';
import type { CuadranteBCG, ItemIngenieriaMenu } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { METAS_CUADRANTES_BCG } from '@/utils/ingenieriaMenuUtils';

interface MatrizBCGChartProps {
  items: ItemIngenieriaMenu[];
  umbralPopularidadUnidades: number;
  umbralMargenContribucionCOP: number;
  onSelectItem: (item: ItemIngenieriaMenu) => void;
}

interface PuntoPosicion {
  item: ItemIngenieriaMenu;
  xPct: number;
  yPct: number;
  sizePx: number;
}

function clampPct(value: number, min = 6, max = 94): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(max, Math.max(min, value));
}

export function MatrizBCGChart({
  items,
  umbralPopularidadUnidades,
  umbralMargenContribucionCOP,
  onSelectItem,
}: MatrizBCGChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const itemsCosteados = useMemo(
    () => items.filter((item) => item.tieneCosteo),
    [items]
  );

  const { puntos, umbralXPct, umbralYPct, maxUnidades, minMargen, maxMargen } = useMemo(() => {
    if (itemsCosteados.length === 0) {
      return {
        puntos: [] as PuntoPosicion[],
        umbralXPct: 50,
        umbralYPct: 50,
        maxUnidades: 10,
        minMargen: 0,
        maxMargen: 10000,
      };
    }

    const maxUnd = Math.max(
      1,
      umbralPopularidadUnidades * 1.8,
      ...itemsCosteados.map((i) => i.unidadesVendidas)
    );
    const margenes = itemsCosteados.map((i) => i.margenContribucionUnitario);
    const minM = Math.min(0, umbralMargenContribucionCOP, ...margenes);
    const maxM = Math.max(1000, umbralMargenContribucionCOP * 1.6, ...margenes);
    const rangoM = Math.max(1, maxM - minM);

    const maxContrib = Math.max(
      1,
      ...itemsCosteados.map((i) => Math.max(0, i.contribucionTotalCOP))
    );

    const uXPct = clampPct((umbralPopularidadUnidades / maxUnd) * 88 + 6, 12, 88);
    const uYPct = clampPct(((umbralMargenContribucionCOP - minM) / rangoM) * 84 + 8, 15, 85);

    const mapAxis = (val: number, threshold: number, minV: number, maxV: number, uPct: number) => {
      if (val <= threshold) {
        const denom = Math.max(0.0001, threshold - minV);
        const ratio = (val - minV) / denom;
        return clampPct(6 + ratio * (uPct - 8), 5, uPct - 2);
      }
      const denom = Math.max(0.0001, maxV - threshold);
      const ratio = (val - threshold) / denom;
      return clampPct(uPct + 2 + ratio * (92 - uPct), uPct + 2, 95);
    };

    const puntosCalc: PuntoPosicion[] = itemsCosteados.map((item) => {
      const xPct =
        umbralPopularidadUnidades > 0
          ? mapAxis(item.unidadesVendidas, umbralPopularidadUnidades, 0, maxUnd, uXPct)
          : clampPct((item.unidadesVendidas / maxUnd) * 84 + 8);

      const yPct = mapAxis(
        item.margenContribucionUnitario,
        umbralMargenContribucionCOP,
        minM,
        maxM,
        uYPct
      );

      const peso = Math.max(0, item.contribucionTotalCOP) / maxContrib;
      const sizePx = Math.round(16 + peso * 18);

      return { item, xPct, yPct, sizePx };
    });

    return {
      puntos: puntosCalc,
      umbralXPct: uXPct,
      umbralYPct: uYPct,
      maxUnidades: maxUnd,
      minMargen: minM,
      maxMargen: maxM,
    };
  }, [itemsCosteados, umbralPopularidadUnidades, umbralMargenContribucionCOP]);

  const itemActivo = useMemo(
    () => puntos.find((p) => p.item.id === hoveredId)?.item || null,
    [puntos, hoveredId]
  );

  if (itemsCosteados.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 text-center">
        <Target className="mx-auto h-10 w-10 text-amber-400/70" aria-hidden="true" />
        <h3 className="mt-3 font-display text-lg font-bold text-white">
          Matriz BCG esperando escandallos o costos de referencia
        </h3>
        <p className="mx-auto mt-1.5 max-w-lg text-xs text-neutral-400">
          Asigna costos unitarios a tus insumos en bodega o define un costo directo de referencia
          en tus platos para graficar los 4 cuadrantes de rentabilidad y popularidad.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" aria-hidden="true" />
            Matriz BCG Gastronómica (Popularidad vs Margen)
          </h2>
          <p className="text-xs text-neutral-400">
            Haz clic en cualquier burbuja para abrir el Simulador de Precios y ver el desglose de receta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {(['estrella', 'caballo_batalla', 'rompecabezas', 'perro'] as CuadranteBCG[]).map(
            (key) => {
              const meta = METAS_CUADRANTES_BCG[key];
              return (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold ${meta.badgeClasses}`}
                >
                  <span aria-hidden="true">{meta.emoji}</span>
                  <span>{meta.tituloCorto}</span>
                </span>
              );
            }
          )}
        </div>
      </div>

      {/* Lienzo de 4 Cuadrantes */}
      <div className="relative h-[360px] sm:h-[420px] w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50">
        {/* Fondo de los 4 cuadrantes alineados a los umbrales */}
        {/* Superior Izquierda: Rompecabezas */}
        <div
          className="absolute top-0 left-0 bg-purple-500/[0.06] border-r border-b border-dashed border-neutral-700/80 pointer-events-none"
          style={{ width: `${umbralXPct}%`, height: `${100 - umbralYPct}%` }}
        >
          <span className="inline-block m-2 rounded-md bg-purple-950/80 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
            🧩 Rompecabezas (Alto margen · Baja venta)
          </span>
        </div>

        {/* Superior Derecha: Estrella */}
        <div
          className="absolute top-0 right-0 bg-amber-500/[0.07] border-b border-dashed border-neutral-700/80 pointer-events-none text-right"
          style={{ width: `${100 - umbralXPct}%`, height: `${100 - umbralYPct}%` }}
        >
          <span className="inline-block m-2 rounded-md bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            ⭐ Estrellas (Alto margen · Alta venta)
          </span>
        </div>

        {/* Inferior Izquierda: Perro */}
        <div
          className="absolute bottom-0 left-0 bg-red-500/[0.05] border-r border-dashed border-neutral-700/80 pointer-events-none flex items-end"
          style={{ width: `${umbralXPct}%`, height: `${umbralYPct}%` }}
        >
          <span className="inline-block m-2 rounded-md bg-red-950/80 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-300">
            🐕 Perros (Bajo margen · Baja venta)
          </span>
        </div>

        {/* Inferior Derecha: Caballo de Batalla */}
        <div
          className="absolute bottom-0 right-0 bg-sky-500/[0.06] pointer-events-none flex items-end justify-end"
          style={{ width: `${100 - umbralXPct}%`, height: `${umbralYPct}%` }}
        >
          <span className="inline-block m-2 rounded-md bg-sky-950/80 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-300">
            🐴 Caballos (Bajo margen · Alta venta)
          </span>
        </div>

        {/* Etiquetas de líneas de corte */}
        <div
          className="absolute top-2 -translate-x-1/2 rounded bg-neutral-950/90 border border-neutral-700 px-1.5 py-0.5 text-[10px] font-mono text-neutral-300 pointer-events-none z-10"
          style={{ left: `${umbralXPct}%` }}
        >
          Pop ≥ {umbralPopularidadUnidades.toFixed(1)} u
        </div>
        <div
          className="absolute right-2 translate-y-1/2 rounded bg-neutral-950/90 border border-neutral-700 px-1.5 py-0.5 text-[10px] font-mono text-neutral-300 pointer-events-none z-10"
          style={{ bottom: `${umbralYPct}%` }}
        >
          Margen ≥ {formatCOP(umbralMargenContribucionCOP)}
        </div>

        {/* Burbujas interactivas de cada producto/combo */}
        {puntos.map(({ item, xPct, yPct, sizePx }) => {
          const meta = METAS_CUADRANTES_BCG[item.cuadrante];
          const isActive = hoveredId === item.id;

          return (
            <button
              key={`${item.tipo}-${item.id}`}
              type="button"
              onClick={() => onSelectItem(item)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId((prev) => (prev === item.id ? null : prev))}
              onFocus={() => setHoveredId(item.id)}
              onBlur={() => setHoveredId((prev) => (prev === item.id ? null : prev))}
              aria-label={`Simular ${item.nombre}: ${meta.titulo}, ${item.unidadesVendidas} vendidas, margen ${formatCOP(item.margenContribucionUnitario)}, food cost ${item.foodCostPct}%`}
              className="group absolute -translate-x-1/2 translate-y-1/2 flex items-center justify-center rounded-full min-h-[36px] min-w-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 z-20"
              style={{
                left: `${xPct}%`,
                bottom: `${yPct}%`,
              }}
            >
              <span
                className={`block rounded-full border-2 border-white/80 shadow-lg transition-transform ${
                  isActive ? 'scale-125 ring-4 ring-white/25' : 'group-hover:scale-110'
                }`}
                style={{
                  width: `${sizePx}px`,
                  height: `${sizePx}px`,
                  backgroundColor: meta.hexColor,
                }}
              />
              <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-950/85 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-200 border border-neutral-800 opacity-90 group-hover:opacity-100 max-w-[110px] truncate">
                {item.nombre}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pie de inspección en vivo o guía de ejes */}
      <div className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900/70 px-3.5 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
        {itemActivo ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                  METAS_CUADRANTES_BCG[itemActivo.cuadrante].badgeClasses
                }`}
              >
                {METAS_CUADRANTES_BCG[itemActivo.cuadrante].emoji}{' '}
                {METAS_CUADRANTES_BCG[itemActivo.cuadrante].tituloCorto}
              </span>
              <strong className="text-white">{itemActivo.nombre}</strong>
              <span className="text-neutral-400">
                Precio: <strong className="text-amber-300">{formatCOP(itemActivo.precioVenta)}</strong>
              </span>
              <span className="text-neutral-400">
                Costo: <strong className="text-neutral-200">{formatCOP(itemActivo.costoUnitarioCOP)}</strong>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span className="text-emerald-400 font-bold">
                Margen: {formatCOP(itemActivo.margenContribucionUnitario)}
              </span>
              <span className="text-sky-300 font-bold">
                {itemActivo.unidadesVendidas} vendidas ({itemActivo.menuMixPct}%)
              </span>
              <span className="text-neutral-400">FC: {itemActivo.foodCostPct}%</span>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 w-full text-[11px] text-neutral-400">
            <span>
              Eje Horizontal (X): <strong className="text-neutral-200">Popularidad (0 – {Math.round(maxUnidades)} unds)</strong>
            </span>
            <span>
              Eje Vertical (Y): <strong className="text-neutral-200">Margen Contribución ({formatCOP(minMargen)} – {formatCOP(maxMargen)})</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
