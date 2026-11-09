// src/services/ventasService.ts
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getBlob } from 'firebase/storage';
import { db } from '@/services/firebase';
import type { ItemVenta, Venta, MetodoPago, TipoEntrega, DatosAnulacionVenta } from '@/types';
import { requireTenantId } from '@/security/tenantScope';
import { getCajaHoy } from '@/services/cajaService';
import { getDomiciliosActivos } from '@/services/domiciliosService';
import { getTodosGastos } from '@/services/gastosService';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import type { SarinOperationalSnapshot } from '@/utils/sarinVoicePos';
import { registrarCompraCliente, revertirCompraCliente } from '@/services/clientesService';
import { descontarStockInsumosPorVenta, revertirStockInsumosPorVenta } from '@/services/inventarioService';
import { calcularConsumoInsumos } from '@/utils/recetasEscandallo';
import { getProductos, getCombos } from '@/services/productosService';
import { formatearMotivoAnulacion } from '@/utils/anulacionVentasUtils';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';
import type { Producto, Combo } from '@/types';

/**
 * Registra una nueva venta en Firestore
 */
export async function uploadFotoTransferencia(file: File, negocioId: string): Promise<string> {
  try {
    const tenantId = requireTenantId(negocioId);
    const extensionByType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const extension = extensionByType[file.type];
    if (!extension || file.size >= 5 * 1024 * 1024) {
      throw new Error('El comprobante debe ser una imagen menor de 5 MiB');
    }
    const storage = getStorage();
    const timestamp = Date.now();
    const filename = `transferencias/${tenantId}/${timestamp}_${crypto.randomUUID()}.${extension}`;
    const storageRef = ref(storage, filename);

    const snapshot = await uploadBytes(storageRef, file);
    return snapshot.ref.fullPath;
  } catch (error) {
    console.error('Error uploading transfer photo:', error);
    throw error;
  }
}

export async function registrarVenta(
  negocioId: string,
  items: ItemVenta[],
  total: number,
  metodoPago: MetodoPago,
  direccion?: string,
  clienteTelefono?: string,
  fotoTransferenciaPath?: string,
  tipoEntrega: TipoEntrega = 'mostrador',
  clienteNombre?: string,
  barrio?: string,
  catalogo?: { productos?: Producto[]; combos?: Combo[] },
  opcionesExtra?: {
    subtotal?: number;
    propina?: number;
    descuento?: number;
    descuentoMotivo?: string;
    cuentaMesaId?: string;
    mesaNombre?: string;
    esPagoParcial?: boolean;
    meseroId?: string;
    meseroNombre?: string;
    comisionMesero?: number;
    promocionId?: string;
    codigoCupon?: string;
    consecutivoFiscal?: string;
    baseGravable?: number;
    valorImpuesto?: number;
    tarifaImpuesto?: number;
    tipoImpuesto?: 'inc' | 'iva' | 'ninguno';
    resolucionDian?: string;
  }
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const venta: Omit<Venta, 'id'> = {
    negocioId: tenantId,
    items,
    total,
    metodoPago,
    tipoEntrega,
    origen: 'pos',
    // Timestamp.now() guarda fecha y hora exacta del cobro: es lo que lee el historial y la analítica.
    fecha: Timestamp.now(),
    ...(direccion && { direccion }),
    ...(barrio && { barrio }),
    ...(clienteTelefono && { clienteTelefono }),
    ...(clienteNombre && { clienteNombre }),
    ...(fotoTransferenciaPath && { fotoTransferenciaPath }),
    ...(typeof opcionesExtra?.subtotal === 'number' && { subtotal: opcionesExtra.subtotal }),
    ...(typeof opcionesExtra?.descuento === 'number' && { descuento: opcionesExtra.descuento }),
    ...(opcionesExtra?.descuentoMotivo && { descuentoMotivo: opcionesExtra.descuentoMotivo }),
    ...(opcionesExtra?.promocionId && { promocionId: opcionesExtra.promocionId }),
    ...(opcionesExtra?.codigoCupon && { codigoCupon: opcionesExtra.codigoCupon }),
    ...(typeof opcionesExtra?.propina === 'number' && { propina: opcionesExtra.propina }),
    ...(opcionesExtra?.cuentaMesaId && { cuentaMesaId: opcionesExtra.cuentaMesaId }),
    ...(opcionesExtra?.mesaNombre && { mesaNombre: opcionesExtra.mesaNombre }),
    ...(typeof opcionesExtra?.esPagoParcial === 'boolean' && { esPagoParcial: opcionesExtra.esPagoParcial }),
    ...(opcionesExtra?.meseroId && { meseroId: opcionesExtra.meseroId }),
    ...(opcionesExtra?.meseroNombre && { meseroNombre: opcionesExtra.meseroNombre }),
    ...(typeof opcionesExtra?.comisionMesero === 'number' && { comisionMesero: opcionesExtra.comisionMesero }),
    ...(opcionesExtra?.consecutivoFiscal && { consecutivoFiscal: opcionesExtra.consecutivoFiscal }),
    ...(typeof opcionesExtra?.baseGravable === 'number' && { baseGravable: opcionesExtra.baseGravable }),
    ...(typeof opcionesExtra?.valorImpuesto === 'number' && { valorImpuesto: opcionesExtra.valorImpuesto }),
    ...(typeof opcionesExtra?.tarifaImpuesto === 'number' && { tarifaImpuesto: opcionesExtra.tarifaImpuesto }),
    ...(opcionesExtra?.tipoImpuesto && { tipoImpuesto: opcionesExtra.tipoImpuesto }),
    ...(opcionesExtra?.resolucionDian && { resolucionDian: opcionesExtra.resolucionDian }),
  };

  const docRef = await addDoc(collection(db, 'ventas'), venta);

  // Si la venta incluye cortesía o descuento comercial, emite registro inmutable de auditoría
  if (typeof opcionesExtra?.descuento === 'number' && opcionesExtra.descuento > 0) {
    const subtotalBruto = opcionesExtra.subtotal ?? total + opcionesExtra.descuento;
    const esCortesia100 = total === 0 || opcionesExtra.descuento >= subtotalBruto;
    registrarEventoAuditoriaSilencioso({
      negocioId: tenantId,
      categoria: 'cortesia_descuento',
      titulo: esCortesia100
        ? `Cortesía 100% en Ticket #${docRef.id.slice(-6).toUpperCase()}`
        : `Descuento Comercial en Ticket #${docRef.id.slice(-6).toUpperCase()}`,
      descripcion: `Descuento de $${opcionesExtra.descuento.toLocaleString('es-CO')} aplicado en ${opcionesExtra.mesaNombre || 'Mostrador POS'}.`,
      motivo: opcionesExtra.descuentoMotivo || (esCortesia100 ? 'Cortesía de la Casa (100%)' : 'Descuento comercial'),
      montoImpacto: opcionesExtra.descuento,
      responsableNombre: 'Cajero POS',
      responsableRol: 'cajero',
      entidadTipo: 'venta',
      referenciaId: docRef.id,
      detallesForenses: {
        subtotalBruto,
        descuentoCOP: opcionesExtra.descuento,
        totalCobrado: total,
        metodoPago,
      },
    });
  }

  // Registro reactivo del cliente en background para no bloquear el flujo
  if (clienteTelefono) {
    registrarCompraCliente(tenantId, {
      telefono: clienteTelefono,
      nombre: clienteNombre,
      direccion,
      barrio,
      monto: total,
      items,
      origen: 'pos',
    }).catch((err) => {
      console.warn('No se pudo registrar cliente reactivo en venta:', err);
    });
  }

  // Deducción atómica de inventario por recetas de escandallo
  if (items.length > 0) {
    (async () => {
      try {
        const prods = catalogo?.productos || (await getProductos(tenantId));
        const cmbs = catalogo?.combos || (await getCombos(tenantId));
        const consumos = calcularConsumoInsumos(items, prods, cmbs);
        if (consumos.length > 0) {
          await descontarStockInsumosPorVenta(
            tenantId,
            consumos,
            `Venta POS #${docRef.id.slice(-6)}`
          );
        }
      } catch (err) {
        console.warn('No se pudo descontar inventario en venta POS:', err);
      }
    })();
  }

  return docRef.id;
}

export async function getFotoTransferenciaObjectUrl(
  storagePath: string,
  negocioId: string
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const expectedPrefix = `transferencias/${tenantId}/`;
  if (!storagePath.startsWith(expectedPrefix)) {
    throw new Error('El comprobante no pertenece al negocio activo');
  }
  const blob = await getBlob(ref(getStorage(), storagePath), 5 * 1024 * 1024);
  return URL.createObjectURL(blob);
}

/**
 * Anula una venta recién registrada por voz en el POS validando pertenencia al tenant.
 */
export async function anularVentaPorVoz(ventaId: string, negocioId: string): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const ventaRef = doc(db, 'ventas', ventaId);
  const snapshot = await getDoc(ventaRef);
  if (!snapshot.exists() || snapshot.data().negocioId !== tenantId) {
    throw new Error('La venta no pertenece al negocio activo');
  }
  await deleteDoc(ventaRef);
}

/**
 * Anula una venta de forma controlada y auditada conservando el registro histórico
 * y revirtiendo opcionalmente insumos deducidos de bodega y métricas de cliente.
 */
export async function anularVentaConAuditoria(
  negocioId: string,
  ventaId: string,
  datosAnulacion: DatosAnulacionVenta,
  catalogo?: { productos?: Producto[]; combos?: Combo[] }
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const ventaRef = doc(db, 'ventas', ventaId);
  const snapshot = await getDoc(ventaRef);

  if (!snapshot.exists() || snapshot.data().negocioId !== tenantId) {
    throw new Error('La venta no pertenece al negocio activo');
  }

  const ventaActual = snapshot.data() as Venta;
  if (ventaActual.estado === 'anulada') {
    throw new Error('La venta ya se encuentra anulada');
  }

  const motivoFormateado = formatearMotivoAnulacion(
    datosAnulacion.motivo,
    datosAnulacion.motivoPersonalizado
  );

  const updates: Partial<Venta> = {
    estado: 'anulada',
    anuladaEn: Timestamp.now(),
    anuladaPor: (datosAnulacion.usuarioNombre || 'Administrador').trim(),
    motivoAnulacion: motivoFormateado,
    notasAnulacion: (datosAnulacion.notas || '').trim(),
    revertirStock: Boolean(datosAnulacion.revertirStock),
  };

  await updateDoc(ventaRef, updates);

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: 'anulacion_venta',
    titulo: `Venta Anulada #${ventaId.slice(-6).toUpperCase()}`,
    descripcion: `Baja controlada de venta por $${(ventaActual.total || 0).toLocaleString('es-CO')}.`,
    motivo: motivoFormateado,
    montoImpacto: ventaActual.total || 0,
    responsableNombre: (datosAnulacion.usuarioNombre || 'Administrador').trim(),
    responsableRol: 'admin',
    entidadTipo: 'venta',
    referenciaId: ventaId,
    detallesForenses: {
      metodoPago: ventaActual.metodoPago,
      origen: ventaActual.origen || 'pos',
      revertirStock: Boolean(datosAnulacion.revertirStock),
      notas: (datosAnulacion.notas || '').trim(),
    },
  });

  // Reversión opcional de stock de insumos
  if (datosAnulacion.revertirStock && ventaActual.items && ventaActual.items.length > 0) {
    try {
      const prods = catalogo?.productos || (await getProductos(tenantId));
      const cmbs = catalogo?.combos || (await getCombos(tenantId));
      const consumos = calcularConsumoInsumos(ventaActual.items, prods, cmbs);
      if (consumos.length > 0) {
        await revertirStockInsumosPorVenta(
          tenantId,
          consumos,
          `Reversión por anulación Venta #${ventaId.slice(-6)}`
        );
      }
    } catch (err) {
      console.warn('No se pudo revertir stock de insumos en anulación:', err);
    }
  }

  // Reversión de historial de cliente si aplica
  if (ventaActual.clienteTelefono) {
    try {
      await revertirCompraCliente(tenantId, ventaActual.clienteTelefono, ventaActual.total);
    } catch (err) {
      console.warn('No se pudo revertir compra de cliente en anulación:', err);
    }
  }
}

/**
 * Obtiene en tiempo real el pulso operativo del turno (ventas de hoy, caja y domicilios activos)
 * estrictamente acotado por negocioId para responder consultas de voz de Sarin.
 */
export async function getSarinOperationalSnapshot(
  negocioId: string
): Promise<SarinOperationalSnapshot> {
  const tenantId = requireTenantId(negocioId);
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const finHoy = new Date(inicioHoy);
  finHoy.setHours(23, 59, 59, 999);

  const ventasQuery = query(
    collection(db, 'ventas'),
    where('negocioId', '==', tenantId),
    where('fecha', '>=', Timestamp.fromDate(inicioHoy)),
    where('fecha', '<=', Timestamp.fromDate(finHoy)),
    orderBy('fecha', 'desc')
  );

  const [ventasSnap, cajaHoy, todosGastos, domiciliosActivos] = await Promise.all([
    getDocs(ventasQuery).catch(() => null),
    getCajaHoy(tenantId).catch(() => null),
    getTodosGastos(tenantId).catch(() => []),
    getDomiciliosActivos(tenantId).catch(() => []),
  ]);

  let ventasHoyTotal = 0;
  let ventasHoyCantidad = 0;
  let ventasEfectivoHoy = 0;
  let ventasTransferenciaHoy = 0;

  if (ventasSnap) {
    ventasSnap.docs.forEach((saleDoc) => {
      const data = saleDoc.data() as Venta;
      if (data.estado === 'anulada') return; // Excluir ventas anuladas del pulso operativo

      const monto = Number.isFinite(data.total) ? data.total : 0;
      ventasHoyTotal += monto;
      ventasHoyCantidad += 1;
      if (data.metodoPago === 'efectivo') {
        ventasEfectivoHoy += monto;
      } else if (data.metodoPago === 'transferencia') {
        ventasTransferenciaHoy += monto;
      }
    });
  }

  const gastosHoy = todosGastos
    .filter((gasto) => {
      const fechaGasto = toValidAdminDate(gasto.fecha);
      if (!fechaGasto) return false;
      const normalizada = new Date(fechaGasto);
      normalizada.setHours(0, 0, 0, 0);
      return normalizada.getTime() === inicioHoy.getTime();
    })
    .reduce((sum, gasto) => sum + (Number.isFinite(gasto.monto) ? gasto.monto : 0), 0);

  const cajaAbierta = Boolean(cajaHoy);
  const montoInicialCaja = cajaHoy?.montoInicial || 0;
  const saldoCajaEfectivo = cajaHoy
    ? cajaHoy.montoInicial + cajaHoy.ingresos + ventasEfectivoHoy - (cajaHoy.egresos + gastosHoy)
    : ventasEfectivoHoy;

  const domiciliosPendientes = domiciliosActivos.filter((d) => d.estado === 'pendiente').length;
  const domiciliosEnPreparacion = domiciliosActivos.filter(
    (d) => d.estado === 'en_preparacion'
  ).length;
  const domiciliosEnCamino = domiciliosActivos.filter((d) => d.estado === 'en_camino').length;

  return {
    ventasHoyTotal,
    ventasHoyCantidad,
    ventasEfectivoHoy,
    ventasTransferenciaHoy,
    cajaAbierta,
    saldoCajaEfectivo,
    montoInicialCaja,
    domiciliosPendientes,
    domiciliosEnPreparacion,
    domiciliosEnCamino,
    domiciliosActivosTotal: domiciliosActivos.length,
  };
}

/**
 * Consulta ventas recientes del negocio acotadas por negocioId.
 */
export async function getVentasRecientes(
  negocioId: string,
  maxRegistros: number = 200
): Promise<Venta[]> {
  const tenantId = requireTenantId(negocioId);
  try {
    const q = query(
      collection(db, 'ventas'),
      where('negocioId', '==', tenantId),
      orderBy('fecha', 'desc'),
      limit(maxRegistros)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    })) as Venta[];
  } catch (error) {
    console.error('Error al consultar ventas recientes:', error);
    return [];
  }
}

