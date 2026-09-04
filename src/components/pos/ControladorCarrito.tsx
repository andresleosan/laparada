// src/components/pos/ControladorCarrito.tsx

import { Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ControladorCarritoProps {
  cantidad: number;
  nombreItem?: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function ControladorCarrito({
  cantidad,
  nombreItem = 'producto',
  onIncrement,
  onDecrement,
  onRemove,
  disabled = false,
}: ControladorCarritoProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={onDecrement}
        size="sm"
        variant="secondary"
        className="h-11 w-11 p-2"
        aria-label={`Disminuir cantidad de ${nombreItem}`}
        disabled={disabled}
      >
        <Minus className="h-3 w-3" aria-hidden="true" />
      </Button>

      <span
        className="w-7 text-center font-semibold text-neutral-50"
        aria-label={`Cantidad de ${nombreItem}: ${cantidad}`}
        aria-live="polite"
      >
        {cantidad}
      </span>

      <Button
        onClick={onIncrement}
        size="sm"
        variant="primary"
        className="h-11 w-11 p-2"
        aria-label={`Aumentar cantidad de ${nombreItem}`}
        disabled={disabled}
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
      </Button>

      <Button
        onClick={onRemove}
        size="sm"
        variant="danger"
        className="h-11 w-11 p-2"
        aria-label={`Eliminar ${nombreItem} del ticket`}
        disabled={disabled}
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </Button>
    </div>
  );
}
