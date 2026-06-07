// src/pages/GastosPage.tsx
import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { DollarSign } from 'lucide-react';

export function GastosPage() {
  return (
    <div className="pb-20 p-4">
      <h1 className="text-3xl font-display font-bold text-gold-400 mb-6">
        Gastos y Cierre
      </h1>
      <EmptyState
        icon={DollarSign}
        title="Gestión de gastos"
        description="Disponible en Fase 5"
      />
    </div>
  );
}
