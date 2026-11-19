import { useState } from 'react';
import { AlertTriangle, Check, Edit3, Wallet } from 'lucide-react';
import type { ResumenCajaMenor } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface ControlCajaMenorCardProps {
  resumen: ResumenCajaMenor;
  onActualizarFondo?: (nuevoFondoCOP: number) => void;
  onRegistrarDesdeCajaMenor?: () => void;
  compact?: boolean;
}

export function ControlCajaMenorCard({
  resumen,
  onActualizarFondo,
  onRegistrarDesdeCajaMenor,
  compact = false,
}: ControlCajaMenorCardProps) {
  const [editandoFondo, setEditandoFondo] = useState(false);
  const [fondoInput, setFondoInput] = useState(String(resumen.fondoAsignadoCOP));

  const handleGuardarFondo = () => {
    const parsed = Number(fondoInput);
    if (Number.isFinite(parsed) && parsed >= 10000 && onActualizarFondo) {
      onActualizarFondo(Math.round(parsed));
    }
    setEditandoFondo(false);
  };

  return (
    <Card className="p-4 sm:p-5 bg-neutral-900/90 border-neutral-800 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-display">
              Control de Caja Menor
            </h3>
            <p className="text-[11px] text-neutral-400">
              {resumen.cantidadRegistros} movimiento{resumen.cantidadRegistros !== 1 ? 's' : ''} imputado{resumen.cantidadRegistros !== 1 ? 's' : ''} al fondo menor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {resumen.alertaReposicion ? (
            <Badge variant="no-disponible" className="text-[10px] font-bold flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Reponer Fondo ({resumen.porcentajeUso}%)
            </Badge>
          ) : (
            <Badge variant="disponible" className="text-[10px] font-bold">
              Saludable ({resumen.porcentajeUso}% usado)
            </Badge>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      <div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              resumen.alertaReposicion
                ? 'bg-red-500'
                : resumen.porcentajeUso >= 55
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, resumen.porcentajeUso))}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-2.5">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">
            Fondo Asignado
          </span>
          {editandoFondo ? (
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                min="10000"
                step="10000"
                aria-label="Nuevo tope de fondo de caja menor"
                value={fondoInput}
                onChange={(e) => setFondoInput(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs font-bold text-white"
              />
              <button
                type="button"
                aria-label="Guardar tope de caja menor"
                onClick={handleGuardarFondo}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="font-bold text-white font-display">
                {formatCOP(resumen.fondoAsignadoCOP)}
              </span>
              {onActualizarFondo && (
                <button
                  type="button"
                  aria-label="Editar tope de caja menor"
                  onClick={() => {
                    setFondoInput(String(resumen.fondoAsignadoCOP));
                    setEditandoFondo(true);
                  }}
                  className="text-neutral-400 hover:text-amber-400"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-2.5">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">
            Consumido
          </span>
          <span className="mt-1 block font-bold text-amber-400 font-display">
            {formatCOP(resumen.totalConsumidoCOP)}
          </span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-2.5">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">
            Disponible
          </span>
          <span
            className={`mt-1 block font-bold font-display ${
              resumen.alertaReposicion ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {formatCOP(resumen.saldoDisponibleCOP)}
          </span>
        </div>
      </div>

      {!compact && onRegistrarDesdeCajaMenor && (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={onRegistrarDesdeCajaMenor}
            className="min-h-[44px] text-xs"
          >
            Registrar Egreso en Caja Menor
          </Button>
        </div>
      )}
    </Card>
  );
}
