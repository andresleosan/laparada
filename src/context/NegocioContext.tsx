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
} from '../services/negociosService';

interface NegocioContextType {
  negocioActual: Negocio;
  usuarioNegocio: UsuarioNegocio | null;
  esSuperAdmin: boolean;
  puedeUsarNanoBanana: boolean;
  cargandoNegocio: boolean;
  identidadResueltaUid: string | null;
  estadoAprobacion: 'activo' | 'pendiente' | 'rechazado' | 'suspendido' | null;
  refrescarNegocio: () => Promise<void>;
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
      setNegocioActual(perfil.negocio);
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

  // El procesamiento facturable se limita a quien también puede guardar imágenes.
  const puedeUsarNanoBanana =
    esSuperAdmin ||
    (
      Boolean(user && usuarioNegocio?.activo) &&
      usuarioNegocio?.rol === 'admin' &&
      negocioActual.id === DEFAULT_NEGOCIO_ID
    );

  const estadoAprobacion = negocioActual.estado || 'activo';

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
