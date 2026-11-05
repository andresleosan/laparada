// src/components/reportes/TopInsumosCostoCard.tsx
import type { InsumoConsumoCMV } from '@/types';
import { Card } from '@/components/ui/Card';
import { formatCOP } from '@/utils/formatCOP';
import { Utensils, Boxes } from 'lucide-react';

interface TopInsumosCostoCardProps {
  insumos: InsumoConsumoCMV[];
  totalCMV: number;
}

export function TopInsumosCostoCard({ insumos, totalCMV }: TopInsumosCostoCardProps) {
  const topInsumos = insumos.slice(0, 6);

  return (
    <Card className="p-4 sm:p-5 bg-neutral-900 border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-neutral-200">
            Insumos con Mayor Impacto en Costo (CMV)
          </h3>
        </div>
        <span className="text-xs text-neutral-400 font-mono">
          Total: <strong className="text-sky-400">{formatCOP(totalCMV)}</strong>
        </span>
      </div>

      {topInsumos.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <Boxes className="h-8 w-8 text-neutral-600 mb-2" />
          <p className="text-xs text-neutral-400">
            Sin consumo de recetas registrado en este período
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Configura escandallos en tus productos para ver el costo exacto de ingredientes.
          </p>
        </div>
      ) : (
        <div className="mt-3.5 space-y-3">
          {topInsumos.map((item) => (
            <div key={item.insumoId} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                  <span className="font-semibold text-white truncate">{item.nombre}</span>
                  <span className="text-neutral-500 text-[10px]">
                    ({item.cantidadConsumida} {item.unidad})
                  </span>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="font-bold text-sky-400 font-display">
                    {formatCOP(item.costoTotalCOP)}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono w-10 text-right">
                    {item.porcentajeCMV}%
                  </span>
                </div>
              </div>

              {/* Barra de progreso visual */}
              <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                  style={{ width: `${Math.min(100, Math.max(3, item.porcentajeCMV))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

