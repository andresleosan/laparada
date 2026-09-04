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
  SUPER_ADMIN_EMAIL,
  DEFAULT_NEGOCIO_ID,
} from '../types/negocio';
import { requireTenantId } from '@/security/tenantScope';

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
  creadoEn: Timestamp.now(),
  aprobadoEn: Timestamp.now(),
};

/**
 * Función auxiliar para generar slugs URL amigables
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * Solicitar registro de un nuevo negocio externo (ej: "El Punto")
 */
export async function solicitarRegistroNegocio(data: {
  nombreNegocio: string;
  nombrePropietario: string;
  email: string;
  password: string;
  telefono: string;
  ciudad?: string;
  direccion?: string;
}): Promise<{ negocioId: string; uid: string }> {
  try {
    if (!auth) throw new Error('Firebase Auth no disponible');

    // 1. Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email.trim().toLowerCase(),
      data.password
    );
    const uid = userCredential.user.uid;

    // 2. Crear documento de Negocio en estado 'pendiente'
    const slug = slugify(data.nombreNegocio);
    const negocioRef = doc(collection(db, 'negocios'));
    const negocioId = negocioRef.id;

    const nuevoNegocio: Negocio = {
      id: negocioId,
      nombre: data.nombreNegocio.trim(),
      slug,
      propietarioEmail: data.email.trim().toLowerCase(),
      propietarioNombre: data.nombrePropietario.trim(),
      telefono: data.telefono.trim(),
      ciudad: data.ciudad?.trim() || '',
      direccion: data.direccion?.trim() || '',
      logoUrl: null,
      estado: 'pendiente',
      plan: 'basico',
      creadoEn: Timestamp.now(),
    };

    await setDoc(negocioRef, nuevoNegocio);

    // 3. Crear registro en colección usuarios_negocio
    const usuarioNegocioRef = doc(db, 'usuarios_negocio', uid);
    const nuevoUsuario: UsuarioNegocio = {
      uid,
      email: data.email.trim().toLowerCase(),
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
    return {
      negocio: NEGOCIO_LA_PARADA,
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
  let negocio: Negocio = NEGOCIO_LA_PARADA;
  if (usuarioDoc.negocioId && usuarioDoc.negocioId !== DEFAULT_NEGOCIO_ID) {
    const negSnap = await getDoc(doc(db, 'negocios', usuarioDoc.negocioId));
    if (!negSnap.exists()) {
      throw new Error('El negocio asociado a tu perfil no existe');
    }
    negocio = negSnap.data() as Negocio;
  } else if (usuarioDoc.negocioId !== DEFAULT_NEGOCIO_ID) {
    throw new Error('Tu perfil administrativo no tiene un negocio válido');
  }

  return {
    negocio,
    usuarioNegocio: usuarioDoc,
    esSuperAdmin: false,
  };
}

/**
 * Obtener todos los negocios (Para Super Admin)
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

    // Incluir La Parada siempre
    if (!estado || estado === 'activo') {
      const existe = list.find((n) => n.id === DEFAULT_NEGOCIO_ID);
      if (!existe) list.unshift(NEGOCIO_LA_PARADA);
    }

    return list;
  } catch (error) {
    console.error('Error al obtener negocios:', error);
    throw error;
  }
}

export async function getNegocioPorId(negocioId: string): Promise<Negocio | null> {
  const tenantId = requireTenantId(negocioId);
  const snapshot = await getDoc(doc(db, 'negocios', tenantId));
  if (!snapshot.exists()) {
    return tenantId === DEFAULT_NEGOCIO_ID ? NEGOCIO_LA_PARADA : null;
  }
  return { ...snapshot.data(), id: snapshot.id } as Negocio;
}

/**
 * Aprobar la solicitud de un nuevo negocio
 */
export async function aprobarNegocio(negocioId: string): Promise<void> {
  try {
    const negocioRef = doc(db, 'negocios', negocioId);
    await updateDoc(negocioRef, {
      estado: 'activo',
      aprobadoEn: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al aprobar negocio:', error);
    throw error;
  }
}

/**
 * Rechazar o suspender la solicitud de un negocio
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
 * Actualizar datos de un negocio (nombre, logo, teléfono, etc.)
 */
export async function actualizarDatosNegocio(
  negocioId: string,
  updates: Partial<Negocio>
): Promise<void> {
  try {
    if (negocioId === DEFAULT_NEGOCIO_ID) {
      // La Parada
      return;
    }
    const negocioRef = doc(db, 'negocios', negocioId);
    await updateDoc(negocioRef, {
      ...updates,
      actualizadoEn: Timestamp.now(),
    });
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
