import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChefHat,
  Flame,
  Package,
  RotateCcw,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import type {
  Combo,
  EstacionCocinaMerma,
  Insumo,
  ModoRegistroMerma,
  MotivoMerma,
  MovimientoKardex,
  OrigenMermaOperativa,
  Producto,
  RegistrarMermaOperativaInput,
  ResultadoMermaOperativa,
} from '@/types';
import { parseFiniteNumber, validatePositiveAmount } from '@/utils/adminInputValidation';
import { formatCOP } from '@/utils/formatCOP';
import { construirMapaCostosInsumos } from '@/utils/ingenieriaMenuUtils';
import { MOTIVOS_MERMA } from '@/utils/kardexInventarioUtils';
import {
  ESTACIONES_COCINA_MERMA_CATALOGO,
  ORIGENES_MERMA_CATALOGO,
  simularMermaProductoTerminado,
} from '@/utils/mermasOperativasUtils';
import { esInsumoSubReceta } from '@/utils/produccionCocinaUtils';

export interface ComandaContextoMerma {
  id: string;
  codigo?: string;
  clienteNombre?: string;
}

export interface RegistrarMermaOperativaModalProps {
  isOpen: boolean;
  onClose: () => void;
  insumos: Insumo[];
  productos?: Producto[];
  combos?: Combo[];
  movimientosKardex?: MovimientoKardex[];
  modoInicial?: ModoRegistroMerma;
  origenInicial?: OrigenMermaOperativa;
  estacionInicial?: EstacionCocinaMerma;
  insumoPreseleccionadoId?: string;
  productoPreseleccionadoId?: string;
  comandaContexto?: ComandaContextoMerma | null;
  onRegistrarMerma: (input: RegistrarMermaOperativaInput) => Promise<ResultadoMermaOperativa>;
  onSuccess?: (resultado: ResultadoMermaOperativa) => void;
}

export function RegistrarMermaOperativaModal({
  isOpen,
  onClose,
  insumos,
  productos = [],
  combos = [],
  movimientosKardex = [],
  modoInicial = 'insumo',
  origenInicial = 'bodega',
  estacionInicial = 'general',
  insumoPreseleccionadoId,
  productoPreseleccionadoId,
  comandaContexto = null,
  onRegistrarMerma,
  onSuccess,
}: RegistrarMermaOperativaModalProps) {
  const generatedId = useId();
  const titleId = `merma-operativa-modal-${generatedId.replace(/:/g, '')}-title`;

  let responsableNombre = 'Administrador';
  try {
    const authCtx = useAuth();
    responsableNombre =
      authCtx.user?.displayName || authCtx.user?.email || 'Administrador';
  } catch {
    // Fallback seguro si se renderiza en pruebas unitarias sin AuthProvider
  }

  const [modo, setModo] = useState<ModoRegistroMerma>(modoInicial);
  const [origen, setOrigen] = useState<OrigenMermaOperativa>(origenInicial);
  const [estacion, setEstacion] = useState<EstacionCocinaMerma>(estacionInicial);
  const [insumoId, setInsumoId] = useState(() =>
    insumoPreseleccionadoId && insumos.some((i) => i.id === insumoPreseleccionadoId)
      ? insumoPreseleccionadoId
      : insumos[0]?.id || ''
  );
  const [referenciaSeleccionada, setReferenciaSeleccionada] = useState(() => {
    if (productoPreseleccionadoId && productos.some((p) => p.id === productoPreseleccionadoId)) {
      return `producto:${productoPreseleccionadoId}`;
    }
    if (productos.length > 0) return `producto:${productos[0].id}`;
    if (combos.length > 0) return `combo:${combos[0].id}`;
    return '';
  });
  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState<MotivoMerma>(() =>
    origenInicial === 'devolucion_cliente'
      ? 'devolucion_cliente'
      : origenInicial === 'cocina_kds'
        ? 'desperdicio_cocina'
        : 'vencimiento'
  );
  const [comandaCodigo, setComandaCodigo] = useState(() => comandaContexto?.codigo || '');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const itemsCatalogo = useMemo(() => {
    const listaProductos = productos.map((p) => ({
      key: `producto:${p.id}`,
      tipo: 'producto' as const,
      id: p.id,
      nombre: p.nombre,
      precio: p.precio,
      tieneReceta: Array.isArray(p.receta) && p.receta.length > 0,
    }));
    const listaCombos = combos.map((c) => ({
      key: `combo:${c.id}`,
      tipo: 'combo' as const,
      id: c.id,
      nombre: c.nombre,
      precio: c.precioEspecial,
      tieneReceta: true,
    }));
    return { listaProductos, listaCombos };
  }, [productos, combos]);

  useEffect(() => {
    if (!isOpen) return;

    setModo(modoInicial);
    setOrigen(origenInicial);
    setEstacion(estacionInicial);
    setCantidad('1');
    setComandaCodigo(comandaContexto?.codigo || '');
    setNotas('');

    if (origenInicial === 'devolucion_cliente') {
      setMotivo('devolucion_cliente');
    } else if (origenInicial === 'cocina_kds') {
      setMotivo('desperdicio_cocina');
    } else {
      setMotivo('vencimiento');
    }

    if (insumoPreseleccionadoId && insumos.some((i) => i.id === insumoPreseleccionadoId)) {
      setInsumoId(insumoPreseleccionadoId);
    } else if (insumos.length > 0) {
      setInsumoId(insumos[0].id);
    } else {
      setInsumoId('');
    }

    if (productoPreseleccionadoId && productos.some((p) => p.id === productoPreseleccionadoId)) {
      setReferenciaSeleccionada(`producto:${productoPreseleccionadoId}`);
    } else if (productos.length > 0) {
      setReferenciaSeleccionada(`producto:${productos[0].id}`);
    } else if (combos.length > 0) {
      setReferenciaSeleccionada(`combo:${combos[0].id}`);
    } else {
      setReferenciaSeleccionada('');
    }
  }, [
    isOpen,
    modoInicial,
    origenInicial,
    estacionInicial,
    insumoPreseleccionadoId,
    productoPreseleccionadoId,
    comandaContexto,
    insumos,
    productos,
    combos,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, guardando, onClose]);

  const costosMap = useMemo(
    () => construirMapaCostosInsumos(insumos, movimientosKardex),
    [insumos, movimientosKardex]
  );

  const costosUnitariosRecord = useMemo(() => {
    const rec: Record<string, number> = {};
    for (const [id, info] of costosMap.entries()) {
      if (info.costoUnitario > 0) rec[id] = info.costoUnitario;
    }
    return rec;
  }, [costosMap]);

  const insumoActivo = useMemo(
    () => insumos.find((i) => i.id === insumoId) || null,
    [insumos, insumoId]
  );

  const cantidadNum = useMemo(() => {
    const parsed = parseFiniteNumber(cantidad);
    return parsed !== null && parsed > 0 ? parsed : 0;
  }, [cantidad]);

  const simulacionInsumo = useMemo(() => {
    if (!insumoActivo) return null;
    const stockActual = Math.max(0, insumoActivo.stockActual || 0);
    const costoUnit = costosMap.get(insumoActivo.id)?.costoUnitario ?? 0;
    const impactoCOP = Math.round(cantidadNum * costoUnit);
    const stockPosterior = Number(Math.max(0, stockActual - cantidadNum).toFixed(4));
    return {
      stockActual,
      stockPosterior,
      costoUnit,
      impactoCOP,
    };
  }, [insumoActivo, costosMap, cantidadNum]);

  const referenciaParsed = useMemo(() => {
    if (!referenciaSeleccionada) return null;
    const [tipo, id] = referenciaSeleccionada.split(':');
    if ((tipo !== 'producto' && tipo !== 'combo') || !id) return null;
    return { tipo: tipo as 'producto' | 'combo', id };
  }, [referenciaSeleccionada]);

  const simulacionProducto = useMemo(() => {
    if (modo !== 'producto_terminado' || !referenciaParsed) return null;
    return simularMermaProductoTerminado({
      referenciaId: referenciaParsed.id,
      tipoReferencia: referenciaParsed.tipo,
      cantidad: cantidadNum > 0 ? cantidadNum : 1,
      productos,
      combos,
      insumos,
      movimientosKardex,
    });
  }, [modo, referenciaParsed, cantidadNum, productos, combos, insumos, movimientosKardex]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorCant = validatePositiveAmount(cantidad);
    if (errorCant) {
      createToast(errorCant, 'error');
      return;
    }
    const cantFinal = parseFiniteNumber(cantidad) as number;

    if (modo === 'insumo' && !insumoActivo) {
      createToast('Selecciona un insumo de bodega para registrar la merma', 'error');
      return;
    }

    if (modo === 'producto_terminado' && !referenciaParsed) {
      createToast('Selecciona un plato o combo del menú', 'error');
      return;
    }

    setGuardando(true);
    try {
      const payload: RegistrarMermaOperativaInput =
        modo === 'insumo'
          ? {
              modo: 'insumo',
              insumoId: insumoActivo?.id,
              cantidad: cantFinal,
              motivo,
              origen,
              estacion,
              comandaId: comandaContexto?.id,
              comandaCodigo: comandaCodigo.trim() || undefined,
              notas: notas.trim(),
              responsable: responsableNombre,
              costosUnitariosPorInsumo: costosUnitariosRecord,
            }
          : {
              modo: 'producto_terminado',
              referenciaId: referenciaParsed?.id,
              tipoReferencia: referenciaParsed?.tipo,
              cantidad: cantFinal,
              motivo,
              origen,
              estacion,
              comandaId: comandaContexto?.id,
              comandaCodigo: comandaCodigo.trim() || undefined,
              notas: notas.trim(),
              responsable: responsableNombre,
              costosUnitariosPorInsumo: costosUnitariosRecord,
            };

      const resultado = await onRegistrarMerma(payload);
      createToast(
        `Merma registrada: ${resultado.referenciaNombre} (Impacto P&L: ${formatCOP(resultado.costoTotalImpactoCOP)})`,
        'success'
      );
      onSuccess?.(resultado);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo registrar la merma operativa';
      createToast(msg, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !guardando) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-3xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5 mb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-red-500/30 bg-red-500/15 text-red-400">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Control de Mermas, Desperdicios y Devoluciones
              </h2>
              <p className="text-xs text-neutral-400">
                Descuento automático en Kardex/Escandallo con impacto directo en P&amp;L y Auditoría Forense
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de merma operativa"
            className="grid h-11 w-11 place-items-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selector de Modalidad */}
        <div
          role="tablist"
          aria-label="Modalidad de merma"
          className="grid grid-cols-1 gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-1.5 sm:grid-cols-2 mb-4"
        >
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'insumo'}
            onClick={() => setModo('insumo')}
            className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              modo === 'insumo'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Package className="h-4 w-4" aria-hidden="true" />
            <span>Insumo / Prep. Base en Bodega</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={modo === 'producto_terminado'}
            onClick={() => setModo('producto_terminado')}
            className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              modo === 'producto_terminado'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
            <span>Plato / Combo (Explosión de Receta)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Origen Operativo y Estación */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-300">
              Origen Operativo de la Pérdida
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ORIGENES_MERMA_CATALOGO.map((orig) => {
                const activo = origen === orig.id;
                return (
                  <button
                    key={orig.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => {
                      setOrigen(orig.id);
                      if (orig.id === 'devolucion_cliente') setMotivo('devolucion_cliente');
                      else if (orig.id === 'cocina_kds') setMotivo('desperdicio_cocina');
                      else if (orig.id === 'bodega') setMotivo('vencimiento');
                    }}
                    className={`min-h-[44px] rounded-xl border px-2.5 py-2 text-left text-xs transition-all ${
                      activo
                        ? 'border-gold-400 bg-gold-400/15 text-white font-bold'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    <div className="truncate">{orig.shortLabel}</div>
                    <div className="text-[10px] opacity-75 truncate">{orig.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${titleId}-estacion`}
                className="block text-xs font-semibold text-neutral-300 mb-1"
              >
                Estación / Área Responsable
              </label>
              <select
                id={`${titleId}-estacion`}
                value={estacion}
                onChange={(e) => setEstacion(e.target.value as EstacionCocinaMerma)}
                className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                {ESTACIONES_COCINA_MERMA_CATALOGO.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Comanda / Referencia (opcional)"
              placeholder="Ej: #K-014, Mesa 3"
              value={comandaCodigo}
              onChange={(e) => setComandaCodigo(e.target.value)}
            />
          </div>

          {/* Selector según Modalidad */}
          {modo === 'insumo' ? (
            <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`${titleId}-insumo`}
                    className="block text-xs font-semibold text-neutral-300 mb-1"
                  >
                    Insumo o Preparación Base afectada
                  </label>
                  <select
                    id={`${titleId}-insumo`}
                    value={insumoId}
                    onChange={(e) => setInsumoId(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  >
                    {insumos.length === 0 ? (
                      <option value="">Sin insumos registrados</option>
                    ) : (
                      insumos.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {esInsumoSubReceta(ins) ? '👨‍🍳 [Prep] ' : ''}
                          {ins.nombre} ({ins.stockActual || 0} {ins.unidad})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <Input
                  label={`Cantidad (${insumoActivo?.unidad || 'unid'})`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  required
                />
              </div>

              {insumoActivo && simulacionInsumo && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-500/25 bg-red-950/20 px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2 text-neutral-300">
                    {esInsumoSubReceta(insumoActivo) ? (
                      <ChefHat className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Package className="h-4 w-4 text-red-400" aria-hidden="true" />
                    )}
                    <span>
                      Stock: <strong className="text-white">{simulacionInsumo.stockActual}</strong> ➔{' '}
                      <strong className="text-red-300">{simulacionInsumo.stockPosterior}</strong>{' '}
                      {insumoActivo.unidad}
                    </span>
                  </div>
                  <div className="font-mono font-bold text-red-300">
                    Impacto P&amp;L:{' '}
                    <span className="font-display text-sm text-red-400">
                      {formatCOP(simulacionInsumo.impactoCOP)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`${titleId}-producto`}
                    className="block text-xs font-semibold text-neutral-300 mb-1"
                  >
                    Producto o Combo Devuelto / Desperdiciado
                  </label>
                  <select
                    id={`${titleId}-producto`}
                    value={referenciaSeleccionada}
                    onChange={(e) => setReferenciaSeleccionada(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                  >
                    {itemsCatalogo.listaProductos.length === 0 &&
                      itemsCatalogo.listaCombos.length === 0 && (
                        <option value="">Catálogo sin productos disponibles</option>
                      )}
                    {itemsCatalogo.listaProductos.length > 0 && (
                      <optgroup label="Productos del Menú">
                        {itemsCatalogo.listaProductos.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.nombre} ({formatCOP(p.precio)}){p.tieneReceta ? ' · Escandallo' : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {itemsCatalogo.listaCombos.length > 0 && (
                      <optgroup label="Combos y Paquetes">
                        {itemsCatalogo.listaCombos.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.nombre} ({formatCOP(c.precio)})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <Input
                  label="Unidades perdidas"
                  type="number"
                  step="1"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  required
                />
              </div>

              {/* Vista previa de Explosión de Escandallo */}
              {simulacionProducto && (
                <div className="rounded-xl border border-amber-500/30 bg-neutral-950 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-bold text-amber-300">
                      <Flame className="h-4 w-4 text-amber-400" aria-hidden="true" />
                      Explosión de Receta y Costo P&amp;L
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-400">
                        PVP dejado de percibir:{' '}
                        <strong className="text-neutral-200">
                          {formatCOP(simulacionProducto.precioVentaPerdidoCOP)}
                        </strong>
                      </span>
                      <span className="font-bold text-red-400 font-display text-sm">
                        Costo Bodega: {formatCOP(simulacionProducto.costoTotalInsumosCOP)}
                      </span>
                    </div>
                  </div>

                  {simulacionProducto.tieneEscandallo ? (
                    <div className="space-y-1.5 pt-1 border-t border-neutral-800">
                      {simulacionProducto.desgloseInsumos.map((item) => (
                        <div
                          key={item.insumoId}
                          className="flex items-center justify-between text-[11px] rounded-lg bg-neutral-900/90 px-2.5 py-1.5"
                        >
                          <span className="text-neutral-200 font-medium">
                            {item.insumoNombre}{' '}
                            <span className="text-red-400 font-bold">
                              (-{item.cantidadTotalMerma} {item.unidad})
                            </span>
                          </span>
                          <div className="flex items-center gap-3 text-neutral-400">
                            <span>
                              {item.stockActual} ➔ <strong className="text-white">{item.stockPosterior}</strong>
                            </span>
                            <span className="font-mono text-red-300">
                              {formatCOP(item.costoTotalMermaCOP)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-200/80">
                      Este producto no tiene receta de insumos configurada. Se registrará el impacto
                      contable con costo de referencia sin descontar materias primas individuales.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Motivos de Merma */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Motivo Exacto de la Merma o Devolución
            </label>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {MOTIVOS_MERMA.map((m) => {
                const seleccionado = motivo === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={seleccionado}
                    onClick={() => setMotivo(m.id)}
                    className={`min-h-[44px] rounded-xl border p-2 text-left text-xs transition-all ${
                      seleccionado
                        ? 'border-red-500 bg-red-500/15 text-white font-semibold'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="font-semibold text-white truncate">{m.label}</div>
                    <div className="text-[10px] text-neutral-400 truncate">{m.descripcion}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Justificación / Detalle Forense (opcional)"
            placeholder="Ej: Hamburguesa quemada en parrilla por cambio de turno / cliente solicitó cambio..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px] px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={guardando}
              disabled={
                guardando ||
                (modo === 'insumo' ? !insumoActivo : !referenciaParsed)
              }
              className="min-h-[44px] px-5 bg-red-500 hover:bg-red-400 text-white font-bold border-0"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" aria-hidden="true" />
              <span>Registrar Merma / Devolución</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
