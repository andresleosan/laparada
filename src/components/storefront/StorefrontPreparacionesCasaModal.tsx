import { useEffect, useId, useMemo, useState } from 'react';
import {
  Check,
  ChefHat,
  Clock,
  Flame,
  Layers,
  ShieldCheck,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { createToast } from '@/components/ui/Toast';
import type { CategoriaSubReceta } from '@/types';
import {
  CATEGORIAS_SUB_RECETA,
  CATEGORIAS_SUB_RECETA_MAP,
  PLANTILLAS_SUB_RECETAS_LA_PARADA,
} from '@/utils/produccionCocinaUtils';

export interface StorefrontPreparacionesCasaModalProps {
  isOpen: boolean;
  onClose: () => void;
  negocioNombre: string;
  notasActuales: string;
  salsasIniciales?: string[];
  onAplicarSalsasAPedido: (nuevasNotas: string, salsasSeleccionadas: string[]) => void;
}

export const SALSAS_ARTESANALES_CORTESIA = [
  {
    id: 'salsa-ajo',
    nombre: 'Salsa de Ajo de la Casa',
    descripcion: 'Cremosa con cilantro fresco y toque cítrico',
  },
  {
    id: 'salsa-tartara',
    nombre: 'Salsa Tártara Artesanal',
    descripcion: 'Con pepinillos y hierbas finas de la casa',
  },
  {
    id: 'salsa-pina',
    nombre: 'Salsa de Piña Dulce',
    descripcion: 'Reducción caramelizada ideal para tequeños y fritos',
  },
  {
    id: 'salsa-picante',
    nombre: 'Picante Artesanal de la Casa',
    descripcion: 'Ají fresco macerado en lotes diarios',
  },
] as const;

export const MAX_SALSAS_CORTESIA = 3;
const PREFIJO_SALSAS_NOTA = 'Salsas de la casa:';

export function combinarNotasConSalsasCasa(
  notasActuales: string,
  salsasSeleccionadas: string[]
): string {
  const segmentosPreservados = (notasActuales || '')
    .split(/\r?\n|\s*\|\s*/)
    .map((segmento) => segmento.trim())
    .filter((segmento) => segmento.length > 0 && !segmento.startsWith(PREFIJO_SALSAS_NOTA));

  if (salsasSeleccionadas.length > 0) {
    segmentosPreservados.push(`${PREFIJO_SALSAS_NOTA} ${salsasSeleccionadas.join(', ')}`);
  }

  return segmentosPreservados.join(' | ');
}

function extraerSalsasDesdeNotas(notas: string): string[] {
  const segmentoSalsas = (notas || '')
    .split(/\r?\n|\s*\|\s*/)
    .map((l) => l.trim())
    .find((l) => l.startsWith(PREFIJO_SALSAS_NOTA));

  if (!segmentoSalsas) return [];

  const nombresPermitidos = new Set<string>(
    SALSAS_ARTESANALES_CORTESIA.map((s) => s.nombre)
  );
  return segmentoSalsas
    .slice(PREFIJO_SALSAS_NOTA.length)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => nombresPermitidos.has(s))
    .slice(0, MAX_SALSAS_CORTESIA);
}

export function StorefrontPreparacionesCasaModal({
  isOpen,
  onClose,
  negocioNombre,
  notasActuales,
  salsasIniciales,
  onAplicarSalsasAPedido,
}: StorefrontPreparacionesCasaModalProps) {
  const generatedId = useId();
  const titleId = `storefront-preparaciones-${generatedId.replace(/:/g, '')}-title`;

  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaSubReceta | 'todas'>('todas');
  const [salsasSeleccionadas, setSalsasSeleccionadas] = useState<string[]>(() =>
    salsasIniciales && salsasIniciales.length > 0
      ? salsasIniciales.slice(0, MAX_SALSAS_CORTESIA)
      : extraerSalsasDesdeNotas(notasActuales)
  );

  useEffect(() => {
    if (!isOpen) return;
    setCategoriaFiltro('todas');
    setSalsasSeleccionadas(
      salsasIniciales && salsasIniciales.length > 0
        ? salsasIniciales.slice(0, MAX_SALSAS_CORTESIA)
        : extraerSalsasDesdeNotas(notasActuales)
    );
  }, [isOpen, notasActuales, salsasIniciales]);

  const categoriasDisponibles = useMemo(
    () =>
      CATEGORIAS_SUB_RECETA.filter((cat) =>
        PLANTILLAS_SUB_RECETAS_LA_PARADA.some((p) => p.categoriaSubReceta === cat.id)
      ),
    []
  );

  const preparacionesFiltradas = useMemo(() => {
    if (categoriaFiltro === 'todas') return PLANTILLAS_SUB_RECETAS_LA_PARADA;
    return PLANTILLAS_SUB_RECETAS_LA_PARADA.filter(
      (p) => p.categoriaSubReceta === categoriaFiltro
    );
  }, [categoriaFiltro]);

  if (!isOpen) return null;

  const toggleSalsa = (nombreSalsa: string) => {
    setSalsasSeleccionadas((prev) => {
      if (prev.includes(nombreSalsa)) {
        return prev.filter((item) => item !== nombreSalsa);
      }
      if (prev.length >= MAX_SALSAS_CORTESIA) {
        createToast(
          `Puedes elegir máximo ${MAX_SALSAS_CORTESIA} salsas artesanales de cortesía.`,
          'info'
        );
        return prev;
      }
      return [...prev, nombreSalsa];
    });
  };

  const handleConfirmar = () => {
    const nuevasNotas = combinarNotasConSalsasCasa(notasActuales, salsasSeleccionadas);
    onAplicarSalsasAPedido(nuevasNotas, salsasSeleccionadas);
    if (salsasSeleccionadas.length > 0) {
      createToast(
        `🥣 ${salsasSeleccionadas.length} ${salsasSeleccionadas.length === 1 ? 'salsa artesanal incluida' : 'salsas artesanales incluidas'} en tu pedido`,
        'success'
      );
    } else {
      createToast('Preferencia de salsas actualizada en tu pedido', 'info');
    }
    onClose();
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-2xl sm:p-6">
        {/* Cabecera */}
        <header className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              Cocina Abierta · Lotes del Día
            </span>
            <h2
              id={titleId}
              className="mt-1.5 font-display text-xl font-black text-white sm:text-2xl"
            >
              Preparaciones de la Casa &amp; Salsas Artesanales
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">
              En <strong className="text-neutral-200">{negocioNombre}</strong> preparamos nuestras
              bases y salsas por lotes frescos con trazabilidad diaria. Explora nuestras recetas y
              elige hasta {MAX_SALSAS_CORTESIA} salsas sin costo adicional.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar preparaciones de la casa"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Cuerpo scrollable */}
        <div className="my-4 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
          {/* Filtro por categoría */}
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtrar preparaciones de la casa por categoría"
          >
            <button
              type="button"
              aria-pressed={categoriaFiltro === 'todas'}
              onClick={() => setCategoriaFiltro('todas')}
              className={`min-h-[44px] rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                categoriaFiltro === 'todas'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700 hover:text-white'
              }`}
            >
              Todas ({PLANTILLAS_SUB_RECETAS_LA_PARADA.length})
            </button>

            {categoriasDisponibles.map((cat) => {
              const activa = categoriaFiltro === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => setCategoriaFiltro(cat.id)}
                  className={`min-h-[44px] rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    activa
                      ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                      : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              );
            })}
          </div>

          {/* Grid de Preparaciones Base */}
          <div
            data-testid="storefront-preparaciones-grid"
            className="grid grid-cols-1 gap-3.5 sm:grid-cols-2"
          >
            {preparacionesFiltradas.map((prep) => {
              const infoCat = CATEGORIAS_SUB_RECETA_MAP[prep.categoriaSubReceta];
              return (
                <article
                  key={prep.id}
                  className="flex flex-col justify-between space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/75 p-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                        <span>{infoCat?.emoji || '🍳'}</span>
                        <span>{infoCat?.label || 'Preparación Base'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                        Frescura {prep.vidaUtilHoras}h
                      </span>
                    </div>

                    <h3 className="font-display text-base font-black text-white">
                      {prep.nombre}
                    </h3>

                    <p className="text-xs leading-relaxed text-neutral-300">
                      {prep.instruccionesPreparacion}
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-neutral-800 pt-2.5">
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-neutral-300">
                      <span className="inline-flex items-center gap-1 text-amber-300">
                        <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                        Lote de {prep.rendimientoLote} {prep.unidad}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sky-300">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Cocción {prep.tiempoPreparacionMin} min
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {prep.ingredientesSugeridos.map((ing) => (
                        <span
                          key={ing.nombreSugerido}
                          className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] font-medium text-neutral-400"
                        >
                          {ing.nombreSugerido}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Selector de Salsas Artesanales */}
          <section className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-950/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <h3 className="font-display text-sm font-black text-white sm:text-base">
                  Elige tus Salsas Artesanales de Cortesía
                </h3>
              </div>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                {salsasSeleccionadas.length} / {MAX_SALSAS_CORTESIA} seleccionadas
              </span>
            </div>

            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              role="group"
              aria-label="Seleccionar salsas de la casa para tu pedido"
            >
              {SALSAS_ARTESANALES_CORTESIA.map((salsa) => {
                const seleccionada = salsasSeleccionadas.includes(salsa.nombre);
                return (
                  <button
                    key={salsa.id}
                    type="button"
                    aria-pressed={seleccionada}
                    onClick={() => toggleSalsa(salsa.nombre)}
                    className={`flex min-h-[44px] items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      seleccionada
                        ? 'border-amber-400 bg-amber-500/20 text-white shadow-sm'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-white">
                        {salsa.nombre}
                      </span>
                      <span className="block text-[11px] text-neutral-400">
                        {salsa.descripcion}
                      </span>
                    </div>
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${
                        seleccionada
                          ? 'border-amber-400 bg-amber-400 text-neutral-950'
                          : 'border-neutral-700 bg-neutral-900 text-transparent'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Pie de acciones */}
        <footer className="flex flex-col-reverse gap-2 border-t border-neutral-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <ChefHat className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            <span>Se agregan automáticamente a las instrucciones de tu entrega.</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-xs font-bold text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
            >
              Cerrar
            </button>
            <button
              type="button"
              data-testid="btn-aplicar-salsas-pedido"
              onClick={handleConfirmar}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-xs font-black text-neutral-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 active:scale-95"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Incluir Salsas en mi Pedido</span>
            </button>
          </div>
        </footer>
      </div>
    </StorefrontDialog>
  );
}

export default StorefrontPreparacionesCasaModal;
