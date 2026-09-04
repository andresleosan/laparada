import { Minus, Plus } from 'lucide-react';

interface MenuItemQuantityControlProps {
  itemName: string;
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  className?: string;
}

export function MenuItemQuantityControl({
  itemName,
  quantity,
  onDecrease,
  onIncrease,
  className = '',
}: MenuItemQuantityControlProps) {
  if (quantity <= 0) {
    return (
      <button
        type="button"
        onClick={onIncrease}
        aria-label={`Agregar ${itemName} al pedido`}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-neutral-950 shadow-sm transition hover:bg-amber-300 active:scale-[0.98] ${className}`}
      >
        <Plus size={17} aria-hidden="true" />
        <span>Agregar</span>
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={`Cantidad de ${itemName} en el pedido`}
      className={`inline-flex min-h-11 items-center rounded-xl bg-neutral-950 p-0.5 text-white shadow-sm ${className}`}
    >
      <button
        type="button"
        onClick={onDecrease}
        aria-label={`Reducir cantidad de ${itemName}`}
        className="grid h-11 w-11 place-items-center rounded-lg text-neutral-300 hover:bg-neutral-800 hover:text-white"
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <span className="min-w-8 text-center text-sm font-black tabular-nums">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        aria-label={`Aumentar cantidad de ${itemName}`}
        className="grid h-11 w-11 place-items-center rounded-lg bg-amber-400 text-neutral-950 hover:bg-amber-300"
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
