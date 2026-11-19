import { useEffect, useId, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  MessageCircle,
  Wallet,
  X,
} from 'lucide-react';
import type { CuentaCorriente, MovimientoCartera } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import {
  evaluarEstadoCartera,
  generarCsvEstadoCuenta,
  generarMensajeEstadoCuentaWhatsApp,
  generarUrlWhatsAppCartera,
  getBadgeEstadoCartera,
  parseFechaCartera,
} from '@/utils/carteraUtils';

interface EstadoCuentaModalProps {
  isOpen: boolean;
  cuenta: CuentaCorriente | null;
  movimientos: MovimientoCartera[];
  negocioNombre: string;
  onClose: () => void;
  onRegistrarAbono: (cuenta: CuentaCorriente) => void;
}

export function EstadoCuentaModal({
  isOpen,
  cuenta,
  movimientos,
  negocioNombre,
  onClose,
  onRegistrarAbono,
}: EstadoCuentaModalProps) {
  const titleId = `modal-estado-cuenta-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const movimientosCuenta = useMemo(() => {
    if (!cuenta) return [];
    return movimientos
      .filter((m) => m.cuentaCorrienteId === cuenta.id)
      .sort((a, b) => {
        const fa = parseFechaCartera(a.fecha)?.getTime() || 0;
        const fb = parseFechaCartera(b.fecha)?.getTime() || 0;
        return fb - fa;
      });
  }, [cuenta, movimientos]);

  if (!isOpen || !cuenta) return null;

  const evaluacion = evaluarEstadoCartera(cuenta, movimientosCuenta);
  const badge = getBadgeEstadoCartera(evaluacion.estadoCartera);
  const mensajeWa = generarMensajeEstadoCuentaWhatsApp(cuenta, movimientosCuenta, negocioNombre);
  const urlWa = generarUrlWhatsAppCartera(cuenta.clienteTelefono, mensajeWa);

  const handleDescargarCsv = () => {
    const csv = generarCsvEstadoCuenta(cuenta, movimientosCuenta);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estado_cuenta_${cuenta.clienteNombre.toLowerCase().replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 p-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/30 bg-gold-400/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-gold-400">
                <FileSpreadsheet className="h-3 w-3" aria-hidden="true" />
                Estado de Cuenta
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badge.badgeCls}`}
              >
                {badge.label}
              </span>
            </div>
            <h2 id={titleId} className="font-display text-xl font-black text-white mt-1">
              {cuenta.clienteNombre}
            </h2>
            <p className="text-xs text-neutral-400">
              {cuenta.clienteTelefono}
              {cuenta.empresa ? ` · ${cuenta.empresa}` : ''}
              {cuenta.nit ? ` · NIT ${cuenta.nit}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar estado de cuenta"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Resumen financiero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Saldo Actual</p>
              <p className="font-display text-lg font-black text-gold-400 mt-0.5">
                {formatCOP(cuenta.saldoActual)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Cupo Total</p>
              <p className="font-display text-lg font-bold text-white mt-0.5">
                {formatCOP(cuenta.cupoCredito)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Disponible</p>
              <p className="font-display text-lg font-bold text-emerald-400 mt-0.5">
                {formatCOP(evaluacion.cupoDisponible)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Plazo / Mora</p>
              <p className="font-display text-base font-bold text-neutral-200 mt-0.5">
                {evaluacion.diasMora > 0
                  ? `${evaluacion.diasMora}d mora`
                  : `${cuenta.plazoDias}d plazo`}
              </p>
            </div>
          </div>

          {/* Movimientos */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-2.5">
              Movimientos de Cuenta ({movimientosCuenta.length})
            </h3>
            {movimientosCuenta.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-950/60 p-6 text-center text-xs text-neutral-400">
                Aún no hay consumos ni abonos registrados en esta cuenta corriente.
              </div>
            ) : (
              <div className="space-y-2">
                {movimientosCuenta.map((mov) => {
                  const esAbono = mov.tipo === 'abono' || mov.tipo === 'ajuste_abono';
                  const fecha = parseFechaCartera(mov.fecha);
                  return (
                    <div
                      key={mov.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950/80 p-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
                            esAbono
                              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                              : 'border-amber-500/30 bg-amber-500/15 text-amber-400'
                          }`}
                        >
                          {esAbono ? (
                            <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">
                              {esAbono
                                ? `Abono (${mov.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'})`
                                : `Consumo Fiado${mov.mesaNombre ? ` · ${mov.mesaNombre}` : ''}`}
                            </span>
                            <span className="font-mono text-[10px] text-neutral-500">
                              {mov.codigoComprobante}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {fecha
                              ? fecha.toLocaleString('es-CO', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Sin fecha'}
                            {mov.referenciaTransferencia ? ` · Ref: ${mov.referenciaTransferencia}` : ''}
                            {mov.notas ? ` · ${mov.notas}` : ''}
                          </p>
                          {mov.items && mov.items.length > 0 && (
                            <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                              {mov.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`font-display text-sm font-black ${
                            esAbono ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {esAbono ? '-' : '+'}
                          {formatCOP(mov.monto)}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          Saldo: {formatCOP(mov.saldoResultante)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pie de acciones */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800 bg-neutral-950/90 p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDescargarCsv}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 text-xs font-bold text-neutral-200 hover:bg-neutral-700"
            >
              <Download className="h-4 w-4 text-gold-400" aria-hidden="true" />
              CSV
            </button>
            <a
              href={urlWa}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp
            </a>
          </div>

          {cuenta.saldoActual > 0 && (
            <button
              type="button"
              onClick={() => onRegistrarAbono(cuenta)}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-gold-400 px-4 text-xs font-black text-base-dark hover:bg-gold-500"
            >
              <Wallet className="h-4 w-4" aria-hidden="true" />
              Registrar Abono
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
