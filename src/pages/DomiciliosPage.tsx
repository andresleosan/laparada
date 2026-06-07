// src/pages/DomiciliosPage.tsx
import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Truck } from 'lucide-react';

export function DomiciliosPage() {
  return (
    <div className="pb-20 p-4">
      <h1 className="text-3xl font-display font-bold text-gold-400 mb-6">
        Domicilios
      </h1>
      <EmptyState
        icon={Truck}
        title="Gestión de pedidos"
        description="Disponible en Fase 3"
      />
    </div>
  );
}
