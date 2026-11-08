import type {
  CategoriaEventoAuditoria,
  SeveridadAuditoria,
  EventoAuditoria,
  FiltrosAuditoria,
  MetricasAuditoria,
  NivelRiesgoOperativo,
  Venta,
  EntradaInventario,
  Insumo,
  CierreCaja,
  TurnoPersonal,
  ValePersonal,
} from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import { determinarTipoMovimiento } from '@/utils/kardexInventarioUtils';

export interface InfoCategoriaAuditoria {
  id: CategoriaEventoAuditoria;
  label: string;
  shortLabel: string;
  descripcion: string;
  badgeClass: string;
}

export const CATEGORIAS_AUDITORIA_CATALOGO: Record<
  CategoriaEventoAuditoria,
  InfoCategoriaAuditoria
> = {
  anulacion_venta: {
    id: 'anulacion_venta',
    label: 'Anulación de Venta',
    shortLabel: 'Anulaciones',
    descripcion: 'Ventas canceladas, reversión de cobros y bajas de tickets emitidos.',
    badgeClass: 'bg-red-500/15 text-red-300 border-red-500/30',
  },
  cortesia_descuento: {
    id: 'cortesia_descuento',
    label: 'Cortesía / Descuento',
    shortLabel: 'Cortesías y Dctos.',
    descripcion: 'Cortesías de la casa (100%) y descuentos comerciales aplicados en caja o salón.',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  merma_inventario: {
    id: 'merma_inventario',
    label: 'Merma de Inventario',
    shortLabel: 'Mermas Bodega',
    descripcion: 'Bajas de materia prima por vencimiento, daño en cocción o desperdicio.',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  ajuste_inventario: {
    id: 'ajuste_inventario',
    label: 'Ajuste de Stock / Conteo',
    shortLabel: 'Ajustes Stock',
    descripcion: 'Diferencias de inventario por conteo físico en bodega o salidas manuales.',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  cancelacion_comanda: {
    id: 'cancelacion_comanda',
    label: 'Cancelación de Comanda',
    shortLabel: 'Comandas Canceladas',
    descripcion: 'Platos o comandas anuladas después de marchar a cocina (KDS) o salón.',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  descuadre_caja: {
    id: 'descuadre_caja',
    label: 'Arqueo / Descuadre de Caja',
    shortLabel: 'Arqueos y Caja',
    descripcion: 'Faltantes o sobrantes detectados en el arqueo físico de billetes y monedas.',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  acceso_personal: {
    id: 'acceso_personal',
    label: 'Acceso y Personal',
    shortLabel: 'Accesos / Personal',
    descripcion: 'Apertura de turnos, adelantos/vales autorizados y desbloqueo de terminales.',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
};

export interface InfoSeveridadAuditoria {
  id: SeveridadAuditoria;
  label: string;
  badgeClass: string;
  dotClass: string;
  prioridad: number;
}

export const SEVERIDAD_AUDITORIA_CATALOGO: Record<SeveridadAuditoria, InfoSeveridadAuditoria> = {
  critica: {
    id: 'critica',
    label: 'Crítica',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    dotClass: 'bg-red-500',
    prioridad: 4,
  },
  alta: {
    id: 'alta',
    label: 'Alta',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    dotClass: 'bg-orange-500',
    prioridad: 3,
  },
  media: {
    id: 'media',
    label: 'Media',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dotClass: 'bg-amber-400',
    prioridad: 2,
  },
  informativa: {
    id: 'informativa',
    label: 'Informativa',
    badgeClass: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    dotClass: 'bg-emerald-400',
    prioridad: 1,
  },
};

/**
 * Sanitiza un monto financiero asegurando un entero no negativo
 */
export function sanitizarMontoAuditoria(valor: unknown): number {
  const num = Number(valor);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num);
}

/**
 * Determina el nivel de severidad forense de acuerdo con la categoría y el impacto monetario
 */
export function determinarSeveridadEvento(
  categoria: CategoriaEventoAuditoria,
  montoImpacto: number,
  esCortesia100 = false
): SeveridadAuditoria {
  const monto = sanitizarMontoAuditoria(montoImpacto);

  switch (categoria) {
    case 'anulacion_venta':
      return monto >= 50000 ? 'critica' : 'alta';
    case 'cortesia_descuento':
      if (esCortesia100 || monto >= 40000) return 'critica';
      if (monto >= 15000) return 'alta';
      return 'media';
    case 'merma_inventario':
      if (monto >= 30000) return 'critica';
      return 'alta';
    case 'ajuste_inventario':
      if (monto >= 30000) return 'alta';
      return 'media';
    case 'cancelacion_comanda':
      return monto >= 35000 ? 'critica' : 'alta';
    case 'descuadre_caja':
      if (monto >= 20000) return 'critica';
      if (monto > 0) return 'alta';
      return 'informativa';
    case 'acceso_personal':
      if (monto >= 50000) return 'media';
      return 'informativa';
    default:
      return 'media';
  }
}

/**
 * Genera una huella forense determinista (tipo hash corto verificable `AUD-XXXX-YYYY`)
 * a partir de los atributos críticos del registro para certificar su integridad.
 */
export function generarHuellaForense(input: {
  negocioId: string;
  categoria: CategoriaEventoAuditoria;
  referenciaId: string;
  montoImpacto: number;
  responsableNombre: string;
}): string {
  const payload = [
    (input.negocioId || '').trim().toLowerCase(),
    input.categoria,
    (input.referenciaId || '').trim(),
    String(sanitizarMontoAuditoria(input.montoImpacto)),
    (input.responsableNombre || '').trim().toLowerCase(),
  ].join('|');

  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < payload.length; i += 1) {
    const code = payload.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }

  const part1 = ((h1 >>> 0) & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const part2 = ((h2 >>> 0) & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `AUD-${part1}-${part2}`;
}

/**
 * Extrae un código corto legible de una referencia de Firestore
 */
export function extraerCodigoVisible(referenciaId: string, prefijo = '#'): string {
  const limpio = (referenciaId || '').trim();
  if (!limpio) return `${prefijo}000000`;
  const sufijo = limpio.slice(-6).toUpperCase();
  return `${prefijo}${sufijo}`;
}

export interface FuentesCorrelacionAuditoria {
  negocioId: string;
  bitacoraInmutable?: EventoAuditoria[];
  ventas?: Venta[];
  movimientosInventario?: EntradaInventario[];
  insumos?: Insumo[];
  cierresCaja?: CierreCaja[];
  turnosPersonal?: TurnoPersonal[];
  valesPersonal?: ValePersonal[];
}

/**
 * Sintetiza y correlaciona todos los eventos de seguridad operativa de un negocio (`negocioId`),
 * unificando los registros explícitos de `bitacora_auditoria` con la correlación histórica
 * de `ventas`, `entradas_inventario`, `cierres_caja`, `turnos_personal` y `vales_personal`.
 * Garantiza deduplicación determinista por `${categoria}:${referenciaId}` y aislamiento multi-tenant.
 */
export function sintetizarEventosAuditoria(fuentes: FuentesCorrelacionAuditoria): EventoAuditoria[] {
  const tenantId = (fuentes.negocioId || '').trim();
  if (!tenantId) return [];

  const mapaEventos = new Map<string, EventoAuditoria>();

  // Mapa rápido de costos de insumos para valuar mermas y ajustes de stock
  const costosInsumosMap = new Map<string, number>();
  (fuentes.insumos || []).forEach((ins) => {
    if (ins.negocioId === tenantId && typeof ins.costoUnitario === 'number' && ins.costoUnitario > 0) {
      costosInsumosMap.set(ins.id, ins.costoUnitario);
    }
  });

  // 1. Primero insertamos los eventos explícitos de la bitácora inmutable (máxima prioridad)
  (fuentes.bitacoraInmutable || []).forEach((ev) => {
    if (ev.negocioId !== tenantId) return;
    const monto = sanitizarMontoAuditoria(ev.montoImpacto);
    const huella =
      ev.huellaForense ||
      generarHuellaForense({
        negocioId: tenantId,
        categoria: ev.categoria,
        referenciaId: ev.referenciaId || ev.id,
        montoImpacto: monto,
        responsableNombre: ev.responsableNombre || 'Sistema',
      });

    const normalizado: EventoAuditoria = {
      ...ev,
      montoImpacto: monto,
      codigoVisible: ev.codigoVisible || extraerCodigoVisible(ev.referenciaId || ev.id),
      origenRegistro: 'bitacora_inmutable',
      huellaForense: huella,
    };

    const dedupKey = `${ev.categoria}:${ev.referenciaId || ev.id}`;
    mapaEventos.set(dedupKey, normalizado);
  });

  // 2. Correlacionamos ventas anuladas y ventas con cortesías / descuentos comerciales
  (fuentes.ventas || []).forEach((venta) => {
    if (venta.negocioId !== tenantId) return;

    // 2a. Anulaciones de venta
    if (venta.estado === 'anulada') {
      const dedupKey = `anulacion_venta:${venta.id}`;
      if (!mapaEventos.has(dedupKey)) {
        const monto = sanitizarMontoAuditoria(venta.total);
        const responsable = (venta.anuladaPor || 'Administrador').trim();
        const motivo = (venta.motivoAnulacion || 'Anulación operativa').trim();
        const resumenItems = (venta.items || [])
          .map((it) => `${it.cantidad}x ${it.nombre}`)
          .join(', ');

        mapaEventos.set(dedupKey, {
          id: `hist_anul_${venta.id}`,
          negocioId: tenantId,
          categoria: 'anulacion_venta',
          severidad: determinarSeveridadEvento('anulacion_venta', monto),
          titulo: `Venta Anulada ${extraerCodigoVisible(venta.id)}`,
          descripcion: resumenItems
            ? `Baja de ticket por ${formatCOP(monto)} (${resumenItems}).`
            : `Baja de ticket por ${formatCOP(monto)}.`,
          motivo,
          montoImpacto: monto,
          responsableNombre: responsable,
          responsableRol: 'admin',
          entidadTipo: 'venta',
          referenciaId: venta.id,
          codigoVisible: extraerCodigoVisible(venta.id),
          detallesForenses: {
            canalOrigen: venta.origen || 'pos',
            metodoPago: venta.metodoPago,
            stockRevertido: Boolean(venta.revertirStock),
            cliente: venta.clienteNombre || 'Mostrador',
            notas: venta.notasAnulacion || 'Sin notas adicionales',
          },
          fecha: venta.anuladaEn || venta.fecha,
          origenRegistro: 'correlacion_historica',
          huellaForense: generarHuellaForense({
            negocioId: tenantId,
            categoria: 'anulacion_venta',
            referenciaId: venta.id,
            montoImpacto: monto,
            responsableNombre: responsable,
          }),
        });
      }
    }

    // 2b. Cortesías de la casa (100%) y descuentos comerciales aplicados
    const descuentoMonto = sanitizarMontoAuditoria(venta.descuento);
    if (descuentoMonto > 0 && venta.estado !== 'anulada') {
      const dedupKey = `cortesia_descuento:${venta.id}`;
      if (!mapaEventos.has(dedupKey)) {
        const subtotalBruto = sanitizarMontoAuditoria(venta.subtotal || venta.total + descuentoMonto);
        const esCortesia100 = venta.total === 0 || (subtotalBruto > 0 && descuentoMonto >= subtotalBruto);
        const motivo = (
          venta.descuentoMotivo ||
          (esCortesia100 ? 'Cortesía de la Casa (100%)' : 'Descuento comercial en caja')
        ).trim();
        const responsable = 'Cajero / Operador POS';

        mapaEventos.set(dedupKey, {
          id: `hist_desc_${venta.id}`,
          negocioId: tenantId,
          categoria: 'cortesia_descuento',
          severidad: determinarSeveridadEvento('cortesia_descuento', descuentoMonto, esCortesia100),
          titulo: esCortesia100
            ? `Cortesía 100% en Ticket ${extraerCodigoVisible(venta.id)}`
            : `Descuento Comercial en Ticket ${extraerCodigoVisible(venta.id)}`,
          descripcion: `Se descontaron ${formatCOP(descuentoMonto)} sobre un subtotal de ${formatCOP(subtotalBruto)} (Total cobrado: ${formatCOP(venta.total)}).`,
          motivo,
          montoImpacto: descuentoMonto,
          responsableNombre: responsable,
          responsableRol: 'cajero',
          entidadTipo: 'venta',
          referenciaId: venta.id,
          codigoVisible: extraerCodigoVisible(venta.id),
          detallesForenses: {
            esCortesiaTotal: esCortesia100,
            subtotalOriginal: subtotalBruto,
            descuentoAplicado: descuentoMonto,
            totalCobrado: sanitizarMontoAuditoria(venta.total),
            mesa: venta.mesaNombre || 'Mostrador',
          },
          fecha: venta.fecha,
          origenRegistro: 'correlacion_historica',
          huellaForense: generarHuellaForense({
            negocioId: tenantId,
            categoria: 'cortesia_descuento',
            referenciaId: venta.id,
            montoImpacto: descuentoMonto,
            responsableNombre: responsable,
          }),
        });
      }
    }
  });

  // 3. Correlacionamos mermas y ajustes de inventario desde el Kardex
  (fuentes.movimientosInventario || []).forEach((mov) => {
    if (mov.negocioId !== tenantId) return;
    const tipo = determinarTipoMovimiento(mov);
    if (tipo !== 'merma' && tipo !== 'ajuste' && tipo !== 'salida_manual') return;

    const categoria: CategoriaEventoAuditoria =
      tipo === 'merma' ? 'merma_inventario' : 'ajuste_inventario';
    const dedupKey = `${categoria}:${mov.id}`;
    if (mapaEventos.has(dedupKey)) return;

    const cantidadAbs = Math.abs(Number(mov.cantidad) || 0);
    const costoUnitarioRef =
      (typeof mov.costoUnitario === 'number' && mov.costoUnitario > 0
        ? mov.costoUnitario
        : costosInsumosMap.get(mov.insumoId)) || 0;
    const montoEstimado = sanitizarMontoAuditoria(
      mov.costo > 0 ? mov.costo : cantidadAbs * costoUnitarioRef
    );
    const responsable = (mov.responsable || 'Administrador').trim();
    const unidad = mov.unidadMedida || 'und';
    const motivo = (mov.motivo || mov.notas || mov.proveedor || 'Ajuste operativo de bodega').trim();

    mapaEventos.set(dedupKey, {
      id: `hist_inv_${mov.id}`,
      negocioId: tenantId,
      categoria,
      severidad: determinarSeveridadEvento(categoria, montoEstimado),
      titulo:
        tipo === 'merma'
          ? `Baja por Merma: ${mov.insumoNombre}`
          : `Ajuste de Stock en Bodega: ${mov.insumoNombre}`,
      descripcion: `Variación de ${mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad} ${unidad} en "${mov.insumoNombre}"${
        typeof mov.stockPrevio === 'number' && typeof mov.stockResultante === 'number'
          ? ` (Stock: ${mov.stockPrevio} ➔ ${mov.stockResultante} ${unidad})`
          : ''
      }.`,
      motivo,
      montoImpacto: montoEstimado,
      responsableNombre: responsable,
      responsableRol: 'admin',
      entidadTipo: 'inventario',
      referenciaId: mov.id,
      codigoVisible: extraerCodigoVisible(mov.id),
      detallesForenses: {
        insumoId: mov.insumoId,
        insumoNombre: mov.insumoNombre,
        cantidad: mov.cantidad,
        unidad,
        stockPrevio: mov.stockPrevio ?? 'N/D',
        stockResultante: mov.stockResultante ?? 'N/D',
        costoEstimadoCOP: montoEstimado,
      },
      fecha: mov.fecha,
      origenRegistro: 'correlacion_historica',
      huellaForense: generarHuellaForense({
        negocioId: tenantId,
        categoria,
        referenciaId: mov.id,
        montoImpacto: montoEstimado,
        responsableNombre: responsable,
      }),
    });
  });

  // 4. Correlacionamos cierres de caja y descuadres de arqueo físico
  (fuentes.cierresCaja || []).forEach((cierre) => {
    if (cierre.negocioId !== tenantId) return;
    const dedupKey = `descuadre_caja:${cierre.id}`;
    if (mapaEventos.has(dedupKey)) return;

    const diferencia =
      typeof cierre.diferenciaEfectivo === 'number'
        ? cierre.diferenciaEfectivo
        : typeof cierre.arqueo?.diferencia === 'number'
          ? cierre.arqueo.diferencia
          : 0;
    const diferenciaAbs = sanitizarMontoAuditoria(Math.abs(diferencia));
    const responsable = (cierre.cajeroNombre || 'Cajero de Turno').trim();
    const estadoCuadre =
      diferencia === 0 ? 'Cuadre Exacto' : diferencia < 0 ? 'Faltante de Caja' : 'Sobrante de Caja';

    // Impacto financiero de riesgo es el valor absoluto del descuadre (especialmente faltantes)
    const montoImpacto = diferencia < 0 ? diferenciaAbs : 0;
    const severidad: SeveridadAuditoria =
      diferencia < -20000
        ? 'critica'
        : diferencia < 0
          ? 'alta'
          : diferencia > 0
            ? 'media'
            : 'informativa';

    mapaEventos.set(dedupKey, {
      id: `hist_caja_${cierre.id}`,
      negocioId: tenantId,
      categoria: 'descuadre_caja',
      severidad,
      titulo: `Acta de Cierre de Caja (${estadoCuadre})`,
      descripcion:
        diferencia === 0
          ? `Arqueo cuadrado sin diferencias. Ingresos netos: ${formatCOP(cierre.totalIngresos)}.`
          : `Se detectó un ${diferencia < 0 ? 'faltante' : 'sobrante'} de ${formatCOP(diferenciaAbs)} en el conteo físico de efectivo.`,
      motivo: (cierre.notas || estadoCuadre).trim(),
      montoImpacto,
      responsableNombre: responsable,
      responsableRol: 'cajero',
      entidadTipo: 'caja',
      referenciaId: cierre.id,
      codigoVisible: extraerCodigoVisible(cierre.id),
      detallesForenses: {
        estadoCuadre,
        efectivoEsperado: cierre.efectivoEsperado ?? cierre.totalIngresos,
        efectivoRealContado: cierre.efectivoReal ?? cierre.totalIngresos,
        diferenciaCOP: diferencia,
        totalIngresosTurno: cierre.totalIngresos,
        totalGastosTurno: cierre.totalGastos,
      },
      fecha: cierre.fecha,
      origenRegistro: 'correlacion_historica',
      huellaForense: generarHuellaForense({
        negocioId: tenantId,
        categoria: 'descuadre_caja',
        referenciaId: cierre.id,
        montoImpacto,
        responsableNombre: responsable,
      }),
    });
  });

  // 5. Correlacionamos turnos y vales de personal (accesos y autorizaciones operativas)
  (fuentes.turnosPersonal || []).forEach((turno) => {
    if (turno.negocioId !== tenantId) return;
    const dedupKey = `acceso_personal:turno_${turno.id}`;
    if (mapaEventos.has(dedupKey)) return;

    const responsable = (turno.empleadoNombre || 'Colaborador').trim();
    mapaEventos.set(dedupKey, {
      id: `hist_turno_${turno.id}`,
      negocioId: tenantId,
      categoria: 'acceso_personal',
      severidad: 'informativa',
      titulo: `Registro de Turno: ${responsable}`,
      descripcion: `Jornada operativa (${turno.horaEntrada}${turno.horaSalida ? ` - ${turno.horaSalida}` : ' · En curso'}) con estado "${turno.estado}".`,
      motivo: turno.notas || `Turno ${turno.tipoTurno}`,
      montoImpacto: 0,
      responsableNombre: responsable,
      responsableRol: turno.cargo,
      entidadTipo: 'personal',
      referenciaId: `turno_${turno.id}`,
      codigoVisible: extraerCodigoVisible(turno.id, '#T-'),
      detallesForenses: {
        empleadoId: turno.empleadoId,
        cargo: turno.cargo,
        tipoTurno: turno.tipoTurno,
        horasTrabajadas: turno.horasTrabajadas,
        estado: turno.estado,
      },
      fecha: turno.fecha,
      origenRegistro: 'correlacion_historica',
      huellaForense: generarHuellaForense({
        negocioId: tenantId,
        categoria: 'acceso_personal',
        referenciaId: `turno_${turno.id}`,
        montoImpacto: 0,
        responsableNombre: responsable,
      }),
    });
  });

  (fuentes.valesPersonal || []).forEach((vale) => {
    if (vale.negocioId !== tenantId) return;
    const dedupKey = `acceso_personal:vale_${vale.id}`;
    if (mapaEventos.has(dedupKey)) return;

    const montoVale = sanitizarMontoAuditoria(vale.monto);
    const responsable = (vale.autorizadoPor || 'Administrador').trim();

    mapaEventos.set(dedupKey, {
      id: `hist_vale_${vale.id}`,
      negocioId: tenantId,
      categoria: 'acceso_personal',
      severidad: determinarSeveridadEvento('acceso_personal', montoVale),
      titulo: `Vale / Adelanto Autorizado a ${vale.empleadoNombre}`,
      descripcion: `Desembolso de ${formatCOP(montoVale)} (${vale.metodoEntrega}) por concepto de ${vale.motivo}.`,
      motivo: vale.notas || vale.motivo,
      montoImpacto: 0,
      responsableNombre: responsable,
      responsableRol: 'admin',
      entidadTipo: 'personal',
      referenciaId: `vale_${vale.id}`,
      codigoVisible: extraerCodigoVisible(vale.id, '#V-'),
      detallesForenses: {
        beneficiario: vale.empleadoNombre,
        montoValeCOP: montoVale,
        metodoEntrega: vale.metodoEntrega,
        estadoVale: vale.estado,
      },
      fecha: vale.fecha,
      origenRegistro: 'correlacion_historica',
      huellaForense: generarHuellaForense({
        negocioId: tenantId,
        categoria: 'acceso_personal',
        referenciaId: `vale_${vale.id}`,
        montoImpacto: 0,
        responsableNombre: responsable,
      }),
    });
  });

  return Array.from(mapaEventos.values()).sort((a, b) => {
    const dateA = toValidAdminDate(a.fecha)?.getTime() ?? 0;
    const dateB = toValidAdminDate(b.fecha)?.getTime() ?? 0;
    return dateB - dateA;
  });
}

/**
 * Filtra la lista de eventos de auditoría según los criterios forenses seleccionados
 */
export function filtrarEventosAuditoria(
  eventos: EventoAuditoria[],
  filtros: FiltrosAuditoria,
  ahora: Date = new Date()
): EventoAuditoria[] {
  const queryText = (filtros.busqueda || '').trim().toLowerCase();

  let inicioRangoMs: number | null = null;
  if (filtros.rangoFecha === 'hoy') {
    const d = new Date(ahora);
    d.setHours(0, 0, 0, 0);
    inicioRangoMs = d.getTime();
  } else if (filtros.rangoFecha === '7dias') {
    const d = new Date(ahora);
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    inicioRangoMs = d.getTime();
  } else if (filtros.rangoFecha === '30dias') {
    const d = new Date(ahora);
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
    inicioRangoMs = d.getTime();
  }

  return eventos.filter((ev) => {
    if (filtros.categoria !== 'todas' && ev.categoria !== filtros.categoria) {
      return false;
    }

    if (filtros.severidad !== 'todas' && ev.severidad !== filtros.severidad) {
      return false;
    }

    if (
      filtros.responsable !== 'todos' &&
      ev.responsableNombre.toLowerCase() !== filtros.responsable.toLowerCase()
    ) {
      return false;
    }

    if (filtros.soloImpactoFinanciero && ev.montoImpacto <= 0) {
      return false;
    }

    if (inicioRangoMs !== null) {
      const fechaEv = toValidAdminDate(ev.fecha);
      if (!fechaEv || fechaEv.getTime() < inicioRangoMs) {
        return false;
      }
    }

    if (queryText) {
      const haystack = [
        ev.titulo,
        ev.descripcion,
        ev.motivo || '',
        ev.responsableNombre,
        ev.codigoVisible,
        ev.referenciaId,
        ev.huellaForense,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(queryText)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Extrae la lista alfabética de operadores/responsables únicos presentes en la bitácora
 */
export function extraerResponsablesUnicos(eventos: EventoAuditoria[]): string[] {
  const set = new Set<string>();
  eventos.forEach((ev) => {
    const nombre = (ev.responsableNombre || '').trim();
    if (nombre) set.add(nombre);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es-CO'));
}

/**
 * Calcula las métricas consolidadas y el semáforo de riesgo operativo
 */
export function calcularMetricasAuditoria(eventos: EventoAuditoria[]): MetricasAuditoria {
  let eventosCriticosYAltos = 0;
  let impactoFinancieroTotal = 0;
  let totalAnulacionesCOP = 0;
  let cantidadAnulaciones = 0;
  let totalCortesiasYDescuentosCOP = 0;
  let cantidadCortesiasYDescuentos = 0;
  let totalMermasCOP = 0;
  let cantidadMermas = 0;
  let cantidadAjustesStock = 0;
  let cantidadCancelacionesComanda = 0;
  let totalDescuadresCajaCOP = 0;
  let cantidadDescuadresCaja = 0;
  let cantidadAccesosPersonal = 0;
  let conteoInmutable = 0;
  let conteoCriticos = 0;

  eventos.forEach((ev) => {
    const monto = sanitizarMontoAuditoria(ev.montoImpacto);
    impactoFinancieroTotal += monto;

    if (ev.severidad === 'critica' || ev.severidad === 'alta') {
      eventosCriticosYAltos += 1;
    }
    if (ev.severidad === 'critica') {
      conteoCriticos += 1;
    }
    if (ev.origenRegistro === 'bitacora_inmutable') {
      conteoInmutable += 1;
    }

    switch (ev.categoria) {
      case 'anulacion_venta':
        cantidadAnulaciones += 1;
        totalAnulacionesCOP += monto;
        break;
      case 'cortesia_descuento':
        cantidadCortesiasYDescuentos += 1;
        totalCortesiasYDescuentosCOP += monto;
        break;
      case 'merma_inventario':
        cantidadMermas += 1;
        totalMermasCOP += monto;
        break;
      case 'ajuste_inventario':
        cantidadAjustesStock += 1;
        break;
      case 'cancelacion_comanda':
        cantidadCancelacionesComanda += 1;
        break;
      case 'descuadre_caja':
        if (monto > 0) {
          cantidadDescuadresCaja += 1;
          totalDescuadresCajaCOP += monto;
        }
        break;
      case 'acceso_personal':
        cantidadAccesosPersonal += 1;
        break;
    }
  });

  let nivelRiesgo: NivelRiesgoOperativo = 'bajo';
  if (conteoCriticos >= 2 || impactoFinancieroTotal >= 150000) {
    nivelRiesgo = 'alto';
  } else if (eventosCriticosYAltos >= 2 || impactoFinancieroTotal >= 40000) {
    nivelRiesgo = 'moderado';
  }

  const porcentajeInmutable =
    eventos.length > 0 ? Math.round((conteoInmutable / eventos.length) * 100) : 100;

  return {
    totalEventos: eventos.length,
    eventosCriticosYAltos,
    impactoFinancieroTotal,
    totalAnulacionesCOP,
    cantidadAnulaciones,
    totalCortesiasYDescuentosCOP,
    cantidadCortesiasYDescuentos,
    totalMermasCOP,
    cantidadMermas,
    cantidadAjustesStock,
    cantidadCancelacionesComanda,
    totalDescuadresCajaCOP,
    cantidadDescuadresCaja,
    cantidadAccesosPersonal,
    nivelRiesgo,
    porcentajeInmutable,
  };
}

/**
 * Genera el certificado forense en texto plano para copiar o compartir
 */
export function generarCertificadoForenseTexto(evento: EventoAuditoria): string {
  const fechaObj = toValidAdminDate(evento.fecha);
  const fechaStr = fechaObj
    ? fechaObj.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Fecha no disponible';

  const catInfo = CATEGORIAS_AUDITORIA_CATALOGO[evento.categoria];
  const sevInfo = SEVERIDAD_AUDITORIA_CATALOGO[evento.severidad];

  const lineas = [
    '🛡️ *CERTIFICADO FORENSE DE AUDITORÍA — LA PARADA*',
    `• Huella de Integridad: ${evento.huellaForense}`,
    `• Código Evento: ${evento.codigoVisible} (Ref: ${evento.referenciaId})`,
    `• Fecha y Hora: ${fechaStr}`,
    `• Categoría: ${catInfo?.label || evento.categoria}`,
    `• Severidad: ${sevInfo?.label || evento.severidad.toUpperCase()}`,
    `• Evento: ${evento.titulo}`,
    `• Detalle: ${evento.descripcion}`,
    `• Motivo / Justificación: ${evento.motivo || 'No especificado'}`,
    `• Impacto Financiero: ${formatCOP(evento.montoImpacto)}`,
    `• Operador Responsable: ${evento.responsableNombre}${evento.responsableRol ? ` (${evento.responsableRol})` : ''}`,
    `• Fuente de Registro: ${evento.origenRegistro === 'bitacora_inmutable' ? 'Bitácora Inmutable Firestore' : 'Correlación Forense Verificada'}`,
  ];

  return lineas.join('\n');
}

/**
 * Genera un resumen ejecutivo de auditoría para envío rápido por WhatsApp
 */
export function generarResumenWhatsAppAuditoria(
  metricas: MetricasAuditoria,
  negocioNombre: string,
  rangoLabel: string
): string {
  const semaforo =
    metricas.nivelRiesgo === 'alto'
      ? '🔴 RIESGO ALTO'
      : metricas.nivelRiesgo === 'moderado'
        ? '🟡 RIESGO MODERADO'
        : '🟢 RIESGO CONTROLADO';

  return [
    `🛡️ *BITÁCORA DE AUDITORÍA Y SEGURIDAD — ${negocioNombre.toUpperCase()}*`,
    `📅 Período: ${rangoLabel}`,
    `🚦 Semáforo Operativo: *${semaforo}*`,
    '',
    `📊 *Resumen de Eventos (${metricas.totalEventos} registros):*`,
    `• Impacto Financiero Auditado: *${formatCOP(metricas.impactoFinancieroTotal)}*`,
    `• Alertas Críticas / Altas: *${metricas.eventosCriticosYAltos}*`,
    `• Anulaciones de Venta (${metricas.cantidadAnulaciones}): *${formatCOP(metricas.totalAnulacionesCOP)}*`,
    `• Cortesías y Descuentos (${metricas.cantidadCortesiasYDescuentos}): *${formatCOP(metricas.totalCortesiasYDescuentosCOP)}*`,
    `• Mermas de Bodega (${metricas.cantidadMermas}): *${formatCOP(metricas.totalMermasCOP)}*`,
    `• Descuadres de Caja (${metricas.cantidadDescuadresCaja}): *${formatCOP(metricas.totalDescuadresCajaCOP)}*`,
    `• Ajustes de Stock: *${metricas.cantidadAjustesStock}* | Accesos Personal: *${metricas.cantidadAccesosPersonal}*`,
  ].join('\n');
}

function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  const raw = value === undefined || value === null ? '' : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Genera el contenido CSV (con UTF-8 BOM) de la bitácora forense para Excel
 */
export function generarCsvAuditoriaForense(eventos: EventoAuditoria[]): string {
  const headers = [
    'Huella Forense',
    'Fecha',
    'Hora',
    'Categoria',
    'Severidad',
    'Codigo Visible',
    'Titulo',
    'Descripcion',
    'Motivo / Justificacion',
    'Impacto Financiero (COP)',
    'Responsable',
    'Rol',
    'Entidad',
    'Referencia ID',
    'Origen Registro',
  ];

  const rows = eventos.map((ev) => {
    const fechaObj = toValidAdminDate(ev.fecha);
    const fecha = fechaObj ? fechaObj.toISOString().slice(0, 10) : '';
    const hora = fechaObj ? fechaObj.toTimeString().slice(0, 8) : '';
    const catLabel = CATEGORIAS_AUDITORIA_CATALOGO[ev.categoria]?.label || ev.categoria;
    const sevLabel = SEVERIDAD_AUDITORIA_CATALOGO[ev.severidad]?.label || ev.severidad;

    return [
      escapeCsvCell(ev.huellaForense),
      escapeCsvCell(fecha),
      escapeCsvCell(hora),
      escapeCsvCell(catLabel),
      escapeCsvCell(sevLabel),
      escapeCsvCell(ev.codigoVisible),
      escapeCsvCell(ev.titulo),
      escapeCsvCell(ev.descripcion),
      escapeCsvCell(ev.motivo || ''),
      escapeCsvCell(sanitizarMontoAuditoria(ev.montoImpacto)),
      escapeCsvCell(ev.responsableNombre),
      escapeCsvCell(ev.responsableRol || ''),
      escapeCsvCell(ev.entidadTipo),
      escapeCsvCell(ev.referenciaId),
      escapeCsvCell(
        ev.origenRegistro === 'bitacora_inmutable'
          ? 'Bitacora Inmutable'
          : 'Correlacion Historica'
      ),
    ].join(',');
  });

  return `\uFEFF${[headers.map(escapeCsvCell).join(','), ...rows].join('\r\n')}`;
}

/**
 * Descarga en el navegador el archivo CSV de auditoría forense
 */
export function descargarCsvAuditoriaForense(
  eventos: EventoAuditoria[],
  negocioId = 'laparada'
): void {
  const csvContent = generarCsvAuditoriaForense(eventos);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fechaStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute('download', `auditoria_forense_${negocioId}_${fechaStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
