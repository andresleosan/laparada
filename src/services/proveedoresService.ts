import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Proveedor,
  FacturaCompra,
  PagoFacturaCompra,
  CrearFacturaCompraInput,
  RegistrarPagoFacturaInput,
} from '@/types/proveedor';
import { requireTenantId } from '@/security/tenantScope';
import { registrarEntradaInventario } from './inventarioService';
import { crearGasto } from './gastosService';

async function assertProveedorTenant(id: string, negocioId: string): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const snapshot = await getDoc(doc(db, 'proveedores', id));
  if (!snapshot.exists() || snapshot.data().negocioId !== tenantId) {
    throw new Error('El proveedor no pertenece al negocio activo');
  }
  return tenantId;
}

async function assertFacturaTenant(id: string, negocioId: string): Promise<{ tenantId: string; factura: FacturaCompra }> {
  const tenantId = requireTenantId(negocioId);
  const snapshot = await getDoc(doc(db, 'facturas_compra', id));
  if (!snapshot.exists() || snapshot.data().negocioId !== tenantId) {
    throw new Error('La factura no pertenece al negocio activo');
  }
  return { tenantId, factura: { ...snapshot.data(), id: snapshot.id } as FacturaCompra };
}

/**
 * Obtener todos los proveedores del negocio
 */
export async function getProveedores(negocioId: string): Promise<Proveedor[]> {
  try {
    const tenantId = requireTenantId(negocioId);
    const proveedoresRef = collection(db, 'proveedores');
    const q = query(
      proveedoresRef,
      where('negocioId', '==', tenantId),
      orderBy('nombre', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    } as Proveedor));
  } catch (error) {
    console.error('Error fetching proveedores:', error);
    throw error;
  }
}

/**
 * Suscripción en tiempo real a los proveedores
 */
export function onProveedoresChange(
  negocioId: string,
  callback: (proveedores: Proveedor[]) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const proveedoresRef = collection(db, 'proveedores');
  const q = query(
    proveedoresRef,
    where('negocioId', '==', tenantId),
    orderBy('nombre', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const proveedores = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      } as Proveedor));
      callback(proveedores);
    },
    (error) => {
      console.error('Error in onProveedoresChange listener:', error);
    }
  );
}

/**
 * Crear un nuevo proveedor
 */
export async function crearProveedor(
  data: Omit<Proveedor, 'id' | 'creadoEn' | 'actualizadoEn'>
): Promise<string> {
  try {
    const tenantId = requireTenantId(data.negocioId);
    const proveedoresRef = collection(db, 'proveedores');
    const now = Timestamp.now();

    const docRef = await addDoc(proveedoresRef, {
      ...data,
      negocioId: tenantId,
      activo: data.activo ?? true,
      diasCreditoHabitual: Math.max(0, Math.round(data.diasCreditoHabitual || 0)),
      creadoEn: now,
      actualizadoEn: now,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating proveedor:', error);
    throw error;
  }
}

/**
 * Actualizar proveedor existente
 */
export async function actualizarProveedor(
  id: string,
  updates: Partial<Omit<Proveedor, 'id' | 'negocioId' | 'creadoEn'>>,
  negocioId: string
): Promise<void> {
  try {
    await assertProveedorTenant(id, negocioId);
    const docRef = doc(db, 'proveedores', id);
    await updateDoc(docRef, {
      ...updates,
      actualizadoEn: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating proveedor:', error);
    throw error;
  }
}

/**
 * Eliminar proveedor
 */
export async function eliminarProveedor(id: string, negocioId: string): Promise<void> {
  try {
    await assertProveedorTenant(id, negocioId);
    const docRef = doc(db, 'proveedores', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting proveedor:', error);
    throw error;
  }
}

/**
 * Obtener facturas de compra del negocio
 */
export async function getFacturasCompra(negocioId: string): Promise<FacturaCompra[]> {
  try {
    const tenantId = requireTenantId(negocioId);
    const facturasRef = collection(db, 'facturas_compra');
    const q = query(
      facturasRef,
      where('negocioId', '==', tenantId),
      orderBy('fechaEmision', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    } as FacturaCompra));
  } catch (error) {
    console.error('Error fetching facturas de compra:', error);
    throw error;
  }
}

/**
 * Suscripción en tiempo real a las facturas de compra
 */
export function onFacturasCompraChange(
  negocioId: string,
  callback: (facturas: FacturaCompra[]) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const facturasRef = collection(db, 'facturas_compra');
  const q = query(
    facturasRef,
    where('negocioId', '==', tenantId),
    orderBy('fechaEmision', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const facturas = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      } as FacturaCompra));
      callback(facturas);
    },
    (error) => {
      console.error('Error in onFacturasCompraChange listener:', error);
    }
  );
}

/**
 * Crear una nueva factura de compra
 */
export async function crearFacturaCompra(
  data: CrearFacturaCompraInput
): Promise<string> {
  try {
    const tenantId = requireTenantId(data.negocioId);
    const facturasRef = collection(db, 'facturas_compra');
    const now = Timestamp.now();

    const total = Math.max(0, Math.round(data.total || 0));
    const esContado = data.condicionPago === 'contado';
    const montoPagado = esContado ? total : 0;
    const saldoPendiente = esContado ? 0 : total;
    const estado = esContado ? 'pagada' : 'pendiente';

    const facturaPayload: Omit<FacturaCompra, 'id'> = {
      negocioId: tenantId,
      proveedorId: data.proveedorId,
      proveedorNombre: data.proveedorNombre,
      numeroFactura: data.numeroFactura.trim(),
      fechaEmision: data.fechaEmision,
      fechaVencimiento: data.fechaVencimiento,
      condicionPago: data.condicionPago,
      estado,
      items: data.items || [],
      subtotal: Math.max(0, Math.round(data.subtotal || total)),
      impuestos: Math.max(0, Math.round(data.impuestos || 0)),
      total,
      montoPagado,
      saldoPendiente,
      afectaInventario: Boolean(data.afectaInventario),
      notas: data.notas?.trim() || '',
      creadoEn: now,
      actualizadoEn: now,
    };

    const docRef = await addDoc(facturasRef, facturaPayload);
    const facturaId = docRef.id;

    // Si es de contado, registrar de inmediato el pago
    if (esContado && total > 0) {
      const pagosRef = collection(db, 'pagos_facturas');
      let gastoId: string | undefined;

      if (data.registrarGastoContado) {
        gastoId = await crearGasto({
          negocioId: tenantId,
          concepto: `Compra Contado Fact. ${data.numeroFactura} - ${data.proveedorNombre}`,
          monto: total,
          categoria: 'insumos',
          fecha: data.fechaEmision,
          notas: `Pago automático contado de factura ${data.numeroFactura}`,
        });
      }

      await addDoc(pagosRef, {
        negocioId: tenantId,
        facturaId,
        proveedorId: data.proveedorId,
        monto: total,
        fechaPago: data.fechaEmision,
        metodoPago: 'efectivo',
        referenciaComprobante: `Contado-${data.numeroFactura}`,
        registradoPor: data.responsable || 'Administrador',
        gastoId,
        notas: 'Pago total inmediato de contado',
        creadoEn: now,
      } as Omit<PagoFacturaCompra, 'id'>);
    }

    // Si afecta inventario y se solicita ingreso automático a bodega
    if (data.afectaInventario && data.registrarEntradaInventarioAutomatica && Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.insumoId && item.cantidad > 0) {
          try {
            await registrarEntradaInventario(
              tenantId,
              item.insumoId,
              item.cantidad,
              item.subtotal || item.cantidad * item.costoUnitario,
              data.proveedorNombre,
              `Ingreso automático por Factura ${data.numeroFactura}`,
              data.responsable || 'Administrador'
            );
          } catch (inventarioErr) {
            console.warn(`No se pudo actualizar stock del insumo ${item.insumoId}:`, inventarioErr);
          }
        }
      }
    }

    return facturaId;
  } catch (error) {
    console.error('Error creating factura de compra:', error);
    throw error;
  }
}

/**
 * Registrar abono o pago a una factura de compra
 */
export async function registrarPagoFactura(
  negocioId: string,
  facturaId: string,
  pagoInput: RegistrarPagoFacturaInput
): Promise<string> {
  try {
    const tenantId = requireTenantId(negocioId);
    const monto = Math.max(0, Math.round(Number(pagoInput.monto) || 0));
    if (monto <= 0) {
      throw new Error('El monto del abono debe ser mayor a 0');
    }

    const facturaRef = doc(db, 'facturas_compra', facturaId);
    const pagoRef = doc(collection(db, 'pagos_facturas'));
    const now = Timestamp.now();

    let gastoId: string | undefined;

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(facturaRef);
      if (!snap.exists() || snap.data().negocioId !== tenantId) {
        throw new Error('La factura no pertenece al negocio activo');
      }

      const factura = snap.data() as FacturaCompra;
      if (factura.estado === 'anulada') {
        throw new Error('No se pueden registrar pagos a una factura anulada');
      }

      const saldoActual = typeof factura.saldoPendiente === 'number'
        ? factura.saldoPendiente
        : Math.max(0, factura.total - (factura.montoPagado || 0));

      if (monto > saldoActual) {
        throw new Error(`El abono ($ ${monto}) supera el saldo pendiente ($ ${saldoActual})`);
      }

      const nuevoMontoPagado = (factura.montoPagado || 0) + monto;
      const nuevoSaldo = Math.max(0, factura.total - nuevoMontoPagado);
      const nuevoEstado = nuevoSaldo === 0 ? 'pagada' : 'parcial';

      transaction.update(facturaRef, {
        montoPagado: nuevoMontoPagado,
        saldoPendiente: nuevoSaldo,
        estado: nuevoEstado,
        actualizadoEn: now,
      });

      transaction.set(pagoRef, {
        negocioId: tenantId,
        facturaId,
        proveedorId: factura.proveedorId,
        monto,
        fechaPago: now,
        metodoPago: pagoInput.metodoPago,
        referenciaComprobante: pagoInput.referenciaComprobante?.trim() || '',
        registradoPor: pagoInput.registradoPor?.trim() || 'Administrador',
        notas: pagoInput.notas?.trim() || '',
        creadoEn: now,
      } as Omit<PagoFacturaCompra, 'id'>);
    });

    // Registrar egreso operativo en la colección 'gastos' si se solicitó
    if (pagoInput.crearGastoCaja) {
      try {
        const snap = await getDoc(facturaRef);
        const fac = snap.data() as FacturaCompra;
        gastoId = await crearGasto({
          negocioId: tenantId,
          concepto: `Abono Fact. ${fac.numeroFactura} - ${fac.proveedorNombre}`,
          monto,
          categoria: 'insumos',
          fecha: now,
          notas: `Abono registrado: ${pagoInput.notas || 'Sin notas adicionales'}. Ref: ${pagoInput.referenciaComprobante || 'N/A'}`,
        });

        if (gastoId) {
          await updateDoc(pagoRef, { gastoId });
        }
      } catch (gastoErr) {
        console.warn('No se pudo registrar el gasto automático de caja:', gastoErr);
      }
    }

    return pagoRef.id;
  } catch (error) {
    console.error('Error registering pago factura:', error);
    throw error;
  }
}

/**
 * Obtener todos los pagos/abonos realizados a una factura
 */
export async function getPagosPorFactura(
  negocioId: string,
  facturaId: string
): Promise<PagoFacturaCompra[]> {
  try {
    const tenantId = requireTenantId(negocioId);
    const pagosRef = collection(db, 'pagos_facturas');
    const q = query(
      pagosRef,
      where('negocioId', '==', tenantId),
      where('facturaId', '==', facturaId),
      orderBy('fechaPago', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    } as PagoFacturaCompra));
  } catch (error) {
    console.error('Error fetching pagos factura:', error);
    throw error;
  }
}

/**
 * Anular factura de compra
 */
export async function anularFacturaCompra(
  negocioId: string,
  facturaId: string,
  motivo: string
): Promise<void> {
  try {
    await assertFacturaTenant(facturaId, negocioId);
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      throw new Error('Debes indicar el motivo de anulación');
    }

    const docRef = doc(db, 'facturas_compra', facturaId);
    await updateDoc(docRef, {
      estado: 'anulada',
      motivoAnulacion: motivoLimpio,
      actualizadoEn: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error anulando factura de compra:', error);
    throw error;
  }
}
