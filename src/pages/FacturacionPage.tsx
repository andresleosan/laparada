import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Download,
  FileCheck,
  History,
  MessageCircle,
  Printer,
  Receipt,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useFacturacion } from '@/hooks/useFacturacion';
import { getVentasRecientes } from '@/services/ventasService';
import type { ComprobanteZ, TicketVentaData, Venta } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';
import { AlertaResolucionBanner } from '@/components/facturacion/AlertaResolucionBanner';
import { ResolucionDianCard } from '@/components/facturacion/ResolucionDianCard';
import { ConfiguracionFiscalCard } from '@/components/facturacion/ConfiguracionFiscalCard';
import { ComprobanteZModal } from '@/components/facturacion/ComprobanteZModal';
import { HistorialDocumentosPosTable } from '@/components/facturacion/HistorialDocumentosPosTable';
import { TicketVentaModal } from '@/components/pos/TicketVentaModal';
import {
  descargarComprobanteZCsv,
  generarComprobanteZTextoWhatsApp,
} from '@/utils/facturacionUtils';

export function FacturacionPage() {
  const { negocioActual } = useNegocio();
  const negocioId = negocioActual.id;

  const {
    configuracion,
    comprobantesZ,
    evaluacionResolucion,
    guardarConfiguracion,
    generarCorteZ,
    guardarCorteZ,
  } = useFacturacion();

  const [pestañaActiva, setPestañaActiva] = useState<
    'resolucion' | 'comprobante_z' | 'documentos_pos'
  >('resolucion');

  const [ventas, setVentas] = useState<Venta[]>([]);

  // Estado para fecha de corte Z
  const [fechaCorteSeleccionada, setFechaCorteSeleccionada] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Modales
  const [comprobanteZActivo, setComprobanteZActivo] = useState<ComprobanteZ | null>(null);
  const [modalComprobanteZOpen, setModalComprobanteZOpen] = useState(false);
  const [ticketActivo, setTicketActivo] = useState<TicketVentaData | null>(null);
  const [modalTicketOpen, setModalTicketOpen] = useState(false);
  const [guardandoCorte, setGuardandoCorte] = useState(false);

  // Cargar ventas recientes
  useEffect(() => {
    if (!negocioId) return;
    getVentasRecientes(negocioId, 250)
      .then((res) => {
        setVentas(res);
      })
      .catch((err) => {
        console.error('Error al cargar ventas en facturación:', err);
      });
  }, [negocioId]);

  // Ventas correspondientes a la fecha de corte seleccionada
  const ventasFechaCorte = useMemo(() => {
    return ventas.filter((v) => {
      if (!v.fecha) return false;
      const d = new Date(v.fecha.toMillis());
      const iso = d.toISOString().slice(0, 10);
      return iso === fechaCorteSeleccionada;
    });
  }, [ventas, fechaCorteSeleccionada]);

  // Corte Z simulado/precalculado para la fecha seleccionada
  const corteZCalculado = useMemo(() => {
    return generarCorteZ(ventasFechaCorte, fechaCorteSeleccionada, 'Cajero Principal');
  }, [generarCorteZ, ventasFechaCorte, fechaCorteSeleccionada]);

  const handlePrevisualizarCorteZ = () => {
    setComprobanteZActivo(corteZCalculado);
    setModalComprobanteZOpen(true);
  };

  const handleGuardarCorteZOficial = async () => {
    if (ventasFechaCorte.length === 0) {
      createToast('No hay ventas registradas en esta fecha para generar corte', 'error');
      return;
    }

    try {
      setGuardandoCorte(true);
      await guardarCorteZ(corteZCalculado);
      createToast(
        `Comprobante Z oficial ${corteZCalculado.numeroZ} guardado correctamente`,
        'success'
      );
      setComprobanteZActivo(corteZCalculado);
      setModalComprobanteZOpen(true);
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'Error al guardar Comprobante Z',
        'error'
      );
    } finally {
      setGuardandoCorte(false);
    }
  };

  const handleVerComprobanteZHistorico = (corte: ComprobanteZ) => {
    setComprobanteZActivo(corte);
    setModalComprobanteZOpen(true);
  };

  const handleCompartirWhatsAppHistorico = (corte: ComprobanteZ) => {
    const texto = generarComprobanteZTextoWhatsApp(corte, configuracion);
    const encoded = encodeURIComponent(texto);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Facturación & Documento Equivalente POS
            </h1>
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400">
              DIAN Colombia
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Resolución oficial de numeración POS, Comprobante Z de corte fiscal e Impoconsumo (INC 8% / IVA)
          </p>
        </div>

        {/* Pestañas de navegación */}
        <div className="flex rounded-xl bg-neutral-900 p-1 border border-neutral-800">
          <button
            type="button"
            onClick={() => setPestañaActiva('resolucion')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors min-h-[44px] ${
              pestañaActiva === 'resolucion'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Award className="h-4 w-4" aria-hidden="true" />
            Resolución DIAN
          </button>

          <button
            type="button"
            onClick={() => setPestañaActiva('comprobante_z')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors min-h-[44px] ${
              pestañaActiva === 'comprobante_z'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Receipt className="h-4 w-4" aria-hidden="true" />
            Comprobante Z Diario
          </button>

          <button
            type="button"
            onClick={() => setPestañaActiva('documentos_pos')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors min-h-[44px] ${
              pestañaActiva === 'documentos_pos'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <History className="h-4 w-4" aria-hidden="true" />
            Historial POS
          </button>
        </div>
      </div>

      {/* Banner reactivo de alerta fiscal */}
      <AlertaResolucionBanner
        evaluacion={evaluacionResolucion}
        onRenovarClick={() => setPestañaActiva('resolucion')}
      />

      {/* Vista de Resolución & Emisor */}
      {pestañaActiva === 'resolucion' && (
        <div className="space-y-6">
          <ResolucionDianCard
            resolucion={configuracion.resolucion}
            evaluacion={evaluacionResolucion}
            onGuardarResolucion={async (nuevaRes) => {
              await guardarConfiguracion({ resolucion: nuevaRes });
              createToast('Resolución DIAN actualizada exitosamente', 'success');
            }}
          />

          <ConfiguracionFiscalCard
            configuracion={configuracion}
            onGuardar={guardarConfiguracion}
          />
        </div>
      )}

      {/* Vista de Comprobante Z Diario */}
      {pestañaActiva === 'comprobante_z' && (
        <div className="space-y-6">
          {/* Card de Generación de Corte Z */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Receipt className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    Corte Fiscal Diario (Comprobante Z)
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Cierre diario obligatorio para cuadre tributario, bases gravables e impuestos
                  </p>
                </div>
              </div>

              {/* Selector de fecha */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-400 font-medium">Fecha de Corte:</label>
                <Input
                  type="date"
                  value={fechaCorteSeleccionada}
                  onChange={(e) => setFechaCorteSeleccionada(e.target.value)}
                  className="w-40 min-h-[44px]"
                />
              </div>
            </div>

            {/* Resumen del Corte Calculado */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
                <span className="text-[11px] text-neutral-400">Documentos Emitidos</span>
                <p className="mt-1 font-mono text-base font-bold text-white">
                  {corteZCalculado.totalDocumentosEmitidos}
                </p>
                <span className="text-[10px] text-neutral-500">
                  {corteZCalculado.totalDocumentosAnulados} anulados
                </span>
              </div>

              <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
                <span className="text-[11px] text-neutral-400">Rango de Consecutivos</span>
                <p className="mt-1 font-mono text-xs font-bold text-amber-400 truncate">
                  {corteZCalculado.consecutivoInicialTexto} a {corteZCalculado.consecutivoFinalTexto}
                </p>
                <span className="text-[10px] text-neutral-500">
                  Prefijo {corteZCalculado.prefijo}
                </span>
              </div>

              <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
                <span className="text-[11px] text-neutral-400">Ventas Brutas</span>
                <p className="mt-1 font-mono text-sm font-bold text-white">
                  {formatCOP(corteZCalculado.totalVentasBrutas)}
                </p>
                <span className="text-[10px] text-neutral-500">
                  Desc: -{formatCOP(corteZCalculado.totalDescuentos)}
                </span>
              </div>

              <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
                <span className="text-[11px] text-neutral-400">Base Gravable INC</span>
                <p className="mt-1 font-mono text-sm font-bold text-white">
                  {formatCOP(corteZCalculado.baseGravableInc8)}
                </p>
                <span className="text-[10px] text-amber-400 font-semibold">Tarifa 8%</span>
              </div>

              <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
                <span className="text-[11px] text-neutral-400">Impuesto Recaudado</span>
                <p className="mt-1 font-mono text-sm font-bold text-emerald-400">
                  {formatCOP(corteZCalculado.totalImpuestos)}
                </p>
                <span className="text-[10px] text-neutral-500">INC + IVA</span>
              </div>

              <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
                <span className="text-[11px] text-neutral-400">Total Recaudado</span>
                <p className="mt-1 font-mono text-sm font-bold text-amber-400">
                  {formatCOP(corteZCalculado.totalCobrado)}
                </p>
                <span className="text-[10px] text-neutral-500">
                  Ef: {formatCOP(corteZCalculado.totalEfectivo)}
                </span>
              </div>
            </div>

            {/* Acciones de corte */}
            <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-neutral-800 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handlePrevisualizarCorteZ}
                className="min-h-[44px] gap-2 font-medium"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Previsualizar e Imprimir Ticket Z
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={handleGuardarCorteZOficial}
                disabled={guardandoCorte || ventasFechaCorte.length === 0}
                className="min-h-[44px] gap-2 font-bold px-5"
              >
                <FileCheck className="h-4 w-4" aria-hidden="true" />
                {guardandoCorte ? 'Guardando Corte Z...' : 'Guardar y Cerrar Corte Z Oficial'}
              </Button>
            </div>
          </div>

          {/* Historial de Comprobantes Z Guardados */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Historial de Comprobantes Z Cerrados
                </h3>
                <p className="text-xs text-neutral-400">
                  Registro inmutable de cortes fiscales diarios anteriores
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-800">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-800 bg-neutral-950/80 text-[11px] font-semibold uppercase text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">No. Comprobante Z</th>
                    <th className="px-4 py-3">Fecha de Corte</th>
                    <th className="px-4 py-3">Rango Consecutivos</th>
                    <th className="px-4 py-3 text-right">Documentos</th>
                    <th className="px-4 py-3 text-right">Ventas Netas</th>
                    <th className="px-4 py-3 text-right">Impuestos</th>
                    <th className="px-4 py-3 text-right">Total Cobrado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 bg-neutral-900/30 font-mono">
                  {comprobantesZ.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center font-sans text-neutral-400">
                        Aún no se han cerrado comprobantes Z oficiales en este local.
                      </td>
                    </tr>
                  ) : (
                    comprobantesZ.map((corte) => (
                      <tr key={corte.id} className="transition-colors hover:bg-neutral-800/40">
                        <td className="px-4 py-3 font-bold text-amber-400">{corte.numeroZ}</td>
                        <td className="px-4 py-3 font-sans text-neutral-300">
                          {corte.fechaCorte} ({corte.horaGeneracion})
                        </td>
                        <td className="px-4 py-3 text-neutral-300">
                          {corte.consecutivoInicialTexto} a {corte.consecutivoFinalTexto}
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          {corte.totalDocumentosEmitidos}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-300">
                          {formatCOP(corte.totalVentasNetas)}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-300">
                          {formatCOP(corte.totalImpuestos)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-white">
                          {formatCOP(corte.totalCobrado)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleVerComprobanteZHistorico(corte)}
                              aria-label={`Ver comprobante Z ${corte.numeroZ}`}
                              className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-lg"
                            >
                              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => descargarComprobanteZCsv(corte, configuracion)}
                              aria-label={`Descargar CSV de comprobante Z ${corte.numeroZ}`}
                              className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-lg text-emerald-400"
                            >
                              <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCompartirWhatsAppHistorico(corte)}
                              aria-label={`Compartir en WhatsApp comprobante Z ${corte.numeroZ}`}
                              className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-lg text-amber-400"
                            >
                              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vista de Historial de Documentos POS */}
      {pestañaActiva === 'documentos_pos' && (
        <HistorialDocumentosPosTable
          ventas={ventas}
          configuracion={configuracion}
          onVerTicket={(t) => {
            setTicketActivo(t);
            setModalTicketOpen(true);
          }}
        />
      )}

      {/* Modal de Comprobante Z */}
      <ComprobanteZModal
        comprobante={comprobanteZActivo}
        configuracion={configuracion}
        isOpen={modalComprobanteZOpen}
        onClose={() => setModalComprobanteZOpen(false)}
      />

      {/* Modal de Ticket POS Térmico */}
      <TicketVentaModal
        ticket={ticketActivo}
        isOpen={modalTicketOpen}
        onClose={() => setModalTicketOpen(false)}
      />
    </div>
  );
}
