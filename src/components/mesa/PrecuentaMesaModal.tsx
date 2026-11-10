import React, { useState, useEffect, useId } from 'react';
import {
  Receipt,
  X,
  Banknote,
  Smartphone,
  Share2,
  Check,
  CheckCircle2,
  FileText,
  DollarSign,
} from 'lucide-react';
import type { CuentaMesa, MetodoPago } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import {
  calcularResumenCuentaMesa,
  generarTextoCompartirPrecuentaMesa,
} from '@/utils/menuMesaUtils';
import { createToast } from '@/components/ui/Toast';

export interface PrecuentaMesaModalProps {
  isOpen: boolean;
  mesaNumero: number;
  mesaNombre: string;
  cuenta: CuentaMesa | null;
  negocioNombre?: string;
  onClose: () => void;
  onSubmit: (params: {
    metodoPagoPreferido: MetodoPago;
    necesitaFactura?: boolean;
    datosFactura?: {
      nit: string;
      razonSocial: string;
    };
    notas?: string;
    clienteNombre?: string;
  }) => Promise<void>;
}

export const PrecuentaMesaModal: React.FC<PrecuentaMesaModalProps> = ({
  isOpen,
  mesaNumero,
  mesaNombre,
  cuenta,
  negocioNombre = 'La Parada',
  onClose,
  onSubmit,
}) => {
  const idPrefix = useId();
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [necesitaFactura, setNecesitaFactura] = useState(false);
  const [nit, setNit] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [notas, setNotas] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !enviando) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, enviando, onClose]);

  if (!isOpen || !cuenta) return null;

  const resumen = calcularResumenCuentaMesa(cuenta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;

    setEnviando(true);
    try {
      await onSubmit({
        metodoPagoPreferido: metodoPago,
        necesitaFactura,
        datosFactura: necesitaFactura && nit.trim() ? { nit: nit.trim(), razonSocial: razonSocial.trim() } : undefined,
        notas: notas.trim() || undefined,
        clienteNombre: clienteNombre.trim() || undefined,
      });
      setEnviadoExitoso(true);
      setTimeout(() => {
        setEnviadoExitoso(false);
        onClose();
      }, 2500);
    } finally {
      setEnviando(false);
    }
  };

  const handleCompartirWhatsApp = async () => {
    const texto = generarTextoCompartirPrecuentaMesa(cuenta, negocioNombre);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        createToast('Desglose de cuenta copiado', 'success');
        setTimeout(() => setCopiado(false), 2000);
      }
    } catch {
      // Ignorar fallo de portapapeles
    }
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${idPrefix}-title`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm transition-all"
    >
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 id={`${idPrefix}-title`} className="font-display text-lg font-bold text-white">
                Pre-Cuenta de Salón
              </h2>
              <p className="text-xs text-neutral-400">
                {mesaNombre || `Mesa ${mesaNumero}`} · Total {formatCOP(resumen.total)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            aria-label="Cerrar modal"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {enviadoExitoso ? (
          <div className="my-8 py-6 text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-bounce">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h3 className="text-xl font-black text-white font-display">
              ¡Solicitud Recibida!
            </h3>
            <p className="text-xs text-neutral-300 max-w-xs mx-auto">
              El personal de caja y servicio ya tiene la alerta y se acerca a tu mesa con tu cuenta y medio de pago seleccionado.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Desglose de Platos Consumidos */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block border-b border-neutral-800 pb-1.5">
                Platos y Bebidas Pedidos ({resumen.itemsCount})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-neutral-800/50">
                {(cuenta.items || []).map((it, idx) => (
                  <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-white">
                        {it.cantidad}x {it.nombre}
                      </span>
                      {it.notas && (
                        <span className="block text-[10px] text-amber-400/90 italic truncate">
                          {it.notas}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-neutral-300 shrink-0">
                      {formatCOP((Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totales y Propina sugerida */}
              <div className="border-t border-neutral-800 pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span>{formatCOP(resumen.subtotal)}</span>
                </div>
                {Boolean(cuenta.descuento && cuenta.descuento > 0) && (
                  <div className="flex justify-between text-amber-400 font-medium">
                    <span>Descuento ({cuenta.descuentoMotivo || 'Cortesía'})</span>
                    <span>-{formatCOP(cuenta.descuento || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-400">
                  <span>Propina voluntaria sugerida (10%)</span>
                  <span>{formatCOP(resumen.propinaSugerida)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-amber-400 pt-1 border-t border-neutral-800">
                  <span>Total sugerido</span>
                  <span>{formatCOP(resumen.total)}</span>
                </div>

                {resumen.totalPagado > 0 && (
                  <div className="flex justify-between text-xs font-bold text-emerald-400">
                    <span>Abonado previamente</span>
                    <span>-{formatCOP(resumen.totalPagado)}</span>
                  </div>
                )}
                {resumen.totalPagado > 0 && (
                  <div className="flex justify-between text-sm font-black text-white pt-1">
                    <span>Saldo pendiente</span>
                    <span>{formatCOP(resumen.saldoRestante)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Selector de Método de Pago Preferido */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                ¿Cómo prefieres pagar?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoPago('efectivo')}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border p-2.5 text-xs font-black transition-all ${
                    metodoPago === 'efectivo'
                      ? 'border-amber-400 bg-amber-500/15 text-white shadow-md'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Banknote className="h-4 w-4 text-emerald-400" />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoPago('transferencia')}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border p-2.5 text-xs font-black transition-all ${
                    metodoPago === 'transferencia'
                      ? 'border-amber-400 bg-amber-500/15 text-white shadow-md'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="h-4 w-4 text-sky-400" />
                  <span>Transferencia / Nequi</span>
                </button>
              </div>
            </div>

            {/* Opcional: Requiere Factura con NIT */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={necesitaFactura}
                  onChange={(e) => setNecesitaFactura(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-amber-400"
                />
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-400" />
                  ¿Requiere Factura con NIT?
                </span>
              </label>

              {necesitaFactura && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                    placeholder="NIT / Cédula"
                    className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    placeholder="Razón Social"
                    className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Nombre del Responsable */}
            <div>
              <label
                htmlFor={`${idPrefix}-nombre`}
                className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
              >
                Tu Nombre o Apodo (Opcional)
              </label>
              <input
                id={`${idPrefix}-nombre`}
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Ej: Familia Rodríguez..."
                maxLength={40}
                className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Notas para el Cobro */}
            <div>
              <label
                htmlFor={`${idPrefix}-notas`}
                className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
              >
                Observaciones para el cobro (Opcional)
              </label>
              <input
                id={`${idPrefix}-notas`}
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Pago con billete de $50.000, traer cambio..."
                maxLength={100}
                className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Acciones */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={enviando}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-black text-white shadow-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                <DollarSign className="h-4 w-4" />
                <span>{enviando ? 'Solicitando...' : 'Solicitar la Cuenta al Mesero'}</span>
              </button>

              <button
                type="button"
                onClick={handleCompartirWhatsApp}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-xs font-bold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                {copiado ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4 text-amber-400" />}
                <span>Compartir desglose por WhatsApp</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
