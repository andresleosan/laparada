import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CreditCard,
  FileSpreadsheet,
  Lock,
  MessageCircle,
  Phone,
  Settings2,
  Wallet,
} from 'lucide-react';
import type { FilaCarteraVencida } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { formatearTelefonoVisual } from '@/utils/clienteUtils';
import {
  getBadgeEstadoCartera,
  getEtiquetaBucketMora,
} from '@/utils/carteraUtils';

interface CuentaCorrienteCardProps {
  fila: FilaCarteraVencida;
  onRegistrarAbono: () => void;
  onVerEstadoCuenta: () => void;
  onConfigurarCupo: () => void;
  onEnviarRecordatorioWhatsApp: () => void;
}

export function CuentaCorrienteCard({
  fila,
  onRegistrarAbono,
  onVerEstadoCuenta,
  onConfigurarCupo,
  onEnviarRecordatorioWhatsApp,
}: CuentaCorrienteCardProps) {
  const { cuenta, evaluacion } = fila;
  const badge = getBadgeEstadoCartera(evaluacion.estadoCartera);
  const usoClamp = Math.min(100, Math.max(0, evaluacion.porcentajeUso));

  const barColor =
    evaluacion.estadoCartera === 'vencida' || evaluacion.estadoCartera === 'bloqueada'
      ? 'bg-red-500'
      : usoClamp >= 85
        ? 'bg-amber-400'
        : 'bg-gold-400';

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 sm:p-5 shadow-lg transition-all hover:border-neutral-700">
      <div className="space-y-3.5">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-base font-bold text-white truncate">
                {cuenta.clienteNombre}
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badge.badgeCls}`}
              >
                {cuenta.estado === 'bloqueada' && <Lock className="h-3 w-3" aria-hidden="true" />}
                {badge.label}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3 text-neutral-500" aria-hidden="true" />
                {formatearTelefonoVisual(cuenta.clienteTelefono)}
              </span>
              {cuenta.empresa && (
                <span className="inline-flex items-center gap-1 text-neutral-300">
                  <Building2 className="h-3 w-3 text-gold-400" aria-hidden="true" />
                  {cuenta.empresa}
                  {cuenta.nit ? ` · NIT ${cuenta.nit}` : ''}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onConfigurarCupo}
            aria-label={`Configurar cupo de ${cuenta.clienteNombre}`}
            title="Editar cupo y plazo"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-gold-400/50 hover:text-gold-400 transition-colors"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Saldos principales */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-neutral-800 bg-neutral-950/80 p-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Saldo Pendiente
            </p>
            <p
              className={`font-display text-base sm:text-lg font-black mt-0.5 ${
                cuenta.saldoActual > 0 ? 'text-gold-400' : 'text-emerald-400'
              }`}
            >
              {formatCOP(cuenta.saldoActual)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Cupo Total
            </p>
            <p className="font-display text-sm sm:text-base font-bold text-white mt-0.5">
              {formatCOP(cuenta.cupoCredito)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Disponible
            </p>
            <p className="font-display text-sm sm:text-base font-bold text-emerald-400 mt-0.5">
              {formatCOP(evaluacion.cupoDisponible)}
            </p>
          </div>
        </div>

        {/* Barra de utilización de cupo */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 text-neutral-400">
              <CreditCard className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
              Uso de cupo ({evaluacion.porcentajeUso}%)
            </span>
            <span className="text-neutral-400">Plazo: {cuenta.plazoDias} días</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${usoClamp}%` }}
            />
          </div>
        </div>

        {/* Alerta de vencimiento o mora */}
        {cuenta.saldoActual > 0 && (
          <div
            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
              evaluacion.diasMora > 0
                ? 'border-red-500/30 bg-red-950/30 text-red-200'
                : evaluacion.estadoCartera === 'por_vencer'
                  ? 'border-amber-500/30 bg-amber-950/30 text-amber-200'
                  : 'border-neutral-800 bg-neutral-950/60 text-neutral-300'
            }`}
          >
            <span className="inline-flex items-center gap-1.5 font-semibold">
              {evaluacion.diasMora > 0 ? (
                <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" aria-hidden="true" />
              ) : (
                <CalendarClock className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              )}
              {evaluacion.diasMora > 0
                ? `${evaluacion.diasMora} día(s) de mora · ${getEtiquetaBucketMora(evaluacion.bucketMora)}`
                : evaluacion.fechaVencimientoReferencia
                  ? `Vence el ${evaluacion.fechaVencimientoReferencia.toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                    })}`
                  : 'Saldo vigente'}
            </span>
            <span className="text-[11px] font-bold text-neutral-400">
              {cuenta.cantidadConsumos} cons. / {cuenta.cantidadAbonos} ab.
            </span>
          </div>
        )}
      </div>

      {/* Acciones táctiles */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-800 pt-3">
        <button
          type="button"
          onClick={onRegistrarAbono}
          disabled={cuenta.saldoActual <= 0}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold-400 px-3 text-xs font-black text-base-dark hover:bg-gold-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Wallet className="h-4 w-4" aria-hidden="true" />
          Registrar Abono
        </button>

        <button
          type="button"
          onClick={onVerEstadoCuenta}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-xs font-bold text-neutral-100 hover:bg-neutral-700 transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4 text-gold-400" aria-hidden="true" />
          Estado de Cuenta
        </button>

        <button
          type="button"
          onClick={onEnviarRecordatorioWhatsApp}
          className="col-span-2 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40 transition-colors"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {evaluacion.diasMora > 0
            ? 'Enviar Recordatorio de Cobro por WhatsApp'
            : 'Enviar Estado de Cuenta por WhatsApp'}
        </button>
      </div>
    </article>
  );
}
