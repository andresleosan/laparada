// src/pages/VentasPage.tsx
import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { History } from 'lucide-react';

export function VentasPage() {
  return (
    <div className="pb-20 p-4">
      <h1 className="text-3xl font-display font-bold text-gold-400 mb-6">
        Historial de Ventas
      </h1>
      <EmptyState
        icon={History}
        title="Historial de transacciones"
        description="Disponible en Fase 5"
      />
    </div>
  );
}
