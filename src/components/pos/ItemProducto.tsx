// src/components/pos/ItemProducto.tsx

import { AlertTriangle, Ban, Clock, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCOP } from '@/utils/formatCOP';
import { getProductColorClass } from '@/services/imageService';
import { getGourmetImage } from '@/utils/productImages';
import { ESTACIONES_COCINA_META } from '@/utils/estacionesCocinaUtils';
import { Badge86Estado, BadgeEspecialDelDia } from '@/components/control86/Control86Badges';
import type { AlertaStockItem, EstacionCocina, EvaluacionControl86 } from '@/types';

interface ItemProductoProps {
  nombre: string;
  precio: number;
  descripcion?: string;
  disponible: boolean;
  esCombo?: boolean;
  esPersonalizable?: boolean;
  imagenUrl?: string;
  onAgregar: () => void;
  disabled?: boolean;
  alertaStock?: AlertaStockItem;
  evaluacion86?: EvaluacionControl86;
  estacionCocina?: EstacionCocina;
  tiempoPreparacionMin?: number;
}

export function ItemProducto({
  nombre,
  precio,
  descripcion,
  disponible,
  esCombo = false,
  esPersonalizable = false,
  imagenUrl,
  onAgregar,
  disabled = false,
  alertaStock,
  evaluacion86,
  estacionCocina,
  tiempoPreparacionMin,
}: ItemProductoProps) {
  const colorClass = getProductColorClass(nombre);
  // Tarjeta pequeña del POS: la variante de 480px basta y pesa un tercio.
  const resolvedImageUrl = getGourmetImage(nombre, imagenUrl, 480);
  const estaEn86 = Boolean(evaluacion86?.agotado86);
  const fueraHorarioEspecial = evaluacion86?.estado === 'fuera_horario_especial';
  const estaAgotado = !estaEn86 && alertaStock?.estado === 'agotado';
  const tieneBajoStock = !estaEn86 && !evaluacion86?.contadorActivo && alertaStock?.estado === 'bajo_stock';
  const bloqueadoPor86ODisp = !disponible || estaEn86 || estaAgotado || fueraHorarioEspecial;
  
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
            {esPersonalizable && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 border border-amber-400/50 px-1.5 py-0.5 text-[10px] font-black text-amber-300 whitespace-nowrap">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                ARMA TU COMBO
              </span>
            )}
            {esCombo && !esPersonalizable && (
              <span className="text-xs font-bold text-gold-400 whitespace-nowrap">
                COMBO
              </span>
            )}
            {evaluacion86 && <BadgeEspecialDelDia evaluacion={evaluacion86} compacto />}
            {evaluacion86 && <Badge86Estado evaluacion={evaluacion86} compacto />}
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
            {!evaluacion86?.contadorActivo &&
              alertaStock?.estado === 'disponible' &&
              typeof alertaStock.porcionesDisponibles === 'number' && (
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

        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-bold text-gold-400">
            {formatCOP(precio)}
          </p>
          {(estacionCocina || (typeof tiempoPreparacionMin === 'number' && tiempoPreparacionMin > 0)) && (
            <span className="inline-flex items-center gap-1 rounded-md border border-neutral-700/80 bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-300 backdrop-blur-xs">
              {estacionCocina && (
                <span aria-hidden="true">{ESTACIONES_COCINA_META[estacionCocina].emoji}</span>
              )}
              <Clock className="h-2.5 w-2.5 text-amber-400" aria-hidden="true" />
              <span>
                {tiempoPreparacionMin ??
                  (estacionCocina ? ESTACIONES_COCINA_META[estacionCocina].tiempoDefaultMin : 10)}
                m
              </span>
            </span>
          )}
        </div>
      </div>

      <Button
        onClick={onAgregar}
        disabled={bloqueadoPor86ODisp || disabled}
        aria-label={
          estaEn86
            ? `${nombre} marcado en 86 (agotado)`
            : fueraHorarioEspecial
              ? `${nombre} disponible solo en horario especial`
              : !disponible
                ? `${nombre} no disponible`
                : estaAgotado
                  ? `${nombre} no disponible: ${alertaStock?.insumoCritico || 'insumo'} agotado`
                  : disabled
                    ? `Agregar ${nombre} al ticket (cobro en proceso)`
                    : esPersonalizable
                      ? `Personalizar ${nombre}`
                      : `Agregar ${nombre} al ticket`
        }
        size="sm"
        variant={!bloqueadoPor86ODisp ? 'primary' : 'secondary'}
        fullWidth
        className="mt-4 relative z-10"
      >
        {estaEn86 ? (
          <Ban className="h-4 w-4 text-red-400" aria-hidden="true" />
        ) : esPersonalizable && !bloqueadoPor86ODisp && !disabled ? (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Plus className="h-4 w-4" aria-hidden="true" />
        )}
        <span>
          {estaEn86
            ? '86 · Agotado'
            : fueraHorarioEspecial
              ? 'Fuera de horario'
              : !disponible
                ? 'No disponible'
                : estaAgotado
                  ? `Agotado (${alertaStock?.insumoCritico || 'insumo'})`
                  : disabled
                    ? 'Procesando cobro'
                    : esPersonalizable
                      ? 'Personalizar'
                      : 'Agregar'}
        </span>
      </Button>
    </div>
  );
}
