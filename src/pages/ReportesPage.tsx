// src/pages/ReportesPage.tsx
import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart3 } from 'lucide-react';

export function ReportesPage() {
  return (
    <div className="pb-20 p-4">
      <h1 className="text-3xl font-display font-bold text-gold-400 mb-6">
        Reportes
      </h1>
      <EmptyState
        icon={BarChart3}
        title="Análisis y reportes"
        description="Disponible en Fase 5"
      />
    </div>
  );
}
