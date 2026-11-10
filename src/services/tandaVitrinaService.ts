import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import type {
  AdicionTanda,
  EstadoTanda,
  ItemTanda,
  MermaTanda,
  MetodoTransferenciaTanda,
  ResumenTanda,
  TandaVitrina,
  TransferenciaTanda,
} from '@/types/tanda';
import { requireTenantId } from '@/security/tenantScope';
import { calcularResumenTanda, calcularTotalesItem } from '@/utils/tandaUtils';

function generarId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export interface ItemInicialTandaInput {
  productoId: string;
  nombre: string;
  precioUnitario: number;
  categoria?: string;
  imagenUrl?: string;
  cantidadInicial: number;
}

/**
 * Inicia una nueva tanda de productos para vitrina
 */
export async function crearTandaVitrina(
  negocioId: string,
  itemsIniciales: ItemInicialTandaInput[],
  cajaId?: string,
  responsable?: string
): Promise<string> {
  const tenantId = requireTenantId(negocioId);

  if (itemsIniciales.length === 0) {
    throw new Error('Debe agregar al menos un producto a la tanda.');
  }

  const items: ItemTanda[] = itemsIniciales.map((item) => ({
    productoId: item.productoId,
    nombre: item.nombre,
    precioUnitario: Math.max(0, item.precioUnitario),
    categoria: item.categoria || '',
    imagenUrl: item.imagenUrl || '',
    cantidadInicial: Math.max(0, Math.floor(item.cantidadInicial)),
    adiciones: [],
    mermas: [],
  }));

  const tandaData: Omit<TandaVitrina, 'id'> = {
    negocioId: tenantId,
    ...(cajaId ? { cajaId } : {}),
    fecha: Timestamp.now(),
    estado: 'abierta',
    ...(responsable ? { responsable: responsable.trim() } : {}),
    items,
    transferencias: [],
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  };

  const colRef = collection(db, 'tandas_vitrina');
  const docRef = await addDoc(colRef, tandaData);
  return docRef.id;
}

/**
 * Obtiene la tanda actualmente abierta del tenant (si existe)
 */
export async function getTandaActiva(negocioId: string): Promise<TandaVitrina | null> {
  const tenantId = requireTenantId(negocioId);
  try {
    const q = query(
      collection(db, 'tandas_vitrina'),
      where('negocioId', '==', tenantId),
      where('estado', '==', 'abierta'),
      orderBy('fecha', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const d = snapshot.docs[0];
    return {
      ...(d.data() as Omit<TandaVitrina, 'id'>),
      id: d.id,
    };
  } catch (error) {
    console.error('Error al obtener tanda activa:', error);
    return null;
  }
}

/**
 * Escucha reactiva en tiempo real de la tanda activa del tenant
 */
export function onTandaActivaChange(
  negocioId: string,
  callback: (tanda: TandaVitrina | null) => void
): () => void {
  const tenantId = requireTenantId(negocioId);

  const q = query(
    collection(db, 'tandas_vitrina'),
    where('negocioId', '==', tenantId),
    where('estado', '==', 'abierta'),
    orderBy('fecha', 'desc'),
    limit(1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
      } else {
        const d = snapshot.docs[0];
        callback({
          ...(d.data() as Omit<TandaVitrina, 'id'>),
          id: d.id,
        });
      }
    },
    (err) => {
      console.error('Error en listener de tanda activa:', err);
      callback(null);
    }
  );
}

/**
 * Agrega más unidades producidas a un producto de la tanda activa
 */
export async function agregarAdicionItem(
  negocioId: string,
  tandaId: string,
  productoId: string,
  cantidad: number,
  nota?: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const docRef = doc(db, 'tandas_vitrina', tandaId);
  const snap = await getDoc(docRef);

  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('Tanda no encontrada o no autorizada.');
  }

  const tanda = snap.data() as TandaVitrina;
  if (tanda.estado !== 'abierta') {
    throw new Error('No se pueden modificar tandas ya cerradas.');
  }

  const nuevaAdicion: AdicionTanda = {
    id: generarId(),
    cantidad: Math.max(1, Math.floor(cantidad)),
    hora: Timestamp.now(),
    ...(nota ? { nota: nota.trim() } : {}),
  };

  const itemsActualizados = tanda.items.map((item) => {
    if (item.productoId === productoId) {
      return {
        ...item,
        adiciones: [...(item.adiciones || []), nuevaAdicion],
      };
    }
    return item;
  });

  await updateDoc(docRef, {
    items: itemsActualizados,
    actualizadoEn: Timestamp.now(),
  });
}

/**
 * Registra una merma o baja de producto en la tanda
 */
export async function registrarMermaItem(
  negocioId: string,
  tandaId: string,
  productoId: string,
  cantidad: number,
  motivo?: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const docRef = doc(db, 'tandas_vitrina', tandaId);
  const snap = await getDoc(docRef);

  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('Tanda no encontrada o no autorizada.');
  }

  const tanda = snap.data() as TandaVitrina;
  if (tanda.estado !== 'abierta') {
    throw new Error('No se pueden modificar tandas cerradas.');
  }

  const nuevaMerma: MermaTanda = {
    id: generarId(),
    cantidad: Math.max(1, Math.floor(cantidad)),
    hora: Timestamp.now(),
    ...(motivo ? { motivo: motivo.trim() } : {}),
  };

  const itemsActualizados = tanda.items.map((item) => {
    if (item.productoId === productoId) {
      return {
        ...item,
        mermas: [...(item.mermas || []), nuevaMerma],
      };
    }
    return item;
  });

  await updateDoc(docRef, {
    items: itemsActualizados,
    actualizadoEn: Timestamp.now(),
  });
}

/**
 * Agrega un nuevo producto a la tanda activa que no estaba al inicio
 */
export async function agregarNuevoProductoATanda(
  negocioId: string,
  tandaId: string,
  itemInput: ItemInicialTandaInput
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const docRef = doc(db, 'tandas_vitrina', tandaId);
  const snap = await getDoc(docRef);

  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('Tanda no encontrada.');
  }

  const tanda = snap.data() as TandaVitrina;
  if (tanda.estado !== 'abierta') {
    throw new Error('La tanda ya está cerrada.');
  }

  const existe = tanda.items.some((i) => i.productoId === itemInput.productoId);
  if (existe) {
    // Si ya existe, simplemente le sumamos como adición
    await agregarAdicionItem(
      negocioId,
      tandaId,
      itemInput.productoId,
      itemInput.cantidadInicial,
      'Agregado durante el turno'
    );
    return;
  }

  const nuevoItem: ItemTanda = {
    productoId: itemInput.productoId,
    nombre: itemInput.nombre,
    precioUnitario: Math.max(0, itemInput.precioUnitario),
    categoria: itemInput.categoria || '',
    imagenUrl: itemInput.imagenUrl || '',
    cantidadInicial: Math.max(0, Math.floor(itemInput.cantidadInicial)),
    adiciones: [],
    mermas: [],
  };

  await updateDoc(docRef, {
    items: [...tanda.items, nuevoItem],
    actualizadoEn: Timestamp.now(),
  });
}

/**
 * Registra una transferencia rápida asociada a la tanda
 */
export async function registrarTransferenciaTanda(
  negocioId: string,
  tandaId: string,
  transferencia: {
    monto: number;
    metodo: MetodoTransferenciaTanda;
    referencia?: string;
    fotoUrl?: string;
    nota?: string;
  }
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const docRef = doc(db, 'tandas_vitrina', tandaId);
  const snap = await getDoc(docRef);

  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('Tanda no encontrada.');
  }

  const tanda = snap.data() as TandaVitrina;
  if (tanda.estado !== 'abierta') {
    throw new Error('La tanda ya está cerrada.');
  }

  const nuevaTransf: TransferenciaTanda = {
    id: generarId(),
    monto: Math.max(0, Math.round(transferencia.monto)),
    metodo: transferencia.metodo,
    hora: Timestamp.now(),
    ...(transferencia.referencia ? { referencia: transferencia.referencia.trim() } : {}),
    ...(transferencia.fotoUrl ? { fotoUrl: transferencia.fotoUrl } : {}),
    ...(transferencia.nota ? { nota: transferencia.nota.trim() } : {}),
  };

  await updateDoc(docRef, {
    transferencias: [...(tanda.transferencias || []), nuevaTransf],
    actualizadoEn: Timestamp.now(),
  });
}

/**
 * Cierra la tanda calculando sobrantes, unidades vendidas y montos esperados
 */
export async function cerrarTandaVitrina(
  negocioId: string,
  tandaId: string,
  sobrantesMap: Record<string, number>,
  notasCierre?: string
): Promise<ResumenTanda> {
  const tenantId = requireTenantId(negocioId);
  const docRef = doc(db, 'tandas_vitrina', tandaId);
  const snap = await getDoc(docRef);

  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('Tanda no encontrada.');
  }

  const tanda = snap.data() as TandaVitrina;
  if (tanda.estado !== 'abierta') {
    throw new Error('Esta tanda ya ha sido cerrada previamente.');
  }

  // Actualizamos cada ítem con sus sobrantes y calculamos vendidos/subtotal
  const itemsCerrados: ItemTanda[] = tanda.items.map((item) => {
    const sobrantes = Math.max(0, Math.floor(sobrantesMap[item.productoId] ?? 0));
    const calc = calcularTotalesItem({ ...item, sobrantes });
    return {
      ...item,
      sobrantes,
      vendidos: calc.vendidos,
      subtotal: calc.subtotal,
    };
  });

  const resumen = calcularResumenTanda(itemsCerrados, tanda.transferencias || []);

  await updateDoc(docRef, {
    estado: 'cerrada' as EstadoTanda,
    items: itemsCerrados,
    resumen,
    fechaCierre: Timestamp.now(),
    ...(notasCierre ? { notasCierre: notasCierre.trim() } : {}),
    actualizadoEn: Timestamp.now(),
  });

  return resumen;
}

/**
 * Obtiene las tandas cerradas o abiertas en un rango de fechas
 */
export async function getTandasPorFecha(
  negocioId: string,
  fechaInicio: Date,
  fechaFin: Date
): Promise<TandaVitrina[]> {
  const tenantId = requireTenantId(negocioId);
  try {
    const q = query(
      collection(db, 'tandas_vitrina'),
      where('negocioId', '==', tenantId),
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin)),
      orderBy('fecha', 'desc')
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      ...(d.data() as Omit<TandaVitrina, 'id'>),
      id: d.id,
    }));
  } catch (error) {
    console.error('Error al obtener tandas por fecha:', error);
    return [];
  }
}
