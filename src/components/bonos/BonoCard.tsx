import {
  AlertTriangle,
  CalendarClock,
  CreditCard,
  Gift,
  History,
  Lock,
  MessageCircle,
  Phone,
  PlusCircle,
  QrCode,
  Ticket,
  Unlock,
} from 'lucide-react';
import type { FilaAuditoriaBono } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { formatearTelefonoVisual } from '@/utils/clienteUtils';
import {
  getBadgeEstadoBono,
  getEtiquetaTipoBono,
} from '@/utils/bonosUtils';

interface BonoCardProps {
  fila: FilaAuditoriaBono;
  onVerQr: () => void;
  onRecargar: () => void;
  onVerHistorial: () => void;
  onCompartirWhatsApp: () => void;
  onToggleBloqueo: () => void;
}

export function BonoCard({
  fila,
  onVerQr,
  onRecargar,
  onVerHistorial,
  onCompartirWhatsApp,
  onToggleBloqueo,
}: BonoCardProps) {
  const { bono, evaluacion } = fila;
  const badge = getBadgeEstadoBono(evaluacion.estadoEfectivo);
  const disponiblePct = Math.min(100, Math.max(0, evaluacion.porcentajeDisponible));

  const barColor =
    evaluacion.estadoEfectivo === 'anulado' ||
    evaluacion.estadoEfectivo === 'bloqueado' ||
    evaluacion.estadoEfectivo === 'vencido'
      ? 'bg-red-500'
      : evaluacion.estadoEfectivo === 'por_vencer'
        ? 'bg-amber-400'
        : 'bg-emerald-400';

  const ModalidadIcon =
    bono.tipo === 'tarjeta_prepago'
      ? CreditCard
      : bono.tipo === 'vale_consumo'
        ? Ticket
        : Gift;

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 sm:p-5 shadow-lg transition-all hover:border-neutral-700">
      <div className="space-y-3.5">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/30 bg-gold-400/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-gold-300">
                <ModalidadIcon className="h-3 w-3" aria-hidden="true" />
                {getEtiquetaTipoBono(bono.tipo)}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badge.badgeCls}`}
              >
                {evaluacion.estadoEfectivo === 'bloqueado' && (
                  <Lock className="h-3 w-3" aria-hidden="true" />
                )}
                {badge.label}
              </span>
            </div>

            <h3 className="mt-1.5 text-base font-bold text-white truncate">
              {bono.titularNombre}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
              <span className="font-mono font-bold text-gold-400">{bono.codigo}</span>
              {bono.titularTelefono && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3 text-neutral-500" aria-hidden="true" />
                  {formatearTelefonoVisual(bono.titularTelefono)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onVerQr}
            aria-label={`Ver código QR de ${bono.codigo}`}
            title="Tarjeta digital y QR"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-gold-400 hover:border-gold-400/50 hover:bg-neutral-800 transition-colors"
          >
            <QrCode className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Saldos */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-neutral-800 bg-neutral-950/80 p-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Saldo Actual
            </p>
            <p
              className={`font-display text-base sm:text-lg font-black mt-0.5 ${
                bono.saldoActual > 0 ? 'text-emerald-400' : 'text-neutral-400'
              }`}
            >
              {formatCOP(bono.saldoActual)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Cargado
            </p>
            <p className="font-display text-sm sm:text-base font-bold text-white mt-0.5">
              {formatCOP(bono.totalCargadoHistorico)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Redimido
            </p>
            <p className="font-display text-sm sm:text-base font-bold text-gold-400 mt-0.5">
              {formatCOP(bono.totalRedimidoHistorico)}
            </p>
          </div>
        </div>

        {/* Barra de saldo disponible */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>Disponible: {evaluacion.porcentajeDisponible}%</span>
            <span>
              {bono.cantidadRedenciones} redenc. · {bono.cantidadRecargas} recarg.
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${disponiblePct}%` }}
            />
          </div>
        </div>

        {/* Vigencia / Alertas */}
        <div
          className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
            evaluacion.estaVencido
              ? 'border-red-500/30 bg-red-950/30 text-red-200'
              : evaluacion.estadoEfectivo === 'por_vencer'
                ? 'border-amber-500/30 bg-amber-950/30 text-amber-200'
                : 'border-neutral-800 bg-neutral-950/60 text-neutral-300'
          }`}
        >
          <span className="inline-flex items-center gap-1.5 font-semibold">
            {evaluacion.estaVencido || evaluacion.estadoEfectivo === 'por_vencer' ? (
              <AlertTriangle
                className={`h-3.5 w-3.5 shrink-0 ${
                  evaluacion.estaVencido ? 'text-red-400' : 'text-amber-400'
                }`}
                aria-hidden="true"
              />
            ) : (
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-gold-400" aria-hidden="true" />
            )}
            {evaluacion.estaVencido
              ? `Venció hace ${evaluacion.diasVencido} día(s)`
              : evaluacion.fechaVencimiento
                ? evaluacion.diasParaVencer !== null && evaluacion.diasParaVencer <= 7
                  ? `Vence en ${evaluacion.diasParaVencer} día(s)`
                  : `Vence el ${evaluacion.fechaVencimiento.toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}`
                : 'Sin fecha de vencimiento'}
          </span>
          <span className="text-[11px] font-bold text-neutral-400">
            {bono.recargable ? 'Recargable' : 'Uso único'}
          </span>
        </div>
      </div>

      {/* Acciones táctiles */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-800 pt-3">
        <button
          type="button"
          onClick={onRecargar}
          disabled={!evaluacion.puedeRecargar}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold-400 px-3 text-xs font-black text-base-dark hover:bg-gold-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Recargar Saldo
        </button>

        <button
          type="button"
          onClick={onVerHistorial}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-xs font-bold text-neutral-100 hover:bg-neutral-700 transition-colors"
        >
          <History className="h-4 w-4 text-gold-400" aria-hidden="true" />
          Auditoría
        </button>

        <button
          type="button"
          onClick={onCompartirWhatsApp}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40 transition-colors"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          WhatsApp
        </button>

        <button
          type="button"
          onClick={onToggleBloqueo}
          disabled={bono.estado === 'anulado'}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-bold text-neutral-300 hover:border-amber-400/40 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {bono.estado === 'bloqueado' ? (
            <>
              <Unlock className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              Activar
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 text-amber-400" aria-hidden="true" />
              Bloquear
            </>
          )}
        </button>
      </div>
    </article>
  );
}
