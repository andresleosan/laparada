import { useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Infinity as InfinityIcon,
  MessageCircle,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { formatCOP } from '@/utils/formatCOP';
import { ESTACIONES_COCINA_META } from '@/utils/estacionesCocinaUtils';
import {
  filtrarItemsTablero86,
  generarResumenTablero86WhatsApp,
  MOTIVOS_86_META,
} from '@/utils/control86Utils';
import { Badge86Estado, BadgeEspecialDelDia } from './Control86Badges';
import { ProgramarEspecialModal } from './ProgramarEspecialModal';
import type {
  Combo,
  EspecialDelDiaConfig,
  EstacionCocina,
  FiltroEstadoTablero86,
  ItemCatalogo86,
  Motivo86,
  Producto,
  ResumenTablero86,
  TipoItemCatalogo86,
} from '@/types';

export interface Control86BoardProps {
  nombreNegocio: string;
  productos: Producto[];
  combos: Combo[];
  items: ItemCatalogo86[];
  resumen: ResumenTablero86;
  ahora?: Date;
  actionLoadingKey?: string | null;
  puedeConfigurarEspeciales?: boolean;
  onMarcar86: (
    item: Pick<ItemCatalogo86, 'id' | 'tipo' | 'nombre'>,
    motivo?: Motivo86,
    nota?: string
  ) => Promise<void>;
  onReactivar86: (
    item: Pick<ItemCatalogo86, 'id' | 'tipo' | 'nombre'>,
    porcionesIniciales?: number | null
  ) => Promise<void>;
  onAjustarPorciones: (
    item: Pick<ItemCatalogo86, 'id' | 'tipo' | 'nombre' | 'control86'>,
    porciones: number | null
  ) => Promise<void>;
  onAjustarPorcionesDelta: (item: ItemCatalogo86, delta: number) => Promise<void>;
  onGuardarEspecial?: (
    tipo: TipoItemCatalogo86,
    itemId: string,
    nombre: string,
    config: EspecialDelDiaConfig | null
  ) => Promise<void>;
  onRestablecerTodos?: () => Promise<void>;
}

const FILTROS_ESTADO: Array<{ id: FiltroEstadoTablero86; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'agotados_86', label: '86 Agotados' },
  { id: 'ultimas_porciones', label: 'Últimas porciones' },
  { id: 'con_contador', label: 'Con contador' },
  { id: 'especiales_hoy', label: 'Especiales hoy' },
  { id: 'disponibles', label: 'Disponibles' },
];

export function Control86Board({
  nombreNegocio,
  productos,
  combos,
  items,
  resumen,
  ahora,
  actionLoadingKey,
  puedeConfigurarEspeciales = false,
  onMarcar86,
  onReactivar86,
  onAjustarPorciones,
  onAjustarPorcionesDelta,
  onGuardarEspecial,
  onRestablecerTodos,
}: Control86BoardProps) {
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstadoTablero86>('todos');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoItemCatalogo86>('todos');
  const [estacionFiltro, setEstacionFiltro] = useState<string>('todas');
  const [motivoSeleccionadoKey, setMotivoSeleccionadoKey] = useState<string | null>(null);
  const [motivo86, setMotivo86] = useState<Motivo86>('sin_insumos');
  const [nota86, setNota86] = useState('');
  const [itemEditandoEspecial, setItemEditandoEspecial] = useState<ItemCatalogo86 | null>(null);

  const itemsFiltrados = useMemo(
    () =>
      filtrarItemsTablero86(items, {
        busqueda,
        estado: estadoFiltro,
        tipo: tipoFiltro,
        estacion: estacionFiltro,
      }),
    [items, busqueda, estadoFiltro, tipoFiltro, estacionFiltro]
  );

  const abrirWhatsAppPizarra = () => {
    const texto = generarResumenTablero86WhatsApp(nombreNegocio, productos, combos, ahora);
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      {/* 4 KPIs de Control 86 en vivo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-red-500/35 bg-red-950/25 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-300">
            En 86 (Agotados)
          </p>
          <p className="mt-1 font-display text-2xl font-black text-white">
            {resumen.totalEn86}
          </p>
          <p className="text-[11px] text-neutral-400">Bloqueados en todos los canales</p>
        </div>

        <div className="rounded-2xl border border-orange-500/35 bg-orange-950/25 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-orange-300">
            Últimas porciones
          </p>
          <p className="mt-1 font-display text-2xl font-black text-white">
            {resumen.totalUltimasPorciones}
          </p>
          <p className="text-[11px] text-neutral-400">Por debajo del umbral</p>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
            Con contador activo
          </p>
          <p className="mt-1 font-display text-2xl font-black text-white">
            {resumen.totalConContador}
          </p>
          <p className="text-[11px] text-neutral-400">
            {resumen.porcionesTotalesEnContador} porciones restantes
          </p>
        </div>

        <div className="rounded-2xl border border-gold-400/35 bg-gold-400/10 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gold-300">
            Especiales hoy
          </p>
          <p className="mt-1 font-display text-2xl font-black text-white">
            {resumen.totalEspecialesVigentes}
          </p>
          <p className="text-[11px] text-neutral-400">
            {resumen.totalEspecialesProgramados} programados en carta
          </p>
        </div>
      </div>

      {/* Controles globales y filtros */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar plato, combo, categoría o nota 86..."
              aria-label="Buscar en tablero Control 86"
              className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-9 pr-9 text-xs text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda en Control 86"
                className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onRestablecerTodos && resumen.totalEn86 > 0 && (
              <button
                type="button"
                disabled={actionLoadingKey === '__batch_reset__'}
                onClick={() => void onRestablecerTodos()}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 text-xs font-black text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Restablecer todos ({resumen.totalEn86})</span>
              </button>
            )}

            <button
              type="button"
              onClick={abrirWhatsAppPizarra}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-neutral-950 px-3.5 text-xs font-bold text-emerald-300 hover:bg-emerald-950/40"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>Compartir Pizarra</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTROS_ESTADO.map((f) => {
            const activo = estadoFiltro === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={activo}
                onClick={() => setEstadoFiltro(f.id)}
                className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                  activo
                    ? 'border-gold-400 bg-gold-400 text-neutral-950'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-600'
                }`}
              >
                {f.label}
              </button>
            );
          })}

          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as 'todos' | TipoItemCatalogo86)}
            aria-label="Filtrar por tipo de ítem"
            className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-neutral-200 focus:border-gold-400 focus:outline-none"
          >
            <option value="todos">Productos y Combos</option>
            <option value="producto">Solo Productos</option>
            <option value="combo">Solo Combos</option>
          </select>

          <select
            value={estacionFiltro}
            onChange={(e) => setEstacionFiltro(e.target.value)}
            aria-label="Filtrar por estación de cocina"
            className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-neutral-200 focus:border-gold-400 focus:outline-none"
          >
            <option value="todas">Todas las estaciones</option>
            {(Object.keys(ESTACIONES_COCINA_META) as EstacionCocina[]).map((est) => (
              <option key={est} value={est}>
                {ESTACIONES_COCINA_META[est].emoji} {ESTACIONES_COCINA_META[est].shortLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Listado interactivo Control 86 */}
      {itemsFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-10 text-center">
          <p className="font-display text-base font-bold text-white">
            No hay ítems que coincidan con este filtro
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Ajusta la búsqueda o limpia los filtros de estado para ver el menú completo.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {itemsFiltrados.map((item) => {
            const key = `${item.tipo}:${item.id}`;
            const cargando = actionLoadingKey === key;
            const en86 = item.evaluacion.agotado86;
            const mostrandoMotivo = motivoSeleccionadoKey === key;
            const estMeta = item.estacionCocina
              ? ESTACIONES_COCINA_META[item.estacionCocina as EstacionCocina]
              : undefined;

            return (
              <div
                key={key}
                data-testid={`control86-row-${item.id}`}
                className={`rounded-2xl border p-3.5 transition-colors ${
                  en86
                    ? 'border-red-500/45 bg-red-950/20'
                    : item.evaluacion.estado === 'ultimas_porciones'
                      ? 'border-orange-500/45 bg-orange-950/15'
                      : 'border-neutral-800 bg-neutral-900/80'
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  {/* Info principal del plato */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-neutral-300">
                        {item.tipo === 'combo' ? 'Combo' : item.categoria}
                      </span>
                      {estMeta && (
                        <span className="rounded border border-neutral-700 bg-neutral-950 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-300">
                          {estMeta.emoji} {estMeta.shortLabel}
                        </span>
                      )}
                      <Badge86Estado evaluacion={item.evaluacion} />
                      <BadgeEspecialDelDia evaluacion={item.evaluacion} />
                    </div>

                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-display text-sm sm:text-base font-black text-white">
                        {item.nombre}
                      </h3>
                      <span className="font-mono text-xs font-bold text-gold-400">
                        {formatCOP(item.precio)}
                      </span>
                    </div>

                    {en86 && (item.evaluacion.motivo86Label || item.control86?.nota86) && (
                      <p className="text-[11px] text-red-200/90">
                        Motivo: <strong>{item.evaluacion.motivo86Label}</strong>
                        {item.control86?.nota86 ? ` · ${item.control86.nota86}` : ''}
                      </p>
                    )}

                    {item.evaluacion.especial.configurado && (
                      <p className="text-[11px] text-gold-300/90">
                        ⭐ {item.evaluacion.especial.etiqueta} ({item.evaluacion.especial.resumenHorario})
                      </p>
                    )}
                  </div>

                  {/* Controles rápidos de contador y botón 1-toque 86/Reactivar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Contador regresivo */}
                    <div className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-950 p-1">
                      <button
                        type="button"
                        disabled={cargando || (item.evaluacion.porcionesDisponibles ?? 0) <= 0}
                        onClick={() => void onAjustarPorcionesDelta(item, -1)}
                        aria-label={`Restar 1 porción a ${item.nombre}`}
                        className="grid h-11 w-11 place-items-center rounded-lg bg-neutral-900 text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <div className="min-w-[68px] px-2 text-center">
                        <span className="block text-[9px] font-bold uppercase text-neutral-500">
                          Porciones
                        </span>
                        <span className="font-mono text-sm font-black text-white">
                          {item.evaluacion.contadorActivo
                            ? item.evaluacion.porcionesDisponibles ?? 0
                            : '∞'}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={cargando}
                        onClick={() => void onAjustarPorcionesDelta(item, 1)}
                        aria-label={`Sumar 1 porción a ${item.nombre}`}
                        className="grid h-11 w-11 place-items-center rounded-lg bg-neutral-900 text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        disabled={cargando}
                        onClick={() => void onAjustarPorcionesDelta(item, 5)}
                        aria-label={`Sumar 5 porciones a ${item.nombre}`}
                        className="min-h-[44px] rounded-lg bg-neutral-900 px-2.5 text-xs font-black text-amber-300 hover:bg-neutral-800 disabled:opacity-40"
                      >
                        +5
                      </button>

                      {item.evaluacion.contadorActivo && (
                        <button
                          type="button"
                          disabled={cargando}
                          onClick={() => void onAjustarPorciones(item, null)}
                          title="Quitar límite de porciones"
                          aria-label={`Quitar límite de porciones a ${item.nombre}`}
                          className="grid h-11 w-11 place-items-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white"
                        >
                          <InfinityIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    {/* Programar Especial (solo admin) */}
                    {puedeConfigurarEspeciales && onGuardarEspecial && (
                      <button
                        type="button"
                        disabled={cargando}
                        onClick={() => setItemEditandoEspecial(item)}
                        aria-label={`Programar Especial del Día para ${item.nombre}`}
                        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors ${
                          item.evaluacion.especial.configurado
                            ? 'border-gold-400/60 bg-gold-400/20 text-gold-300 hover:bg-gold-400/30'
                            : 'border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-gold-400/40 hover:text-gold-300'
                        }`}
                      >
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        <span>Especial</span>
                      </button>
                    )}

                    {/* Botón gigante 1-toque 86 / Reactivar */}
                    {en86 ? (
                      <button
                        type="button"
                        disabled={cargando}
                        onClick={() => void onReactivar86(item)}
                        aria-label={`Reactivar ${item.nombre}`}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-xs font-black text-neutral-950 shadow-md hover:bg-emerald-400 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>Reactivar</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={cargando}
                          onClick={() => void onMarcar86(item, 'produccion_agotada')}
                          aria-label={`Marcar ${item.nombre} en 86`}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-black text-white shadow-md hover:bg-red-500 disabled:opacity-50"
                        >
                          <Ban className="h-4 w-4" aria-hidden="true" />
                          <span>Marcar 86</span>
                        </button>
                        <button
                          type="button"
                          disabled={cargando}
                          aria-expanded={mostrandoMotivo}
                          aria-label={`Elegir motivo de 86 para ${item.nombre}`}
                          onClick={() => {
                            setMotivoSeleccionadoKey(mostrandoMotivo ? null : key);
                            setNota86('');
                          }}
                          className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-2.5 text-[11px] font-bold text-neutral-300 hover:border-red-500/50 hover:text-white"
                        >
                          Motivo
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Panel rápido de motivo y nota al marcar 86 */}
                {mostrandoMotivo && !en86 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-3">
                    <select
                      value={motivo86}
                      onChange={(e) => setMotivo86(e.target.value as Motivo86)}
                      aria-label={`Motivo de 86 para ${item.nombre}`}
                      className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white"
                    >
                      {(Object.keys(MOTIVOS_86_META) as Motivo86[]).map((m) => (
                        <option key={m} value={m}>
                          {MOTIVOS_86_META[m].label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      maxLength={160}
                      value={nota86}
                      onChange={(e) => setNota86(e.target.value)}
                      placeholder="Nota breve (ej: llega queso a las 5pm)"
                      className="min-h-[44px] min-w-[200px] flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white placeholder-neutral-500"
                    />
                    <button
                      type="button"
                      disabled={cargando}
                      onClick={async () => {
                        await onMarcar86(item, motivo86, nota86);
                        setMotivoSeleccionadoKey(null);
                        setNota86('');
                      }}
                      className="min-h-[44px] rounded-xl bg-red-600 px-4 text-xs font-black text-white hover:bg-red-500"
                    >
                      Confirmar 86
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {onGuardarEspecial && (
        <ProgramarEspecialModal
          item={itemEditandoEspecial}
          isOpen={Boolean(itemEditandoEspecial)}
          guardando={
            itemEditandoEspecial
              ? actionLoadingKey === `${itemEditandoEspecial.tipo}:${itemEditandoEspecial.id}`
              : false
          }
          onClose={() => setItemEditandoEspecial(null)}
          onGuardar={async (config) => {
            if (!itemEditandoEspecial) return;
            await onGuardarEspecial(
              itemEditandoEspecial.tipo,
              itemEditandoEspecial.id,
              itemEditandoEspecial.nombre,
              config
            );
          }}
        />
      )}
    </div>
  );
}
