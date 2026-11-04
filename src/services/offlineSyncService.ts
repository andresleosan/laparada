// src/services/offlineSyncService.ts
import { requireTenantId } from '@/security/tenantScope';
import type {
  CatalogoCacheOffline,
  Combo,
  EstadoSyncVenta,
  Producto,
  SyncResult,
  VentaPendienteOffline,
} from '@/types';
import { registrarVenta } from '@/services/ventasService';

const DB_NAME = 'laparada_pos_offline';
const DB_VERSION = 1;
const STORE_VENTAS = 'ventas_pendientes';
const STORE_CATALOGO = 'catalogo_cache';

/**
 * Abre o inicializa la base de datos IndexedDB local para el POS.
 */
export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store para ventas pendientes de sincronización
      if (!db.objectStoreNames.contains(STORE_VENTAS)) {
        const ventasStore = db.createObjectStore(STORE_VENTAS, { keyPath: 'id' });
        ventasStore.createIndex('negocioId', 'negocioId', { unique: false });
        ventasStore.createIndex('fechaCreacion', 'fechaCreacion', { unique: false });
      }

      // Store para caché del catálogo por local
      if (!db.objectStoreNames.contains(STORE_CATALOGO)) {
        db.createObjectStore(STORE_CATALOGO, { keyPath: 'negocioId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Error al abrir IndexedDB'));
  });
}

/**
 * Guarda una venta offline en la cola local de IndexedDB aislada por negocioId.
 */
export async function guardarVentaOffline(
  negocioId: string,
  datos: Omit<
    VentaPendienteOffline,
    'id' | 'negocioId' | 'fechaCreacion' | 'estadoSync' | 'intentos'
  > & {
    id?: string;
    fechaCreacion?: string;
  }
): Promise<VentaPendienteOffline> {
  const tenantId = requireTenantId(negocioId);
  const db = await openOfflineDB();

  const id = datos.id || crypto.randomUUID();
  const ventaOffline: VentaPendienteOffline = {
    ...datos,
    id,
    negocioId: tenantId,
    fechaCreacion: datos.fechaCreacion || new Date().toISOString(),
    estadoSync: 'pendiente',
    intentos: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VENTAS, 'readwrite');
    const store = tx.objectStore(STORE_VENTAS);
    const request = store.put(ventaOffline);

    request.onsuccess = () => resolve(ventaOffline);
    request.onerror = () => reject(request.error || new Error('Error al guardar venta offline'));
  });
}

/**
 * Obtiene todas las ventas pendientes de sincronización para el local activo.
 */
export async function obtenerVentasPendientes(negocioId: string): Promise<VentaPendienteOffline[]> {
  const tenantId = requireTenantId(negocioId);
  const db = await openOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VENTAS, 'readonly');
    const store = tx.objectStore(STORE_VENTAS);
    const index = store.index('negocioId');
    const request = index.getAll(IDBKeyRange.only(tenantId));

    request.onsuccess = () => {
      const results = (request.result as VentaPendienteOffline[]) || [];
      // Orden cronológico ascendente (FIFO)
      results.sort(
        (a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime()
      );
      resolve(results);
    };
    request.onerror = () => reject(request.error || new Error('Error al consultar ventas pendientes'));
  });
}

/**
 * Cuenta la cantidad de ventas pendientes en la cola local.
 */
export async function contarVentasPendientes(negocioId: string): Promise<number> {
  const ventas = await obtenerVentasPendientes(negocioId);
  return ventas.length;
}

/**
 * Elimina una venta de la cola offline (por ejemplo, tras sincronización exitosa o descarte).
 */
export async function eliminarVentaPendiente(id: string, negocioId: string): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const db = await openOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VENTAS, 'readwrite');
    const store = tx.objectStore(STORE_VENTAS);

    // Verificamos pertenencia al negocio antes de borrar
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as VentaPendienteOffline | undefined;
      if (!item) {
        resolve();
        return;
      }
      if (item.negocioId !== tenantId) {
        reject(new Error('La venta no pertenece al negocio activo'));
        return;
      }
      const delReq = store.delete(id);
      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error || new Error('Error al eliminar venta offline'));
    };
    getReq.onerror = () => reject(getReq.error || new Error('Error al validar venta offline'));
  });
}

/**
 * Actualiza el estado de una venta offline (ej. en sincronización o con error).
 */
export async function actualizarEstadoVentaPendiente(
  id: string,
  negocioId: string,
  estadoSync: EstadoSyncVenta,
  errorDetalle?: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const db = await openOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VENTAS, 'readwrite');
    const store = tx.objectStore(STORE_VENTAS);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const venta = getReq.result as VentaPendienteOffline | undefined;
      if (!venta) {
        resolve();
        return;
      }
      if (venta.negocioId !== tenantId) {
        reject(new Error('La venta no pertenece al negocio activo'));
        return;
      }

      venta.estadoSync = estadoSync;
      if (estadoSync === 'error') {
        venta.intentos += 1;
        venta.errorDetalle = errorDetalle;
      }

      const putReq = store.put(venta);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error || new Error('Error al actualizar estado'));
    };

    getReq.onerror = () => reject(getReq.error || new Error('Error al buscar venta offline'));
  });
}

/**
 * Procesa la cola de ventas pendientes en orden FIFO hacia Firestore.
 */
export async function sincronizarVentasPendientes(negocioId: string): Promise<SyncResult> {
  const tenantId = requireTenantId(negocioId);
  const pendientes = await obtenerVentasPendientes(tenantId);

  const resultado: SyncResult = {
    exitosas: 0,
    fallidas: 0,
    errores: [],
  };

  if (pendientes.length === 0) {
    return resultado;
  }

  for (const venta of pendientes) {
    try {
      await actualizarEstadoVentaPendiente(venta.id, tenantId, 'sincronizando');

      // Intentamos registrar en Firestore con la lógica unificada de ventas
      if (venta.subtotal !== undefined || venta.propina !== undefined) {
        await registrarVenta(
          tenantId,
          venta.items,
          venta.total,
          venta.metodoPago,
          venta.direccion,
          venta.clienteTelefono,
          undefined,
          venta.tipoEntrega,
          venta.clienteNombre,
          venta.barrio,
          undefined,
          {
            subtotal: venta.subtotal,
            propina: venta.propina,
          }
        );
      } else if (venta.clienteNombre || venta.barrio) {
        await registrarVenta(
          tenantId,
          venta.items,
          venta.total,
          venta.metodoPago,
          venta.direccion,
          venta.clienteTelefono,
          undefined,
          venta.tipoEntrega,
          venta.clienteNombre,
          venta.barrio
        );
      } else {
        await registrarVenta(
          tenantId,
          venta.items,
          venta.total,
          venta.metodoPago,
          venta.direccion,
          venta.clienteTelefono,
          undefined,
          venta.tipoEntrega
        );
      }

      // Si fue exitosa, la eliminamos de la cola local
      await eliminarVentaPendiente(venta.id, tenantId);
      resultado.exitosas += 1;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido al sincronizar';
      resultado.fallidas += 1;
      resultado.errores.push({ id: venta.id, error: mensaje });
      await actualizarEstadoVentaPendiente(venta.id, tenantId, 'error', mensaje);
    }
  }

  return resultado;
}

/**
 * Guarda en caché local el catálogo de productos y combos para uso offline.
 */
export async function guardarCatalogoEnCache(
  negocioId: string,
  productos: Producto[],
  combos: Combo[]
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const db = await openOfflineDB();

  const registro: CatalogoCacheOffline = {
    negocioId: tenantId,
    productos,
    combos,
    actualizadoEn: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATALOGO, 'readwrite');
    const store = tx.objectStore(STORE_CATALOGO);
    const req = store.put(registro);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Error al guardar catálogo en caché'));
  });
}

/**
 * Recupera el catálogo en caché local cuando no hay conexión con Firestore.
 */
export async function obtenerCatalogoEnCache(
  negocioId: string
): Promise<CatalogoCacheOffline | null> {
  const tenantId = requireTenantId(negocioId);
  const db = await openOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATALOGO, 'readonly');
    const store = tx.objectStore(STORE_CATALOGO);
    const req = store.get(tenantId);

    req.onsuccess = () => resolve((req.result as CatalogoCacheOffline) || null);
    req.onerror = () => reject(req.error || new Error('Error al leer catálogo en caché'));
  });
}
