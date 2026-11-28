import { Flame, Plus, Sparkles } from 'lucide-react';
import { formatCOP } from '@/utils/formatCOP';
import type { Combo, EvaluacionControl86, Producto, TipoItemCatalogo86 } from '@/types';
import { evaluarDisponibilidadItem86 } from '@/utils/control86Utils';

export interface EspecialBannerEntrada {
  tipo: TipoItemCatalogo86;
  item: Producto | Combo;
  evaluacion: EvaluacionControl86;
}

interface EspecialesDelDiaBannerProps {
  productos: Producto[];
  combos: Combo[];
  ahora?: Date;
  onSeleccionarItem?: (tipo: TipoItemCatalogo86, item: Producto | Combo) => void;
  compacto?: boolean;
  titulo?: string;
}

export function EspecialesDelDiaBanner({
  productos,
  combos,
  ahora,
  onSeleccionarItem,
  compacto = false,
  titulo = 'Especiales de Hoy en Cocina',
}: EspecialesDelDiaBannerProps) {
  const especiales: EspecialBannerEntrada[] = [
    ...combos.map((c) => ({
      tipo: 'combo' as const,
      item: c,
      evaluacion: evaluarDisponibilidadItem86(c, ahora),
    })),
    ...productos.map((p) => ({
      tipo: 'producto' as const,
      item: p,
      evaluacion: evaluarDisponibilidadItem86(p, ahora),
    })),
  ]
    .filter(
      (entry) =>
        entry.evaluacion.especial.esEspecialVigente &&
        entry.evaluacion.disponibleBase &&
        !entry.evaluacion.agotado86
    )
    .sort(
      (a, b) =>
        (a.item.especialDelDia?.prioridad ?? 50) -
        (b.item.especialDelDia?.prioridad ?? 50)
    );

  if (especiales.length === 0) return null;

  return (
    <section
      aria-label="Especiales del día"
      data-testid="banner-especiales-del-dia"
      className={`rounded-2xl border border-gold-400/40 bg-gradient-to-r from-[#1A1408] via-neutral-900 to-neutral-950 shadow-xl ${
        compacto ? 'p-3' : 'p-4 sm:p-5'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-gold-400/40 bg-gold-400/15 text-gold-400">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-sm sm:text-base font-black text-white">
              {titulo}
            </h2>
            <p className="text-[11px] text-neutral-400">
              Platos destacados por tiempo o cupo limitado
            </p>
          </div>
        </div>
        <span className="rounded-full border border-gold-400/40 bg-gold-400/15 px-2.5 py-0.5 text-[11px] font-black text-gold-300">
          {especiales.length} {especiales.length === 1 ? 'especial activo' : 'especiales activos'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {especiales.map(({ tipo, item, evaluacion }) => {
          const precio =
            tipo === 'combo' ? (item as Combo).precioEspecial : (item as Producto).precio;

          return (
            <div
              key={`${tipo}-${item.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950/85 p-3 transition-colors hover:border-gold-400/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center gap-1 rounded bg-gold-400/20 px-1.5 py-0.5 text-[10px] font-black text-gold-300">
                    <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                    {evaluacion.especial.etiqueta}
                  </span>
                  {evaluacion.porcionesDisponibles !== null && (
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        evaluacion.estado === 'ultimas_porciones'
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      <Flame className="h-2.5 w-2.5" aria-hidden="true" />
                      {evaluacion.porcionesDisponibles} disp.
                    </span>
                  )}
                </div>
                <p className="truncate text-sm font-bold text-white">{item.nombre}</p>
                {evaluacion.especial.mensajeSugerido && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-neutral-400">
                    {evaluacion.especial.mensajeSugerido}
                  </p>
                )}
                <p className="mt-1 font-display text-sm font-black text-gold-400">
                  {formatCOP(precio)}
                </p>
              </div>

              {onSeleccionarItem && (
                <button
                  type="button"
                  onClick={() => onSeleccionarItem(tipo, item)}
                  aria-label={`Pedir especial ${item.nombre}`}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-gold-400 px-3.5 py-2 text-xs font-black text-neutral-950 shadow-sm transition-all hover:bg-amber-300 active:scale-95"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Pedir</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
