import React from 'react';
import {
  Ban,
  Percent,
  PackageMinus,
  SlidersHorizontal,
  Flame,
  Wallet,
  UserCheck,
  Fingerprint,
  Clock,
  User,
  Eye,
  Lock,
} from 'lucide-react';
import { formatCOP } from '@/utils/formatCOP';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import {
  CATEGORIAS_AUDITORIA_CATALOGO,
  SEVERIDAD_AUDITORIA_CATALOGO,
} from '@/utils/auditoriaUtils';
import type { CategoriaEventoAuditoria, EventoAuditoria } from '@/types';

interface EventoAuditoriaCardProps {
  evento: EventoAuditoria;
  onInspeccionar: (evento: EventoAuditoria) => void;
}

const ICONOS_CATEGORIA: Record<CategoriaEventoAuditoria, React.ElementType> = {
  anulacion_venta: Ban,
  cortesia_descuento: Percent,
  merma_inventario: PackageMinus,
  ajuste_inventario: SlidersHorizontal,
  cancelacion_comanda: Flame,
  descuadre_caja: Wallet,
  acceso_personal: UserCheck,
};

export const EventoAuditoriaCard: React.FC<EventoAuditoriaCardProps> = ({
  evento,
  onInspeccionar,
}) => {
  const catInfo = CATEGORIAS_AUDITORIA_CATALOGO[evento.categoria];
  const sevInfo = SEVERIDAD_AUDITORIA_CATALOGO[evento.severidad];
  const IconoCat = ICONOS_CATEGORIA[evento.categoria] || Fingerprint;

  const fechaObj = toValidAdminDate(evento.fecha);
  const fechaFormateada = fechaObj
    ? fechaObj.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Sin fecha';
  const horaFormateada = fechaObj
    ? fechaObj.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const esCritico = evento.severidad === 'critica';

  return (
    <div
      className={`group rounded-2xl border p-4 transition-all ${
        esCritico
          ? 'border-red-500/40 bg-gradient-to-r from-red-950/25 via-neutral-900 to-neutral-900 hover:border-red-500/60'
          : 'border-neutral-800 bg-neutral-900/90 hover:border-neutral-700'
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Columna Izquierda: Badges, Título, Descripción y Motivo */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Badge de Severidad */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${sevInfo.badgeClass}`}
            >
              <span className={`h-2 w-2 rounded-full ${sevInfo.dotClass}`} />
              {sevInfo.label}
            </span>

            {/* Badge de Categoría */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${catInfo.badgeClass}`}
            >
              <IconoCat className="h-3.5 w-3.5" />
              {catInfo.label}
            </span>

            {/* Huella Forense */}
            <span className="inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-0.5 font-mono text-[11px] text-neutral-300">
              <Fingerprint className="h-3 w-3 text-gold-400" />
              {evento.huellaForense}
            </span>

            {/* Indicador de Bitácora Inmutable */}
            {evento.origenRegistro === 'bitacora_inmutable' && (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                <Lock className="h-3 w-3" />
                Firma Inmutable
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-base font-bold text-white font-display">
              {evento.titulo}
            </h3>
            <span className="font-mono text-xs text-neutral-400">
              ({evento.codigoVisible})
            </span>
          </div>

          <p className="text-sm text-neutral-300 leading-relaxed">
            {evento.descripcion}
          </p>

          {evento.motivo && (
            <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950/90 px-3 py-1.5 text-xs text-neutral-300">
              <span className="font-semibold text-gold-400">Justificación:</span>
              <span>{evento.motivo}</span>
            </div>
          )}

          {/* Metadatos de Tiempo y Operador */}
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-neutral-500" />
              {fechaFormateada} {horaFormateada && `· ${horaFormateada}`}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gold-400" />
              <strong className="text-neutral-200">{evento.responsableNombre}</strong>
              {evento.responsableRol && (
                <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-neutral-300">
                  {evento.responsableRol}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Columna Derecha: Monto de Impacto Financiero y Acción de Inspección */}
        <div className="flex flex-row items-center justify-between gap-4 border-t border-neutral-800/80 pt-3 lg:flex-col lg:items-end lg:justify-center lg:border-t-0 lg:pt-0 shrink-0">
          <div className="text-left lg:text-right">
            <span className="block text-[11px] uppercase tracking-wider text-neutral-400">
              Impacto Auditado
            </span>
            <span
              className={`text-lg sm:text-xl font-black font-display ${
                evento.montoImpacto > 0 ? 'text-gold-400' : 'text-neutral-400'
              }`}
            >
              {evento.montoImpacto > 0
                ? formatCOP(evento.montoImpacto)
                : 'Sin impacto COP'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onInspeccionar(evento)}
            aria-label={`Inspeccionar certificado forense de ${evento.titulo}`}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/90 px-3.5 py-2 text-xs font-semibold text-white hover:border-gold-400/50 hover:bg-neutral-800 transition-colors"
          >
            <Eye className="h-4 w-4 text-gold-400" />
            <span>Certificado Forense</span>
          </button>
        </div>
      </div>
    </div>
  );
};
