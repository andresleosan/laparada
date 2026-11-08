// src/utils/descuentosUtils.ts
import type {
  DescuentoAplicado,
  MotivoDescuentoDef,
  MotivoDescuentoId,
  TipoDescuento,
} from '@/types/descuento';
import { formatCOP } from './formatCOP';

/**
 * Catálogo de motivos predefinidos comunes en restaurantes y gastro-bares
 */
export const MOTIVOS_DESCUENTO_PREDEFINIDOS: MotivoDescuentoDef[] = [
  {
    id: 'cortesia_casa',
    label: 'Cortesía de la casa / Invitación',
    descripcion: 'Autorizada por administración o cortesía gastronómica',
  },
  {
    id: 'cliente_vip',
    label: 'Cliente VIP / Amigo de la casa',
    descripcion: 'Fidelización a clientes frecuentes y habituales',
  },
  {
    id: 'convenio_comercial',
    label: 'Convenio comercial / Alianza',
    descripcion: 'Descuento acordado con empresas aliadas o eventos',
  },
  {
    id: 'compensacion_servicio',
    label: 'Compensación de servicio',
    descripcion: 'Por demora justificada, cambio de plato o inconformidad',
  },
  {
    id: 'promocion_dia',
    label: 'Promoción del día / Happy Hour',
    descripcion: 'Campaña comercial o beneficio temporal del menú',
  },
  {
    id: 'staff_personal',
    label: 'Colaborador / Personal',
    descripcion: 'Beneficio interno de alimentación para el equipo',
  },
  {
    id: 'otro',
    label: 'Otro motivo autorizado',
    descripcion: 'Motivo específico registrado por el cajero/administrador',
  },
];

/**
 * Porcentajes rápidos recomendados para botones táctiles en POS
 */
export const PORCENTAJES_RAPIDOS_DESCUENTO = [5, 10, 15, 20, 50] as const;

/**
 * Calcula un descuento seguro garantizando que jamás sea negativo
 * ni supere el 100% del subtotal consumido.
 */
export function calcularDescuento(
  subtotal: number,
  tipo: TipoDescuento,
  valor: number,
  motivo = 'Descuento autorizado',
  motivoId?: MotivoDescuentoId,
  autorizadoPor?: string,
  promocionId?: string,
  codigoCupon?: string
): DescuentoAplicado {
  const subtotalSeguro = Number.isFinite(subtotal) ? Math.max(0, Math.round(subtotal)) : 0;
  let montoDescontadoCOP = 0;
  let valorSanitizado = 0;

  if (subtotalSeguro <= 0) {
    return {
      tipo,
      valor: 0,
      montoDescontadoCOP: 0,
      motivo: motivo.trim() || 'Descuento',
      motivoId,
      autorizadoPor: autorizadoPor?.trim() || undefined,
      promocionId,
      codigoCupon,
    };
  }

  if (tipo === 'cortesia_100') {
    valorSanitizado = 100;
    montoDescontadoCOP = subtotalSeguro;
  } else if (tipo === 'porcentaje') {
    const rawPct = Number(valor);
    valorSanitizado = Number.isFinite(rawPct) ? Math.min(100, Math.max(0, rawPct)) : 0;
    montoDescontadoCOP = Math.min(
      subtotalSeguro,
      Math.round((subtotalSeguro * valorSanitizado) / 100)
    );
  } else if (tipo === 'monto_fijo') {
    const rawMonto = Number(valor);
    valorSanitizado = Number.isFinite(rawMonto) ? Math.max(0, Math.round(rawMonto)) : 0;
    montoDescontadoCOP = Math.min(subtotalSeguro, valorSanitizado);
  }

  return {
    tipo,
    valor: valorSanitizado,
    montoDescontadoCOP,
    motivo: motivo.trim() || 'Descuento autorizado',
    motivoId,
    autorizadoPor: autorizadoPor?.trim() || undefined,
    promocionId,
    codigoCupon,
  };
}

/**
 * Calcula de forma consolidada el subtotal, descuento, propina y total a pagar.
 */
export function calcularTotalesConDescuentoYPropina(
  subtotal: number,
  descuento?: DescuentoAplicado | null,
  propina = 0
): {
  subtotal: number;
  descuentoCOP: number;
  subtotalConDescuento: number;
  propina: number;
  total: number;
} {
  const subtotalSeguro = Number.isFinite(subtotal) ? Math.max(0, Math.round(subtotal)) : 0;
  const propinaSegura = Number.isFinite(propina) ? Math.max(0, Math.round(propina)) : 0;

  const rawDescuento = descuento?.montoDescontadoCOP ?? 0;
  const descuentoCOP = Number.isFinite(rawDescuento)
    ? Math.min(subtotalSeguro, Math.max(0, Math.round(rawDescuento)))
    : 0;

  const subtotalConDescuento = Math.max(0, subtotalSeguro - descuentoCOP);
  const total = subtotalConDescuento + propinaSegura;

  return {
    subtotal: subtotalSeguro,
    descuentoCOP,
    subtotalConDescuento,
    propina: propinaSegura,
    total,
  };
}

/**
 * Formatea un texto conciso del descuento para tickets y resúmenes
 */
export function formatearDetalleDescuento(descuento: DescuentoAplicado): string {
  if (descuento.tipo === 'cortesia_100') {
    return `Cortesía 100% (${descuento.motivo}): -${formatCOP(descuento.montoDescontadoCOP)}`;
  }
  if (descuento.tipo === 'porcentaje') {
    return `Descuento ${descuento.valor}% (${descuento.motivo}): -${formatCOP(descuento.montoDescontadoCOP)}`;
  }
  return `Descuento fijo (${descuento.motivo}): -${formatCOP(descuento.montoDescontadoCOP)}`;
}

/**
 * Resuelve la etiqueta legible de un motivo de descuento
 */
export function obtenerMotivoDescuentoLabel(
  motivoId?: MotivoDescuentoId | string,
  fallbackMotivo?: string
): string {
  if (motivoId) {
    const encontrado = MOTIVOS_DESCUENTO_PREDEFINIDOS.find((m) => m.id === motivoId);
    if (encontrado) return encontrado.label;
  }
  return fallbackMotivo?.trim() || 'Descuento autorizado';
}

