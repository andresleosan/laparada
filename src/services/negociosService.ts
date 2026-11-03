// src/services/negociosService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { db, auth } from './firebase';
import { assertValidAdminProfile } from '../security/adminAuthorization';
import {
  Negocio,
  UsuarioNegocio,
  EstadoNegocio,
  TipoPlanSaaS,
  PLANES_SAAS,
  SUPER_ADMIN_EMAIL,
  DEFAULT_NEGOCIO_ID,
} from '../types/negocio';
import { requireTenantId } from '@/security/tenantScope';

const OPERATIONAL_FIELDS = ['nombre', 'telefono', 'ciudad', 'direccion', 'logoUrl'] as const;

/**
 * Negocio oficial inicial (La Parada)
 */
export const NEGOCIO_LA_PARADA: Negocio = {
  id: DEFAULT_NEGOCIO_ID,
  nombre: 'La Parada',
  slug: 'la-parada',
  propietarioEmail: SUPER_ADMIN_EMAIL,
  propietarioNombre: 'Andrés Sánchez',
  telefono: '3001234567',
  direccion: 'Calle Principal # 12-34',
  ciudad: 'Cúcuta',
  logoUrl: '/logo-96.jpg',
  estado: 'activo',
  plan: 'enterprise',
  planId: 'enterprise',
  cuotaRespuestasIA: 100000,
  respuestasIAUsadas: 0,
  creadoEn: Timestamp.now(),
  aprobadoEn: Timestamp.now(),
};

function pickOperationalFields(source: Partial<Record<(typeof OPERATIONAL_FIELDS)[number], unknown>>): DatosOperativosNegocio {
  return Object.fromEntries(
    OPERATIONAL_FIELDS
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]])
  ) as DatosOperativosNegocio;
}

async function resolveLaParadaNegocio(): Promise<Negocio> {
  try {
    const snap = await getDoc(doc(db, 'negocios', DEFAULT_NEGOCIO_ID));
    if (snap && typeof snap.exists === 'function' && snap.exists()) {
      const stored = snap.data() as Record<string, unknown>;
      return {
        ...NEGOCIO_LA_PARADA,
        ...pickOperationalFields(stored),
        id: DEFAULT_NEGOCIO_ID,
        estado: 'activo',
      };
    }
  } catch {
    // Si aún no existe el documento en Firestore, conservar los valores base.
  }
  return NEGOCIO_LA_PARADA;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export interface SolicitudRegistroNegocioInput {
  nombreNegocio: string;
  nombrePropietario: string;
  email: string;
  password: string;
  telefono: string;
  ciudad?: string;
  direccion?: string;
  planDeseado?: TipoPlanSaaS;
}

/**
 * Solicitar registro de un nuevo negocio externo (ej: "El Punto", "Puesto Central")
 */
export async function solicitarRegistroNegocio(
  data: SolicitudRegistroNegocioInput
): Promise<{ negocioId: string; uid: string }> {
  try {
    if (!auth) throw new Error('Firebase Auth no disponible');

    let uid = auth.currentUser?.uid;
    const normalizedEmail = data.email.trim().toLowerCase();

    // Si no hay sesión activa, crear usuario con email y password
    if (!uid) {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        data.password
      );
      uid = userCredential.user.uid;
    }

    const planElegido: TipoPlanSaaS = data.planDeseado && PLANES_SAAS[data.planDeseado]
      ? data.planDeseado
      : 'prueba_3d';
    const configPlan = PLANES_SAAS[planElegido];

    const slug = slugify(data.nombreNegocio) || `local-${Date.now()}`;
    const negocioRef = doc(collection(db, 'negocios'));
    const negocioId = negocioRef.id;

    const nuevoNegocio: Negocio = {
      id: negocioId,
      nombre: data.nombreNegocio.trim(),
      slug,
      propietarioEmail: normalizedEmail,
      propietarioNombre: data.nombrePropietario.trim(),
      telefono: data.telefono.trim(),
      ciudad: data.ciudad?.trim() || '',
      direccion: data.direccion?.trim() || '',
      logoUrl: null,
      estado: 'pendiente',
      plan: planElegido,
      planId: planElegido,
      cuotaRespuestasIA: configPlan.cuotaRespuestasIA,
      respuestasIAUsadas: 0,
      creadoEn: Timestamp.now(),
    };

    await setDoc(negocioRef, nuevoNegocio);

    const usuarioNegocioRef = doc(db, 'usuarios_negocio', uid);
    const nuevoUsuario: UsuarioNegocio = {
      uid,
      email: normalizedEmail,
      nombre: data.nombrePropietario.trim(),
      negocioId,
      rol: 'admin',
      activo: true,
      creadoEn: Timestamp.now(),
    };

    await setDoc(usuarioNegocioRef, nuevoUsuario);

    return { negocioId, uid };
  } catch (error) {
    console.error('Error al registrar negocio:', error);
    throw error;
  }
}

/**
 * Obtener todos los negocios registrados (Exclusivo para SuperAdmin)
 */
export async function getTodosNegocios(estado?: EstadoNegocio): Promise<Negocio[]> {
  try {
    let q = query(collection(db, 'negocios'), orderBy('creadoEn', 'desc'));
    if (estado) {
      q = query(
        collection(db, 'negocios'),
        where('estado', '==', estado),
        orderBy('creadoEn', 'desc')
      );
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Negocio));

    // Incluir La Parada siempre en la lista
    if (!estado || estado === 'activo') {
      const existe = list.find((n) => n.id === DEFAULT_NEGOCIO_ID);
      if (!existe) list.unshift(NEGOCIO_LA_PARADA);
    }

    return list;
  } catch (error) {
    console.error('Error al obtener negocios:', error);
    return [NEGOCIO_LA_PARADA];
  }
}

/**
 * Obtener datos de un negocio por su identificador
 */
export async function getNegocioPorId(negocioId: string): Promise<Negocio | null> {
  const tenantId = requireTenantId(negocioId);
  const snapshot = await getDoc(doc(db, 'negocios', tenantId));
  if (!snapshot.exists()) {
    return tenantId === DEFAULT_NEGOCIO_ID ? NEGOCIO_LA_PARADA : null;
  }
  return { ...snapshot.data(), id: snapshot.id } as Negocio;
}

/**
 * Aprobar la solicitud de un negocio y activar su plan inicial
 */
export async function aprobarNegocio(
  negocioId: string,
  planId: TipoPlanSaaS = 'prueba_3d'
): Promise<void> {
  try {
    const configPlan = PLANES_SAAS[planId] || PLANES_SAAS.prueba_3d;
    const duracionMs = configPlan.dias * 24 * 60 * 60 * 1000;
    const venceEn = Timestamp.fromMillis(Date.now() + duracionMs);

    const negocioRef = doc(db, 'negocios', negocioId);
    await updateDoc(negocioRef, {
      estado: 'activo',
      plan: planId,
      planId,
      cuotaRespuestasIA: configPlan.cuotaRespuestasIA,
      respuestasIAUsadas: 0,
      suscripcionVenceEn: venceEn,
      aprobadoEn: Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al aprobar negocio:', error);
    throw error;
  }
}

/**
 * Renovar o extender la suscripción de un negocio con un plan (+3d, +7d, +15d, +30d)
 */
export async function renovarSuscripcionNegocio(
  negocioId: string,
  planId: TipoPlanSaaS
): Promise<void> {
  try {
    const configPlan = PLANES_SAAS[planId];
    if (!configPlan) throw new Error(`Plan SaaS no válido: ${planId}`);

    const duracionMs = configPlan.dias * 24 * 60 * 60 * 1000;
    const negocioRef = doc(db, 'negocios', negocioId);
    const snap = await getDoc(negocioRef);
    const data = snap.data() as Partial<Negocio> | undefined;

    const baseTiempo = data?.suscripcionVenceEn && typeof data.suscripcionVenceEn.toMillis === 'function'
      ? Math.max(Date.now(), data.suscripcionVenceEn.toMillis())
      : Date.now();

    const nuevoVencimiento = Timestamp.fromMillis(baseTiempo + duracionMs);
    const nuevaCuota = (data?.cuotaRespuestasIA && data.cuotaRespuestasIA > 0 ? data.cuotaRespuestasIA : 0) + configPlan.cuotaRespuestasIA;

    await updateDoc(negocioRef, {
      estado: 'activo',
      plan: planId,
      planId,
      cuotaRespuestasIA: nuevaCuota,
      suscripcionVenceEn: nuevoVencimiento,
      actualizadoEn: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al renovar suscripción de negocio:', error);
    throw error;
  }
}

/**
 * Cambiar estado de un negocio (activo, suspendido, rechazado)
 */
export async function cambiarEstadoNegocio(
  negocioId: string,
  estado: EstadoNegocio,
  notas?: string
): Promise<void> {
  try {
    const negocioRef = doc(db, 'negocios', negocioId);
    await updateDoc(negocioRef, {
      estado,
      notasAdmin: notas || null,
      actualizadoEn: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al cambiar estado de negocio:', error);
    throw error;
  }
}

/**
 * Obtener perfil de negocio y rol de un usuario por su Email o UID
 */
export async function getPerfilUsuarioYNegocio(
  email: string,
  uid?: string
): Promise<{
  negocio: Negocio;
  usuarioNegocio: UsuarioNegocio;
  esSuperAdmin: boolean;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  const isSuperAdmin = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();

  // Si es el Super Admin, tiene acceso a La Parada con rol superadmin
  if (isSuperAdmin) {
    const negocio = await resolveLaParadaNegocio();
    return {
      negocio,
      usuarioNegocio: {
        uid: uid || 'superadmin',
        email: normalizedEmail,
        nombre: 'Super Admin Andrés',
        negocioId: DEFAULT_NEGOCIO_ID,
        rol: 'superadmin',
        activo: true,
        creadoEn: Timestamp.now(),
      },
      esSuperAdmin: true,
    };
  }

  if (!uid) {
    throw new Error('No se pudo validar la identidad del usuario');
  }

  // El perfil administrativo debe pertenecer exactamente al UID autenticado.
  let usuarioDoc: UsuarioNegocio | null = null;

  const userSnap = await getDoc(doc(db, 'usuarios_negocio', uid));
  if (userSnap.exists()) {
    usuarioDoc = userSnap.data() as UsuarioNegocio;
  }

  if (!usuarioDoc) {
    throw new Error('Tu usuario no tiene un perfil administrativo asignado');
  }

  assertValidAdminProfile(usuarioDoc, { uid, email: normalizedEmail });

  // Obtener negocio asociado
  let negocio: Negocio;
  if (usuarioDoc.negocioId === DEFAULT_NEGOCIO_ID) {
    negocio = await resolveLaParadaNegocio();
  } else if (usuarioDoc.negocioId) {
    const negSnap = await getDoc(doc(db, 'negocios', usuarioDoc.negocioId));
    if (!negSnap.exists()) {
      throw new Error('El negocio asociado a tu perfil no existe');
    }
    negocio = { ...negSnap.data(), id: negSnap.id } as Negocio;
  } else {
    throw new Error('Tu perfil administrativo no tiene un negocio válido');
  }

  return {
    negocio,
    usuarioNegocio: usuarioDoc,
    esSuperAdmin: false,
  };
}

export type DatosOperativosNegocio = Partial<Pick<
  Negocio,
  'nombre' | 'telefono' | 'ciudad' | 'direccion' | 'logoUrl'
>>;

function isNotFoundFirestoreError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = String((error as { code?: unknown }).code);
  return code === 'not-found' || code === 'firestore/not-found';
}

/**
 * Actualizar datos de un negocio (nombre, logo, teléfono, etc.)
 */
export async function actualizarDatosNegocio(
  negocioId: string,
  updates: DatosOperativosNegocio
): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    const negocioRef = doc(db, 'negocios', tenantId);
    const operationalUpdates = pickOperationalFields(updates);
    const payload = {
      ...operationalUpdates,
      actualizadoEn: Timestamp.now(),
    };
    try {
      await updateDoc(negocioRef, payload);
    } catch (error) {
      if (tenantId === DEFAULT_NEGOCIO_ID && isNotFoundFirestoreError(error)) {
        await setDoc(negocioRef, payload, { merge: true });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error al actualizar datos de negocio:', error);
    throw error;
  }
}

/**
 * Obtener los usuarios/operadores de un negocio específico
 */
export async function getUsuariosDeNegocio(
  negocioId: string
): Promise<UsuarioNegocio[]> {
  try {
    const q = query(
      collection(db, 'usuarios_negocio'),
      where('negocioId', '==', negocioId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as UsuarioNegocio);
  } catch (error) {
    console.error('Error al obtener usuarios de negocio:', error);
    return [];
  }
}

/**
 * Activar o desactivar un usuario de negocio
 */
export async function toggleUsuarioActivo(
  uid: string,
  activo: boolean
): Promise<void> {
  try {
    const userRef = doc(db, 'usuarios_negocio', uid);
    await updateDoc(userRef, { activo });
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    throw error;
  }
}
