import { Phone, MessageSquare, Plus, Edit2, Trash2, Building2, Calendar } from 'lucide-react';
import type { Proveedor, ResumenProveedorTotales } from '@/types/proveedor';
import { CATEGORIAS_PROVEEDOR_CONFIG, generarMensajeWhatsAppProveedor } from '@/utils/proveedoresUtils';
import { formatCOP } from '@/utils/formatCOP';

interface ProveedorCardProps {
  proveedor: Proveedor;
  resumen?: ResumenProveedorTotales;
  onEditar: (proveedor: Proveedor) => void;
  onNuevaFactura: (proveedor: Proveedor) => void;
  onEliminar: (proveedor: Proveedor) => void;
}

export function ProveedorCard({
  proveedor,
  resumen,
  onEditar,
  onNuevaFactura,
  onEliminar,
}: ProveedorCardProps) {
  const catConfig = CATEGORIAS_PROVEEDOR_CONFIG[proveedor.categoria] || CATEGORIAS_PROVEEDOR_CONFIG.otros;
  const saldoPendiente = resumen?.saldoPendiente || 0;
  const facturasPendientes = resumen?.facturasPendientes || 0;

  const telLimpio = proveedor.telefono.replace(/\D/g, '');
  const telWhatsApp = telLimpio.startsWith('57') ? telLimpio : `57${telLimpio}`;
  const mensajeWA = encodeURIComponent(generarMensajeWhatsAppProveedor(proveedor));
  const waUrl = `https://wa.me/${telWhatsApp}?text=${mensajeWA}`;

  return (
    <article
      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-gold-400/40 transition-all shadow-lg"
      aria-label={`Proveedor ${proveedor.nombre}`}
    >
      <div>
        {/* Cabecera: Categoría y Estado */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium border ${catConfig.badgeBg}`}
          >
            {catConfig.label}
          </span>

          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              proveedor.activo
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
            }`}
          >
            {proveedor.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Nombre y Contacto */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-gold-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-bold text-base sm:text-lg text-white truncate">
              {proveedor.nombre}
            </h3>
            {proveedor.contacto && (
              <p className="text-sm text-neutral-400 truncate">
                Contacto: <span className="text-neutral-300 font-medium">{proveedor.contacto}</span>
              </p>
            )}
            {proveedor.nit && (
              <p className="text-xs text-neutral-500 font-mono">
                NIT: {proveedor.nit}
              </p>
            )}
          </div>
        </div>

        {/* Resumen Financiero del Proveedor */}
        <div className="grid grid-cols-2 gap-2 my-3.5 p-3 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Saldo Pendiente
            </span>
            <span
              className={`font-display font-bold text-sm sm:text-base ${
                saldoPendiente > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {formatCOP(saldoPendiente)}
            </span>
            {facturasPendientes > 0 && (
              <span className="text-[11px] text-amber-500/90 block">
                {facturasPendientes} {facturasPendientes === 1 ? 'factura pendiente' : 'facturas pendientes'}
              </span>
            )}
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Plazo Crédito
            </span>
            <div className="flex items-center gap-1.5 text-neutral-300 text-sm font-medium mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <span>
                {proveedor.diasCreditoHabitual > 0
                  ? `${proveedor.diasCreditoHabitual} días`
                  : 'Contado'}
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 block truncate">
              Total: {formatCOP(resumen?.totalComprado || 0)}
            </span>
          </div>
        </div>

        {/* Dirección o notas */}
        {proveedor.direccion && (
          <p className="text-xs text-neutral-400 truncate mb-2">
            📍 {proveedor.direccion} {proveedor.ciudad ? `(${proveedor.ciudad})` : ''}
          </p>
        )}
      </div>

      {/* Barra de Acciones Táctiles (>= 44px) */}
      <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
        {/* Contacto rápido */}
        <div className="flex items-center gap-1.5">
          <a
            href={`tel:${proveedor.telefono}`}
            aria-label={`Llamar a ${proveedor.nombre}`}
            className="w-11 h-11 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center transition-colors border border-neutral-700"
          >
            <Phone className="w-4 h-4" />
          </a>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Escribir por WhatsApp a ${proveedor.nombre}`}
            className="w-11 h-11 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors border border-emerald-500/30"
          >
            <MessageSquare className="w-4 h-4" />
          </a>
        </div>

        {/* Acciones de gestión */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onNuevaFactura(proveedor)}
            className="h-11 px-3.5 rounded-lg bg-gold-400 hover:bg-gold-500 text-neutral-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Factura</span>
          </button>

          <button
            type="button"
            onClick={() => onEditar(proveedor)}
            aria-label={`Editar proveedor ${proveedor.nombre}`}
            className="w-11 h-11 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors border border-neutral-700"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onEliminar(proveedor)}
            aria-label={`Eliminar proveedor ${proveedor.nombre}`}
            className="w-11 h-11 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-colors border border-rose-500/20"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
