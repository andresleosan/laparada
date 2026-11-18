import type {
  Insumo,
  EntradaInventario,
  Proveedor,
  OrdenCompra,
  ItemOrdenCompra,
  SugerenciaReabastecimiento,
  PrioridadReabastecimiento,
  ItemConteoFisicoBodega,
  ResumenConteoFisicoBodega,
  EstadoDiferenciaConteo,
} from '@/types';
import { formatCOP } from './formatCOP';

/**
 * Determina la prioridad de reabastecimiento según el nivel de quiebre de stock
 */
export function determinarPrioridadReabastecimiento(
  stockActual: number,
  stockMinimo: number
): PrioridadReabastecimiento {
  const actual = Number.isFinite(stockActual) ? stockActual : 0;
  const minimo = Number.isFinite(stockMinimo) ? Math.max(0, stockMinimo) : 0;

  if (actual <= 0) {
    return 'agotado';
  }
  if (actual <= minimo * 0.5) {
    return 'critico';
  }
  return 'bajo';
}

/**
 * Calcula la cantidad sugerida de compra para alcanzar el nivel óptimo (por defecto 2x stockMinimo)
 */
export function calcularCantidadSugeridaReabastecimiento(
  stockActual: number,
  stockMinimo: number,
  factorObjetivo = 2
): number {
  const actual = Number.isFinite(stockActual) ? Math.max(0, stockActual) : 0;
  const minimo = Number.isFinite(stockMinimo) ? Math.max(0, stockMinimo) : 0;
  const factor = Number.isFinite(factorObjetivo) && factorObjetivo >= 1 ? factorObjetivo : 2;

  if (minimo <= 0) {
    return 1;
  }

  const stockOptimo = minimo * factor;
  const faltanteParaOptimo = Math.max(minimo - actual, stockOptimo - actual);

  if (minimo >= 1) {
    return Math.max(1, Math.ceil(faltanteParaOptimo));
  }

  return Math.max(0.5, Number(faltanteParaOptimo.toFixed(2)));
}

/**
 * Resuelve el último costo unitario y nombre de proveedor registrado en el Kardex para cada insumo
 */
export function construirMapaUltimaCompraKardex(
  movimientos: EntradaInventario[]
): Map<string, { costoUnitario: number; proveedorNombre?: string }> {
  const mapa = new Map<string, { costoUnitario: number; proveedorNombre?: string }>();

  for (const mov of movimientos) {
    if (!mov.insumoId || mapa.has(mov.insumoId)) continue;
    const esEntrada = !mov.tipoMovimiento || mov.tipoMovimiento === 'entrada';
    if (!esEntrada || mov.cantidad <= 0) continue;

    const costoUnitario =
      typeof mov.costoUnitario === 'number' && mov.costoUnitario > 0
        ? Math.round(mov.costoUnitario)
        : mov.costo > 0
          ? Math.round(mov.costo / mov.cantidad)
          : 0;

    if (costoUnitario > 0 || mov.proveedor) {
      mapa.set(mov.insumoId, {
        costoUnitario: Math.max(0, costoUnitario),
        proveedorNombre:
          mov.proveedor && mov.proveedor !== 'Manual' ? mov.proveedor : undefined,
      });
    }
  }

  return mapa;
}

/**
 * Busca el proveedor del directorio que mejor coincida con un nombre de referencia
 */
export function encontrarProveedorCoincidente(
  nombreReferencia: string | undefined,
  proveedores: Proveedor[]
): Proveedor | undefined {
  if (!nombreReferencia || !nombreReferencia.trim()) return undefined;
  const refLimpia = nombreReferencia.trim().toLowerCase();

  const activos = proveedores.filter((p) => p.activo);
  return (
    activos.find((p) => p.nombre.trim().toLowerCase() === refLimpia) ||
    activos.find(
      (p) =>
        p.nombre.toLowerCase().includes(refLimpia) ||
        refLimpia.includes(p.nombre.toLowerCase())
    )
  );
}

/**
 * Genera sugerencias automáticas de reabastecimiento para todos los insumos en o bajo su stock mínimo
 */
export function generarSugerenciasReabastecimiento(
  insumos: Insumo[],
  proveedores: Proveedor[] = [],
  movimientosKardex: EntradaInventario[] = [],
  factorObjetivo = 2
): SugerenciaReabastecimiento[] {
  const mapaKardex = construirMapaUltimaCompraKardex(movimientosKardex);
  const sugerencias: SugerenciaReabastecimiento[] = [];

  for (const insumo of insumos) {
    if (insumo.esSubReceta) {
      continue;
    }

    const stockMinimo = typeof insumo.stockMinimo === 'number' ? insumo.stockMinimo : 0;
    const stockActual = typeof insumo.stockActual === 'number' ? insumo.stockActual : 0;

    // Solo sugerir para insumos con alerta configurada que estén en o por debajo del stock mínimo
    if (stockMinimo <= 0 || stockActual > stockMinimo) {
      continue;
    }

    const infoKardex = mapaKardex.get(insumo.id);
    const costoCatalogo =
      typeof insumo.costoUnitario === 'number' && insumo.costoUnitario > 0
        ? Math.round(insumo.costoUnitario)
        : 0;
    const costoUnitarioReferencia = costoCatalogo || infoKardex?.costoUnitario || 0;

    const nombreProvRef = insumo.proveedor || infoKardex?.proveedorNombre;
    const proveedorMatch = encontrarProveedorCoincidente(nombreProvRef, proveedores);

    const deficit = Number(Math.max(0, stockMinimo - stockActual).toFixed(4));
    const cantidadSugerida = calcularCantidadSugeridaReabastecimiento(
      stockActual,
      stockMinimo,
      factorObjetivo
    );
    const subtotalEstimado = Math.max(0, Math.round(cantidadSugerida * costoUnitarioReferencia));
    const prioridad = determinarPrioridadReabastecimiento(stockActual, stockMinimo);

    sugerencias.push({
      insumoId: insumo.id,
      insumoNombre: insumo.nombre,
      unidad: insumo.unidad || 'unidades',
      stockActual,
      stockMinimo,
      deficit,
      cantidadSugerida,
      costoUnitarioReferencia,
      subtotalEstimado,
      proveedorSugeridoId: proveedorMatch?.id,
      proveedorSugeridoNombre: proveedorMatch?.nombre || nombreProvRef,
      prioridad,
    });
  }

  const pesoPrioridad: Record<PrioridadReabastecimiento, number> = {
    agotado: 0,
    critico: 1,
    bajo: 2,
  };

  return sugerencias.sort((a, b) => {
    const diffPrio = pesoPrioridad[a.prioridad] - pesoPrioridad[b.prioridad];
    if (diffPrio !== 0) return diffPrio;
    return b.deficit - a.deficit;
  });
}

/**
 * Agrupa las sugerencias de compra por proveedor para emitir órdenes consolidadas en 1 clic
 */
export interface GrupoSugerenciaProveedor {
  proveedorId: string;
  proveedorNombre: string;
  proveedorTelefono?: string;
  items: SugerenciaReabastecimiento[];
  totalEstimado: number;
  cantidadAgotados: number;
}

export function agruparSugerenciasPorProveedor(
  sugerencias: SugerenciaReabastecimiento[],
  proveedores: Proveedor[]
): GrupoSugerenciaProveedor[] {
  const proveedorMap = new Map(proveedores.map((p) => [p.id, p]));
  const grupos = new Map<string, GrupoSugerenciaProveedor>();

  for (const sug of sugerencias) {
    const prov = sug.proveedorSugeridoId ? proveedorMap.get(sug.proveedorSugeridoId) : undefined;
    const key = prov ? prov.id : '__sin_proveedor__';
    const nombre = prov ? prov.nombre : sug.proveedorSugeridoNombre || 'Por asignar proveedor';

    if (!grupos.has(key)) {
      grupos.set(key, {
        proveedorId: prov?.id || '',
        proveedorNombre: nombre,
        proveedorTelefono: prov?.telefono,
        items: [],
        totalEstimado: 0,
        cantidadAgotados: 0,
      });
    }

    const grupo = grupos.get(key)!;
    grupo.items.push(sug);
    grupo.totalEstimado += sug.subtotalEstimado;
    if (sug.prioridad === 'agotado') {
      grupo.cantidadAgotados += 1;
    }
  }

  return Array.from(grupos.values()).sort((a, b) => {
    // Primero proveedores asignados con más urgencia
    if (Boolean(a.proveedorId) !== Boolean(b.proveedorId)) {
      return a.proveedorId ? -1 : 1;
    }
    return b.cantidadAgotados - a.cantidadAgotados || b.items.length - a.items.length;
  });
}

/**
 * Genera un consecutivo legible para la Orden de Compra (ej: "OC-0001")
 */
export function generarNumeroOrdenCompra(consecutivoActual: number): string {
  const num = Math.max(1, Math.round(Number(consecutivoActual) || 0) + 1);
  return `OC-${String(num).padStart(4, '0')}`;
}

/**
 * Convierte una lista de sugerencias en ítems listos para una Orden de Compra
 */
export function convertirSugerenciasAItemsOrden(
  sugerencias: SugerenciaReabastecimiento[]
): ItemOrdenCompra[] {
  return sugerencias.map((s) => {
    const cantidad = Math.max(0.01, Number(s.cantidadSugerida) || 1);
    const costo = Math.max(0, Math.round(Number(s.costoUnitarioReferencia) || 0));
    return {
      insumoId: s.insumoId,
      insumoNombre: s.insumoNombre,
      unidad: s.unidad,
      stockActualSnapshot: s.stockActual,
      stockMinimoSnapshot: s.stockMinimo,
      cantidadSolicitada: cantidad,
      costoUnitarioEstimado: costo,
      subtotalEstimado: Math.round(cantidad * costo),
    };
  });
}

/**
 * Calcula los totales estimados y reales de una Orden de Compra evitando montos negativos
 */
export function calcularTotalesOrdenCompra(items: ItemOrdenCompra[]): {
  totalEstimado: number;
  totalReal: number;
} {
  let totalEstimado = 0;
  let totalReal = 0;

  for (const item of items) {
    const cantSol = Math.max(0, Number(item.cantidadSolicitada) || 0);
    const costoEst = Math.max(0, Math.round(Number(item.costoUnitarioEstimado) || 0));
    totalEstimado += Math.round(cantSol * costoEst);

    const cantRec =
      typeof item.cantidadRecibida === 'number'
        ? Math.max(0, item.cantidadRecibida)
        : cantSol;
    const costoReal =
      typeof item.costoUnitarioReal === 'number'
        ? Math.max(0, Math.round(item.costoUnitarioReal))
        : costoEst;
    totalReal += Math.round(cantRec * costoReal);
  }

  return {
    totalEstimado: Math.max(0, totalEstimado),
    totalReal: Math.max(0, totalReal),
  };
}

/**
 * Genera el mensaje estructurado de WhatsApp para enviar una Orden de Compra al proveedor
 */
export function generarMensajeWhatsAppOrdenCompra(
  orden: Pick<OrdenCompra, 'numeroOrden' | 'proveedorNombre' | 'items' | 'totalEstimado' | 'notas'>,
  nombreNegocio = 'La Parada'
): string {
  const lineasItems = orden.items
    .filter((i) => i.cantidadSolicitada > 0)
    .map((item) => {
      const subtotalTxt =
        item.costoUnitarioEstimado > 0
          ? ` (Est. ${formatCOP(Math.round(item.cantidadSolicitada * item.costoUnitarioEstimado))})`
          : '';
      return `• *${item.cantidadSolicitada} ${item.unidad}* — ${item.insumoNombre}${subtotalTxt}`;
    })
    .join('\n');

  const bloqueTotal =
    orden.totalEstimado > 0
      ? `\n💰 *Total Estimado:* ${formatCOP(orden.totalEstimado)}`
      : '';

  const bloqueNotas =
    orden.notas && orden.notas.trim()
      ? `\n📝 *Observaciones:* ${orden.notas.trim()}`
      : '';

  return `Hola *${orden.proveedorNombre}*, un cordial saludo desde *${nombreNegocio}*. 👋

Te compartimos nuestra *Orden de Compra ${orden.numeroOrden}* para abastecimiento de bodega:

${lineasItems}${bloqueTotal}${bloqueNotas}

Por favor confírmanos disponibilidad y hora estimada de entrega. ¡Muchas gracias!`;
}

/**
 * Construye la URL wa.me con prefijo colombiano 57 por defecto
 */
export function construirUrlWhatsAppOrdenCompra(
  telefono: string,
  mensaje: string
): string {
  const digitos = (telefono || '').replace(/\D/g, '');
  const telefonoNormalizado =
    digitos.length === 10 && !digitos.startsWith('57') ? `57${digitos}` : digitos;
  return `https://wa.me/${telefonoNormalizado}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Evalúa una línea individual en el Conteo Físico Rápido de Bodega
 */
export function calcularLineaConteoFisico(
  insumo: Insumo,
  stockFisicoContado: number,
  costoFallback = 0
): ItemConteoFisicoBodega {
  const stockSistema = typeof insumo.stockActual === 'number' ? Number(insumo.stockActual.toFixed(4)) : 0;
  const stockFisico = Number.isFinite(stockFisicoContado)
    ? Number(Math.max(0, stockFisicoContado).toFixed(4))
    : stockSistema;

  const diferencia = Number((stockFisico - stockSistema).toFixed(4));
  const costoUnitario =
    typeof insumo.costoUnitario === 'number' && insumo.costoUnitario > 0
      ? Math.round(insumo.costoUnitario)
      : Math.max(0, Math.round(costoFallback));

  const impactoValorCOP = Math.round(diferencia * costoUnitario);

  let estadoDiferencia: EstadoDiferenciaConteo = 'exacto';
  if (diferencia < 0) {
    estadoDiferencia = 'faltante';
  } else if (diferencia > 0) {
    estadoDiferencia = 'sobrante';
  }

  return {
    insumoId: insumo.id,
    insumoNombre: insumo.nombre,
    unidad: insumo.unidad || 'unidades',
    stockSistema,
    stockFisicoContado: stockFisico,
    diferencia,
    costoUnitario,
    impactoValorCOP,
    estadoDiferencia,
  };
}

/**
 * Calcula el resumen consolidado de un Conteo Físico Rápido de Bodega
 */
export function calcularResumenConteoFisico(
  lineas: ItemConteoFisicoBodega[]
): ResumenConteoFisicoBodega {
  let exactosCount = 0;
  let faltantesCount = 0;
  let sobrantesCount = 0;
  let valorFaltantesCOP = 0;
  let valorSobrantesCOP = 0;

  for (const linea of lineas) {
    if (linea.estadoDiferencia === 'exacto') {
      exactosCount += 1;
    } else if (linea.estadoDiferencia === 'faltante') {
      faltantesCount += 1;
      valorFaltantesCOP += Math.abs(linea.impactoValorCOP);
    } else {
      sobrantesCount += 1;
      valorSobrantesCOP += Math.max(0, linea.impactoValorCOP);
    }
  }

  return {
    totalInsumosEvaluados: lineas.length,
    insumosConDiferencia: faltantesCount + sobrantesCount,
    exactosCount,
    faltantesCount,
    sobrantesCount,
    valorFaltantesCOP,
    valorSobrantesCOP,
    balanceNetoCOP: valorSobrantesCOP - valorFaltantesCOP,
  };
}

/**
 * Genera un acta resumida en texto para enviar por WhatsApp tras un conteo físico de bodega
 */
export function generarActaConteoWhatsApp(
  resumen: ResumenConteoFisicoBodega,
  lineas: ItemConteoFisicoBodega[],
  nombreNegocio = 'La Parada',
  responsable = 'Administrador'
): string {
  const conDiferencia = lineas.filter((l) => l.estadoDiferencia !== 'exacto');
  const fechaStr = new Date().toLocaleDateString('es-CO');

  const detalleLineas =
    conDiferencia.length > 0
      ? conDiferencia
          .map((l) => {
            const signo = l.diferencia > 0 ? `+${l.diferencia}` : `${l.diferencia}`;
            return `• *${l.insumoNombre}*: Sist. ${l.stockSistema} ➔ Fís. ${l.stockFisicoContado} ${l.unidad} (${signo} ${l.unidad})`;
          })
          .join('\n')
      : '• Sin descuadres detectados. 100% cuadrado.';

  return `📋 *ACTA DE CONTEO FÍSICO DE BODEGA — ${nombreNegocio.toUpperCase()}*
📅 Fecha: ${fechaStr} | 👤 Responsable: ${responsable}

• Insumos auditados: *${resumen.totalInsumosEvaluados}*
• Cuadrados exactos: *${resumen.exactosCount}*
• Con faltante: *${resumen.faltantesCount}* (${formatCOP(resumen.valorFaltantesCOP)})
• Con sobrante: *${resumen.sobrantesCount}* (${formatCOP(resumen.valorSobrantesCOP)})
• Balance Neto: *${formatCOP(resumen.balanceNetoCOP)}*

*Detalle de Ajustes:*
${detalleLineas}`;
}
