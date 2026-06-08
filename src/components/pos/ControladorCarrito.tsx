// src/components/pos/ControladorCarrito.tsx

import { Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ControladorCarritoProps {
  cantidad: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export function ControladorCarrito({
  cantidad,
  onIncrement,
  onDecrement,
  onRemove,
}: ControladorCarritoProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={onDecrement}
        size="sm"
        variant="secondary"
        className="p-2 w-8 h-8"
        aria-label="Disminuir cantidad"
      >
        <Minus className="h-3 w-3" />
      </Button>

      <span className="w-8 text-center font-semibold text-neutral-50">
        {cantidad}
      </span>

      <Button
        onClick={onIncrement}
        size="sm"
        variant="primary"
        className="p-2 w-8 h-8"
        aria-label="Aumentar cantidad"
      >
        <Plus className="h-3 w-3" />
      </Button>

      <Button
        onClick={onRemove}
        size="sm"
        variant="danger"
        className="p-2 w-8 h-8"
        aria-label="Remover item"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
