import { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Database,
  FileText,
  MessageCircle,
  RefreshCw,
  Scale,
  Wallet,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useContabilidad } from '@/hooks/useContabilidad';
import { formatCOP } from '@/utils/formatCOP';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LibroFiscalDiarioTable } from '@/components/contabilidad/LibroFiscalDiarioTable';
import { Formulario310Card } from '@/components/contabilidad/Formulario310Card';
import { ConciliacionCajaVentasCard } from '@/components/contabilidad/ConciliacionCajaVentasCard';
import { ExportarSoftwareContableCard } from '@/components/contabilidad/ExportarSoftwareContableCard';
import type { TipoPeriodoContable } from '@/types/contabilidad';

export function ContabilidadPage() {
  const { negocioActual } = useNegocio();

  const {
    tipoPeriodo,
    anoSeleccionado,
    bimestreSeleccionado,
    rangoPeriodo,
    loading,
    error,
    configuracionFiscal,
    mapeoPuc,
    libroFiscal,
    formulario310,
    conciliacion,
    asientosContables,
    cambiarPeriodo,
    guardarMapeo,
    registrarCierreConciliacion,
    exportarLibroFiscal,
    exportarFormulario310,
    exportarConciliacion,
    exportarSoftware,
    obtenerMensajeWhatsApp,
    refresh,
  } = useContabilidad();

  const [pestañaActiva, setPestañaActiva] = useState<
    'libro_fiscal' | 'formulario_310' | 'conciliacion' | 'software_contable'
  >('libro_fiscal');

  const handleCompartirWhatsApp = () => {
    const texto = obtenerMensajeWhatsApp();
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading && libroFiscal.entradas.length === 0) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="border-b border-neutral-800 pb-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
              Conciliación Contable & Libro Fiscal DIAN
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              Cargando registros fiscales, bases gravables y arqueos...
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>

          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && libroFiscal.entradas.length === 0) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <EmptyState
            icon={AlertCircle}
            title="No pudimos cargar la información contable"
            description={error}
            action={{
              label: 'Reintentar consulta',
              onClick: refresh,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8 text-neutral-100">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Cabecera principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/10 text-gold-400 border border-gold-400/20">
                <Scale className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
                  Conciliación Contable & Libro Fiscal
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400">
                  Libro diario oficial Art. 616 del E.T., Formulario 310 de Impoconsumo e interfaces para Siigo y World Office.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCompartirWhatsApp}
              className="flex items-center gap-2 text-xs min-h-[44px] px-3 font-semibold text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/20"
              aria-label="Compartir informe contable con el contador por WhatsApp"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">WhatsApp Contador</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={refresh}
              className="flex items-center gap-2 text-xs min-h-[44px] px-3 font-semibold text-neutral-300"
              aria-label="Refrescar datos contables"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Refrescar</span>
            </Button>
          </div>
        </div>

        {/* Barra de Filtros de Período Contable */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-3.5 text-xs">
          <div className="flex items-center gap-2 text-neutral-300">
            <Calendar className="h-4 w-4 text-gold-400" />
            <span className="font-semibold text-white">Período:</span>
            <span className="font-mono text-neutral-300">{rangoPeriodo.etiqueta}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'bimestre_actual', label: 'Bimestre Actual' },
              { id: 'bimestre_anterior', label: 'Bimestre Anterior' },
              { id: 'mes_actual', label: 'Mes Actual' },
              { id: 'mes_anterior', label: 'Mes Anterior' },
              { id: 'ano_actual', label: `Año ${anoSeleccionado}` },
            ].map((p) => {
              const activo = tipoPeriodo === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => cambiarPeriodo(p.id as TipoPeriodoContable)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold min-h-[38px] transition-colors ${
                    activo
                      ? 'bg-gold-400 text-black shadow-sm font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                  aria-pressed={activo}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 KPIs Clave Superiores */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block">
              Ventas Netas Totales
            </span>
            <span className="text-xl sm:text-2xl font-bold text-white font-display block mt-1">
              {formatCOP(libroFiscal.acumuladoVentasNetas)}
            </span>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Brutas: {formatCOP(libroFiscal.acumuladoVentasBrutas)}
            </span>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-4">
            <span className="text-[11px] text-amber-400 uppercase tracking-wider font-semibold block">
              Base Gravable INC (8%)
            </span>
            <span className="text-xl sm:text-2xl font-bold text-amber-300 font-display block mt-1">
              {formatCOP(formulario310.ingresosNetosGravados8)}
            </span>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              R31 Formulario 310 DIAN
            </span>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
            <span className="text-[11px] text-amber-400 uppercase tracking-wider font-semibold block">
              Impoconsumo a Pagar (R52)
            </span>
            <span className="text-xl sm:text-2xl font-bold text-white font-display block mt-1">
              {formatCOP(formulario310.saldoAPagar)}
            </span>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Tarifa legal 8% sobre base
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block">
              Salud Conciliación Caja
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xl font-bold font-display ${
                  conciliacion.saludConciliacion === 'optima'
                    ? 'text-emerald-400'
                    : conciliacion.saludConciliacion === 'alerta'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {conciliacion.saludConciliacion === 'optima' && 'Óptima'}
                {conciliacion.saludConciliacion === 'alerta' && 'Alerta Leve'}
                {conciliacion.saludConciliacion === 'critica' && 'Crítica'}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              {conciliacion.diasCuadrados} de {conciliacion.items.length} días cuadrados
            </span>
          </div>
        </div>

        {/* Selector de Pestañas de Módulos */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setPestañaActiva('libro_fiscal')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors min-h-[44px] ${
              pestañaActiva === 'libro_fiscal'
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
            aria-pressed={pestañaActiva === 'libro_fiscal'}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>Libro Fiscal (Art. 616 E.T.)</span>
          </button>

          <button
            type="button"
            onClick={() => setPestañaActiva('formulario_310')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors min-h-[44px] ${
              pestañaActiva === 'formulario_310'
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
            aria-pressed={pestañaActiva === 'formulario_310'}
          >
            <Scale className="h-4 w-4" aria-hidden="true" />
            <span>Impoconsumo (Formulario 310 DIAN)</span>
          </button>

          <button
            type="button"
            onClick={() => setPestañaActiva('conciliacion')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors min-h-[44px] ${
              pestañaActiva === 'conciliacion'
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
            aria-pressed={pestañaActiva === 'conciliacion'}
          >
            <Wallet className="h-4 w-4" aria-hidden="true" />
            <span>Conciliación Ventas vs Caja</span>
          </button>

          <button
            type="button"
            onClick={() => setPestañaActiva('software_contable')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors min-h-[44px] ${
              pestañaActiva === 'software_contable'
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
            aria-pressed={pestañaActiva === 'software_contable'}
          >
            <Database className="h-4 w-4" aria-hidden="true" />
            <span>Interfaces Software (Siigo / World Office / Helisa)</span>
          </button>
        </div>

        {/* Contenido de la pestaña activa */}
        <div className="pt-2">
          {pestañaActiva === 'libro_fiscal' && (
            <LibroFiscalDiarioTable
              consolidado={libroFiscal}
              onExportarCsv={exportarLibroFiscal}
              nombreNegocio={negocioActual.nombre}
              nit={configuracionFiscal?.nit || '222222222222'}
            />
          )}

          {pestañaActiva === 'formulario_310' && (
            <Formulario310Card
              liquidacion={formulario310}
              configuracionFiscal={configuracionFiscal}
              anoSeleccionado={anoSeleccionado}
              bimestreSeleccionado={bimestreSeleccionado}
              onCambiarBimestre={(bim) => cambiarPeriodo('bimestre_actual', anoSeleccionado, bim)}
              onExportarCsv={exportarFormulario310}
              onEnviarWhatsApp={handleCompartirWhatsApp}
              nombreNegocio={negocioActual.nombre}
            />
          )}

          {pestañaActiva === 'conciliacion' && (
            <ConciliacionCajaVentasCard
              conciliacion={conciliacion}
              onExportarCsv={exportarConciliacion}
              onCerrarConciliacionMensual={registrarCierreConciliacion}
            />
          )}

          {pestañaActiva === 'software_contable' && (
            <ExportarSoftwareContableCard
              asientos={asientosContables}
              mapeoPuc={mapeoPuc}
              onGuardarMapeo={guardarMapeo}
              onExportarSoftware={exportarSoftware}
              nombreNegocio={negocioActual.nombre}
            />
          )}
        </div>
      </div>
    </div>
  );
}
