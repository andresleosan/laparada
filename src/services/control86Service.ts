import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import { crearAlertaSilenciosa } from '@/services/notificacionesService';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';
import {
  MOTIVOS_86_META,
  sanitizarControl86,
  sanitizarEspecialDelDia,
  UMBRAL_ALERTA_PORCIONES_DEFAULT,
} from '@/utils/control86Utils';
import type {
  Combo,
  Control86Item,
  EspecialDelDiaConfig,
  ItemCatalogo86,
  ItemVenta,
  Motivo86,
  Producto,
  TipoItemCatalogo86,
} from '@/types';

function getCollectionName(tipo: TipoItemCatalogo86): 'productos' | 'combos' {
  return tipo === 'producto' ? 'productos' : 'combos';
}

/**
 * Consulta de respaldo multi-tenant de productos en 86 o con contador activo.
 */
export async function obtenerProductosControl86(negocioId: string): Promise<Producto[]> {
  const tenantId = requireTenantId(negocioId);
  const q = query(collection(db, 'productos'), where('negocioId', '==', tenantId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Producto));
}

/**
 * Marca en 1 toque un producto o combo como 86 (agotado temporalmente).
 * Solo muta `disponible`, `control86` y `actualizadoEn` para permitir operación desde Cocina/Caja.
 */
export async function activar86Item(
  negocioId: string,
  tipo: TipoItemCatalogo86,
  itemId: string,
  opciones: {
    motivo?: Motivo86;
    nota?: string;
    responsableNombre?: string;
    responsableRol?: string;
  } = {}
): Promise<Control86Item> {
  const tenantId = requireTenantId(negocioId);
  const colName = getCollectionName(tipo);
  const itemRef = doc(db, colName, itemId);
  const ahoraIso = new Date().toISOString();
  const responsable = (opciones.responsableNombre || 'Cocina / Caja').trim().slice(0, 120);

  let nombreItem = itemId;
  let nuevoControl86: Control86Item = sanitizarControl86({ agotado86: true });

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(itemRef);
    if (!snap.exists() || snap.data().negocioId !== tenantId) {
      throw new Error(`El ${tipo} no pertenece al negocio activo`);
    }

    const data = snap.data() as Partial<Producto | Combo>;
    nombreItem = typeof data.nombre === 'string' && data.nombre.trim() ? data.nombre.trim() : itemId;
    const prev = data.control86;

    nuevoControl86 = sanitizarControl86({
      ...prev,
      agotado86: true,
      motivo86: opciones.motivo || prev?.motivo86 || 'produccion_agotada',
      nota86: opciones.nota ?? prev?.nota86,
      porcionesDisponibles: prev?.contadorActivo ? 0 : prev?.porcionesDisponibles ?? null,
      actualizadoPor: responsable,
      actualizadoEnIso: ahoraIso,
    });

    tx.update(itemRef, {
      disponible: false,
      control86: nuevoControl86,
      actualizadoEn: Timestamp.now(),
    });
  });

  const motivoLabel = nuevoControl86.motivo86
    ? MOTIVOS_86_META[nuevoControl86.motivo86].shortLabel
    : 'Agotado';

  crearAlertaSilenciosa(tenantId, {
    modulo: 'cocina',
    tipo: 'control_86_agotado',
    titulo: `86 · ${nombreItem} agotado`,
    mensaje: `${responsable} marcó "${nombreItem}" en 86 (${motivoLabel}).${
      nuevoControl86.nota86 ? ` Nota: ${nuevoControl86.nota86}` : ''
    }`,
    urgencia: 'alta',
    enlace: '/cocina',
    origen: 'manual',
    creadaPor: responsable,
    metadata: { tipo, itemId, motivo86: nuevoControl86.motivo86 || 'produccion_agotada' },
  });

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: 'ajuste_inventario',
    severidad: 'media',
    titulo: `Control 86 activado: ${nombreItem}`,
    descripcion: `Se pausó "${nombreItem}" en todos los canales (POS, Storefront, Kiosco, QR).`,
    motivo: `${motivoLabel}${nuevoControl86.nota86 ? ` · ${nuevoControl86.nota86}` : ''}`,
    montoImpacto: 0,
    responsableNombre: responsable,
    responsableRol: opciones.responsableRol || 'cocinero',
    entidadTipo: 'comanda',
    referenciaId: itemId,
  });

  return nuevoControl86;
}

/**
 * Reactiva en 1 toque un ítem que estaba en 86, opcionalmente cargando nuevas porciones.
 */
export async function reactivarItem86(
  negocioId: string,
  tipo: TipoItemCatalogo86,
  itemId: string,
  opciones: {
    porcionesIniciales?: number | null;
    activarContador?: boolean;
    responsableNombre?: string;
  } = {}
): Promise<Control86Item> {
  const tenantId = requireTenantId(negocioId);
  const colName = getCollectionName(tipo);
  const itemRef = doc(db, colName, itemId);
  const ahoraIso = new Date().toISOString();
  const responsable = (opciones.responsableNombre || 'Cocina / Caja').trim().slice(0, 120);

  let nombreItem = itemId;
  let nuevoControl86: Control86Item = sanitizarControl86({ agotado86: false });

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(itemRef);
    if (!snap.exists() || snap.data().negocioId !== tenantId) {
      throw new Error(`El ${tipo} no pertenece al negocio activo`);
    }

    const data = snap.data() as Partial<Producto | Combo>;
    nombreItem = typeof data.nombre === 'string' && data.nombre.trim() ? data.nombre.trim() : itemId;
    const prev = data.control86;

    const usaPorciones =
      typeof opciones.porcionesIniciales === 'number' && opciones.porcionesIniciales > 0;
    const contadorActivo =
      typeof opciones.activarContador === 'boolean'
        ? opciones.activarContador
        : usaPorciones
          ? true
          : Boolean(prev?.contadorActivo && (prev?.porcionesDisponibles ?? 0) > 0);

    const porcionesFinal = contadorActivo
      ? usaPorciones
        ? opciones.porcionesIniciales
        : Math.max(1, prev?.porcionesDisponibles ?? 10)
      : null;

    nuevoControl86 = sanitizarControl86({
      agotado86: false,
      contadorActivo,
      porcionesDisponibles: porcionesFinal,
      umbralAlertaPorciones: prev?.umbralAlertaPorciones ?? UMBRAL_ALERTA_PORCIONES_DEFAULT,
      auto86AlLlegarACero: prev?.auto86AlLlegarACero ?? true,
      actualizadoPor: responsable,
      actualizadoEnIso: ahoraIso,
    });

    tx.update(itemRef, {
      disponible: true,
      control86: nuevoControl86,
      actualizadoEn: Timestamp.now(),
    });
  });

  crearAlertaSilenciosa(tenantId, {
    modulo: 'cocina',
    tipo: 'control_86_reactivado',
    titulo: `Reactivado: ${nombreItem}`,
    mensaje: `${responsable} rehabilitó "${nombreItem}"${
      nuevoControl86.contadorActivo && nuevoControl86.porcionesDisponibles !== null
        ? ` con ${nuevoControl86.porcionesDisponibles} porciones disponibles.`
        : ' sin límite de porciones.'
    }`,
    urgencia: 'baja',
    enlace: '/cocina',
    origen: 'manual',
    creadaPor: responsable,
  });

  return nuevoControl86;
}

/**
 * Configura o ajusta el contador regresivo de porciones disponibles en tiempo real.
 */
export async function ajustarPorcionesItem86(
  negocioId: string,
  tipo: TipoItemCatalogo86,
  itemId: string,
  opciones: {
    contadorActivo: boolean;
    porcionesDisponibles?: number | null;
    umbralAlertaPorciones?: number;
    auto86AlLlegarACero?: boolean;
    responsableNombre?: string;
  }
): Promise<Control86Item> {
  const tenantId = requireTenantId(negocioId);
  const colName = getCollectionName(tipo);
  const itemRef = doc(db, colName, itemId);
  const ahoraIso = new Date().toISOString();
  const responsable = (opciones.responsableNombre || 'Cocina / Caja').trim().slice(0, 120);

  let nombreItem = itemId;
  let resultadoControl86: Control86Item = sanitizarControl86();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(itemRef);
    if (!snap.exists() || snap.data().negocioId !== tenantId) {
      throw new Error(`El ${tipo} no pertenece al negocio activo`);
    }

    const data = snap.data() as Partial<Producto | Combo>;
    nombreItem = typeof data.nombre === 'string' && data.nombre.trim() ? data.nombre.trim() : itemId;
    const prev = data.control86;
    const auto86 = opciones.auto86AlLlegarACero ?? prev?.auto86AlLlegarACero ?? true;
    const umbral = opciones.umbralAlertaPorciones ?? prev?.umbralAlertaPorciones ?? UMBRAL_ALERTA_PORCIONES_DEFAULT;

    const cantidad = opciones.contadorActivo
      ? Math.max(0, Math.round(Number(opciones.porcionesDisponibles ?? 0)))
      : null;

    const debeMarcar86 =
      opciones.contadorActivo && cantidad !== null && cantidad <= 0 && auto86;

    resultadoControl86 = sanitizarControl86({
      agotado86: debeMarcar86 ? true : opciones.contadorActivo && (cantidad ?? 0) > 0 ? false : Boolean(prev?.agotado86),
      motivo86: debeMarcar86 ? 'produccion_agotada' : prev?.motivo86,
      nota86: debeMarcar86 ? prev?.nota86 : undefined,
      contadorActivo: opciones.contadorActivo,
      porcionesDisponibles: cantidad,
      umbralAlertaPorciones: umbral,
      auto86AlLlegarACero: auto86,
      actualizadoPor: responsable,
      actualizadoEnIso: ahoraIso,
    });

    const disponibleFinal = debeMarcar86
      ? false
      : opciones.contadorActivo && (cantidad ?? 0) > 0
        ? true
        : data.disponible !== false;

    tx.update(itemRef, {
      disponible: disponibleFinal,
      control86: resultadoControl86,
      actualizadoEn: Timestamp.now(),
    });
  });

  if (resultadoControl86.agotado86) {
    crearAlertaSilenciosa(tenantId, {
      modulo: 'cocina',
      tipo: 'control_86_agotado',
      titulo: `86 automático: ${nombreItem}`,
      mensaje: `El contador de porciones de "${nombreItem}" llegó a 0 y se marcó en 86.`,
      urgencia: 'alta',
      enlace: '/cocina',
      origen: 'automatico',
    });
  } else if (
    resultadoControl86.contadorActivo &&
    typeof resultadoControl86.porcionesDisponibles === 'number' &&
    resultadoControl86.porcionesDisponibles > 0 &&
    resultadoControl86.porcionesDisponibles <= (resultadoControl86.umbralAlertaPorciones ?? UMBRAL_ALERTA_PORCIONES_DEFAULT)
  ) {
    crearAlertaSilenciosa(tenantId, {
      modulo: 'cocina',
      tipo: 'ultimas_porciones_86',
      titulo: `Últimas porciones: ${nombreItem}`,
      mensaje: `Solo quedan ${resultadoControl86.porcionesDisponibles} porciones de "${nombreItem}".`,
      urgencia: 'media',
      enlace: '/cocina',
      origen: 'automatico',
    });
  }

  return resultadoControl86;
}

/**
 * Descuenta atómicamente las porciones disponibles de los productos/combos vendidos
 * cuando tienen el contador Control 86 activo. Dispara auto-86 al llegar a 0.
 */
export async function consumirPorcionesEnPedido(
  negocioId: string,
  items: ItemVenta[],
  contexto: { origen: string; referencia?: string } = { origen: 'pos' }
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  if (!Array.isArray(items) || items.length === 0) return;

  const cantidadesPorClave = new Map<
    string,
    { tipo: TipoItemCatalogo86; id: string; cantidad: number }
  >();

  for (const item of items) {
    if (!item.referenciaId || (item.tipo !== 'producto' && item.tipo !== 'combo')) continue;
    const cant = Math.max(0, Math.round(Number(item.cantidad) || 0));
    if (cant <= 0) continue;
    const key = `${item.tipo}:${item.referenciaId}`;
    const prev = cantidadesPorClave.get(key);
    if (prev) {
      prev.cantidad += cant;
    } else {
      cantidadesPorClave.set(key, { tipo: item.tipo, id: item.referenciaId, cantidad: cant });
    }
  }

  const ahoraIso = new Date().toISOString();

  for (const entry of cantidadesPorClave.values()) {
    const colName = getCollectionName(entry.tipo);
    const itemRef = doc(db, colName, entry.id);

    try {
      let nombreItem = '';
      let porcionesPrevias = 0;
      let porcionesRestantes = 0;
      let umbral = UMBRAL_ALERTA_PORCIONES_DEFAULT;
      let marcoAuto86 = false;
      let huboDescuento = false;

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(itemRef);
        if (!snap.exists() || snap.data().negocioId !== tenantId) return;

        const data = snap.data() as Partial<Producto | Combo>;
        const c86 = data.control86;
        if (!c86?.contadorActivo || typeof c86.porcionesDisponibles !== 'number') {
          return;
        }

        huboDescuento = true;
        nombreItem = typeof data.nombre === 'string' ? data.nombre : entry.id;
        porcionesPrevias = Math.max(0, Math.round(c86.porcionesDisponibles));
        porcionesRestantes = Math.max(0, porcionesPrevias - entry.cantidad);
        umbral = c86.umbralAlertaPorciones ?? UMBRAL_ALERTA_PORCIONES_DEFAULT;
        const auto86 = c86.auto86AlLlegarACero !== false;
        marcoAuto86 = porcionesRestantes === 0 && auto86;

        const nuevoControl86 = sanitizarControl86({
          ...c86,
          contadorActivo: true,
          porcionesDisponibles: porcionesRestantes,
          agotado86: marcoAuto86 ? true : Boolean(c86.agotado86),
          motivo86: marcoAuto86 ? 'produccion_agotada' : c86.motivo86,
          actualizadoPor: `Venta ${contexto.origen}`,
          actualizadoEnIso: ahoraIso,
        });

        tx.update(itemRef, {
          ...(marcoAuto86 ? { disponible: false } : {}),
          control86: nuevoControl86,
          actualizadoEn: Timestamp.now(),
        });
      });

      if (!huboDescuento) continue;

      if (marcoAuto86 && porcionesPrevias > 0) {
        crearAlertaSilenciosa(tenantId, {
          modulo: 'cocina',
          tipo: 'control_86_agotado',
          titulo: `86 automático · ${nombreItem}`,
          mensaje: `"${nombreItem}" llegó a 0 porciones (${contexto.origen}${
            contexto.referencia ? ` #${contexto.referencia.slice(-6)}` : ''
          }) y quedó bloqueado en todos los canales.`,
          urgencia: 'alta',
          enlace: '/cocina',
          origen: 'automatico',
        });
      } else if (
        porcionesRestantes > 0 &&
        porcionesRestantes <= umbral &&
        porcionesPrevias > umbral
      ) {
        crearAlertaSilenciosa(tenantId, {
          modulo: 'cocina',
          tipo: 'ultimas_porciones_86',
          titulo: `Quedan ${porcionesRestantes}: ${nombreItem}`,
          mensaje: `El contador de "${nombreItem}" bajó a ${porcionesRestantes} porciones.`,
          urgencia: 'media',
          enlace: '/cocina',
          origen: 'automatico',
        });
      }
    } catch (err) {
      console.warn(`No se pudo descontar porciones 86 para ${entry.tipo}:${entry.id}:`, err);
    }
  }
}

/**
 * Guarda o limpia la programación de Especial del Día (solo administradores).
 */
export async function guardarEspecialDelDiaItem(
  negocioId: string,
  tipo: TipoItemCatalogo86,
  itemId: string,
  config: EspecialDelDiaConfig | null
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const colName = getCollectionName(tipo);
  const itemRef = doc(db, colName, itemId);
  const snap = await getDoc(itemRef);

  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error(`El ${tipo} no pertenece al negocio activo`);
  }

  if (!config || !config.activo) {
    await updateDoc(itemRef, {
      especialDelDia: deleteField(),
      actualizadoEn: Timestamp.now(),
    });
    return;
  }

  const especialLimpio = sanitizarEspecialDelDia(config);
  await updateDoc(itemRef, {
    especialDelDia: especialLimpio,
    actualizadoEn: Timestamp.now(),
  });
}

/**
 * Restablece en lote todos los productos/combos marcados en 86 al iniciar un nuevo turno.
 */
export async function restablecerTodosLos86(
  negocioId: string,
  itemsEn86: Pick<ItemCatalogo86, 'id' | 'tipo' | 'control86'>[],
  responsableNombre: string = 'Cocina / Caja'
): Promise<number> {
  const tenantId = requireTenantId(negocioId);
  if (!itemsEn86.length) return 0;

  const ahoraIso = new Date().toISOString();
  const responsable = responsableNombre.trim().slice(0, 120) || 'Cocina / Caja';
  const batch = writeBatch(db);
  const lote = itemsEn86.slice(0, 400);

  for (const item of lote) {
    const ref = doc(db, getCollectionName(item.tipo), item.id);
    const prev = item.control86;
    const nuevoControl86 = sanitizarControl86({
      agotado86: false,
      contadorActivo: false,
      porcionesDisponibles: null,
      umbralAlertaPorciones: prev?.umbralAlertaPorciones ?? UMBRAL_ALERTA_PORCIONES_DEFAULT,
      auto86AlLlegarACero: prev?.auto86AlLlegarACero ?? true,
      actualizadoPor: responsable,
      actualizadoEnIso: ahoraIso,
    });

    batch.update(ref, {
      disponible: true,
      control86: nuevoControl86,
      actualizadoEn: Timestamp.now(),
    });
  }

  await batch.commit();

  crearAlertaSilenciosa(tenantId, {
    modulo: 'cocina',
    tipo: 'control_86_restablecido',
    titulo: `Pizarra 86 restablecida (${lote.length} platos)`,
    mensaje: `${responsable} reactivó ${lote.length} productos/combos para el turno.`,
    urgencia: 'baja',
    enlace: '/cocina',
    origen: 'manual',
    creadaPor: responsable,
  });

  return lote.length;
}
