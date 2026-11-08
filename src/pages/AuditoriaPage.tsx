import { useState } from 'react';
import {
  ShieldCheck,
  ShieldPlus,
  FileSpreadsheet,
  Share2,
  RefreshCw,
  AlertCircle,
  SearchX,
} from 'lucide-react';
import { useAuditoria } from '@/hooks/useAuditoria';
import { AuditoriaKpisGrid } from '@/components/auditoria/AuditoriaKpisGrid';
import { AuditoriaFiltersBar } from '@/components/auditoria/AuditoriaFiltersBar';
import { EventoAuditoriaCard } from '@/components/auditoria/EventoAuditoriaCard';
import { DetalleForenseModal } from '@/components/auditoria/DetalleForenseModal';
import { RegistrarIncidenteModal } from '@/components/auditoria/RegistrarIncidenteModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import type { EventoAuditoria, RegistrarEventoAuditoriaInput } from '@/types';

export function AuditoriaPage() {
  const {
    eventosFiltrados,
    metricas,
    responsablesUnicos,
    filtros,
    loading,
    error,
    actualizarFiltro,
    limpiarFiltros,
    registrarIncidenteManual,
    exportarCSV,
    compartirWhatsApp,
    refresh,
  } = useAuditoria();

  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoAuditoria | null>(
    null
  );
  const [modalIncidenteAbierto, setModalIncidenteAbierto] = useState(false);

  const handleGuardarIncidente = async (
    input: Omit<RegistrarEventoAuditoriaInput, 'negocioId'>
  ) => {
    const id = await registrarIncidenteManual(input);
    createToast('Acta sellada en la bitácora inmutable de auditoría', 'success');
    return id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="border-b border-neutral-800 pb-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
              Centro de Auditoría & Bitácora de Seguridad
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              Correlacionando registros inmutables, anulaciones, cortesías, mermas y accesos...
            </p>
          </div>

          <Skeleton className="h-24 w-full rounded-2xl" />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>

          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900">
          <EmptyState
            icon={AlertCircle}
            title="No pudimos cargar la bitácora forense"
            description={error}
            action={{ label: 'Reintentar conexión', onClick: refresh }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Encabezado Principal y Acciones Forenses */}
        <div className="flex flex-col gap-4 border-b border-neutral-800 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
                  Centro de Auditoría & Bitácora Forense
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400">
                  Log inmutable de anulaciones, cortesías 100%, mermas de bodega, comandas y accesos de personal
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void refresh()}
              aria-label="Actualizar bitácora de auditoría"
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:border-neutral-700 hover:bg-neutral-800 transition-colors"
            >
              <RefreshCw className="h-4 w-4 text-neutral-400" />
              <span>Actualizar</span>
            </button>

            <button
              type="button"
              onClick={compartirWhatsApp}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span>Resumen WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={exportarCSV}
              disabled={eventosFiltrados.length === 0}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-gold-400" />
              <span>Exportar Excel (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => setModalIncidenteAbierto(true)}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-gold-400 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-gold-300 transition-colors shadow-sm"
            >
              <ShieldPlus className="h-4 w-4" />
              <span>Registrar Acta</span>
            </button>
          </div>
        </div>

        {/* Semáforo de Riesgo y 4 KPIs Forenses */}
        <AuditoriaKpisGrid metricas={metricas} />

        {/* Barra de Filtros Forenses */}
        <AuditoriaFiltersBar
          filtros={filtros}
          responsablesUnicos={responsablesUnicos}
          totalResultados={eventosFiltrados.length}
          onActualizarFiltro={actualizarFiltro}
          onLimpiarFiltros={limpiarFiltros}
        />

        {/* Lista Cronológica de Eventos Auditados */}
        {eventosFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70">
            <EmptyState
              icon={SearchX}
              title="No se encontraron eventos con estos filtros"
              description="No existen anulaciones, cortesías, mermas ni incidentes que coincidan con la búsqueda actual."
              action={{
                label: 'Ver todos los registros',
                onClick: limpiarFiltros,
              }}
            />
          </div>
        ) : (
          <div className="space-y-3" role="feed" aria-label="Eventos de auditoría operativa">
            {eventosFiltrados.map((evento) => (
              <EventoAuditoriaCard
                key={evento.id}
                evento={evento}
                onInspeccionar={(ev) => setEventoSeleccionado(ev)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Certificado Forense Detallado */}
      <DetalleForenseModal
        evento={eventoSeleccionado}
        onClose={() => setEventoSeleccionado(null)}
      />

      {/* Modal para Sellar Nueva Acta Inmutable */}
      <RegistrarIncidenteModal
        isOpen={modalIncidenteAbierto}
        onClose={() => setModalIncidenteAbierto(false)}
        onSubmit={handleGuardarIncidente}
      />
    </div>
  );
}
