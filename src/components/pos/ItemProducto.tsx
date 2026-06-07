// src/components/pos/ItemProducto.tsx
import React from 'react';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCOP } from '@/utils/formatCOP';

interface ItemProductoProps {
  nombre: string;
  precio: number;
  descripcion?: string;
  disponible: boolean;
  esCombо?: boolean;
  onAgregar: () => void;
}

export function ItemProducto({
  nombre,
  precio,
  descripcion,
  disponible,
  esCombо = false,
  onAgregar,
}: ItemProductoProps) {
  return (
    <Card className="p-4 flex flex-col h-full">
      <div className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-neutral-50 text-sm flex-1">
            {nombre}
          </h3>
          {esCombо && (
            <span className="ml-2 text-xs font-bold text-gold-400 whitespace-nowrap">
              COMBO
            </span>
          )}
        </div>

        {descripcion && (
          <p className="text-xs text-neutral-400 mb-3 line-clamp-2">
            {descripcion}
          </p>
        )}

        <p className="text-lg font-bold text-gold-400">
          {formatCOP(precio)}
        </p>
      </div>

      <Button
        onClick={onAgregar}
        disabled={!disponible}
        size="sm"
        variant={disponible ? 'primary' : 'secondary'}
        fullWidth
        className="mt-4"
      >
        <Plus className="h-4 w-4" />
        <span>{disponible ? 'Agregar' : 'No disponible'}</span>
      </Button>
    </Card>
  );
}
