import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Download,
  Eye,
  Flame,
  History,
  MessageCircle,
  Search,
  TrendingUp,
} from 'lucide-react';
import type {
  AnaliticaTandasConsolidada,
  SaludMermaVitrina,
  TandaVitrina,
} from '@/types/tanda';
import { formatCOP } from '@/utils/formatCOP';
import { formatFecha, formatHora } from '@/utils/dateUtils';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import {
  calcularResumenTanda,
  generarResumenTandaWhatsApp,
} from '@/utils/tandaUtils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalDetalleTandaCerrada } from './ModalDetalleTandaCerrada';

interface HistorialTandasSectionProps {
  tandas: TandaVitrina[];
  analitica: AnaliticaTandasConsolidada;
  nombreNegocio?: string;
  onExportarCsv: () => void;
}

type FiltroMerma = 'todas' | 'con_merma' | 'sin_merma';

const BADGE_SALUD_MERMA: Record<
  SaludMermaVitrina,
  { label: string; className: string }
> = {
  optima: {
    label: 'Óptima (≤ 3%)',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  },
  atencion: {
    label: 'Atención (3-7%)',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  },
  critica: {
    label: 'Crítica (> 7%)',
    className: 'bg-red-500/15 text-red-300 border-red-500/40',
  },
};

export function HistorialTandasSection({
  tandas,
  analitica,
  nombreNegocio = 'La Parada',
  onExportarCsv,
}: HistorialTandasSectionProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroMerma, setFiltroMerma] = useState<FiltroMerma>('todas');
  const [tandaSeleccionada, setTandaSeleccionada] = useState<TandaVitrina | null>(null);

  const tandasCerradas = useMemo(
    () => tandas.filter((t) => t.estado === 'cerrada'),
    [tandas]
  );

  const tandasFiltradas = useMemo(() => {
    const queryNorm = busqueda.trim().toLowerCase();

    return tandasCerradas.filter((tanda) => {
      const resumen =
        tanda.resumen ?? calcularResumenTanda(tanda.items || [], tanda.transferencias || []);

      if (filtroMerma === 'con_merma' && resumen.totalMermas === 0) return false;
      if (filtroMerma === 'sin_merma' && resumen.totalMermas > 0) return false;

      if (!queryNorm) return true;

      const responsableMatch = (tanda.responsable || '').toLowerCase().includes(queryNorm);
      const notasMatch = (tanda.notasCierre || '').toLowerCase().includes(queryNorm);
      const productoMatch = (tanda.items || []).some((it) =>
        it.nombre.toLowerCase().includes(queryNorm)
      );

      return responsableMatch || notasMatch || productoMatch;
    });
  }, [tandasCerradas, busqueda, filtroMerma]);

  const badgeSalud = BADGE_SALUD_MERMA[analitica.saludMerma];

  if (tandasCerradas.length === 0) {
    return (
      <Card className="border-neutral-800 bg-neutral-900/50 p-6">
        <EmptyState
          icon={History}
          title="Aún no hay tandas cerradas en el historial"
          description="Cuando cierres tu primera tanda de vitrina contando los sobrantes, aquí verás las actas históricas, tasa de merma y el ranking de rentabilidad por producto."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado de analítica e historial */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white">
            Analítica de Vitrina & Historial de Tandas
          </h2>
          <p className="text-xs text-neutral-400">
            Consolidado de rotación, control de mermas y rentabilidad por producto horneado/frito
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={onExportarCsv}
          aria-label="Exportar historial y rentabilidad de tandas a Excel CSV"
          className="min-h-[44px] gap-2 border-neutral-700 text-xs font-bold text-neutral-200 hover:border-emerald-400 hover:text-white"
        >
          <Download className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span>Exportar CSV</span>
        </Button>
      </div>

      {/* 4 Tarjetas KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Venta Acumulada Vitrina</span>
            <TrendingUp className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-xl font-bold text-amber-400">
            {formatCOP(analitica.ingresosTotalesVitrina)}
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">
            Efectivo: <strong className="text-neutral-200">{formatCOP(analitica.totalEfectivoVitrina)}</strong> · Transf:{' '}
            <strong className="text-purple-300">{formatCOP(analitica.totalTransferenciasVitrina)}</strong>
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Tasa de Rotación Global</span>
            <Flame className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-xl font-bold text-emerald-400">
            {analitica.tasaRotacionGlobalPct}%
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">
            {analitica.totalUnidadesVendidas} vendidas de {analitica.totalUnidadesPuestas} puestas
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-neutral-400">Tasa de Merma</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeSalud.className}`}
            >
              {badgeSalud.label}
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-bold text-red-400">
            {analitica.tasaMermaGlobalPct}%
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">
            {analitica.totalUnidadesMerma} unds · Impacto:{' '}
            <strong className="text-red-300">{formatCOP(analitica.valorComercialMerma)}</strong>
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Tandas Auditadas</span>
            <CheckCircle2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-xl font-bold text-white">
            {analitica.cantidadTandasCerradas}
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">
            Promedio por tanda:{' '}
            <strong className="text-neutral-200">{formatCOP(analitica.ticketPromedioPorTanda)}</strong>
          </p>
        </div>
      </div>

      {/* Rentabilidad y Rotación por Producto de Vitrina */}
      <Card className="border-neutral-800 bg-neutral-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-2 border-b border-neutral-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <h3 className="font-display text-sm font-bold text-white">
              Rentabilidad y Rotación por Producto de Vitrina
            </h3>
          </div>
          <span className="text-xs text-neutral-400">
            {analitica.rankingProductos.length} producto
            {analitica.rankingProductos.length === 1 ? '' : 's'} analizado
            {analitica.rankingProductos.length === 1 ? '' : 's'}
          </span>
        </div>

        {analitica.rankingProductos.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">
            No hay productos registrados en las tandas cerradas.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-800 text-[11px] text-neutral-400">
                <tr>
                  <th className="py-2.5 pr-3 font-semibold">Producto</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Puesto</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Vendidos</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Mermas</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Sobró</th>
                  <th className="px-3 py-2.5 font-semibold min-w-[140px]">Rotación %</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Merma %</th>
                  <th className="py-2.5 pl-3 text-right font-semibold">Ingresos Brutos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {analitica.rankingProductos.map((prod, index) => (
                  <tr key={prod.productoId} className="hover:bg-neutral-800/30">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-[11px] font-bold text-amber-400">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="block font-semibold text-white truncate">
                            {prod.nombre}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {formatCOP(prod.precioUnitarioPromedio)} · {prod.tandasParticipadas}{' '}
                            tanda{prod.tandasParticipadas === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-neutral-300">
                      {prod.totalPuesto}
                    </td>
                    <td className="px-2 py-3 text-right font-mono font-bold text-emerald-400">
                      {prod.totalVendidos}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-red-400">
                      {prod.totalMermas}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-neutral-400">
                      {prod.totalSobrantes}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400"
                            style={{ width: `${Math.min(100, Math.max(4, prod.tasaRotacionPct))}%` }}
                          />
                        </div>
                        <span className="w-11 text-right font-mono font-semibold text-neutral-200">
                          {prod.tasaRotacionPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${
                          prod.tasaMermaPct > 7
                            ? 'bg-red-500/15 text-red-300'
                            : prod.tasaMermaPct > 3
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        {prod.tasaMermaPct}%
                      </span>
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <span className="block font-display font-bold text-amber-400">
                        {formatCOP(prod.ingresosBrutos)}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {prod.participacionIngresosPct}% part.
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Listado Filtrable de Historial de Tandas Cerradas */}
      <Card className="border-neutral-800 bg-neutral-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-neutral-800 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <div>
              <h3 className="font-display text-sm font-bold text-white">
                Historial de Tandas Cerradas ({tandasFiltradas.length})
              </h3>
              <p className="text-[11px] text-neutral-400">
                Inspecciona el acta de cierre, mermas y cuadre de caja de cada turno
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                aria-hidden="true"
              />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar responsable o producto..."
                aria-label="Buscar en historial de tandas por responsable o producto"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-9 pr-3 text-xs text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none sm:w-60"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'todas', label: 'Todas' },
                  { id: 'con_merma', label: 'Con Merma' },
                  { id: 'sin_merma', label: 'Sin Merma' },
                ] as const
              ).map((opcion) => (
                <button
                  key={opcion.id}
                  type="button"
                  aria-pressed={filtroMerma === opcion.id}
                  onClick={() => setFiltroMerma(opcion.id)}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-semibold transition-colors ${
                    filtroMerma === opcion.id
                      ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tandasFiltradas.length === 0 ? (
          <div className="py-8 text-center">
            <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-neutral-600" aria-hidden="true" />
            <p className="text-xs text-neutral-400">
              No hay tandas cerradas que coincidan con el filtro seleccionado.
            </p>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-neutral-800/80">
            {tandasFiltradas.map((tanda) => {
              const fechaApertura = toValidAdminDate(tanda.fecha);
              const fechaCierre = toValidAdminDate(tanda.fechaCierre);
              const resumen =
                tanda.resumen ??
                calcularResumenTanda(tanda.items || [], tanda.transferencias || []);
              const totalPuestas = resumen.totalInicial + resumen.totalAdiciones;
              const rotacion =
                totalPuestas > 0
                  ? Math.round((resumen.totalVendidos / totalPuestas) * 1000) / 10
                  : 0;
              const textoWhatsApp = generarResumenTandaWhatsApp(tanda, nombreNegocio);
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textoWhatsApp)}`;

              return (
                <div
                  key={tanda.id}
                  className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-neutral-800/20 px-2 rounded-xl transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        {fechaApertura ? formatFecha(fechaApertura) : 'Fecha desconocida'}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {fechaApertura ? formatHora(fechaApertura) : ''}
                        {fechaCierre ? ` → ${formatHora(fechaCierre)}` : ''}
                      </span>
                      {tanda.responsable && (
                        <span className="rounded-lg bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-300">
                          {tanda.responsable}
                        </span>
                      )}
                      {resumen.totalMermas > 0 && (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                          {resumen.totalMermas} merma{resumen.totalMermas === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
                      <span>
                        Vendidas:{' '}
                        <strong className="text-emerald-400">
                          {resumen.totalVendidos}/{totalPuestas}
                        </strong>{' '}
                        ({rotacion}%)
                      </span>
                      <span>
                        Sobrantes: <strong className="text-neutral-200">{resumen.totalSobrantes}</strong>
                      </span>
                      <span>
                        Efectivo:{' '}
                        <strong className="text-neutral-200">
                          {formatCOP(resumen.totalEfectivoEsperado)}
                        </strong>
                      </span>
                      <span>
                        Transf:{' '}
                        <strong className="text-purple-300">
                          {formatCOP(resumen.totalTransferencias)}
                        </strong>
                      </span>
                    </div>

                    {tanda.notasCierre && (
                      <p className="truncate text-xs italic text-neutral-400">
                        "{tanda.notasCierre}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                    <div className="text-left sm:text-right mr-1">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Venta Tanda
                      </span>
                      <span className="font-display text-base font-bold text-amber-400">
                        {formatCOP(resumen.totalVentaEstimada)}
                      </span>
                    </div>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Enviar acta de tanda del ${
                        fechaApertura ? formatFecha(fechaApertura) : tanda.id
                      } por WhatsApp`}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-emerald-700/50 bg-emerald-950/30 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-900/40"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    </a>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setTandaSeleccionada(tanda)}
                      className="min-h-[44px] gap-1.5 text-xs"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      <span>Ver Acta</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ModalDetalleTandaCerrada
        isOpen={!!tandaSeleccionada}
        onClose={() => setTandaSeleccionada(null)}
        tanda={tandaSeleccionada}
        nombreNegocio={nombreNegocio}
      />
    </div>
  );
}
