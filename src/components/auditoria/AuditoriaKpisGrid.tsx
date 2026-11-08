import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  Percent,
  PackageMinus,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatCOP } from '@/utils/formatCOP';
import type { MetricasAuditoria } from '@/types';

interface AuditoriaKpisGridProps {
  metricas: MetricasAuditoria;
}

export const AuditoriaKpisGrid: React.FC<AuditoriaKpisGridProps> = ({ metricas }) => {
  const configRiesgo = {
    bajo: {
      titulo: 'Semáforo Forense: Operación Controlada',
      descripcion:
        'Las anulaciones, cortesías y ajustes de bodega se encuentran dentro de los parámetros normales del turno.',
      borderClass: 'border-emerald-500/30 bg-emerald-500/10',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
    },
    moderado: {
      titulo: 'Semáforo Forense: Atención Preventiva',
      descripcion:
        'Se detectaron eventos de severidad alta o descuentos/anulaciones acumuladas que ameritan verificación del administrador.',
      borderClass: 'border-amber-500/30 bg-amber-500/10',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
    },
    alto: {
      titulo: 'Semáforo Forense: Alerta de Riesgo Operativo Alto',
      descripcion:
        'Impacto financiero elevado en anulaciones, cortesías 100%, mermas o faltantes de caja. Revisa las justificaciones individuales.',
      borderClass: 'border-red-500/40 bg-red-500/10',
      badgeClass: 'bg-red-500/20 text-red-200 border-red-500/40',
      icon: ShieldAlert,
      iconColor: 'text-red-400',
    },
  }[metricas.nivelRiesgo];

  const IconoRiesgo = configRiesgo.icon;

  return (
    <div className="space-y-4">
      {/* Banner de Estado de Seguridad e Inmutabilidad */}
      <div
        className={`rounded-2xl border p-4 transition-colors ${configRiesgo.borderClass}`}
        role="region"
        aria-label="Estado de seguridad operativa"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-neutral-950/70 p-2.5 border border-white/10">
              <IconoRiesgo className={`h-6 w-6 ${configRiesgo.iconColor}`} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-display">
                  {configRiesgo.titulo}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${configRiesgo.badgeClass}`}
                >
                  {metricas.totalEventos} eventos auditados
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-neutral-300">
                {configRiesgo.descripcion}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center rounded-xl border border-gold-400/30 bg-neutral-950/80 px-3 py-2 text-xs text-gold-300">
            <Lock className="h-4 w-4 shrink-0 text-gold-400" />
            <span>Bitácora Inmutable Protegida</span>
          </div>
        </div>
      </div>

      {/* 4 Tarjetas KPI Forenses */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <Card className="border border-neutral-800 bg-neutral-900/90 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Impacto Financiero
            </span>
            <div className="rounded-lg bg-gold-400/15 p-2 text-gold-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-gold-400 font-display">
            {formatCOP(metricas.impactoFinancieroTotal)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            {metricas.eventosCriticosYAltos} alertas de severidad crítica o alta
          </p>
        </Card>

        <Card className="border border-neutral-800 bg-neutral-900/90 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Anulaciones de Venta
            </span>
            <div className="rounded-lg bg-red-500/15 p-2 text-red-400">
              <Ban className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-white font-display">
            {formatCOP(metricas.totalAnulacionesCOP)}
          </p>
          <p className="mt-1 text-xs text-red-300/90">
            {metricas.cantidadAnulaciones} tickets cancelados en el período
          </p>
        </Card>

        <Card className="border border-neutral-800 bg-neutral-900/90 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Cortesías y Descuentos
            </span>
            <div className="rounded-lg bg-amber-500/15 p-2 text-amber-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-white font-display">
            {formatCOP(metricas.totalCortesiasYDescuentosCOP)}
          </p>
          <p className="mt-1 text-xs text-amber-300/90">
            {metricas.cantidadCortesiasYDescuentos} beneficios / cortesías otorgadas
          </p>
        </Card>

        <Card className="border border-neutral-800 bg-neutral-900/90 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Mermas y Arqueos Caja
            </span>
            <div className="rounded-lg bg-orange-500/15 p-2 text-orange-400">
              <PackageMinus className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-white font-display">
            {formatCOP(metricas.totalMermasCOP + metricas.totalDescuadresCajaCOP)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            {metricas.cantidadMermas} mermas · {metricas.cantidadAjustesStock} ajustes ·{' '}
            {metricas.cantidadDescuadresCaja} descuadres
          </p>
        </Card>
      </div>
    </div>
  );
};
