import { useEffect, useId, useState } from 'react';
import { Banknote, CheckCircle2, MessageCircle, QrCode, Upload, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type {
  CotizacionComercial,
  EstadoAnticipoCotizacion,
  MetodoPago,
  RegistrarAnticipoCotizacionInput,
} from '@/types';
import {
  construirMensajeAnticipoCotizacionWhatsApp,
  normalizarTelefonoCotizacionWhatsApp,
} from '@/utils/cotizacionesUtils';
import { formatCOP } from '@/utils/formatCOP';

export interface RegistrarAnticipoCotizacionModalProps {
  cotizacion: CotizacionComercial | null;
  isOpen: boolean;
  negocioNombre?: string;
  responsableNombre?: string;
  procesando?: boolean;
  onClose: () => void;
  onGuardarAnticipo: (
    cotizacionId: string,
    input: RegistrarAnticipoCotizacionInput,
    fotoComprobante?: File | null
  ) => Promise<void>;
}

export function RegistrarAnticipoCotizacionModal({
  cotizacion,
  isOpen,
  negocioNombre = 'La Parada',
  responsableNombre = 'Administrador',
  procesando = false,
  onClose,
  onGuardarAnticipo,
}: RegistrarAnticipoCotizacionModalProps) {
  const titleId = `anticipo-cot-${useId().replace(/:/g, '')}`;
  const [monto, setMonto] = useState('0');
  const [metodo, setMetodo] = useState<MetodoPago>('transferencia');
  const [estadoAnticipo, setEstadoAnticipo] =
    useState<EstadoAnticipoCotizacion>('verificado');
  const [referencia, setReferencia] = useState('');
  const [aprobarAuto, setAprobarAuto] = useState(true);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !cotizacion) return;
    const sugerido =
      cotizacion.anticipoMonto > 0
        ? cotizacion.anticipoMonto
        : Math.round(cotizacion.totalCotizado * 0.5);
    setMonto(String(sugerido));
    setMetodo(cotizacion.anticipoMetodo || 'transferencia');
    setEstadoAnticipo(
      cotizacion.anticipoEstado === 'sin_anticipo' ? 'verificado' : cotizacion.anticipoEstado
    );
    setReferencia(cotizacion.anticipoReferencia || '');
    setAprobarAuto(true);
    setFotoFile(null);
    setError('');
  }, [isOpen, cotizacion]);

  if (!isOpen || !cotizacion) return null;

  const montoInt = Math.max(0, Math.round(Number(monto) || 0));
  const saldoResultante = Math.max(
    0,
    cotizacion.totalCotizado - (estadoAnticipo === 'sin_anticipo' ? 0 : montoInt)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (montoInt > cotizacion.totalCotizado) {
      setError('El anticipo no puede superar el total cotizado del evento.');
      return;
    }

    try {
      await onGuardarAnticipo(
        cotizacion.id,
        {
          anticipoMonto: montoInt,
          anticipoMetodo: metodo,
          anticipoEstado: montoInt === 0 ? 'sin_anticipo' : estadoAnticipo,
          anticipoReferencia: referencia.trim() || undefined,
          aprobarSiVerificado: aprobarAuto,
          responsableNombre,
        },
        fotoFile
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar anticipo');
    }
  };

  const abrirConfirmacionWhatsApp = () => {
    const cotSimulada: CotizacionComercial = {
      ...cotizacion,
      anticipoMonto: montoInt,
      anticipoMetodo: metodo,
      anticipoEstado: estadoAnticipo,
      anticipoReferencia: referencia.trim() || undefined,
      saldoPendiente: saldoResultante,
    };
    const texto = construirMensajeAnticipoCotizacionWhatsApp(cotSimulada, negocioNombre);
    const tel = normalizarTelefonoCotizacionWhatsApp(cotizacion.clienteTelefono);
    const url = tel
      ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      canClose={!procesando}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-3xl border border-neutral-800 bg-[#0A0A0A] p-6 text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
              <Banknote className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-black text-white">
                Anticipo Offline · {cotizacion.codigo}
              </h2>
              <p className="text-xs text-neutral-400">
                {cotizacion.empresa || cotizacion.clienteNombre} · Total{' '}
                <strong className="text-gold-400">{formatCOP(cotizacion.totalCotizado)}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={procesando}
            aria-label="Cerrar modal de anticipo"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Presets de porcentaje */}
          <div className="flex flex-wrap gap-2">
            {[30, 50, 100].map((pct) => {
              const valor = Math.round((cotizacion.totalCotizado * pct) / 100);
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setMonto(String(valor))}
                  className="min-h-[40px] flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs font-bold text-neutral-200 hover:border-gold-400 hover:text-gold-300"
                >
                  {pct}% ({formatCOP(valor)})
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="font-semibold text-neutral-300">Monto del Anticipo (COP)</span>
              <input
                type="number"
                min={0}
                max={cotizacion.totalCotizado}
                step={1000}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 font-display text-base font-bold text-gold-400 focus:border-gold-400 focus:outline-none"
              />
            </label>

            <label className="space-y-1 text-xs">
              <span className="font-semibold text-neutral-300">Estado de Verificación</span>
              <select
                value={estadoAnticipo}
                onChange={(e) => setEstadoAnticipo(e.target.value as EstadoAnticipoCotizacion)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                <option value="verificado">Verificado en cuenta / caja</option>
                <option value="pendiente">Pendiente por verificar</option>
                <option value="sin_anticipo">Sin anticipo</option>
              </select>
            </label>
          </div>

          {/* Selector táctil de método offline */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-neutral-300">Método de Pago Offline</span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                aria-pressed={metodo === 'transferencia'}
                onClick={() => setMetodo('transferencia')}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-colors ${
                  metodo === 'transferencia'
                    ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                }`}
              >
                <QrCode className="h-4 w-4" aria-hidden="true" />
                <span>Transferencia / Nequi</span>
              </button>
              <button
                type="button"
                aria-pressed={metodo === 'efectivo'}
                onClick={() => setMetodo('efectivo')}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-colors ${
                  metodo === 'efectivo'
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                }`}
              >
                <Banknote className="h-4 w-4" aria-hidden="true" />
                <span>Efectivo en Caja</span>
              </button>
            </div>
          </div>

          <label className="block space-y-1 text-xs">
            <span className="font-semibold text-neutral-300">
              Número de Comprobante / Referencia (Opcional)
            </span>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: Bancolombia #458921 · Nequi 315..."
              className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
            />
          </label>

          {metodo === 'transferencia' && (
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed border-neutral-700 bg-neutral-950 px-3.5 py-3 text-xs text-neutral-300 hover:border-gold-400">
              <span className="flex items-center gap-2 truncate">
                <Upload className="h-4 w-4 text-gold-400 shrink-0" />
                {fotoFile ? fotoFile.name : 'Adjuntar captura de transferencia (opcional)'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
              />
              <span className="rounded-lg bg-neutral-800 px-2.5 py-1 text-[11px] font-bold text-white">
                Elegir
              </span>
            </label>
          )}

          <label className="flex items-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-200 cursor-pointer">
            <input
              type="checkbox"
              checked={aprobarAuto}
              onChange={(e) => setAprobarAuto(e.target.checked)}
              className="h-4 w-4 rounded accent-gold-400"
            />
            <span>Aprobar automáticamente la cotización al verificar el anticipo</span>
          </label>

          {/* Resumen de saldo */}
          <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3">
            <div>
              <p className="text-[11px] text-neutral-400">Saldo pendiente por liquidar</p>
              <p className="font-display text-2xl font-black text-emerald-400">
                {formatCOP(saldoResultante)}
              </p>
            </div>
            {montoInt > 0 && (
              <button
                type="button"
                onClick={abrirConfirmacionWhatsApp}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600/20 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Recibo WA</span>
              </button>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/50 bg-red-950/50 p-3 text-xs font-semibold text-red-200"
            >
              {error}
            </div>
          )}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={procesando}
              className="min-h-[44px] flex-1 rounded-xl border border-neutral-700 bg-neutral-900 text-xs font-bold text-neutral-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando}
              className="inline-flex min-h-[44px] flex-[1.5] items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 text-xs font-black text-black hover:bg-gold-500 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>{procesando ? 'Guardando...' : 'Guardar Anticipo Offline'}</span>
            </button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
