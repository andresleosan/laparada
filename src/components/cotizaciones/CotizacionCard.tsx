import {
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  FileText,
  Flame,
  MapPin,
  MessageCircle,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { CotizacionComercial, EstadoCotizacion } from '@/types';
import {
  ESTADOS_COTIZACION_META,
  formatearModalidadEntrega,
  formatearTipoEvento,
  obtenerEstadoEfectivoCotizacion,
} from '@/utils/cotizacionesUtils';
import { formatCOP } from '@/utils/formatCOP';

export interface CotizacionCardProps {
  cotizacion: CotizacionComercial;
  onVerPropuesta: (cotizacion: CotizacionComercial) => void;
  onEnviarWhatsApp: (cotizacion: CotizacionComercial) => void;
  onRegistrarAnticipo: (cotizacion: CotizacionComercial) => void;
  onEditar: (cotizacion: CotizacionComercial) => void;
  onConvertir: (cotizacion: CotizacionComercial) => void;
  onCambiarEstado?: (
    cotizacion: CotizacionComercial,
    nuevoEstado: Exclude<EstadoCotizacion, 'convertida'>
  ) => void;
  onEliminar?: (cotizacion: CotizacionComercial) => void;
  puedeEliminar?: boolean;
  procesando?: boolean;
}

export function CotizacionCard({
  cotizacion,
  onVerPropuesta,
  onEnviarWhatsApp,
  onRegistrarAnticipo,
  onEditar,
  onConvertir,
  onCambiarEstado,
  onEliminar,
  puedeEliminar = false,
  procesando = false,
}: CotizacionCardProps) {
  const estadoEfectivo = obtenerEstadoEfectivoCotizacion(cotizacion);
  const estadoMeta = ESTADOS_COTIZACION_META[estadoEfectivo];
  const tipoEvento = formatearTipoEvento(cotizacion.tipoEvento);
  const esConvertida = cotizacion.estado === 'convertida';
  const esRechazada = estadoEfectivo === 'rechazada';

  const porcentajeAnticipo =
    cotizacion.totalCotizado > 0
      ? Math.min(100, Math.round((cotizacion.anticipoMonto / cotizacion.totalCotizado) * 100))
      : 0;

  return (
    <article
      data-testid={`cotizacion-card-${cotizacion.id}`}
      className="flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/90 p-5 shadow-lg transition-all hover:border-gold-400/40"
    >
      <div className="space-y-4">
        {/* Cabecera: código, estado y monto total */}
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-gold-400/40 bg-gold-400/10 px-2.5 py-0.5 font-mono text-xs font-black text-gold-400">
                {cotizacion.codigo}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${estadoMeta.badgeClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${estadoMeta.dotClass}`} />
                {estadoMeta.label}
              </span>
              <span className="rounded-full border border-neutral-700 bg-neutral-950 px-2.5 py-0.5 text-xs font-semibold text-neutral-300">
                {tipoEvento.emoji} {tipoEvento.label}
              </span>
            </div>

            <h3 className="font-display text-lg font-black text-white truncate">
              {cotizacion.empresa || cotizacion.clienteNombre}
            </h3>
            <p className="text-xs text-neutral-400">
              {cotizacion.empresa ? (
                <>
                  Contacto: <strong className="text-neutral-200">{cotizacion.clienteNombre}</strong>
                  {cotizacion.nitEmpresa && ` · NIT ${cotizacion.nitEmpresa}`}
                </>
              ) : (
                <>Tel: {cotizacion.clienteTelefono}</>
              )}
              {cotizacion.empresa && ` · ${cotizacion.clienteTelefono}`}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Total Cotizado
            </p>
            <p className="font-display text-2xl font-black text-gold-400">
              {formatCOP(cotizacion.totalCotizado)}
            </p>
            {cotizacion.costoEstimadoInsumos > 0 && (
              <p className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                Margen {cotizacion.margenEstimadoPct}% ({formatCOP(cotizacion.utilidadEstimada)})
              </p>
            )}
          </div>
        </header>

        {/* Metadatos del evento */}
        <div className="grid grid-cols-1 gap-2 text-xs text-neutral-300 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-bold text-white">
                {cotizacion.fechaEvento}
                {cotizacion.horaEvento ? ` · ${cotizacion.horaEvento}` : ''}
              </p>
              <p className="text-[11px] text-neutral-500">
                Válida hasta {cotizacion.fechaVencimiento}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2">
            <Users className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-bold text-white">{cotizacion.invitados} invitados</p>
              <p className="truncate text-[11px] text-neutral-500">
                {formatearModalidadEntrega(cotizacion.modalidadEntrega)}
              </p>
            </div>
          </div>
        </div>

        {cotizacion.direccionEvento && (
          <p className="flex items-center gap-1.5 text-xs text-neutral-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
            <span className="truncate">
              {cotizacion.direccionEvento}
              {cotizacion.barrioEvento ? ` (${cotizacion.barrioEvento})` : ''}
            </span>
          </p>
        )}

        {/* Resumen de ítems */}
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3 space-y-1 text-xs">
          {cotizacion.items.slice(0, 3).map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 text-neutral-300">
              <span className="truncate">
                <strong className="text-white">{it.cantidad}×</strong> {it.nombre}
              </span>
              <span className="font-mono text-neutral-400 shrink-0">
                {formatCOP(it.subtotal)}
              </span>
            </div>
          ))}
          {cotizacion.items.length > 3 && (
            <p className="text-[11px] font-semibold text-gold-400">
              +{cotizacion.items.length - 3} ítems adicionales en la propuesta
            </p>
          )}
        </div>

        {/* Barra de Anticipo Offline vs Saldo */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-300">
              <Banknote className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              {cotizacion.anticipoMonto > 0 ? (
                <>
                  Anticipo {cotizacion.anticipoMetodo === 'efectivo' ? 'Efectivo' : 'Transferencia'}:{' '}
                  <strong className="text-emerald-300">
                    {formatCOP(cotizacion.anticipoMonto)}
                  </strong>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      cotizacion.anticipoEstado === 'verificado'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {cotizacion.anticipoEstado === 'verificado' ? 'Verificado' : 'Pendiente'}
                  </span>
                </>
              ) : (
                <span className="text-neutral-400">Sin anticipo registrado</span>
              )}
            </span>
            <span className="font-mono font-bold text-white">
              Saldo: {formatCOP(esConvertida ? 0 : cotizacion.saldoPendiente)}
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all ${
                esConvertida
                  ? 'bg-emerald-400'
                  : cotizacion.anticipoEstado === 'verificado'
                    ? 'bg-emerald-500'
                    : 'bg-amber-400'
              }`}
              style={{ width: `${esConvertida ? 100 : porcentajeAnticipo}%` }}
            />
          </div>

          {cotizacion.anticipoReferencia && (
            <p className="text-[11px] text-neutral-400">
              Comprobante / Ref: <span className="font-mono text-neutral-200">{cotizacion.anticipoReferencia}</span>
            </p>
          )}

          {esConvertida && cotizacion.ventaId && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-emerald-300 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Venta #{cotizacion.ventaId.slice(-6).toUpperCase()}</span>
              {cotizacion.comandaId && (
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5">
                  Comanda KDS enviada
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Acciones táctiles (min-h-[44px]) */}
      <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-3">
        <button
          type="button"
          onClick={() => onVerPropuesta(cotizacion)}
          disabled={procesando}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-xs font-bold text-neutral-200 hover:border-gold-400 hover:text-white"
        >
          <FileText className="h-4 w-4 text-gold-400" aria-hidden="true" />
          <span>Propuesta</span>
        </button>

        <button
          type="button"
          onClick={() => onEnviarWhatsApp(cotizacion)}
          disabled={procesando}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>WhatsApp</span>
        </button>

        {!esConvertida && !esRechazada && (
          <>
            <button
              type="button"
              onClick={() => onRegistrarAnticipo(cotizacion)}
              disabled={procesando}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-950/30 px-3 text-xs font-bold text-sky-300 hover:bg-sky-600 hover:text-white"
            >
              <Banknote className="h-4 w-4" aria-hidden="true" />
              <span>Anticipo</span>
            </button>

            <button
              type="button"
              onClick={() => onEditar(cotizacion)}
              disabled={procesando}
              aria-label={`Editar cotización ${cotizacion.codigo}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-gold-400 hover:text-white"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
            </button>

            {onCambiarEstado && estadoEfectivo !== 'aprobada' && (
              <button
                type="button"
                onClick={() => onCambiarEstado(cotizacion, 'aprobada')}
                disabled={procesando}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-black"
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
                <span>Aprobar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onConvertir(cotizacion)}
              disabled={procesando}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 text-xs font-black text-black transition-colors hover:bg-gold-500 disabled:opacity-50"
            >
              <Flame className="h-4 w-4" aria-hidden="true" />
              <span>Convertir a Venta + Comanda KDS (1 Clic)</span>
            </button>
          </>
        )}

        {!esConvertida && puedeEliminar && onEliminar && (
          <button
            type="button"
            onClick={() => onEliminar(cotizacion)}
            disabled={procesando}
            aria-label={`Eliminar cotización ${cotizacion.codigo}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-900/60 bg-red-950/30 text-red-400 hover:bg-red-600 hover:text-white"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </footer>
    </article>
  );
}
