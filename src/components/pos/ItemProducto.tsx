// src/components/pos/ItemProducto.tsx

import { AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCOP } from '@/utils/formatCOP';
import { getProductColorClass } from '@/services/imageService';
import { getGourmetImage } from '@/utils/productImages';
import type { AlertaStockItem } from '@/types';

interface ItemProductoProps {
  nombre: string;
  precio: number;
  descripcion?: string;
  disponible: boolean;
  esCombo?: boolean;
  imagenUrl?: string;
  onAgregar: () => void;
  disabled?: boolean;
  alertaStock?: AlertaStockItem;
}

export function ItemProducto({
  nombre,
  precio,
  descripcion,
  disponible,
  esCombo = false,
  imagenUrl,
  onAgregar,
  disabled = false,
  alertaStock,
}: ItemProductoProps) {
  const colorClass = getProductColorClass(nombre);
  // Tarjeta pequeña del POS: la variante de 480px basta y pesa un tercio.
  const resolvedImageUrl = getGourmetImage(nombre, imagenUrl, 480);
  const estaAgotado = alertaStock?.estado === 'agotado';
  const tieneBajoStock = alertaStock?.estado === 'bajo_stock';
  
  return (
    <div
      data-admin-media="true"
      className={`min-h-56 rounded-2xl border border-neutral-700 p-4 flex flex-col h-full relative overflow-hidden group shadow-lg ${colorClass}`}
      style={resolvedImageUrl ? {
        backgroundImage: `url(${resolvedImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      {/* Overlay oscuro para mejorar legibilidad */}
      {resolvedImageUrl && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
      )}
      
      <div className="flex-1 relative z-10">
        <div className="flex items-start justify-between mb-2 gap-1.5 flex-wrap">
          <h3 className="font-semibold text-neutral-50 text-sm flex-1">
            {nombre}
          </h3>
          <div className="flex items-center gap-1">
            {esCombo && (
              <span className="text-xs font-bold text-gold-400 whitespace-nowrap">
                COMBO
              </span>
            )}
            {estaAgotado && (
              <span className="inline-flex items-center gap-1 rounded bg-red-950/90 border border-red-800/80 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Agotado
              </span>
            )}
            {tieneBajoStock && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-950/90 border border-amber-800/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {alertaStock?.porcionesDisponibles} disp.
              </span>
            )}
            {alertaStock?.estado === 'disponible' && typeof alertaStock.porcionesDisponibles === 'number' && (
              <span className="rounded bg-black/60 border border-neutral-700/60 px-1.5 py-0.5 text-[10px] text-neutral-300">
                {alertaStock.porcionesDisponibles} disp.
              </span>
            )}
          </div>
        </div>

        {descripcion && (
          <p className="text-xs text-neutral-300 mb-3 line-clamp-2">
            {descripcion}
          </p>
        )}

        <p className="text-lg font-bold text-gold-400">
          {formatCOP(precio)}
        </p>
      </div>

      <Button
        onClick={onAgregar}
        disabled={!disponible || estaAgotado || disabled}
        aria-label={
          !disponible
            ? `${nombre} no disponible`
            : estaAgotado
              ? `${nombre} no disponible: ${alertaStock?.insumoCritico || 'insumo'} agotado`
              : disabled
                ? `Agregar ${nombre} al ticket (cobro en proceso)`
                : `Agregar ${nombre} al ticket`
        }
        size="sm"
        variant={disponible && !estaAgotado ? 'primary' : 'secondary'}
        fullWidth
        className="mt-4 relative z-10"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>
          {!disponible
            ? 'No disponible'
            : estaAgotado
              ? `Agotado (${alertaStock?.insumoCritico || 'insumo'})`
              : disabled
                ? 'Procesando cobro'
                : 'Agregar'}
        </span>
      </Button>
    </div>
  );
}
