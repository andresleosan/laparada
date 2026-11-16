import { useState, useMemo } from 'react';
import {
  Sparkles,
  ShoppingCart,
  MessageSquare,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
} from 'lucide-react';
import type {
  Proveedor,
  OrdenCompra,
  SugerenciaReabastecimiento,
  ItemOrdenCompra,
} from '@/types/proveedor';
import {
  agruparSugerenciasPorProveedor,
  convertirSugerenciasAItemsOrden,
  generarMensajeWhatsAppOrdenCompra,
  construirUrlWhatsAppOrdenCompra,
} from '@/utils/ordenesCompraYConteoUtils';
import { formatCOP } from '@/utils/formatCOP';

interface OrdenesCompraIntelligentSectionProps {
  ordenes: OrdenCompra[];
  proveedores: Proveedor[];
  sugerencias: SugerenciaReabastecimiento[];
  nombreNegocio?: string;
  onAbrirNuevaOrden: (
    proveedor?: Proveedor | null,
    items?: ItemOrdenCompra[] | null
  ) => void;
  onRecibirOrden: (orden: OrdenCompra) => void;
  onMarcarEnviada: (ordenId: string) => Promise<void>;
  onCancelarOrden: (orden: OrdenCompra) => Promise<void>;
}

type FiltroEstadoOrden = 'todas' | 'pendientes' | 'recibidas' | 'canceladas';

export function OrdenesCompraIntelligentSection({
  ordenes,
  proveedores,
  sugerencias,
  nombreNegocio = 'La Parada',
  onAbrirNuevaOrden,
  onRecibirOrden,
  onMarcarEnviada,
  onCancelarOrden,
}: OrdenesCompraIntelligentSectionProps) {
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoOrden>('todas');

  const gruposSugeridos = useMemo(
    () => agruparSugerenciasPorProveedor(sugerencias, proveedores),
    [sugerencias, proveedores]
  );

  const presupuestoTotalSugerido = useMemo(
    () => sugerencias.reduce((acc, s) => acc + s.subtotalEstimado, 0),
    [sugerencias]
  );

  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((o) => {
      if (filtroEstado === 'pendientes') {
        return o.estado === 'borrador' || o.estado === 'enviada';
      }
      if (filtroEstado === 'recibidas') {
        return o.estado === 'recibida';
      }
      if (filtroEstado === 'canceladas') {
        return o.estado === 'cancelada';
      }
      return true;
    });
  }, [ordenes, filtroEstado]);

  const handleEnviarWhatsAppOrden = async (orden: OrdenCompra) => {
    const prov = proveedores.find((p) => p.id === orden.proveedorId);
    const telefono = orden.proveedorTelefono || prov?.telefono || '';
    if (!telefono) {
      alert('Este proveedor no tiene teléfono registrado para WhatsApp.');
      return;
    }

    const msg = generarMensajeWhatsAppOrdenCompra(orden, nombreNegocio);
    const url = construirUrlWhatsAppOrdenCompra(telefono, msg);
    window.open(url, '_blank', 'noopener,noreferrer');

    if (orden.estado === 'borrador') {
      await onMarcarEnviada(orden.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Panel de Sugerencias Automáticas por Quiebre de Stock Mínimo */}
      <section
        aria-label="Sugerencias automáticas por quiebre de stock mínimo"
        className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-neutral-900 to-neutral-900 p-4 sm:p-6 shadow-lg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-white flex items-center gap-2 flex-wrap">
                <span>Sugerencia Automática por Quiebre de Stock Mínimo</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  {sugerencias.length}{' '}
                  {sugerencias.length === 1 ? 'insumo en alerta' : 'insumos en alerta'}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 mt-0.5">
                Cálculo inteligente para cubrir stock óptimo (2x mínimo) según existencias actuales y último costo en Kardex.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {sugerencias.length > 0 && (
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">
                  Reposición Estimada
                </span>
                <span className="font-display font-black text-lg text-gold-400">
                  {formatCOP(presupuestoTotalSugerido)}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => onAbrirNuevaOrden(null, null)}
              disabled={proveedores.length === 0}
              className="h-11 px-4 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-colors shadow disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              <span>+ Armar Orden de Compra</span>
            </button>
          </div>
        </div>

        {sugerencias.length === 0 ? (
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center gap-3 text-emerald-400 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>
              ¡Bodega saludable! Todos los insumos con alerta configurada superan su stock mínimo.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gruposSugeridos.map((grupo) => {
              const provObj = proveedores.find((p) => p.id === grupo.proveedorId) || null;

              return (
                <div
                  key={grupo.proveedorId || grupo.proveedorNombre}
                  className="p-4 rounded-xl bg-neutral-950/90 border border-neutral-800 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block">
                          Proveedor Sugerido
                        </span>
                        <h3 className="font-display font-bold text-base text-white">
                          {grupo.proveedorNombre}
                        </h3>
                      </div>
                      <span className="font-display font-bold text-sm text-gold-400">
                        {formatCOP(grupo.totalEstimado)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {grupo.items.map((sug) => (
                        <div
                          key={sug.insumoId}
                          className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-neutral-900 border border-neutral-800/80"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                sug.prioridad === 'agotado'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : sug.prioridad === 'critico'
                                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {sug.prioridad === 'agotado'
                                ? 'Agotado'
                                : sug.prioridad === 'critico'
                                  ? 'Crítico'
                                  : 'Bajo'}
                            </span>
                            <span className="font-semibold text-white truncate">
                              {sug.insumoNombre}
                            </span>
                            <span className="text-neutral-400">
                              (Actual: {sug.stockActual} / Mín: {sug.stockMinimo})
                            </span>
                          </div>
                          <span className="font-bold text-emerald-400 shrink-0 ml-2">
                            Pedir: {sug.cantidadSugerida} {sug.unidad}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        onAbrirNuevaOrden(
                          provObj,
                          convertirSugerenciasAItemsOrden(grupo.items)
                        )
                      }
                      disabled={proveedores.length === 0}
                      className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center gap-2 transition-colors shadow disabled:opacity-40"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Generar Orden con {grupo.items.length} Insumos</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Listado y Gestión de Órdenes de Compra */}
      <section aria-label="Historial y gestión de órdenes de compra" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gold-400" />
            <span>Órdenes de Compra Emitidas ({ordenes.length})</span>
          </h3>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                ['todas', 'Todas'],
                ['pendientes', 'Pendientes de Recibir'],
                ['recibidas', 'Recibidas en Kardex'],
                ['canceladas', 'Canceladas'],
              ] as [FiltroEstadoOrden, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filtroEstado === key}
                onClick={() => setFiltroEstado(key)}
                className={`h-10 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  filtroEstado === key
                    ? 'bg-gold-400 text-neutral-950 border-gold-400'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {ordenesFiltradas.length === 0 ? (
          <div className="p-10 text-center bg-neutral-900/60 rounded-2xl border border-neutral-800">
            <ShoppingCart className="w-10 h-10 text-neutral-600 mx-auto mb-2.5" />
            <p className="font-display font-bold text-base text-white mb-1">
              No hay órdenes de compra en esta vista
            </p>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Genera una orden inteligente desde las sugerencias de quiebre de stock para enviarla por WhatsApp y recibirla en 1 clic al Kardex.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ordenesFiltradas.map((orden) => {
              const fechaStr =
                orden.creadoEn && typeof orden.creadoEn.toDate === 'function'
                  ? orden.creadoEn.toDate().toLocaleDateString('es-CO')
                  : new Date().toLocaleDateString('es-CO');

              const puedeRecibir =
                orden.estado === 'borrador' || orden.estado === 'enviada';

              return (
                <article
                  key={orden.id}
                  aria-label={`Orden de compra ${orden.numeroOrden}`}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-lg hover:border-gold-400/40 transition-all"
                >
                  <div>
                    {/* Cabecera de la tarjeta */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-neutral-950 text-gold-400 border border-neutral-800">
                        {orden.numeroOrden}
                      </span>

                      {orden.estado === 'recibida' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Recibida en Kardex
                        </span>
                      )}
                      {orden.estado === 'enviada' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          Enviada WhatsApp
                        </span>
                      )}
                      {orden.estado === 'borrador' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          Borrador
                        </span>
                      )}
                      {orden.estado === 'cancelada' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          Cancelada
                        </span>
                      )}
                    </div>

                    <h4 className="font-display font-bold text-base text-white mb-0.5">
                      {orden.proveedorNombre}
                    </h4>
                    <p className="text-xs text-neutral-400 mb-3">
                      Emitida el {fechaStr} · {orden.items.length}{' '}
                      {orden.items.length === 1 ? 'insumo' : 'insumos'}
                    </p>

                    {/* Desglose compacto de ítems */}
                    <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-1 mb-3 max-h-36 overflow-y-auto">
                      {orden.items.map((it) => (
                        <div
                          key={it.insumoId}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-neutral-300 truncate pr-2">
                            {orden.estado === 'recibida' &&
                            typeof it.cantidadRecibida === 'number'
                              ? `${it.cantidadRecibida} ${it.unidad}`
                              : `${it.cantidadSolicitada} ${it.unidad}`}{' '}
                            · {it.insumoNombre}
                          </span>
                          <span className="text-neutral-400 font-mono shrink-0">
                            {formatCOP(
                              orden.estado === 'recibida' &&
                                typeof it.costoUnitarioReal === 'number'
                                ? it.costoUnitarioReal
                                : it.costoUnitarioEstimado
                            )}
                            /u
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Totales */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800 mb-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">
                          Total Estimado
                        </span>
                        <span className="font-display font-bold text-sm text-neutral-200">
                          {formatCOP(orden.totalEstimado)}
                        </span>
                      </div>
                      {orden.estado === 'recibida' &&
                        typeof orden.totalReal === 'number' && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase tracking-wider text-emerald-400 block">
                              Total Real Kardex
                            </span>
                            <span className="font-display font-bold text-sm text-emerald-400">
                              {formatCOP(orden.totalReal)}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Acciones Táctiles (>= 44px) */}
                  {puedeRecibir && (
                    <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleEnviarWhatsAppOrden(orden)}
                        aria-label={`Enviar orden ${orden.numeroOrden} por WhatsApp`}
                        className="h-11 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRecibirOrden(orden)}
                          className="h-11 px-3.5 rounded-lg bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs flex items-center gap-1.5 transition-colors shadow"
                        >
                          <PackageCheck className="w-4 h-4" />
                          <span>Recibir al Kardex</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onCancelarOrden(orden)}
                          aria-label={`Cancelar orden ${orden.numeroOrden}`}
                          className="w-11 h-11 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center justify-center transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
