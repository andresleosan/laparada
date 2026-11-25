import { useId } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  ExternalLink,
  MessageCircle,
  Package,
  Phone,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import type { ReclamoEvaluado } from '@/types/reclamo';
import { formatCOP } from '@/utils/formatCOP';
import {
  CANAL_INCIDENTE_META,
  CAUSA_RAIZ_META,
  construirUrlWhatsAppReclamo,
  ESTADO_RECLAMO_META,
  PRIORIDAD_RECLAMO_META,
  SLA_RECLAMO_META,
  TIPO_PQRS_META,
  TIPO_RESOLUCION_META,
} from '@/utils/reclamosUtils';

export interface DetalleReclamoModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ReclamoEvaluado | null;
  nombreNegocio?: string;
  onMarcarWhatsApp?: (reclamoId: string) => Promise<void>;
  onAbrirResolver?: (item: ReclamoEvaluado) => void;
}

export function DetalleReclamoModal({
  isOpen,
  onClose,
  item,
  nombreNegocio = 'La Parada',
  onMarcarWhatsApp,
  onAbrirResolver,
}: DetalleReclamoModalProps) {
  const generatedId = useId();
  const titleId = `detalle-reclamo-${generatedId.replace(/:/g, '')}-title`;

  if (!isOpen || !item) return null;
  const { reclamo: r } = item;

  const handleWhatsApp = (modo: 'acuse' | 'resolucion') => {
    const url = construirUrlWhatsAppReclamo(r, nombreNegocio, modo);
    window.open(url, '_blank', 'noopener,noreferrer');
    void onMarcarWhatsApp?.(r.id).catch(() => undefined);
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-gold-400/40 bg-gold-400/15 px-2.5 py-0.5 font-mono text-xs font-bold text-gold-300">
                {r.codigoRadicado}
              </span>
              <span
                className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                  SLA_RECLAMO_META[item.semaforoSla].badgeClass
                }`}
              >
                {SLA_RECLAMO_META[item.semaforoSla].label}
              </span>
            </div>
            <h2 id={titleId} className="mt-1 font-display text-lg font-bold text-white">
              {r.clienteNombre}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle del reclamo"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                TIPO_PQRS_META[r.tipo].badgeClass
              }`}
            >
              {TIPO_PQRS_META[r.tipo].label}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                CANAL_INCIDENTE_META[r.canal].badgeClass
              }`}
            >
              {CANAL_INCIDENTE_META[r.canal].label}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                PRIORIDAD_RECLAMO_META[r.prioridad].badgeClass
              }`}
            >
              {PRIORIDAD_RECLAMO_META[r.prioridad].label}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                ESTADO_RECLAMO_META[r.estado].badgeClass
              }`}
            >
              {ESTADO_RECLAMO_META[r.estado].label}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 text-xs sm:grid-cols-2">
            <div>
              <span className="text-neutral-400">Causa raíz:</span>
              <p className="font-semibold text-white">
                {CAUSA_RAIZ_META[r.causaRaiz].label}
              </p>
            </div>
            <div>
              <span className="text-neutral-400">Tiempo SLA:</span>
              <p className="flex items-center gap-1 font-semibold text-white">
                <Clock className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
                {item.minutosTranscurridos} min transcurridos / {r.slaObjetivoMin} min meta
              </p>
            </div>
            <div>
              <span className="text-neutral-400">Valor pedido asociado:</span>
              <p className="font-display font-bold text-gold-300">
                {formatCOP(r.montoPedidoCOP)}
              </p>
            </div>
            <div>
              <span className="text-neutral-400">Contacto:</span>
              <p className="flex items-center gap-1 font-semibold text-white">
                <Phone className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                {r.clienteTelefono || 'No registrado'}
              </p>
            </div>
            {r.direccionEntrega && (
              <div className="sm:col-span-2">
                <span className="text-neutral-400">Dirección:</span>
                <p className="font-semibold text-neutral-200">
                  {r.direccionEntrega}
                  {r.barrioEntrega ? ` · Barrio ${r.barrioEntrega}` : ''}
                </p>
              </div>
            )}
            <div>
              <span className="text-neutral-400">Radicado por:</span>
              <p className="font-semibold text-neutral-200">{r.registradoPor}</p>
            </div>
            <div>
              <span className="text-neutral-400">Fecha:</span>
              <p className="font-mono text-neutral-200">{r.fechaIso}</p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-neutral-400">
              Descripción del caso
            </p>
            <p className="text-sm text-neutral-200">{r.descripcion}</p>
          </div>

          {r.itemsAfectados && r.itemsAfectados.length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold-300">
                <Package className="h-3.5 w-3.5" aria-hidden="true" />
                Ítems del pedido
              </p>
              <ul className="space-y-1 text-xs text-neutral-300">
                {r.itemsAfectados.map((it, idx) => (
                  <li key={`${it.referenciaId}-${idx}`}>
                    • {it.nombre} × {it.cantidad} ({formatCOP(it.subtotal)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {r.tipoResolucion && (
            <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-emerald-300">
                  Resuelto: {TIPO_RESOLUCION_META[r.tipoResolucion].label}
                </span>
                {typeof r.montoCompensacionCOP === 'number' && r.montoCompensacionCOP > 0 && (
                  <span className="font-mono font-bold text-white">
                    Compensación: {formatCOP(r.montoCompensacionCOP)}
                  </span>
                )}
              </div>
              {r.resolucionNotas && <p className="text-neutral-200">{r.resolucionNotas}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {r.bonoCortesiaCodigo && (
                  <Link
                    to="/bonos"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 rounded-lg border border-gold-400/40 bg-gold-400/10 px-2.5 py-1 font-mono font-bold text-gold-300"
                  >
                    Bono {r.bonoCortesiaCodigo}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                )}
                {r.movimientoCajaCodigo && (
                  <Link
                    to="/caja"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 font-mono font-bold text-rose-300"
                  >
                    Caja {r.movimientoCajaCodigo}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                )}
                {r.reenvioDomicilioId && (
                  <Link
                    to="/domicilios"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 font-mono font-bold text-sky-300"
                  >
                    Reenvío #{r.reenvioDomicilioId.slice(-6).toUpperCase()}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-800 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleWhatsApp(item.esActivo ? 'acuse' : 'resolucion')}
              className="min-h-[44px] border-emerald-500/40 text-emerald-300"
            >
              <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {item.esActivo ? 'Enviar Acuse WhatsApp' : 'Enviar Resolución WhatsApp'}
            </Button>

            {item.esActivo && onAbrirResolver && (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  onClose();
                  onAbrirResolver(item);
                }}
                className="min-h-[44px]"
              >
                Resolver Caso
              </Button>
            )}
          </div>
        </div>
      </div>
    </StorefrontDialog>
  );
}
