import { useMemo, useState } from 'react';
import { Search, FileSpreadsheet, Eye } from 'lucide-react';
import type { ConfiguracionFiscal, TicketVentaData, Venta } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCOP } from '@/utils/formatCOP';
import { descargarHistorialPosCsv } from '@/utils/facturacionUtils';

interface HistorialDocumentosPosTableProps {
  ventas: Venta[];
  configuracion: ConfiguracionFiscal;
  onVerTicket?: (ticket: TicketVentaData) => void;
}

export function HistorialDocumentosPosTable({
  ventas,
  configuracion,
  onVerTicket,
}: HistorialDocumentosPosTableProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'completadas' | 'anuladas'>('todos');

  // Filtrado memoizado
  const ventasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return ventas.filter((v) => {
      // Filtro de estado
      if (filtroEstado === 'completadas' && v.estado === 'anulada') return false;
      if (filtroEstado === 'anuladas' && v.estado !== 'anulada') return false;

      if (!q) return true;

      const consecutivo = (v.consecutivoFiscal || `#${v.id.slice(-6)}`).toLowerCase();
      const cliente = (v.clienteNombre || '').toLowerCase();
      const id = v.id.toLowerCase();
      return consecutivo.includes(q) || cliente.includes(q) || id.includes(q);
    });
  }, [ventas, busqueda, filtroEstado]);

  const handleDescargarCsv = () => {
    descargarHistorialPosCsv(ventasFiltradas, configuracion);
  };

  const handleAbrirTicket = (v: Venta) => {
    if (!onVerTicket) return;

    const fechaValida = v.fecha ? new Date(v.fecha.toMillis()) : new Date();
    const subtotal = v.subtotal ?? v.total;
    const baseGravable = v.baseGravable ?? Math.round(subtotal / 1.08);
    const impuesto = v.valorImpuesto ?? subtotal - baseGravable;

    const ticketData: TicketVentaData = {
      ventaId: v.id,
      negocioNombre: configuracion.nombreComercial || configuracion.razonSocial,
      negocioDireccion: configuracion.direccionFiscal,
      negocioTelefono: configuracion.telefonoContacto,
      fecha: fechaValida,
      items: v.items || [],
      subtotal: v.subtotal,
      descuento: v.descuento,
      descuentoMotivo: v.descuentoMotivo,
      propina: v.propina,
      total: v.total,
      metodoPago: v.metodoPago,
      tipoEntrega: v.tipoEntrega || 'mostrador',
      clienteNombre: v.clienteNombre,
      clienteTelefono: v.clienteTelefono,
      direccionEntrega: v.direccion,
      barrioEntrega: v.barrio,
      mesaNombre: v.mesaNombre,
      estado: v.estado,
      motivoAnulacion: v.motivoAnulacion,
      datosFiscales: {
        razonSocial: configuracion.razonSocial,
        nombreComercial: configuracion.nombreComercial,
        nit: configuracion.nit,
        dv: configuracion.dv,
        regimen: configuracion.regimenFiscal,
        responsabilidad: configuracion.responsabilidad,
        direccionFiscal: configuracion.direccionFiscal,
        municipio: configuracion.municipio,
        consecutivoFiscal: v.consecutivoFiscal || `#${v.id.slice(-6).toUpperCase()}`,
        numeroResolucion: configuracion.resolucion.numeroResolucion,
        prefijo: configuracion.resolucion.prefijo,
        rangoTexto: `del ${configuracion.resolucion.rangoInicial} al ${configuracion.resolucion.rangoFinal}`,
        vigenciaTexto: `hasta ${configuracion.resolucion.fechaVencimiento}`,
        baseGravable,
        impuesto,
        tarifa: v.tarifaImpuesto || configuracion.tarifaDefault.porcentaje,
        tipoImpuesto: v.tipoImpuesto || configuracion.tarifaDefault.tipo,
        leyenda: configuracion.leyendaFiscal,
      },
    };

    onVerTicket(ticketData);
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white">
            Documentos Equivalentes POS Emitidos
          </h3>
          <p className="text-xs text-neutral-400">
            Registro cronológico oficial con consecutivo DIAN y discriminación de impuestos
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={handleDescargarCsv}
          disabled={ventasFiltradas.length === 0}
          className="min-h-[44px] gap-2 font-medium text-emerald-400 hover:text-emerald-300"
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          Exportar a Excel (CSV)
        </Button>
      </div>

      {/* Barra de filtros */}
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por consecutivo (ej: POS-001), cliente o ID..."
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          {(['todos', 'completadas', 'anuladas'] as const).map((estado) => (
            <button
              key={estado}
              type="button"
              onClick={() => setFiltroEstado(estado)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold capitalize transition-colors min-h-[44px] ${
                filtroEstado === estado
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {estado}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla / Lista responsive */}
      <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-neutral-800 bg-neutral-950/80 text-[11px] font-semibold uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3">Consecutivo POS</th>
              <th className="px-4 py-3">Fecha y Hora</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Método / Canal</th>
              <th className="px-4 py-3 text-right">Base Gravable</th>
              <th className="px-4 py-3 text-right">Impuesto (INC/IVA)</th>
              <th className="px-4 py-3 text-right">Total Cobrado</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 bg-neutral-900/30 font-mono">
            {ventasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center font-sans text-neutral-400">
                  No se encontraron documentos equivalentes con los filtros actuales.
                </td>
              </tr>
            ) : (
              ventasFiltradas.map((v) => {
                const esAnulada = v.estado === 'anulada';
                const subtotal = v.subtotal ?? v.total;
                const base = v.baseGravable ?? Math.round(subtotal / 1.08);
                const impuesto = v.valorImpuesto ?? subtotal - base;
                const consecutivo = v.consecutivoFiscal || `#${v.id.slice(-6).toUpperCase()}`;

                return (
                  <tr
                    key={v.id}
                    className={`transition-colors hover:bg-neutral-800/40 ${
                      esAnulada ? 'opacity-60 bg-red-950/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-amber-400">{consecutivo}</td>
                    <td className="px-4 py-3 font-sans text-neutral-300">
                      {v.fecha ? new Date(v.fecha.toMillis()).toLocaleString('es-CO') : '-'}
                    </td>
                    <td className="px-4 py-3 font-sans text-white">
                      {v.clienteNombre || 'Consumidor Final'}
                    </td>
                    <td className="px-4 py-3 font-sans text-neutral-300 capitalize">
                      {v.metodoPago} • {v.tipoEntrega || 'mostrador'}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-300">
                      {formatCOP(base)}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-300">
                      {formatCOP(impuesto)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white">
                      {formatCOP(v.total)}
                    </td>
                    <td className="px-4 py-3 text-center font-sans">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          esAnulada
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {esAnulada ? 'Anulada' : 'Válida'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAbrirTicket(v)}
                        aria-label={`Ver comprobante de ${consecutivo}`}
                        className="h-9 w-9 p-0 inline-flex items-center justify-center rounded-lg"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
