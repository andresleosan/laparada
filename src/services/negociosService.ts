// src/services/negociosService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { assertValidAdminProfile } from '../security/adminAuthorization';
import {
  Negocio,
  UsuarioNegocio,
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
    negocio = { ...negSnap.data(), id: negSnap.id } as Negocio;
  } else if (usuarioDoc.negocioId !== DEFAULT_NEGOCIO_ID) {
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

/**
 * Actualizar datos de un negocio (nombre, logo, teléfono, etc.)
 */
export async function actualizarDatosNegocio(
  negocioId: string,
  updates: DatosOperativosNegocio
): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    if (tenantId === DEFAULT_NEGOCIO_ID) {
      // La Parada
      return;
    }
    const negocioRef = doc(db, 'negocios', tenantId);
    const operationalFields = ['nombre', 'telefono', 'ciudad', 'direccion', 'logoUrl'] as const;
    const operationalUpdates = Object.fromEntries(
      operationalFields
        .filter((field) => updates[field] !== undefined)
        .map((field) => [field, updates[field]])
    );
    await updateDoc(negocioRef, {
      ...operationalUpdates,
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
