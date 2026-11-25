import React, { useEffect, useId, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Gift,
  MessageCircle,
  Truck,
  Utensils,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import type {
  ReclamoPqrs,
  ResolverReclamoInput,
  TipoResolucionReclamo,
} from '@/types/reclamo';
import { formatCOP } from '@/utils/formatCOP';
import {
  construirUrlWhatsAppReclamo,
  TIPO_RESOLUCION_META,
  TIPO_RESOLUCION_ORDEN,
} from '@/utils/reclamosUtils';

export interface ResolverReclamoModalProps {
  isOpen: boolean;
  onClose: () => void;
  reclamo: ReclamoPqrs | null;
  nombreNegocio?: string;
  onResolverReclamo: (
    reclamoId: string,
    input: ResolverReclamoInput
  ) => Promise<ReclamoPqrs>;
  onMarcarWhatsApp?: (reclamoId: string) => Promise<void>;
}

const ICONOS_RESOLUCION: Record<TipoResolucionReclamo, React.ElementType> = {
  reenvio_domicilio: Truck,
  bono_cortesia: Gift,
  devolucion_caja: Banknote,
  reposicion_salon: Utensils,
  disculpa_seguimiento: CheckCircle2,
};

export function ResolverReclamoModal({
  isOpen,
  onClose,
  reclamo,
  nombreNegocio = 'La Parada',
  onResolverReclamo,
  onMarcarWhatsApp,
}: ResolverReclamoModalProps) {
  const generatedId = useId();
  const titleId = `resolver-reclamo-${generatedId.replace(/:/g, '')}-title`;

  let resueltoDefault = 'Administrador';
  let resueltoRolDefault = 'admin';
  try {
    const authCtx = useAuth();
    resueltoDefault =
      authCtx.user?.displayName || authCtx.user?.email || resueltoDefault;
  } catch {
    // Fallback seguro
  }
  try {
    const negCtx = useNegocio();
    if (negCtx.usuarioNegocio?.nombre) {
      resueltoDefault = negCtx.usuarioNegocio.nombre;
    }
    if (negCtx.usuarioNegocio?.rol) {
      resueltoRolDefault = negCtx.usuarioNegocio.rol;
    }
  } catch {
    // Fallback seguro
  }

  const [tipoResolucion, setTipoResolucion] =
    useState<TipoResolucionReclamo>('bono_cortesia');
  const [montoStr, setMontoStr] = useState('0');
  const [vigenciaBonoDiasStr, setVigenciaBonoDiasStr] = useState('30');
  const [autorizadoPor, setAutorizadoPor] = useState(resueltoDefault);
  const [direccionReenvio, setDireccionReenvio] = useState('');
  const [barrioReenvio, setBarrioReenvio] = useState('');
  const [resolucionNotas, setResolucionNotas] = useState('');
  const [resueltoPor, setResueltoPor] = useState(resueltoDefault);
  const [guardando, setGuardando] = useState(false);
  const [reclamoResuelto, setReclamoResuelto] = useState<ReclamoPqrs | null>(null);

  useEffect(() => {
    if (!isOpen || !reclamo) return;
    setReclamoResuelto(null);
    setTipoResolucion(
      reclamo.canal === 'domicilio' ? 'reenvio_domicilio' : 'bono_cortesia'
    );
    setMontoStr(String(Math.max(0, Math.round(reclamo.montoPedidoCOP || 10000))));
    setVigenciaBonoDiasStr('30');
    setAutorizadoPor(resueltoDefault);
    setDireccionReenvio(reclamo.direccionEntrega || '');
    setBarrioReenvio(reclamo.barrioEntrega || '');
    setResolucionNotas('');
    setResueltoPor(resueltoDefault);
  }, [isOpen, reclamo, resueltoDefault]);

  if (!isOpen || !reclamo) return null;

  const metaActual = TIPO_RESOLUCION_META[tipoResolucion];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resolucionNotas.trim().length < 3) {
      createToast('Describe la solución aplicada (mínimo 3 caracteres)', 'error');
      return;
    }

    const montoNum = Number(montoStr);
    const montoCompensacionCOP =
      Number.isFinite(montoNum) && montoNum >= 0 ? Math.round(montoNum) : 0;

    if (metaActual.requiereMonto && montoCompensacionCOP <= 0) {
      createToast('Indica un valor de compensación mayor a $0', 'error');
      return;
    }

    try {
      setGuardando(true);
      const res = await onResolverReclamo(reclamo.id, {
        tipoResolucion,
        montoCompensacionCOP,
        resolucionNotas: resolucionNotas.trim(),
        resueltoPor: resueltoPor.trim() || resueltoDefault,
        resueltoRol: resueltoRolDefault,
        autorizadoPor: autorizadoPor.trim() || resueltoDefault,
        vigenciaBonoDias: Math.max(1, Math.round(Number(vigenciaBonoDiasStr) || 30)),
        direccionReenvio: direccionReenvio.trim(),
        barrioReenvio: barrioReenvio.trim(),
      });
      setReclamoResuelto(res);
      createToast(`Caso ${res.codigoRadicado} resuelto con éxito`, 'success');
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo resolver el reclamo',
        'error'
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleAbrirWhatsApp = () => {
    if (!reclamoResuelto) return;
    const url = construirUrlWhatsAppReclamo(reclamoResuelto, nombreNegocio, 'resolucion');
    window.open(url, '_blank', 'noopener,noreferrer');
    void onMarcarWhatsApp?.(reclamoResuelto.id).catch(() => undefined);
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={() => {
        if (!guardando) onClose();
      }}
      canClose={!guardando}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-emerald-500/30 bg-neutral-900 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div>
            <h2 id={titleId} className="font-display text-lg font-bold text-white">
              Resolver Caso {reclamo.codigoRadicado}
            </h2>
            <p className="text-xs text-neutral-400">
              {reclamo.clienteNombre} · Pedido {formatCOP(reclamo.montoPedidoCOP)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de resolución"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {reclamoResuelto ? (
          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                <span>Resolución Offline Registrada</span>
              </div>
              <p className="text-xs text-neutral-200">{reclamoResuelto.resolucionNotas}</p>
              {reclamoResuelto.bonoCortesiaCodigo && (
                <p className="text-xs font-mono text-gold-300">
                  🎁 Vale emitido en /bonos: <strong>{reclamoResuelto.bonoCortesiaCodigo}</strong> ·{' '}
                  {formatCOP(reclamoResuelto.montoCompensacionCOP ?? 0)}
                </p>
              )}
              {reclamoResuelto.movimientoCajaCodigo && (
                <p className="text-xs font-mono text-rose-300">
                  💵 Egreso registrado en /caja: <strong>{reclamoResuelto.movimientoCajaCodigo}</strong> ·{' '}
                  {formatCOP(reclamoResuelto.montoCompensacionCOP ?? 0)}
                </p>
              )}
              {reclamoResuelto.reenvioDomicilioId && (
                <p className="text-xs font-mono text-sky-300">
                  🛵 Reenvío de garantía creado en /domicilios (#{reclamoResuelto.reenvioDomicilioId.slice(-6).toUpperCase()}) a $0
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleAbrirWhatsApp}
                className="min-h-[44px] border-emerald-500/40 text-emerald-300"
              >
                <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Notificar Solución por WhatsApp
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={onClose}
                className="min-h-[44px]"
              >
                Finalizar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-300">
                Acción de Garantía / Resolución Offline
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TIPO_RESOLUCION_ORDEN.map((tipoRes) => {
                  const meta = TIPO_RESOLUCION_META[tipoRes];
                  const Icon = ICONOS_RESOLUCION[tipoRes];
                  const seleccionado = tipoResolucion === tipoRes;
                  return (
                    <button
                      key={tipoRes}
                      type="button"
                      aria-pressed={seleccionado}
                      onClick={() => setTipoResolucion(tipoRes)}
                      className={`flex min-h-[54px] items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                        seleccionado
                          ? 'border-gold-400 bg-gold-400/15 text-white'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" />
                      <div>
                        <span className="block text-xs font-bold">{meta.label}</span>
                        <span className="block text-[11px] text-neutral-400">
                          {meta.descripcion}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {tipoResolucion === 'bono_cortesia' && (
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-gold-400/30 bg-gold-400/5 p-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="res-monto-bono"
                    className="mb-1 block text-xs font-bold text-gold-300"
                  >
                    Valor del Bono de Cortesía (COP) *
                  </label>
                  <input
                    id="res-monto-bono"
                    type="number"
                    min={1000}
                    step={500}
                    required
                    value={montoStr}
                    onChange={(e) => setMontoStr(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="res-vigencia-bono"
                    className="mb-1 block text-xs font-bold text-gold-300"
                  >
                    Vigencia del vale (días)
                  </label>
                  <input
                    id="res-vigencia-bono"
                    type="number"
                    min={1}
                    max={365}
                    value={vigenciaBonoDiasStr}
                    onChange={(e) => setVigenciaBonoDiasStr(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white"
                  />
                </div>
              </div>
            )}

            {tipoResolucion === 'devolucion_caja' && (
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="res-monto-caja"
                    className="mb-1 block text-xs font-bold text-rose-300"
                  >
                    Valor a devolver de Caja Menor (COP) *
                  </label>
                  <input
                    id="res-monto-caja"
                    type="number"
                    min={500}
                    step={500}
                    required
                    value={montoStr}
                    onChange={(e) => setMontoStr(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="res-autoriza"
                    className="mb-1 block text-xs font-bold text-rose-300"
                  >
                    Autorizado por *
                  </label>
                  <input
                    id="res-autoriza"
                    type="text"
                    required
                    value={autorizadoPor}
                    onChange={(e) => setAutorizadoPor(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white"
                  />
                </div>
              </div>
            )}

            {tipoResolucion === 'reenvio_domicilio' && (
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="res-dir-reenvio"
                    className="mb-1 block text-xs font-bold text-sky-300"
                  >
                    Dirección para reenvío ($0) *
                  </label>
                  <input
                    id="res-dir-reenvio"
                    type="text"
                    required
                    value={direccionReenvio}
                    onChange={(e) => setDireccionReenvio(e.target.value)}
                    placeholder="Ej: Av 1 # 12-40"
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="res-barrio-reenvio"
                    className="mb-1 block text-xs font-bold text-sky-300"
                  >
                    Barrio
                  </label>
                  <input
                    id="res-barrio-reenvio"
                    type="text"
                    value={barrioReenvio}
                    onChange={(e) => setBarrioReenvio(e.target.value)}
                    placeholder="Ej: Caobos"
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="res-responsable"
                  className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
                >
                  Resuelto por *
                </label>
                <input
                  id="res-responsable"
                  type="text"
                  required
                  value={resueltoPor}
                  onChange={(e) => setResueltoPor(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white"
                />
              </div>

              {(tipoResolucion === 'reenvio_domicilio' ||
                tipoResolucion === 'reposicion_salon') && (
                <div>
                  <label
                    htmlFor="res-costo-asumido"
                    className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
                  >
                    Costo estimado reposición (COP)
                  </label>
                  <input
                    id="res-costo-asumido"
                    type="number"
                    min={0}
                    step={500}
                    value={montoStr}
                    onChange={(e) => setMontoStr(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white"
                  />
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="res-notas"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Notas de cierre y acuerdo con el cliente *
              </label>
              <textarea
                id="res-notas"
                required
                rows={3}
                value={resolucionNotas}
                onChange={(e) => setResolucionNotas(e.target.value)}
                placeholder="Ej: Se emitió vale de cortesía por $15.000 y se confirmó recepción por WhatsApp."
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-800 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={guardando}
                className="min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={guardando}
                disabled={guardando}
                className="min-h-[44px]"
              >
                Confirmar Resolución Offline
              </Button>
            </div>
          </form>
        )}
      </div>
    </StorefrontDialog>
  );
}
