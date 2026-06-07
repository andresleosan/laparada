// src/pages/InventarioPage.tsx
import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Box } from 'lucide-react';

export function InventarioPage() {
  return (
    <div className="pb-20 p-4">
      <h1 className="text-3xl font-display font-bold text-gold-400 mb-6">
        Inventario
      </h1>
      <EmptyState
        icon={Box}
        title="Gestión de insumos"
        description="Disponible en Fase 4"
      />
    </div>
  );
}
