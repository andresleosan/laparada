import { useState } from 'react';
import { Award, RefreshCw } from 'lucide-react';
import type { EvaluacionResolucionDian, ResolucionDian } from '@/types';
import { Button } from '@/components/ui/Button';
import { RenovarResolucionModal } from './RenovarResolucionModal';
import { formatearConsecutivoFiscal } from '@/utils/facturacionUtils';

interface ResolucionDianCardProps {
  resolucion: ResolucionDian;
  evaluacion: EvaluacionResolucionDian;
  onGuardarResolucion: (resolucion: ResolucionDian) => Promise<void>;
}

export function ResolucionDianCard({
  resolucion,
  evaluacion,
  onGuardarResolucion,
}: ResolucionDianCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const rangoTotal = Math.max(1, resolucion.rangoFinal - resolucion.rangoInicial + 1);
  const foliosEmitidos = Math.max(0, resolucion.consecutivoActual - resolucion.rangoInicial);

  const colorBadge =
    evaluacion.color === 'rojo'
      ? 'border-red-600 bg-red-950/60 text-red-300'
      : evaluacion.color === 'amarillo'
      ? 'border-amber-500 bg-amber-950/60 text-amber-300'
      : 'border-emerald-500 bg-emerald-950/60 text-emerald-300';

  const colorBarra =
    evaluacion.color === 'rojo'
      ? 'bg-red-500'
      : evaluacion.color === 'amarillo'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <>
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-white">
                  Resolución DIAN de Facturación POS
                </h3>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colorBadge}`}
                >
                  {evaluacion.estado.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Formulario Oficial No. {resolucion.numeroResolucion}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setModalOpen(true)}
            className="min-h-[44px] gap-2 font-medium"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Renovar / Editar Rango
          </Button>
        </div>

        {/* Grilla de datos clave */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3.5">
            <span className="text-[11px] text-neutral-400 font-medium">Prefijo y Rango</span>
            <p className="mt-1 font-mono text-sm font-bold text-white">
              {resolucion.prefijo} ({resolucion.rangoInicial.toLocaleString('es-CO')} al{' '}
              {resolucion.rangoFinal.toLocaleString('es-CO')})
            </p>
            <span className="text-[10px] text-neutral-500">
              {rangoTotal.toLocaleString('es-CO')} folios autorizados
            </span>
          </div>

          <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3.5">
            <span className="text-[11px] text-neutral-400 font-medium">Siguiente Consecutivo</span>
            <p className="mt-1 font-mono text-sm font-bold text-amber-400">
              {formatearConsecutivoFiscal(resolucion.prefijo, resolucion.consecutivoActual)}
            </p>
            <span className="text-[10px] text-neutral-500">
              Folio #{resolucion.consecutivoActual}
            </span>
          </div>

          <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3.5">
            <span className="text-[11px] text-neutral-400 font-medium">Folios Restantes</span>
            <p className="mt-1 font-mono text-sm font-bold text-white">
              {evaluacion.foliosRestantes.toLocaleString('es-CO')}
            </p>
            <span className="text-[10px] text-neutral-500">
              {100 - evaluacion.porcentajeFoliosUsados}% del rango libre
            </span>
          </div>

          <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3.5">
            <span className="text-[11px] text-neutral-400 font-medium">Vigencia DIAN</span>
            <p className="mt-1 font-mono text-sm font-bold text-white">
              {resolucion.fechaVencimiento}
            </p>
            <span className="text-[10px] text-neutral-500">
              {evaluacion.diasRestantes >= 0
                ? `${evaluacion.diasRestantes} días restantes`
                : `Vencida hace ${Math.abs(evaluacion.diasRestantes)} días`}
            </span>
          </div>
        </div>

        {/* Barra de progreso de folios consumidos */}
        <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400">Consumo de Folios Autorizados</span>
            <span className="font-mono font-bold text-white">
              {foliosEmitidos.toLocaleString('es-CO')} / {rangoTotal.toLocaleString('es-CO')} (
              {evaluacion.porcentajeFoliosUsados}%)
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className={`h-full transition-all duration-500 ${colorBarra}`}
              style={{ width: `${evaluacion.porcentajeFoliosUsados}%` }}
            />
          </div>
        </div>
      </div>

      <RenovarResolucionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        resolucionActual={resolucion}
        onGuardar={onGuardarResolucion}
      />
    </>
  );
}
