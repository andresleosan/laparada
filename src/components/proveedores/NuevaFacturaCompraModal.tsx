import { useState, useEffect, useId, type FormEvent } from 'react';
import { Timestamp } from 'firebase/firestore';
import { X, Receipt, Plus, Trash2, Check } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type {
  Proveedor,
  ItemFacturaCompra,
  CondicionPagoFactura,
  CrearFacturaCompraInput,
} from '@/types/proveedor';
import type { Insumo } from '@/types';
import { calcularFechaVencimiento } from '@/utils/proveedoresUtils';
import { formatCOP } from '@/utils/formatCOP';

interface NuevaFacturaCompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<CrearFacturaCompraInput, 'negocioId'>) => Promise<unknown>;
  proveedores: Proveedor[];
  insumos?: Insumo[];
  proveedorPreseleccionado?: Proveedor | null;
  cargando?: boolean;
}

export function NuevaFacturaCompraModal({
  isOpen,
  onClose,
  onSubmit,
  proveedores,
  insumos = [],
  proveedorPreseleccionado,
  cargando = false,
}: NuevaFacturaCompraModalProps) {
  const generatedId = useId();
  const titleId = `modal-nueva-factura-${generatedId.replace(/:/g, '')}-title`;

  const [proveedorId, setProveedorId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaEmisionStr, setFechaEmisionStr] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [condicionPago, setCondicionPago] = useState<CondicionPagoFactura>('credito');
  const [diasCredito, setDiasCredito] = useState<number>(15);
  const [fechaVencimientoStr, setFechaVencimientoStr] = useState(
    () => new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [afectaInventario, setAfectaInventario] = useState(true);
  const [registrarGastoContado, setRegistrarGastoContado] = useState(true);
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState<ItemFacturaCompra[]>([
    {
      descripcion: '',
      cantidad: 1,
      unidad: 'kg',
      costoUnitario: 0,
      subtotal: 0,
    },
  ]);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Inicializar proveedor
  useEffect(() => {
    if (proveedorPreseleccionado) {
      setProveedorId(proveedorPreseleccionado.id);
      if (proveedorPreseleccionado.diasCreditoHabitual > 0) {
        setCondicionPago('credito');
        setDiasCredito(proveedorPreseleccionado.diasCreditoHabitual);
      } else {
        setCondicionPago('contado');
        setDiasCredito(0);
      }
    } else if (proveedores.length > 0 && !proveedorId) {
      setProveedorId(proveedores[0].id);
      const hab = proveedores[0].diasCreditoHabitual || 0;
      setCondicionPago(hab > 0 ? 'credito' : 'contado');
      setDiasCredito(hab);
    }
  }, [proveedorPreseleccionado, proveedores, isOpen]);

  // Recalcular vencimiento cuando cambia emisión o días de crédito
  useEffect(() => {
    if (condicionPago === 'contado') {
      setFechaVencimientoStr(fechaEmisionStr);
    } else {
      const emision = new Date(`${fechaEmisionStr}T12:00:00`);
      const venc = calcularFechaVencimiento(emision, diasCredito);
      setFechaVencimientoStr(venc.toISOString().split('T')[0]);
    }
  }, [fechaEmisionStr, condicionPago, diasCredito]);

  if (!isOpen) return null;

  const proveedorActual = proveedores.find((p) => p.id === proveedorId) || proveedorPreseleccionado;

  // Manejo dinámico de ítems
  const handleItemChange = (
    index: number,
    field: keyof ItemFacturaCompra,
    value: unknown
  ) => {
    setItems((prev) => {
      const copia = [...prev];
      const item = { ...copia[index], [field]: value };

      if (field === 'cantidad' || field === 'costoUnitario') {
        const cant = Math.max(0, Number(field === 'cantidad' ? value : item.cantidad) || 0);
        const costo = Math.max(0, Number(field === 'costoUnitario' ? value : item.costoUnitario) || 0);
        item.subtotal = cant * costo;
      }

      copia[index] = item;
      return copia;
    });
  };

  const handleSeleccionarInsumo = (index: number, insumoId: string) => {
    const insumo = insumos.find((i) => i.id === insumoId);
    if (!insumo) return;

    setItems((prev) => {
      const copia = [...prev];
      const prevItem = copia[index];
      const costo = insumo.costoUnitario || prevItem.costoUnitario || 0;
      copia[index] = {
        ...prevItem,
        insumoId: insumo.id,
        descripcion: insumo.nombre,
        unidad: insumo.unidad || 'kg',
        costoUnitario: costo,
        subtotal: prevItem.cantidad * costo,
      };
      return copia;
    });
  };

  const handleAgregarItem = () => {
    setItems((prev) => [
      ...prev,
      {
        descripcion: '',
        cantidad: 1,
        unidad: 'unidad',
        costoUnitario: 0,
        subtotal: 0,
      },
    ]);
  };

  const handleEliminarItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalCalculado = items.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!proveedorActual) {
      setErrorLocal('Selecciona un proveedor válido.');
      return;
    }

    const numLimpio = numeroFactura.trim();
    if (!numLimpio) {
      setErrorLocal('Ingresa el número de factura o remisión.');
      return;
    }

    if (totalCalculado <= 0) {
      setErrorLocal('El total de la factura debe ser mayor a $ 0 COP.');
      return;
    }

    const itemsValidos = items.filter((i) => i.descripcion.trim().length > 0 && i.cantidad > 0);
    if (itemsValidos.length === 0) {
      setErrorLocal('Agrega al menos un ítem o concepto con descripción y cantidad válida.');
      return;
    }

    const emisionDate = new Date(`${fechaEmisionStr}T12:00:00`);
    const vencimientoDate = new Date(`${fechaVencimientoStr}T12:00:00`);

    try {
      await onSubmit({
        proveedorId: proveedorActual.id,
        proveedorNombre: proveedorActual.nombre,
        numeroFactura: numLimpio,
        fechaEmision: Timestamp.fromDate(emisionDate),
        fechaVencimiento: Timestamp.fromDate(vencimientoDate),
        condicionPago,
        estado: condicionPago === 'contado' ? 'pagada' : 'pendiente',
        items: itemsValidos,
        subtotal: totalCalculado,
        total: totalCalculado,
        afectaInventario,
        registrarEntradaInventarioAutomatica: afectaInventario,
        registrarGastoContado,
        notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : 'Error al registrar la factura de compra.');
    }
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden my-6 mx-auto p-0"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 id={titleId} className="font-display font-bold text-lg text-white">
              Registrar Factura de Compra
            </h2>
            <p className="text-xs text-neutral-400">
              Registra compras de contado o a crédito con programación de vencimiento
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal de factura"
          className="w-10 h-10 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
        {errorLocal && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorLocal}
          </div>
        )}

        {/* Proveedor y N° Factura */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="fac-proveedor" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
              Proveedor <span className="text-gold-400">*</span>
            </label>
            <select
              id="fac-proveedor"
              required
              value={proveedorId}
              onChange={(e) => {
                const id = e.target.value;
                setProveedorId(id);
                const prov = proveedores.find((p) => p.id === id);
                if (prov) {
                  setDiasCredito(prov.diasCreditoHabitual || 0);
                  setCondicionPago((prov.diasCreditoHabitual || 0) > 0 ? 'credito' : 'contado');
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
            >
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.diasCreditoHabitual > 0 ? `(${p.diasCreditoHabitual}d)` : '(Contado)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="fac-numero" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
              N° Factura o Remisión <span className="text-gold-400">*</span>
            </label>
            <input
              id="fac-numero"
              type="text"
              required
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              placeholder="Ej: FAC-1049 o REM-2026"
              className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm font-mono focus:border-gold-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Condición de Pago y Fechas */}
        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Condición Comercial
            </span>
            <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setCondicionPago('contado')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  condicionPago === 'contado'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Contado (Inmediato)
              </button>
              <button
                type="button"
                onClick={() => setCondicionPago('credito')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  condicionPago === 'credito'
                    ? 'bg-gold-400/20 text-gold-300 border border-gold-400/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Crédito (A plazos)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label htmlFor="fac-emision" className="block text-xs text-neutral-400 mb-1">
                Fecha de Emisión
              </label>
              <input
                id="fac-emision"
                type="date"
                required
                value={fechaEmisionStr}
                onChange={(e) => setFechaEmisionStr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
              />
            </div>

            {condicionPago === 'credito' ? (
              <div>
                <label htmlFor="fac-vencimiento" className="block text-xs text-neutral-400 mb-1">
                  Fecha de Vencimiento ({diasCredito} días)
                </label>
                <input
                  id="fac-vencimiento"
                  type="date"
                  required
                  value={fechaVencimientoStr}
                  onChange={(e) => setFechaVencimientoStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
                />
              </div>
            ) : (
              <div className="flex items-center text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                Se marcará como pagada de inmediato en caja y Kardex.
              </div>
            )}
          </div>
        </div>

        {/* Tabla de Conceptos / Insumos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Conceptos de la Compra
            </span>
            <button
              type="button"
              onClick={handleAgregarItem}
              className="text-xs font-semibold text-gold-400 hover:text-gold-300 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar línea</span>
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
              >
                {/* Selector rápido si hay insumos en bodega */}
                {insumos.length > 0 && (
                  <div className="sm:col-span-4">
                    <select
                      value={item.insumoId || ''}
                      onChange={(e) => handleSeleccionarInsumo(index, e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-xs text-neutral-300 focus:border-gold-400 focus:outline-none"
                    >
                      <option value="">(Vincular a Insumo en Bodega...)</option>
                      {insumos.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.nombre} ({ins.unidad})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Descripción libre */}
                <div className={insumos.length > 0 ? 'sm:col-span-3' : 'sm:col-span-5'}>
                  <input
                    type="text"
                    required
                    placeholder="Descripción del insumo o producto"
                    value={item.descripcion}
                    onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-white text-xs placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
                  />
                </div>

                {/* Cantidad & Unidad */}
                <div className="sm:col-span-2 flex items-center gap-1">
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    placeholder="Cant."
                    value={item.cantidad || ''}
                    onChange={(e) => handleItemChange(index, 'cantidad', parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-white text-xs focus:border-gold-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Unid."
                    value={item.unidad || ''}
                    onChange={(e) => handleItemChange(index, 'unidad', e.target.value)}
                    className="w-14 px-1.5 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-white text-xs focus:border-gold-400 focus:outline-none text-center"
                  />
                </div>

                {/* Costo Unitario */}
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    placeholder="Costo COP"
                    value={item.costoUnitario || ''}
                    onChange={(e) => handleItemChange(index, 'costoUnitario', parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-white text-xs focus:border-gold-400 focus:outline-none text-right font-mono"
                  />
                </div>

                {/* Botón eliminar */}
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    disabled={items.length <= 1}
                    onClick={() => handleEliminarItem(index)}
                    aria-label={`Eliminar ítem ${index + 1}`}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total General de la Factura */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-gold-400/30 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold block">
              Total de la Compra
            </span>
            <span className="text-xs text-neutral-500">
              {items.length} {items.length === 1 ? 'concepto registrado' : 'conceptos registrados'}
            </span>
          </div>
          <span className="font-display font-black text-xl sm:text-2xl text-gold-400">
            {formatCOP(totalCalculado)}
          </span>
        </div>

        {/* Automatizaciones e Integraciones */}
        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={afectaInventario}
              onChange={(e) => setAfectaInventario(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-gold-400 focus:ring-gold-400"
            />
            <span className="text-xs text-neutral-300">
              📦 Ingresar automáticamente insumos vinculados al stock de bodega (Kardex de entradas)
            </span>
          </label>

          {condicionPago === 'contado' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={registrarGastoContado}
                onChange={(e) => setRegistrarGastoContado(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-gold-400 focus:ring-gold-400"
              />
              <span className="text-xs text-neutral-300">
                💰 Registrar de inmediato como egreso operativo en la sección Gastos (Insumos)
              </span>
            </label>
          )}
        </div>

        {/* Notas */}
        <div>
          <label htmlFor="fac-notas" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
            Notas u Observaciones
          </label>
          <input
            id="fac-notas"
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observaciones de calidad, transporte o entrega"
            className="w-full px-3.5 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:border-gold-400 focus:outline-none"
          />
        </div>

        {/* Botones de acción */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-sm transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={cargando || totalCalculado <= 0}
            className="h-11 px-6 rounded-lg bg-gold-400 hover:bg-gold-500 text-neutral-950 font-bold text-sm transition-colors shadow disabled:opacity-50 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{cargando ? 'Registrando...' : 'Confirmar Factura de Compra'}</span>
          </button>
        </div>
      </form>
    </StorefrontDialog>
  );
}
