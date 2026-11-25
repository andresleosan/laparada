import React, { useEffect, useId, useState } from 'react';
import { LifeBuoy, ShieldAlert, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import type { Domicilio } from '@/types';
import type {
  CanalIncidenteReclamo,
  CausaRaizReclamo,
  PrioridadReclamo,
  ReclamoPqrs,
  RegistrarReclamoInput,
  TipoPqrs,
} from '@/types/reclamo';
import { formatCOP } from '@/utils/formatCOP';
import {
  CANAL_INCIDENTE_META,
  CANAL_INCIDENTE_ORDEN,
  CAUSA_RAIZ_META,
  CAUSA_RAIZ_ORDEN,
  obtenerSlaObjetivoMin,
  PRIORIDAD_RECLAMO_META,
  PRIORIDAD_RECLAMO_ORDEN,
  TIPO_PQRS_META,
  TIPO_PQRS_ORDEN,
} from '@/utils/reclamosUtils';

export interface RegistrarReclamoModalProps {
  isOpen: boolean;
  onClose: () => void;
  domicilioInicial?: Domicilio | null;
  onRegistrarReclamo: (
    input: Omit<RegistrarReclamoInput, 'negocioId'>
  ) => Promise<ReclamoPqrs>;
  onSuccess?: (reclamo: ReclamoPqrs) => void;
}

export function RegistrarReclamoModal({
  isOpen,
  onClose,
  domicilioInicial,
  onRegistrarReclamo,
  onSuccess,
}: RegistrarReclamoModalProps) {
  const generatedId = useId();
  const titleId = `registrar-reclamo-${generatedId.replace(/:/g, '')}-title`;

  let registradoDefault = 'Operador Turno';
  let registradoRolDefault = 'cajero';
  try {
    const authCtx = useAuth();
    registradoDefault =
      authCtx.user?.displayName || authCtx.user?.email || registradoDefault;
  } catch {
    // Fallback seguro
  }
  try {
    const negCtx = useNegocio();
    if (negCtx.usuarioNegocio?.nombre) {
      registradoDefault = negCtx.usuarioNegocio.nombre;
    }
    if (negCtx.usuarioNegocio?.rol) {
      registradoRolDefault = negCtx.usuarioNegocio.rol;
    }
  } catch {
    // Fallback seguro
  }

  const [tipo, setTipo] = useState<TipoPqrs>('garantia_pedido');
  const [canal, setCanal] = useState<CanalIncidenteReclamo>('domicilio');
  const [causaRaiz, setCausaRaiz] = useState<CausaRaizReclamo>('demora_entrega');
  const [prioridad, setPrioridad] = useState<PrioridadReclamo>('alta');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [barrioEntrega, setBarrioEntrega] = useState('');
  const [mesaNombre, setMesaNombre] = useState('');
  const [repartidorNombre, setRepartidorNombre] = useState('');
  const [montoPedidoStr, setMontoPedidoStr] = useState('0');
  const [descripcion, setDescripcion] = useState('');
  const [registradoPor, setRegistradoPor] = useState(registradoDefault);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (domicilioInicial) {
      setTipo('garantia_pedido');
      setCanal('domicilio');
      setCausaRaiz('demora_entrega');
      setPrioridad('alta');
      setClienteNombre(domicilioInicial.clienteNombre || '');
      setClienteTelefono(domicilioInicial.clienteTelefono || '');
      setDireccionEntrega(domicilioInicial.direccion || '');
      setBarrioEntrega(domicilioInicial.barrio || '');
      setMesaNombre(domicilioInicial.mesaNumero || '');
      setRepartidorNombre(domicilioInicial.domiciliarioNombre || '');
      setMontoPedidoStr(String(Math.max(0, Math.round(domicilioInicial.total || 0))));
      setDescripcion('');
    } else {
      setTipo('reclamo');
      setCanal('domicilio');
      setCausaRaiz('pedido_incompleto');
      setPrioridad('alta');
      setClienteNombre('');
      setClienteTelefono('');
      setDireccionEntrega('');
      setBarrioEntrega('');
      setMesaNombre('');
      setRepartidorNombre('');
      setMontoPedidoStr('0');
      setDescripcion('');
    }
    setRegistradoPor(registradoDefault);
  }, [isOpen, domicilioInicial, registradoDefault]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clienteNombre.trim().length < 2) {
      createToast('Ingresa el nombre del cliente (mínimo 2 caracteres)', 'error');
      return;
    }
    if (descripcion.trim().length < 5) {
      createToast('Describe el incidente o solicitud (mínimo 5 caracteres)', 'error');
      return;
    }

    const montoNum = Number(montoPedidoStr);
    const montoPedidoCOP =
      Number.isFinite(montoNum) && montoNum >= 0 ? Math.round(montoNum) : 0;

    try {
      setGuardando(true);
      const creado = await onRegistrarReclamo({
        tipo,
        canal,
        causaRaiz,
        prioridad,
        slaObjetivoMin: obtenerSlaObjetivoMin(prioridad),
        clienteNombre: clienteNombre.trim(),
        ...(clienteTelefono.trim() ? { clienteTelefono: clienteTelefono.trim() } : {}),
        ...(direccionEntrega.trim() ? { direccionEntrega: direccionEntrega.trim() } : {}),
        ...(barrioEntrega.trim() ? { barrioEntrega: barrioEntrega.trim() } : {}),
        ...(domicilioInicial?.id ? { domicilioId: domicilioInicial.id } : {}),
        ...(domicilioInicial?.ventaId ? { ventaId: domicilioInicial.ventaId } : {}),
        ...(mesaNombre.trim() ? { mesaNombre: mesaNombre.trim() } : {}),
        ...(repartidorNombre.trim() ? { repartidorNombre: repartidorNombre.trim() } : {}),
        ...(domicilioInicial?.items && domicilioInicial.items.length > 0
          ? { itemsAfectados: domicilioInicial.items }
          : {}),
        montoPedidoCOP,
        descripcion: descripcion.trim(),
        registradoPor: registradoPor.trim() || registradoDefault,
        registradoRol: registradoRolDefault,
      });

      createToast(
        `Caso ${creado.codigoRadicado} radicado (${PRIORIDAD_RECLAMO_META[prioridad].label})`,
        'success'
      );
      onSuccess?.(creado);
      onClose();
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo radicar el reclamo',
        'error'
      );
    } finally {
      setGuardando(false);
    }
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
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gold-400/30 bg-neutral-900 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/40 bg-gold-400/15 text-gold-400">
              <LifeBuoy className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                {domicilioInicial
                  ? `Reclamo / Garantía · Pedido de ${domicilioInicial.clienteNombre}`
                  : 'Radicar Reclamo, PQRS o Garantía'}
              </h2>
              <p className="text-xs text-neutral-400">
                Seguimiento SLA en vivo y resolución offline trazable
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de registro de reclamo"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {domicilioInicial && (
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2.5 text-xs text-sky-200">
              Vinculado al domicilio #{domicilioInicial.id.slice(-6).toUpperCase()} · Total:{' '}
              <strong>{formatCOP(domicilioInicial.total)}</strong>
              {domicilioInicial.domiciliarioNombre
                ? ` · Repartidor: ${domicilioInicial.domiciliarioNombre}`
                : ''}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="pqrs-tipo"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Tipo PQRS
              </label>
              <select
                id="pqrs-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoPqrs)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                {TIPO_PQRS_ORDEN.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_PQRS_META[t].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pqrs-canal"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Canal de origen
              </label>
              <select
                id="pqrs-canal"
                value={canal}
                onChange={(e) => setCanal(e.target.value as CanalIncidenteReclamo)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                {CANAL_INCIDENTE_ORDEN.map((c) => (
                  <option key={c} value={c}>
                    {CANAL_INCIDENTE_META[c].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pqrs-causa"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Causa raíz
              </label>
              <select
                id="pqrs-causa"
                value={causaRaiz}
                onChange={(e) => setCausaRaiz(e.target.value as CausaRaizReclamo)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                {CAUSA_RAIZ_ORDEN.map((causa) => (
                  <option key={causa} value={causa}>
                    {CAUSA_RAIZ_META[causa].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-300">
              Prioridad y compromiso SLA
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRIORIDAD_RECLAMO_ORDEN.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={prioridad === p}
                  onClick={() => setPrioridad(p)}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                    prioridad === p
                      ? PRIORIDAD_RECLAMO_META[p].badgeClass
                      : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white'
                  }`}
                >
                  {PRIORIDAD_RECLAMO_META[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pqrs-cliente"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Nombre del cliente *
              </label>
              <input
                id="pqrs-cliente"
                type="text"
                required
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Ej: Carlos Ramírez"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="pqrs-telefono"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                WhatsApp / Teléfono
              </label>
              <input
                id="pqrs-telefono"
                type="tel"
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                placeholder="Ej: 3112223344"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="pqrs-direccion"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Dirección de entrega (si aplica)
              </label>
              <input
                id="pqrs-direccion"
                type="text"
                value={direccionEntrega}
                onChange={(e) => setDireccionEntrega(e.target.value)}
                placeholder="Ej: Av 1 # 12-40"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="pqrs-barrio"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Barrio / Mesa
              </label>
              <input
                id="pqrs-barrio"
                type="text"
                value={canal === 'salon' ? mesaNombre : barrioEntrega}
                onChange={(e) =>
                  canal === 'salon'
                    ? setMesaNombre(e.target.value)
                    : setBarrioEntrega(e.target.value)
                }
                placeholder={canal === 'salon' ? 'Ej: Mesa 4' : 'Ej: Caobos'}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="pqrs-monto"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Valor pedido (COP)
              </label>
              <input
                id="pqrs-monto"
                type="number"
                min={0}
                step={500}
                value={montoPedidoStr}
                onChange={(e) => setMontoPedidoStr(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="pqrs-repartidor"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Repartidor / Mesero
              </label>
              <input
                id="pqrs-repartidor"
                type="text"
                value={repartidorNombre}
                onChange={(e) => setRepartidorNombre(e.target.value)}
                placeholder="Opcional"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="pqrs-registra"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Radicado por *
              </label>
              <input
                id="pqrs-registra"
                type="text"
                required
                value={registradoPor}
                onChange={(e) => setRegistradoPor(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="pqrs-descripcion"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
            >
              Descripción del incidente o solicitud *
            </label>
            <textarea
              id="pqrs-descripcion"
              required
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Faltaron las salsas de ajo y la bebida llegó derramada en la bolsa..."
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm text-white focus:border-gold-400 focus:outline-none"
            />
          </div>

          {prioridad === 'critica' && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
              <span>
                Prioridad crítica: activa alerta operativa inmediata y registro en bitácora de auditoría.
              </span>
            </div>
          )}

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
              Radicar PQRS / Garantía
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
