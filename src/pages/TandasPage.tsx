import React, { useState } from 'react';
import {
  Layers,
  Smartphone,
  CheckSquare,
  AlertTriangle,
  Sparkles,
  PlusCircle,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useProductos } from '@/hooks/useProductos';
import { useTandaVitrina } from '@/hooks/useTandaVitrina';
import { useCaja } from '@/hooks/useCaja';
import { formatCOP } from '@/utils/formatCOP';
import { formatHora } from '@/utils/dateUtils';
import { calcularTotalesItem } from '@/utils/tandaUtils';
import { createToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { ModalAperturaTanda } from '@/components/tandas/ModalAperturaTanda';
import { ModalAdicionMerma } from '@/components/tandas/ModalAdicionMerma';
import { ModalTransferenciaTanda } from '@/components/tandas/ModalTransferenciaTanda';
import { ModalCierreTanda } from '@/components/tandas/ModalCierreTanda';
import type { MetodoTransferenciaTanda, ResumenTanda } from '@/types/tanda';

export function TandasPage() {
  const { negocioActual, usuarioNegocio } = useNegocio();
  const { productos } = useProductos();
  const {
    tandaActiva,
    loading,
    iniciarTanda,
    agregarAdicion,
    registrarMerma,
    agregarProducto,
    registrarTransferencia,
    cerrarTanda,
  } = useTandaVitrina(negocioActual.id);
  const { cajaActual } = useCaja();

  // Modales
  const [modalAperturaOpen, setModalAperturaOpen] = useState(false);
  const [modalTransferenciaOpen, setModalTransferenciaOpen] = useState(false);
  const [modalCierreOpen, setModalCierreOpen] = useState(false);
  const [modalAdicionMermaState, setModalAdicionMermaState] = useState<{
    isOpen: boolean;
    modo: 'adicion' | 'merma';
    producto: { id: string; nombre: string } | null;
  }>({
    isOpen: false,
    modo: 'adicion',
    producto: null,
  });

  const handleAbrirTanda = async (items: Parameters<typeof iniciarTanda>[0], resp?: string) => {
    try {
      if (tandaActiva) {
        // Si ya hay una tanda activa, agregar los nuevos productos
        for (const item of items) {
          await agregarProducto(item);
        }
        createToast('Productos agregados a la tanda activa', 'success');
      } else {
        await iniciarTanda(
          items,
          cajaActual?.id,
          resp || usuarioNegocio?.nombre || 'Cajero'
        );
        createToast('Tanda de vitrina iniciada correctamente', 'success');
      }
    } catch {
      createToast('Error al procesar la tanda', 'error');
    }
  };

  const handleConfirmarAdicionMerma = async (cantidad: number, notaOMotivo?: string) => {
    const prod = modalAdicionMermaState.producto;
    if (!prod) return;

    if (modalAdicionMermaState.modo === 'adicion') {
      await agregarAdicion(prod.id, cantidad, notaOMotivo);
      createToast(`+${cantidad} unidades sumadas a ${prod.nombre}`, 'success');
    } else {
      await registrarMerma(prod.id, cantidad, notaOMotivo);
      createToast(`${cantidad} unidades mermadas de ${prod.nombre}`, 'info');
    }
  };

  const handleConfirmarTransferencia = async (
    monto: number,
    metodo: MetodoTransferenciaTanda,
    referencia?: string,
    fotoUrl?: string,
    nota?: string
  ) => {
    await registrarTransferencia(monto, metodo, referencia, fotoUrl, nota);
    createToast(`Transferencia de ${formatCOP(monto)} registrada`, 'success');
  };

  const handleConfirmarCierre = async (
    sobrantesMap: Record<string, number>,
    notasCierre?: string
  ): Promise<ResumenTanda> => {
    const resumen = await cerrarTanda(sobrantesMap, notasCierre);
    createToast(
      `Tanda cerrada con éxito. Venta estimada: ${formatCOP(resumen.totalVentaEstimada)}`,
      'success',
      4000
    );
    return resumen;
  };

  // Métricas rápidas de la tanda activa
  const metricas = React.useMemo(() => {
    if (!tandaActiva) return { totalPuesto: 0, totalMermas: 0, totalTransf: 0, prodsCount: 0 };

    let totalPuesto = 0;
    let totalMermas = 0;
    for (const it of tandaActiva.items) {
      const calc = calcularTotalesItem(it);
      totalPuesto += calc.totalPuesto;
      totalMermas += calc.totalMermas;
    }

    const totalTransf = (tandaActiva.transferencias || []).reduce((acc, t) => acc + (t.monto || 0), 0);

    return {
      totalPuesto,
      totalMermas,
      totalTransf,
      prodsCount: tandaActiva.items.length,
    };
  }, [tandaActiva]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Cabecera general */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white tracking-tight">
                Venta por Tandas y Vitrina
              </h1>
              <p className="text-xs text-neutral-400">
                Control de fritos y horneados por lote sin fricción paso a paso
              </p>
            </div>
          </div>
        </div>

        {tandaActiva && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalAperturaOpen(true)}
              className="text-xs gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              Agregar Producto
            </Button>

            <Button
              type="button"
              onClick={() => setModalTransferenciaOpen(true)}
              className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold"
            >
              <Smartphone className="h-4 w-4" />
              ⚡ Registrar Transferencia
            </Button>

            <Button
              type="button"
              onClick={() => setModalCierreOpen(true)}
              className="text-xs gap-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold"
            >
              <CheckSquare className="h-4 w-4" />
              Cerrar Tanda / Sacar Cuenta
            </Button>
          </div>
        )}
      </div>

      {/* ESTADO 1: SIN TANDA ACTIVA */}
      {!tandaActiva ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 sm:p-12 text-center max-w-2xl mx-auto">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mb-4">
            <Layers className="h-8 w-8" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">
            No hay una tanda de vitrina abierta
          </h2>
          <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
            Inicia una tanda seleccionando los productos de tu catálogo (pancerottis, empanadas,
            frituras) con sus cantidades iniciales. Durante el día podrás recargar nuevas hornadas,
            registrar transferencias de Nequi/Daviplata y al final sacar la cuenta contando los sobrantes.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              onClick={() => setModalAperturaOpen(true)}
              className="gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-6 py-2.5 text-sm"
            >
              <Sparkles className="h-4 w-4" />
              Abrir Tanda de Hoy
            </Button>
          </div>
        </div>
      ) : (
        /* ESTADO 2: TANDA ACTIVA EN CURSO */
        <div className="space-y-6">
          {/* Barra de estado y KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Estado de Vitrina</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Abierta
                </span>
              </div>
              <p className="mt-2 font-display text-xl font-bold text-white">
                {metricas.prodsCount} productos
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Iniciada {formatHora(tandaActiva.fecha.toDate())}
                {tandaActiva.responsable ? ` por ${tandaActiva.responsable}` : ''}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
              <span className="text-xs text-neutral-400">Total Unidades Puestas</span>
              <p className="mt-2 font-display text-xl font-bold text-amber-400">
                {metricas.totalPuesto} unds
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Iniciales + Recargas de cocina
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
              <span className="text-xs text-neutral-400">Mermas / Bajas</span>
              <p className="mt-2 font-display text-xl font-bold text-red-400">
                {metricas.totalMermas} unds
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Quemadas, caídas o cortesías
              </p>
            </div>

            <div className="rounded-xl border border-purple-900/50 bg-purple-950/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-300">Transferencias</span>
                <Smartphone className="h-4 w-4 text-purple-400" />
              </div>
              <p className="mt-2 font-display text-xl font-bold text-purple-300">
                {formatCOP(metricas.totalTransf)}
              </p>
              <p className="text-[11px] text-purple-400/80 mt-0.5">
                {tandaActiva.transferencias?.length || 0} transferencias recibidas
              </p>
            </div>
          </div>

          {/* Grilla de productos activos en vitrina */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-bold text-white">
                Productos en Vitrina ({tandaActiva.items.length})
              </h2>
              <span className="text-xs text-neutral-500">
                Presiona <strong>+ Recargar</strong> cuando cocina saque más unidades
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {tandaActiva.items.map((item) => {
                const calc = calcularTotalesItem(item);
                const netoPuesto = calc.totalPuesto - calc.totalMermas;

                return (
                  <div
                    key={item.productoId}
                    className="flex flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition-all hover:border-neutral-700"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white text-sm truncate">
                            {item.nombre}
                          </h3>
                          <span className="text-xs font-medium text-amber-400">
                            {formatCOP(item.precioUnitario)}
                          </span>
                        </div>
                        <span className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-mono font-bold text-white">
                          Neto: {netoPuesto}
                        </span>
                      </div>

                      {/* Desglose de unidades */}
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-950/60 p-2 text-xs">
                        <div className="text-center">
                          <span className="block text-[10px] text-neutral-400">Inicial</span>
                          <span className="font-bold text-neutral-200">{item.cantidadInicial}</span>
                        </div>
                        <span className="text-neutral-600">+</span>
                        <div className="text-center">
                          <span className="block text-[10px] text-emerald-400">Recargas</span>
                          <span className="font-bold text-emerald-400">
                            +{calc.totalAdiciones}
                          </span>
                        </div>
                        <span className="text-neutral-600">-</span>
                        <div className="text-center">
                          <span className="block text-[10px] text-red-400">Mermas</span>
                          <span className="font-bold text-red-400">-{calc.totalMermas}</span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones del producto */}
                    <div className="mt-4 flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                      <Button
                        type="button"
                        onClick={() =>
                          setModalAdicionMermaState({
                            isOpen: true,
                            modo: 'adicion',
                            producto: { id: item.productoId, nombre: item.nombre },
                          })
                        }
                        className="flex-1 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5"
                      >
                        + Recargar
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setModalAdicionMermaState({
                            isOpen: true,
                            modo: 'merma',
                            producto: { id: item.productoId, nombre: item.nombre },
                          })
                        }
                        className="text-xs text-red-400 hover:text-red-300 border-red-900/50 hover:bg-red-950/20 py-1.5 px-3"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Merma
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Registro de Transferencias Recibidas en la Tanda */}
          {tandaActiva.transferencias && tandaActiva.transferencias.length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-purple-400" />
                  <h3 className="font-bold text-sm text-white">
                    Transferencias Registradas en esta Tanda ({tandaActiva.transferencias.length})
                  </h3>
                </div>
                <span className="font-display font-bold text-sm text-purple-300">
                  Total: {formatCOP(metricas.totalTransf)}
                </span>
              </div>

              <div className="divide-y divide-neutral-800">
                {tandaActiva.transferencias.map((t) => (
                  <div key={t.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="uppercase font-bold text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded text-[10px]">
                        {t.metodo}
                      </span>
                      <span className="text-neutral-400">
                        {formatHora(t.hora.toDate())}
                      </span>
                      {t.referencia && (
                        <span className="text-neutral-500 font-mono">
                          Ref: {t.referencia}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-white">{formatCOP(t.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALES */}
      <ModalAperturaTanda
        isOpen={modalAperturaOpen}
        onClose={() => setModalAperturaOpen(false)}
        onConfirmar={handleAbrirTanda}
        productos={productos}
      />

      {tandaActiva && (
        <>
          <ModalAdicionMerma
            isOpen={modalAdicionMermaState.isOpen}
            onClose={() =>
              setModalAdicionMermaState((prev) => ({ ...prev, isOpen: false, producto: null }))
            }
            producto={modalAdicionMermaState.producto}
            modo={modalAdicionMermaState.modo}
            onConfirmar={handleConfirmarAdicionMerma}
          />

          <ModalTransferenciaTanda
            isOpen={modalTransferenciaOpen}
            onClose={() => setModalTransferenciaOpen(false)}
            onConfirmar={handleConfirmarTransferencia}
          />

          <ModalCierreTanda
            isOpen={modalCierreOpen}
            onClose={() => setModalCierreOpen(false)}
            tanda={tandaActiva}
            onConfirmar={handleConfirmarCierre}
          />
        </>
      )}
    </div>
  );
}
