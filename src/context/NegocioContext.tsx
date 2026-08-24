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

  const cargarDatosNegocio = useCallback(async () => {
    if (authLoading) return;

    if (!user || !user.email) {
      setNegocioActual(NEGOCIO_LA_PARADA);
      setUsuarioNegocio(null);
      setEsSuperAdmin(false);
      setCargandoNegocio(false);
      return;
    }

    setCargandoNegocio(true);
    try {
      const email = user.email.trim().toLowerCase();
      const perfil = await getPerfilUsuarioYNegocio(email, user.uid);

      setNegocioActual(perfil.negocio);
      setUsuarioNegocio(perfil.usuarioNegocio);
      setEsSuperAdmin(perfil.esSuperAdmin || email === SUPER_ADMIN_EMAIL.toLowerCase());
    } catch (error) {
      console.error('Error cargando perfil de negocio:', error);
      // Fallback seguro a La Parada
      setNegocioActual(NEGOCIO_LA_PARADA);
      setEsSuperAdmin(user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
    } finally {
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
    (user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ||
    negocioActual.id === DEFAULT_NEGOCIO_ID;

  const estadoAprobacion = negocioActual.estado || 'activo';

  const cambiarNegocioActivo = (negocio: Negocio) => {
    if (esSuperAdmin) {
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
