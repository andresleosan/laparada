// src/context/BotContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface BotContextType {
  botActivo: boolean;
  setBotActivo: (activo: boolean) => void;
  mensajesBienvenida: string;
  setMensajesBienvenida: (mensaje: string) => void;
  mensajeCierre: string;
  setMensajeCierre: (mensaje: string) => void;
  webhookVerificado: boolean;
  setWebhookVerificado: (verificado: boolean) => void;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

export function BotProvider({ children }: { children: React.ReactNode }) {
  const [botActivo, setBotActivo] = useState(false);
  const [mensajesBienvenida, setMensajesBienvenida] = useState(
    '¡Hola! Bienvenido a La Parada 🍔'
  );
  const [mensajeCierre, setMensajeCierre] = useState(
    'Gracias por tu pedido. ¡Hasta pronto!'
  );
  const [webhookVerificado, setWebhookVerificado] = useState(false);

  return (
    <BotContext.Provider
      value={{
        botActivo,
        setBotActivo,
        mensajesBienvenida,
        setMensajesBienvenida,
        mensajeCierre,
        setMensajeCierre,
        webhookVerificado,
        setWebhookVerificado,
      }}
    >
      {children}
    </BotContext.Provider>
  );
}

export function useBot() {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error('useBot debe ser usado dentro de BotProvider');
  }
  return context;
}
