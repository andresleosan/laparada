// src/context/NegocioContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  Negocio,
  UsuarioNegocio,
  SUPER_ADMIN_EMAIL,
  DEFAULT_NEGOCIO_ID,
} from '../types/negocio';
import {
  NEGOCIO_LA_PARADA,
  getPerfilUsuarioYNegocio,
  getNegocioPorId,
} from '../services/negociosService';

const SUPERADMIN_TENANT_KEY = 'laparada.superadmin.tenant';

interface NegocioContextType {
  negocioActual: Negocio;
  usuarioNegocio: UsuarioNegocio | null;
  esSuperAdmin: boolean;
  puedeUsarNanoBanana: boolean;
  cargandoNegocio: boolean;
  identidadResueltaUid: string | null;
  estadoAprobacion: 'activo' | 'pendiente' | 'rechazado' | 'suspendido' | null;
  refrescarNegocio: () => Promise<void>;
  cambiarNegocioActivo: (negocio: Negocio) => void;
}

const NegocioContext = createContext<NegocioContextType | undefined>(undefined);

export function NegocioProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [negocioActual, setNegocioActual] = useState<Negocio>(NEGOCIO_LA_PARADA);
  const [usuarioNegocio, setUsuarioNegocio] = useState<UsuarioNegocio | null>(null);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);
  const [cargandoNegocio, setCargandoNegocio] = useState(true);
  const [identidadResueltaUid, setIdentidadResueltaUid] = useState<string | null>(null);

  const cargarDatosNegocio = useCallback(async () => {
    if (authLoading) return;

    if (!user || !user.email) {
      setNegocioActual(NEGOCIO_LA_PARADA);
      setUsuarioNegocio(null);
      setEsSuperAdmin(false);
      setIdentidadResueltaUid(null);
      setCargandoNegocio(false);
      return;
    }

    setCargandoNegocio(true);
    setIdentidadResueltaUid(null);
    try {
      const email = user.email.trim().toLowerCase();
      const perfil = await getPerfilUsuarioYNegocio(email, user.uid);
      let negocioSeleccionado = perfil.negocio;
      if (perfil.esSuperAdmin) {
        const tenantGuardado = sessionStorage.getItem(SUPERADMIN_TENANT_KEY);
        if (tenantGuardado) {
          const candidato = await getNegocioPorId(tenantGuardado);
          if (candidato?.estado === 'activo') {
            negocioSeleccionado = candidato;
          } else {
            sessionStorage.removeItem(SUPERADMIN_TENANT_KEY);
          }
        }
      }

      setNegocioActual(negocioSeleccionado);
      setUsuarioNegocio(perfil.usuarioNegocio);
      setEsSuperAdmin(perfil.esSuperAdmin || email === SUPER_ADMIN_EMAIL.toLowerCase());
    } catch (error) {
      console.error('Error cargando perfil de negocio:', error);
      // La tienda pública conserva La Parada, pero no se concede perfil administrativo.
      setNegocioActual(NEGOCIO_LA_PARADA);
      setUsuarioNegocio(null);
      setEsSuperAdmin(user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
    } finally {
      setIdentidadResueltaUid(user.uid);
      setCargandoNegocio(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    cargarDatosNegocio();
  }, [cargarDatosNegocio]);

  // Restricción exclusiva de Nano Banana:
  // Solo permitida para el Super Admin andres.san1404@gmail.com o negocio La Parada
  const puedeUsarNanoBanana =
    esSuperAdmin ||
    (Boolean(user && usuarioNegocio?.activo) && negocioActual.id === DEFAULT_NEGOCIO_ID);

  const estadoAprobacion = negocioActual.estado || 'activo';

  const cambiarNegocioActivo = (negocio: Negocio) => {
    if (esSuperAdmin && negocio.estado === 'activo') {
      sessionStorage.setItem(SUPERADMIN_TENANT_KEY, negocio.id);
      setNegocioActual(negocio);
    }
  };

  return (
    <NegocioContext.Provider
      value={{
        negocioActual,
        usuarioNegocio,
        esSuperAdmin,
        puedeUsarNanoBanana,
        cargandoNegocio,
        identidadResueltaUid,
        estadoAprobacion,
        refrescarNegocio: cargarDatosNegocio,
        cambiarNegocioActivo,
      }}
    >
      {children}
    </NegocioContext.Provider>
  );
}

export function useNegocio() {
  const context = useContext(NegocioContext);
  if (context === undefined) {
    throw new Error('useNegocio debe ser usado dentro de NegocioProvider');
  }
  return context;
}
