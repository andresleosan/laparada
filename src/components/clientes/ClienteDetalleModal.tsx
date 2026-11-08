import { useEffect, useState, useId } from 'react';
import {
  X,
  Phone,
  MapPin,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Receipt,
  FileText,
  Clock,
  Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { Cliente, Venta } from '@/types';
import { getHistorialVentasCliente } from '@/services/clientesService';
import {
  calcularTicketPromedioCliente,
  formatearTelefonoVisual,
  obtenerEnlaceWhatsAppCliente,
} from '@/utils/clienteUtils';
import {
  evaluarNivelFidelizacion,
  evaluarEstadoRiesgoCliente,
} from '@/utils/fidelizacionUtils';
import { formatCOP } from '@/utils/formatCOP';
import { formatFecha, formatHora } from '@/utils/dateUtils';
import { TarjetaSellosDigital } from './TarjetaSellosDigital';

interface ClienteDetalleModalProps {
  cliente: Cliente | null;
  negocioId: string;
  isOpen: boolean;
  onClose: () => void;
  onEditar?: (cliente: Cliente) => void;
  onCanjearRecompensa?: (clienteId: string) => Promise<void>;
  onAjustarSellos?: (clienteId: string, delta: number) => Promise<void>;
  onLanzarCampana?: (cliente: Cliente) => void;
}

export function ClienteDetalleModal({
  cliente,
  negocioId,
  isOpen,
  onClose,
  onEditar,
  onCanjearRecompensa,
  onAjustarSellos,
  onLanzarCampana,
}: ClienteDetalleModalProps) {
  const generatedId = useId();
  const titleId = `modal-detalle-cliente-${generatedId.replace(/:/g, '')}-title`;
  const navigate = useNavigate();

  const [historial, setHistorial] = useState<Venta[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    if (cliente && isOpen && negocioId) {
      setCargandoHistorial(true);
      getHistorialVentasCliente(negocioId, cliente.telefono)
        .then((ventas) => setHistorial(ventas))
        .catch((err) => {
          console.warn('Error cargando historial de compras:', err);
          setHistorial([]);
        })
        .finally(() => setCargandoHistorial(false));
    }
  }, [cliente, isOpen, negocioId]);

  if (!isOpen || !cliente) return null;

  const nivel = evaluarNivelFidelizacion(cliente);
  const riesgo = evaluarEstadoRiesgoCliente(cliente);
  const ticketPromedio = calcularTicketPromedioCliente(cliente);
  const enlaceWa = obtenerEnlaceWhatsAppCliente(cliente.telefono);

  const handleIrAlPOS = () => {
    onClose();
    navigate('/pos');
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl">
        {/* Cabecera */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-400/20 text-gold-400 font-display font-bold text-lg">
              {cliente.nombre.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id={titleId} className="font-display text-lg font-bold text-white">
                  {cliente.nombre}
                </h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${nivel.badgeCls}`}>
                  {nivel.label}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border flex items-center gap-1 ${riesgo.badgeCls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${riesgo.dotCls}`} />
                  {riesgo.label} ({riesgo.diasInactivo}d)
                </span>
              </div>
              <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                <Phone className="h-3.5 w-3.5 text-neutral-500" />
                {formatearTelefonoVisual(cliente.telefono)}
                <a
                  href={enlaceWa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 ml-1.5 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  WhatsApp
                </a>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Tarjeta Digital de Sellos VIP */}
          <TarjetaSellosDigital
            cliente={cliente}
            onCanjearRecompensa={onCanjearRecompensa}
            onAjustarSellos={onAjustarSellos}
          />

          {/* Banner de Campaña Rápida */}
          {onLanzarCampana && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-200">
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>¿Deseas enviar una campaña o mensaje directo a {cliente.nombre}?</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onLanzarCampana(cliente);
                }}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-base-dark font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Campaña WhatsApp
              </button>
            </div>
          )}

          {/* Métricas clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Pedidos</p>
              <p className="font-display text-xl font-bold text-white mt-1">{cliente.totalPedidos}</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Consumido</p>
              <p className="font-display text-lg font-bold text-gold-400 mt-1">{formatCOP(cliente.totalConsumido)}</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Ticket Promedio</p>
              <p className="font-display text-lg font-bold text-neutral-200 mt-1">{formatCOP(ticketPromedio)}</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Última compra</p>
              <p className="text-xs font-semibold text-neutral-300 mt-2 truncate">
                {formatFecha(cliente.ultimoPedidoEn)}
              </p>
            </div>
          </div>

          {/* Lo de siempre */}
          {cliente.loDeSiempre && cliente.loDeSiempre.items.length > 0 && (
            <div className="rounded-xl border border-gold-400/30 bg-gold-400/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gold-400">
                  <Sparkles className="h-4 w-4" />
                  "Lo de siempre" (Pedido habitual)
                </span>
                <span className="font-display font-bold text-sm text-gold-400">
                  {formatCOP(cliente.loDeSiempre.total)}
                </span>
              </div>
              <ul className="divide-y divide-neutral-800/60 text-xs text-neutral-300">
                {cliente.loDeSiempre.items.map((item, idx) => (
                  <li key={idx} className="py-1.5 flex justify-between items-center">
                    <span>
                      <strong className="text-white">{item.cantidad}x</strong> {item.nombre}
                    </span>
                    <span className="text-neutral-400 font-mono">{formatCOP(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleIrAlPOS}
                className="mt-3 w-full min-h-[44px] rounded-xl bg-gold-400/20 hover:bg-gold-400/30 border border-gold-400/40 text-gold-400 font-bold text-xs py-2 px-3 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="h-4 w-4" />
                Abrir POS y cargar pedido
              </button>
            </div>
          )}

          {/* Direcciones y Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-2">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-gold-400" />
                Direcciones Guardadas ({cliente.direcciones.length})
              </p>
              {cliente.direcciones.length > 0 ? (
                <ul className="text-xs text-neutral-300 space-y-1">
                  {cliente.direcciones.map((dir, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-gold-400 font-bold">•</span>
                      <span>{dir}</span>
                    </li>
                  ))}
                  {cliente.barrio && (
                    <li className="text-[11px] text-neutral-500 pt-1">
                      Barrio preferido: <span className="text-neutral-300">{cliente.barrio}</span>
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-neutral-500">Sin direcciones registradas.</p>
              )}
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-2">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-gold-400" />
                Notas y Preferencias
              </p>
              {cliente.notas ? (
                <p className="text-xs text-neutral-300 italic whitespace-pre-wrap">{cliente.notas}</p>
              ) : (
                <p className="text-xs text-neutral-500">Sin observaciones especiales.</p>
              )}
            </div>
          </div>

          {/* Historial de compras recientes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="h-4 w-4 text-gold-400" />
                Historial de Compras Recientes
              </h3>
              <span className="text-xs text-neutral-500">
                {historial.length} {historial.length === 1 ? 'venta' : 'ventas'} encontradas
              </span>
            </div>

            {cargandoHistorial ? (
              <div className="py-6 text-center text-xs text-neutral-400">
                Cargando historial de compras...
              </div>
            ) : historial.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {historial.map((venta) => {
                  const fechaVenta = venta.fecha ? new Date((venta.fecha as any).toDate ? (venta.fecha as any).toDate() : venta.fecha) : new Date();
                  return (
                    <div
                      key={venta.id}
                      className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono">{venta.id.slice(0, 8)}</span>
                          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] uppercase font-semibold text-neutral-300">
                            {venta.origen}
                          </span>
                          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] uppercase font-semibold text-neutral-300">
                            {venta.metodoPago}
                          </span>
                        </div>
                        <p className="text-neutral-400 text-[11px] mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-neutral-500" />
                          {formatFecha(fechaVenta)} · {formatHora(fechaVenta)}
                        </p>
                        <p className="text-neutral-300 text-[11px] mt-1 truncate max-w-sm">
                          {venta.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-display font-bold text-sm text-gold-400 block">
                          {formatCOP(venta.total)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/40 p-4 text-center text-xs text-neutral-500">
                Aún no hay compras asociadas al número de teléfono en este local.
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            {onEditar && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditar(cliente);
                }}
                className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors"
              >
                Editar Cliente
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl bg-gold-400 hover:bg-gold-500 px-5 py-2 text-xs font-bold text-base-dark transition-all ml-auto"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </StorefrontDialog>
  );
}
