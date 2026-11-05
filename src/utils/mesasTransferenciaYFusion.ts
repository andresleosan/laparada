import type {
  CuentaMesa,
  FusionMesasEvento,
  Mesa,
  PagoParcialMesa,
  RondaComanda,
  TrasladoMesaEvento,
} from '@/types/mesa';
import type { ItemVenta } from '@/types';
import { calcularConsolidadoItems, calcularTotalCuenta } from './mesasUtils';

/**
 * Valida si es técnicamente y operativamente posible trasladar la cuenta de una mesa a otra.
 */
export function validarTrasladoMesa(
  mesaOrigen: Mesa,
  mesaDestino: Mesa,
  cuenta: CuentaMesa
): { valido: boolean; error?: string } {
  if (!mesaOrigen || !mesaDestino || !cuenta) {
    return { valido: false, error: 'Faltan datos requeridos para el traslado.' };
  }

  if (mesaOrigen.negocioId !== mesaDestino.negocioId || mesaOrigen.negocioId !== cuenta.negocioId) {
    return { valido: false, error: 'Las mesas no pertenecen al mismo negocio.' };
  }

  if (mesaOrigen.id === mesaDestino.id) {
    return { valido: false, error: 'La mesa destino no puede ser la misma mesa de origen.' };
  }

  if (mesaOrigen.estado !== 'ocupada' && mesaOrigen.estado !== 'por_cobrar') {
    return { valido: false, error: 'La mesa de origen no tiene una cuenta activa para trasladar.' };
  }

  if (mesaOrigen.cuentaActivaId !== cuenta.id) {
    return { valido: false, error: 'La cuenta no coincide con la mesa de origen.' };
  }

  if (mesaDestino.estado !== 'libre' || Boolean(mesaDestino.cuentaActivaId)) {
    return {
      valido: false,
      error: `La mesa destino (${mesaDestino.nombre}) está ocupada. Solo puedes trasladar a una mesa libre.`,
    };
  }

  if (cuenta.estado !== 'abierta' && cuenta.estado !== 'por_cobrar') {
    return { valido: false, error: 'Solo se pueden trasladar cuentas abiertas o por cobrar.' };
  }

  return { valido: true };
}

/**
 * Crea el evento de auditoría para un traslado de mesa.
 */
export function crearEventoTraslado(
  mesaOrigen: Mesa,
  mesaDestino: Mesa,
  motivo?: string,
  operador?: string
): TrasladoMesaEvento {
  return {
    id: `traslado_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    mesaOrigenId: mesaOrigen.id,
    mesaOrigenNumero: mesaOrigen.numero,
    mesaOrigenNombre: mesaOrigen.nombre,
    mesaDestinoId: mesaDestino.id,
    mesaDestinoNumero: mesaDestino.numero,
    mesaDestinoNombre: mesaDestino.nombre,
    fecha: new Date(),
    motivo: motivo?.trim() || 'Cambio de mesa solicitado por el cliente',
    ...(operador ? { operador: operador.trim() } : {}),
  };
}

/**
 * Valida si es técnicamente y operativamente posible unir o fusionar dos mesas en el salón.
 */
export function validarFusionMesas(
  mesaPrincipal: Mesa,
  mesaSecundaria: Mesa,
  cuentaPrincipal: CuentaMesa,
  cuentaSecundaria: CuentaMesa
): { valido: boolean; error?: string } {
  if (!mesaPrincipal || !mesaSecundaria || !cuentaPrincipal || !cuentaSecundaria) {
    return { valido: false, error: 'Faltan datos requeridos para la unión de mesas.' };
  }

  if (
    mesaPrincipal.negocioId !== mesaSecundaria.negocioId ||
    mesaPrincipal.negocioId !== cuentaPrincipal.negocioId ||
    mesaPrincipal.negocioId !== cuentaSecundaria.negocioId
  ) {
    return { valido: false, error: 'Las mesas no pertenecen al mismo negocio.' };
  }

  if (mesaPrincipal.id === mesaSecundaria.id) {
    return { valido: false, error: 'No puedes fusionar una mesa consigo misma.' };
  }

  if (cuentaPrincipal.id === cuentaSecundaria.id) {
    return { valido: false, error: 'Las cuentas a fusionar deben ser diferentes.' };
  }

  if (mesaPrincipal.estado === 'libre' || !mesaPrincipal.cuentaActivaId) {
    return { valido: false, error: `La mesa principal (${mesaPrincipal.nombre}) no tiene una cuenta activa.` };
  }

  if (mesaSecundaria.estado === 'libre' || !mesaSecundaria.cuentaActivaId) {
    return { valido: false, error: `La mesa secundaria (${mesaSecundaria.nombre}) no tiene una cuenta activa.` };
  }

  if (cuentaPrincipal.estado !== 'abierta' && cuentaPrincipal.estado !== 'por_cobrar') {
    return { valido: false, error: 'La cuenta principal no se encuentra en estado editable.' };
  }

  if (cuentaSecundaria.estado !== 'abierta' && cuentaSecundaria.estado !== 'por_cobrar') {
    return { valido: false, error: 'La cuenta secundaria no se encuentra en estado editable.' };
  }

  return { valido: true };
}

export interface ResultadoFusionCuentas {
  itemsConsolidados: ItemVenta[];
  rondasCombinadas: RondaComanda[];
  nuevoTotal: number;
  nuevosComensales: number;
  pagosParcialesCombinados: PagoParcialMesa[];
  totalPagadoCombinado: number;
  saldoPendienteCombinado: number;
  eventoFusion: FusionMesasEvento;
}

/**
 * Combina de forma determinista y auditable dos cuentas abiertas de mesa.
 */
export function combinarCuentasMesas(
  cuentaPrincipal: CuentaMesa,
  cuentaSecundaria: CuentaMesa,
  motivo?: string,
  operador?: string
): ResultadoFusionCuentas {
  const rondasPrincipal = cuentaPrincipal.rondas || [];
  const rondasSecundaria = cuentaSecundaria.rondas || [];

  // Re-numerar las rondas de la mesa secundaria correlativamente
  const baseNumeroRonda = rondasPrincipal.length;
  const rondasSecundariaAjustadas: RondaComanda[] = rondasSecundaria.map((ronda, idx) => ({
    ...ronda,
    numero: baseNumeroRonda + idx + 1,
    notas: ronda.notas
      ? `[De ${cuentaSecundaria.mesaNombre}] ${ronda.notas}`
      : `[De ${cuentaSecundaria.mesaNombre}]`,
  }));

  const rondasCombinadas: RondaComanda[] = [...rondasPrincipal, ...rondasSecundariaAjustadas];
  const itemsConsolidados = calcularConsolidadoItems(rondasCombinadas);
  const nuevoTotal = calcularTotalCuenta(itemsConsolidados);

  const comensalesP = Math.max(1, cuentaPrincipal.comensales || 1);
  const comensalesS = Math.max(1, cuentaSecundaria.comensales || 1);
  const nuevosComensales = comensalesP + comensalesS;

  const abonosP = cuentaPrincipal.pagosParciales || [];
  const abonosS = (cuentaSecundaria.pagosParciales || []).map((abono) => ({
    ...abono,
    notas: abono.notas
      ? `[Abono en ${cuentaSecundaria.mesaNombre}] ${abono.notas}`
      : `[Abono original en ${cuentaSecundaria.mesaNombre}]`,
  }));
  const pagosParcialesCombinados: PagoParcialMesa[] = [...abonosP, ...abonosS];

  const totalPagadoCombinado = pagosParcialesCombinados.reduce((acc, p) => acc + (p.monto || 0), 0);
  const saldoPendienteCombinado = Math.max(0, nuevoTotal - totalPagadoCombinado);

  const eventoFusion: FusionMesasEvento = {
    id: `fusion_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    mesaSecundariaId: cuentaSecundaria.mesaId,
    mesaSecundariaNumero: cuentaSecundaria.mesaNumero,
    mesaSecundariaNombre: cuentaSecundaria.mesaNombre,
    cuentaSecundariaId: cuentaSecundaria.id,
    itemsFusionadosCount: cuentaSecundaria.items?.length || 0,
    totalFusionado: cuentaSecundaria.total || 0,
    fecha: new Date(),
    motivo: motivo?.trim() || 'Fusión de mesas por solicitud de comensales',
    ...(operador ? { operador: operador.trim() } : {}),
  };

  return {
    itemsConsolidados,
    rondasCombinadas,
    nuevoTotal,
    nuevosComensales,
    pagosParcialesCombinados,
    totalPagadoCombinado,
    saldoPendienteCombinado,
    eventoFusion,
  };
}
