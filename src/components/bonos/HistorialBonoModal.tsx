import { useEffect, useId, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CalendarClock,
  Download,
  History,
  Lock,
  Unlock,
  X,
} from 'lucide-react';
import type {
  BonoPrepago,
  CambiarEstadoBonoInput,
  MovimientoBono,
} from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import {
  evaluarEstadoBono,
  generarCsvMovimientosBonos,
  getBadgeEstadoBono,
  getEtiquetaTipoBono,
  parseFechaBono,
} from '@/utils/bonosUtils';

interface HistorialBonoModalProps {
  isOpen: boolean;
  bono: BonoPrepago | null;
  movimientos: MovimientoBono[];
  procesando?: boolean;
  onClose: () => void;
  onCambiarEstado: (input: CambiarEstadoBonoInput) => Promise<void>;
}

export function HistorialBonoModal({
  isOpen,
  bono,
  movimientos,
  procesando = false,
  onClose,
  onCambiarEstado,
}: HistorialBonoModalProps) {
  const titleId = `modal-historial-bono-${useId().replace(/:/g, '')}`;
  const [motivoAccion, setMotivoAccion] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setMotivoAccion('');
    setError('');
  }, [isOpen, bono]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const movimientosBono = useMemo(() => {
    if (!bono) return [];
    return movimientos
      .filter((m) => m.bonoId === bono.id)
      .sort((a, b) => {
        const fa = parseFechaBono(a.fecha)?.getTime() || 0;
        const fb = parseFechaBono(b.fecha)?.getTime() || 0;
        return fb - fa;
      });
  }, [bono, movimientos]);

  if (!isOpen || !bono) return null;

  const evaluacion = evaluarEstadoBono(bono);
  const badge = getBadgeEstadoBono(evaluacion.estadoEfectivo);

  const ejecutarAccion = async (
    accion: CambiarEstadoBonoInput['accion'],
    nuevaVigenciaDias?: number
  ) => {
    try {
      setError('');
      await onCambiarEstado({
        bonoId: bono.id,
        accion,
        motivo: motivoAccion.trim() || undefined,
        nuevaVigenciaDias,
      });
      setMotivoAccion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del bono');
    }
  };

  const handleDescargarCsv = () => {
    const csv = generarCsvMovimientosBonos(movimientosBono);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_${bono.codigo.toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/30 bg-gold-400/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-gold-400">
                <History className="h-3 w-3" aria-hidden="true" />
                {getEtiquetaTipoBono(bono.tipo)}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badge.badgeCls}`}
              >
                {badge.label}
              </span>
            </div>
            <h2 id={titleId} className="font-display text-xl font-black text-white mt-1">
              {bono.titularNombre} · <span className="font-mono text-gold-400">{bono.codigo}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar historial de bono"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Saldo Actual</p>
              <p className="font-display text-lg font-black text-emerald-400 mt-0.5">
                {formatCOP(bono.saldoActual)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Total Cargado</p>
              <p className="font-display text-lg font-bold text-white mt-0.5">
                {formatCOP(bono.totalCargadoHistorico)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Total Redimido</p>
              <p className="font-display text-lg font-bold text-gold-400 mt-0.5">
                {formatCOP(bono.totalRedimidoHistorico)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Vigencia</p>
              <p className="text-xs font-bold text-neutral-200 mt-1">
                {evaluacion.fechaVencimiento
                  ? evaluacion.fechaVencimiento.toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Sin vencimiento'}
              </p>
            </div>
          </div>

          {/* Controles administrativos de vigencia y seguridad */}
          {bono.estado !== 'anulado' && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                Control de Vigencia y Seguridad
              </p>
              <input
                type="text"
                value={motivoAccion}
                onChange={(e) => setMotivoAccion(e.target.value)}
                disabled={procesando}
                placeholder="Motivo de bloqueo, anulación o extensión (opcional)..."
                className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs text-white focus:border-gold-400 focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => void ejecutarAccion('extender_vigencia', 30)}
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40"
                >
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  Extender +30 días
                </button>
                <button
                  type="button"
                  disabled={procesando}
                  onClick={() =>
                    void ejecutarAccion(
                      bono.estado === 'bloqueado' ? 'desbloquear' : 'bloquear'
                    )
                  }
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 text-xs font-bold text-amber-300 hover:bg-amber-900/40"
                >
                  {bono.estado === 'bloqueado' ? (
                    <>
                      <Unlock className="h-4 w-4" aria-hidden="true" />
                      Desbloquear Bono
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Bloquear Preventivamente
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => void ejecutarAccion('anular')}
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/30 px-3 text-xs font-bold text-red-300 hover:bg-red-900/40"
                >
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  Anular Definitivamente
                </button>
              </div>
              {error && (
                <p role="alert" className="text-xs font-semibold text-red-300">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Ledger inmutable */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-2.5">
              Movimientos Auditados ({movimientosBono.length})
            </h3>
            {movimientosBono.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-950/60 p-6 text-center text-xs text-neutral-400">
                No hay movimientos registrados en este bono.
              </div>
            ) : (
              <div className="space-y-2">
                {movimientosBono.map((mov) => {
                  const esEntrada = mov.tipo === 'emision' || mov.tipo === 'recarga';
                  const esRedencion = mov.tipo === 'redencion';
                  const fecha = parseFechaBono(mov.fecha);

                  return (
                    <div
                      key={mov.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950/80 p-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
                            esEntrada
                              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                              : esRedencion
                                ? 'border-amber-500/30 bg-amber-500/15 text-amber-400'
                                : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          {esEntrada ? (
                            <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white capitalize">
                              {mov.tipo.replace('_', ' ')}
                              {mov.metodoPago ? ` (${mov.metodoPago})` : ''}
                              {mov.mesaNombre ? ` · ${mov.mesaNombre}` : ''}
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
                            {mov.referenciaTransferencia
                              ? ` · Ref: ${mov.referenciaTransferencia}`
                              : ''}
                            {mov.notas ? ` · ${mov.notas}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`font-display text-sm font-black ${
                            esEntrada
                              ? 'text-emerald-400'
                              : esRedencion
                                ? 'text-amber-300'
                                : 'text-neutral-300'
                          }`}
                        >
                          {esEntrada ? '+' : esRedencion ? '-' : ''}
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

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-950/90 p-4">
          <button
            type="button"
            onClick={handleDescargarCsv}
            disabled={movimientosBono.length === 0}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 text-xs font-bold text-neutral-200 hover:bg-neutral-700 disabled:opacity-40"
          >
            <Download className="h-4 w-4 text-gold-400" aria-hidden="true" />
            Exportar Auditoría CSV
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-800 px-4 text-xs font-bold text-neutral-200 hover:bg-neutral-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
