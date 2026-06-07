// src/pages/BotConfigPage.tsx
import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { MessageCircle } from 'lucide-react';

export function BotConfigPage() {
  return (
    <div className="pb-20 p-4">
      <h1 className="text-3xl font-display font-bold text-gold-400 mb-6">
        Configuración del Bot
      </h1>
      <EmptyState
        icon={MessageCircle}
        title="Bot WhatsApp"
        description="Disponible en Fase 5"
      />
    </div>
  );
}
