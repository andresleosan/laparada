// src/context/JornadaContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Jornada } from '@/types';
import { detectJornadaActual } from '@/utils/jornadaUtils';

interface JornadaContextType {
  jornadaActual: Jornada;
  setJornada: (jornada: Jornada) => void;
}

const JornadaContext = createContext<JornadaContextType | undefined>(undefined);

export function JornadaProvider({ children }: { children: React.ReactNode }) {
  const [jornadaActual, setJornadaState] = useState<Jornada>(() =>
    detectJornadaActual()
  );

  // Re-detectar jornada cada hora
  useEffect(() => {
    const interval = setInterval(() => {
      setJornadaState(detectJornadaActual());
    }, 1000 * 60 * 60); // Cada hora

    return () => clearInterval(interval);
  }, []);

  const setJornada = (jornada: Jornada) => {
    setJornadaState(jornada);
  };

  return (
    <JornadaContext.Provider value={{ jornadaActual, setJornada }}>
      {children}
    </JornadaContext.Provider>
  );
}

export function useJornada() {
  const context = useContext(JornadaContext);
  if (context === undefined) {
    throw new Error('useJornada debe ser usado dentro de JornadaProvider');
  }
  return context;
}
