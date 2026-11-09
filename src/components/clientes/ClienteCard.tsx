import {
  Phone,
  MapPin,
  Sparkles,
  ExternalLink,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Gift,
  Send,
  Award,
  Star,
} from 'lucide-react';
import type { Cliente } from '@/types';
import {
  calcularTicketPromedioCliente,
  formatearTelefonoVisual,
  obtenerEnlaceWhatsAppCliente,
} from '@/utils/clienteUtils';
import {
  evaluarNivelFidelizacion,
  evaluarEstadoRiesgoCliente,
  calcularProgresoTarjetaSellos,
} from '@/utils/fidelizacionUtils';
import { formatCOP } from '@/utils/formatCOP';
import { formatFecha } from '@/utils/dateUtils';

interface ClienteCardProps {
  cliente: Cliente;
  onVerDetalle: (cliente: Cliente) => void;
  onEditar: (cliente: Cliente) => void;
  onEliminar: (cliente: Cliente) => void;
  onLanzarCampana?: (cliente: Cliente) => void;
}

export function ClienteCard({
  cliente,
  onVerDetalle,
  onEditar,
  onEliminar,
  onLanzarCampana,
}: ClienteCardProps) {
  const nivel = evaluarNivelFidelizacion(cliente);
  const riesgo = evaluarEstadoRiesgoCliente(cliente);
  const progresoSellos = calcularProgresoTarjetaSellos(
    cliente.sellosActuales,
    cliente.metaSellos,
    cliente.recompensasDisponibles,
    cliente.recompensasRedimidas
  );
  const ticketPromedio = calcularTicketPromedioCliente(cliente);
  const enlaceWa = obtenerEnlaceWhatsAppCliente(cliente.telefono);
  const iniciales = cliente.nombre
    ? cliente.nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    : 'CL';

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 sm:p-5 shadow-lg transition-all hover:border-neutral-700">
      <div className="space-y-3">
        {/* Encabezado: Avatar + Nombre + Badges de Nivel y Riesgo + WhatsApp */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-400/10 font-display font-bold text-gold-400 border border-gold-400/20">
              {iniciales}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-bold text-white truncate max-w-[160px] sm:max-w-[200px]">
                  {cliente.nombre}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${nivel.badgeCls}`}
                >
                  {nivel.label}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold border flex items-center gap-1 ${riesgo.badgeCls}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${riesgo.dotCls}`} />
                  {riesgo.label}
                </span>
                {typeof cliente.calificacionPromedio === 'number' && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold border flex items-center gap-1 ${
                      cliente.calificacionPromedio >= 4
                        ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    <span>{cliente.calificacionPromedio.toFixed(1)}★</span>
                  </span>
                )}
              </div>
              <p className="flex items-center gap-1 text-xs text-neutral-400 mt-0.5">
                <Phone className="h-3 w-3 text-neutral-500" />
                {formatearTelefonoVisual(cliente.telefono)}
              </p>
            </div>
          </div>

          <a
            href={enlaceWa}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300 transition-colors"
            aria-label={`Abrir chat de WhatsApp con ${cliente.nombre}`}
            title="Escribir por WhatsApp"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Mini barra de sellos y recompensas */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-[11px] font-bold text-neutral-300">
              <Award className="h-3.5 w-3.5 text-gold-400" />
              Sellos acumulados:
            </span>
            <span className="font-display text-xs font-bold text-gold-400">
              {progresoSellos.sellosActuales} / {progresoSellos.metaSellos}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {Array.from({ length: progresoSellos.metaSellos }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full ${
                  i < progresoSellos.sellosActuales
                    ? 'bg-gradient-to-r from-gold-400 to-amber-500'
                    : 'bg-neutral-800'
                }`}
              />
            ))}
          </div>

          {progresoSellos.recompensasDisponibles > 0 && (
            <div className="pt-1 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <Gift className="h-3.5 w-3.5 text-emerald-400" />
                {progresoSellos.recompensasDisponibles} recompensa(s) lista(s)
              </span>
              <span className="text-[10px] text-emerald-300 underline cursor-pointer" onClick={() => onVerDetalle(cliente)}>
                Canjear
              </span>
            </div>
          )}
        </div>

        {/* Métricas: Pedidos + Consumido + Ticket Promedio */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 p-2.5 text-center">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">Pedidos</p>
            <p className="font-display text-sm font-bold text-white mt-0.5">{cliente.totalPedidos}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">Total</p>
            <p className="font-display text-xs font-bold text-gold-400 mt-0.5 truncate">
              {formatCOP(cliente.totalConsumido)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">Promedio</p>
            <p className="font-display text-xs font-bold text-neutral-300 mt-0.5 truncate">
              {formatCOP(ticketPromedio)}
            </p>
          </div>
        </div>

        {/* Datos adicionales: Dirección / Barrio / Fecha */}
        <div className="space-y-1 text-xs text-neutral-400">
          {cliente.direcciones.length > 0 && (
            <p className="flex items-center gap-1.5 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
              <span className="truncate">{cliente.direcciones[0]}</span>
              {cliente.barrio && <span className="text-neutral-500">({cliente.barrio})</span>}
            </p>
          )}

          <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            <Calendar className="h-3 w-3 shrink-0" />
            Último pedido: {formatFecha(cliente.ultimoPedidoEn)} ({riesgo.diasInactivo}d)
          </p>
        </div>

        {/* "Lo de siempre" preview */}
        {cliente.loDeSiempre && cliente.loDeSiempre.items.length > 0 && (
          <div className="rounded-xl border border-gold-400/20 bg-gold-400/5 px-2.5 py-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-gold-400 truncate">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {cliente.loDeSiempre.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', ')}
              </span>
            </span>
            <span className="text-[11px] font-bold text-neutral-300 shrink-0 ml-2">
              {formatCOP(cliente.loDeSiempre.total)}
            </span>
          </div>
        )}
      </div>

      {/* Botones de acción accesibles */}
      <div className="mt-4 flex items-center gap-2 border-t border-neutral-800 pt-3">
        <button
          type="button"
          onClick={() => onVerDetalle(cliente)}
          className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors"
          aria-label={`Ver historial y detalle de ${cliente.nombre}`}
        >
          <Eye className="h-4 w-4" />
          Ficha VIP
        </button>

        {onLanzarCampana && (
          <button
            type="button"
            onClick={() => onLanzarCampana(cliente)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300 transition-colors"
            aria-label={`Enviar mensaje o campaña por WhatsApp a ${cliente.nombre}`}
            title="Campaña WhatsApp"
          >
            <Send className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onEditar(cliente)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          aria-label={`Editar datos de ${cliente.nombre}`}
          title="Editar cliente"
        >
          <Edit2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onEliminar(cliente)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-500 hover:bg-red-950/40 hover:border-red-500/30 hover:text-red-400 transition-colors"
          aria-label={`Eliminar cliente ${cliente.nombre}`}
          title="Eliminar cliente"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
