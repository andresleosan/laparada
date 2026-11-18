import { useMemo, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Banknote,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  Download,
  Plus,
  Search,
  TrendingUp,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useCotizaciones } from '@/hooks/useCotizaciones';
import { useFacturacion } from '@/hooks/useFacturacion';
import { useInventario } from '@/hooks/useInventario';
import { useKardex } from '@/hooks/useKardex';
import { useProductos } from '@/hooks/useProductos';
import {
  ConvertirCotizacionModal,
  CotizacionCard,
  CotizacionFormModal,
  PropuestaCotizacionModal,
  RegistrarAnticipoCotizacionModal,
} from '@/components/cotizaciones';
import { TicketVentaModal } from '@/components/pos/TicketVentaModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { createToast } from '@/components/ui/Toast';
import { uploadFotoTransferencia } from '@/services/ventasService';
import type {
  CotizacionComercial,
  CrearCotizacionInput,
  EstadoCotizacion,
  MetodoPago,
  RegistrarAnticipoCotizacionInput,
  TicketVentaData,
  TipoEventoCotizacion,
} from '@/types';
import {
  TIPOS_EVENTO_CATALOGO,
  descargarCotizacionesCsv,
  filtrarCotizaciones,
  generarCodigoCotizacion,
  generarUrlWhatsAppCotizacion,
} from '@/utils/cotizacionesUtils';
import {
  calcularDesgloseFiscal,
  formatearConsecutivoFiscal,
} from '@/utils/facturacionUtils';
import { formatCOP } from '@/utils/formatCOP';

const ESTADOS_FILTRO: Array<{ id: 'todas' | EstadoCotizacion; label: string }> = [
  { id: 'todas', label: 'Todas' },
  { id: 'borrador', label: 'Borradores' },
  { id: 'enviada', label: 'Enviadas' },
  { id: 'aprobada', label: 'Aprobadas' },
  { id: 'convertida', label: 'Convertidas' },
  { id: 'vencida', label: 'Vencidas' },
  { id: 'rechazada', label: 'Rechazadas' },
];

export const CotizacionesPage: FC = () => {
  const { negocioActual, usuarioNegocio, esSuperAdmin } = useNegocio();
  const esAdmin = esSuperAdmin || usuarioNegocio?.rol === 'admin';
  const responsableNombre = usuarioNegocio?.nombre || 'Administrador';

  const {
    cotizaciones,
    loading,
    error,
    metricas,
    crear,
    actualizar,
    cambiarEstado,
    registrarAnticipo,
    marcarEnviadaWhatsApp,
    convertirAVenta,
    eliminar,
    recargar,
  } = useCotizaciones();

  const { productos, combos } = useProductos();
  const { insumos } = useInventario();
  const { movimientos } = useKardex({ insumos, limite: 150 });
  const { configuracion: configFiscal, asignarConsecutivo } = useFacturacion();

  const [filtroEstado, setFiltroEstado] = useState<'todas' | EstadoCotizacion>('todas');
  const [filtroTipoEvento, setFiltroTipoEvento] = useState<'todos' | TipoEventoCotizacion>('todos');
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [cotizacionEditando, setCotizacionEditando] = useState<CotizacionComercial | null>(null);
  const [cotizacionPropuesta, setCotizacionPropuesta] = useState<CotizacionComercial | null>(null);
  const [cotizacionAnticipo, setCotizacionAnticipo] = useState<CotizacionComercial | null>(null);
  const [cotizacionConvertir, setCotizacionConvertir] = useState<CotizacionComercial | null>(null);
  const [ticketConvertido, setTicketConvertido] = useState<TicketVentaData | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const codigoSugerido = useMemo(
    () => generarCodigoCotizacion(cotizaciones),
    [cotizaciones]
  );

  const cotizacionesFiltradas = useMemo(
    () =>
      filtrarCotizaciones(cotizaciones, {
        estado: filtroEstado,
        tipoEvento: filtroTipoEvento,
        busqueda,
      }),
    [cotizaciones, filtroEstado, filtroTipoEvento, busqueda]
  );

  const negocioInfo = {
    nombre: negocioActual?.nombre || 'La Parada',
    telefono: negocioActual?.telefono,
    direccion: negocioActual?.direccion,
  };

  const handleAbrirNueva = () => {
    setCotizacionEditando(null);
    setFormModalOpen(true);
  };

  const handleEditar = (cot: CotizacionComercial) => {
    setCotizacionEditando(cot);
    setFormModalOpen(true);
  };

  const handleGuardarCotizacion = async (
    input: CrearCotizacionInput,
    cotizacionId?: string
  ) => {
    setGuardando(true);
    try {
      if (cotizacionId) {
        await actualizar(cotizacionId, input);
        createToast(`✅ Cotización ${input.codigo || ''} actualizada.`, 'success');
      } else {
        await crear(input);
        createToast(
          `✅ Propuesta ${input.codigo || codigoSugerido} creada para ${input.empresa || input.clienteNombre}.`,
          'success'
        );
      }
      setFormModalOpen(false);
      setCotizacionEditando(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar cotización';
      createToast(msg, 'error');
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  const handleEnviarWhatsApp = async (cot: CotizacionComercial) => {
    const url = generarUrlWhatsAppCotizacion(cot, negocioInfo);
    window.open(url, '_blank', 'noopener,noreferrer');
    try {
      await marcarEnviadaWhatsApp(cot.id);
      createToast(`📲 Propuesta ${cot.codigo} lista en WhatsApp.`, 'info');
    } catch (err) {
      console.warn('No se pudo registrar timestamp de envío WhatsApp:', err);
    }
  };

  const handleCambiarEstado = async (
    cot: CotizacionComercial,
    nuevoEstado: Exclude<EstadoCotizacion, 'convertida'>
  ) => {
    setProcesandoId(cot.id);
    try {
      await cambiarEstado(cot.id, nuevoEstado);
      createToast(`Cotización ${cot.codigo} marcada como ${nuevoEstado}.`, 'success');
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo actualizar el estado.',
        'error'
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const handleGuardarAnticipo = async (
    cotizacionId: string,
    input: RegistrarAnticipoCotizacionInput,
    fotoFile?: File | null
  ) => {
    setProcesandoId(cotizacionId);
    try {
      let fotoPath = input.anticipoFotoPath;
      if (fotoFile && negocioActual?.id) {
        fotoPath = await uploadFotoTransferencia(fotoFile, negocioActual.id);
      }
      const res = await registrarAnticipo(cotizacionId, {
        ...input,
        ...(fotoPath ? { anticipoFotoPath: fotoPath } : {}),
      });
      createToast(
        `✅ Anticipo de ${formatCOP(res.anticipoMonto)} guardado. Saldo: ${formatCOP(res.saldoPendiente)}.`,
        'success'
      );
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo registrar el anticipo.',
        'error'
      );
      throw err;
    } finally {
      setProcesandoId(null);
    }
  };

  const handleConfirmarConversion = async (params: {
    cotizacion: CotizacionComercial;
    metodoPagoSaldo: MetodoPago;
    enviarAKDS: boolean;
    descontarInventario: boolean;
    notasCocinaExtra?: string;
  }) => {
    const { cotizacion } = params;
    setProcesandoId(cotizacion.id);
    try {
      let datosFiscales:
        | {
            consecutivoFiscal?: string;
            baseGravable?: number;
            valorImpuesto?: number;
            tarifaImpuesto?: number;
            tipoImpuesto?: 'inc' | 'iva' | 'ninguno';
            resolucionDian?: string;
            razonSocial?: string;
            nombreComercial?: string;
            nit?: string;
            dv?: string;
            regimen?: string;
            responsabilidad?: string;
            direccionFiscal?: string;
            municipio?: string;
            departamento?: string;
            telefono?: string;
            prefijo?: string;
            rangoTexto?: string;
            vigenciaTexto?: string;
            leyenda?: string;
          }
        | undefined;

      if (configFiscal?.habilitado) {
        const desglose = calcularDesgloseFiscal(
          cotizacion.totalCotizado,
          configFiscal.tarifaDefault.porcentaje,
          configFiscal.preciosIncluyenImpuesto,
          configFiscal.tarifaDefault.tipo
        );
        let consecutivoFiscal: string;
        try {
          const cInfo = await asignarConsecutivo();
          consecutivoFiscal = cInfo.consecutivoFiscal;
        } catch {
          consecutivoFiscal = formatearConsecutivoFiscal(
            configFiscal.resolucion.prefijo,
            configFiscal.resolucion.consecutivoActual
          );
        }

        datosFiscales = {
          consecutivoFiscal,
          baseGravable: desglose.baseGravable,
          valorImpuesto: desglose.valorImpuesto,
          tarifaImpuesto: configFiscal.tarifaDefault.porcentaje,
          tipoImpuesto: configFiscal.tarifaDefault.tipo,
          resolucionDian: configFiscal.resolucion.numeroResolucion,
          razonSocial: configFiscal.razonSocial,
          nombreComercial: configFiscal.nombreComercial,
          nit: configFiscal.nit,
          dv: configFiscal.dv,
          regimen: configFiscal.regimenFiscal,
          responsabilidad: configFiscal.responsabilidad,
          direccionFiscal: configFiscal.direccionFiscal,
          municipio: configFiscal.municipio,
          departamento: configFiscal.departamento,
          telefono: configFiscal.telefonoContacto,
          prefijo: configFiscal.resolucion.prefijo,
          rangoTexto: `del ${configFiscal.resolucion.rangoInicial} al ${configFiscal.resolucion.rangoFinal}`,
          vigenciaTexto: `hasta ${configFiscal.resolucion.fechaVencimiento}`,
          leyenda: configFiscal.leyendaFiscal,
        };
      }

      const resultado = await convertirAVenta(
        cotizacion.id,
        {
          metodoPagoSaldo: params.metodoPagoSaldo,
          enviarAKDS: params.enviarAKDS,
          descontarInventario: params.descontarInventario,
          responsableNombre,
          notasCocinaExtra: params.notasCocinaExtra,
          negocioNombre: negocioActual?.nombre || 'La Parada',
          negocioSlug: negocioActual?.slug,
          negocioDireccion: negocioActual?.direccion,
          negocioTelefono: negocioActual?.telefono,
          datosFiscales,
        },
        { productos, combos }
      );

      setCotizacionConvertir(null);
      setTicketConvertido(resultado.ticket);
      createToast(
        `🔥 ${cotizacion.codigo} convertida a Venta #${resultado.ventaId.slice(-6).toUpperCase()}${resultado.comandaId ? ' y enviada a Cocina KDS' : ''}.`,
        'success',
        4500
      );
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'Error al convertir la cotización.',
        'error'
      );
      throw err;
    } finally {
      setProcesandoId(null);
    }
  };

  const handleEliminar = async (cot: CotizacionComercial) => {
    if (!window.confirm(`¿Deseas eliminar permanentemente la cotización ${cot.codigo}?`)) {
      return;
    }
    setProcesandoId(cot.id);
    try {
      await eliminar(cot.id);
      createToast(`Cotización ${cot.codigo} eliminada.`, 'info');
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo eliminar la cotización.',
        'error'
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const handleExportarCsv = () => {
    descargarCotizacionesCsv(cotizacionesFiltradas, negocioInfo.nombre);
    createToast(
      `Exportadas ${cotizacionesFiltradas.length} cotizaciones a CSV.`,
      'success'
    );
  };

  return (
    <div className="min-h-screen bg-base-dark px-4 pb-24 pt-5 text-white sm:px-6 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Cabecera */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-400">
              Ventas Corporativas & Catering
            </p>
            <h1 className="font-display text-2xl font-black text-white sm:text-3xl">
              Cotizaciones, Eventos y Catering
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Arma propuestas para empresas y fiestas, simula margen e insumos en bodega, controla anticipos offline y convierte a venta + cocina KDS en 1 clic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/pos"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 text-xs font-bold text-neutral-200 hover:border-gold-400 hover:text-gold-300"
            >
              <ChefHat className="h-4 w-4 text-gold-400" aria-hidden="true" />
              <span>Ir al POS</span>
            </Link>

            <button
              type="button"
              onClick={handleExportarCsv}
              disabled={cotizacionesFiltradas.length === 0}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 text-xs font-bold text-neutral-200 hover:border-gold-400 hover:text-white disabled:opacity-40"
            >
              <Download className="h-4 w-4 text-gold-400" aria-hidden="true" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handleAbrirNueva}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gold-400 px-4 text-xs font-black text-black shadow-lg hover:bg-gold-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Nueva Cotización</span>
            </button>
          </div>
        </header>

        {/* 5 KPIs Ejecutivos */}
        <section
          aria-label="Indicadores de cotizaciones y eventos"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Pipeline Activo</span>
              <Briefcase className="h-4 w-4 text-gold-400" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-2xl font-black text-gold-400">
              {formatCOP(metricas.pipelineActivoCOP)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {metricas.borradores + metricas.enviadas + metricas.aprobadas} propuestas en curso
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Aprobadas por Producir</span>
              <CheckCircle2 className="h-4 w-4 text-amber-400" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-2xl font-black text-white">
              {metricas.aprobadas}
            </p>
            <p className="mt-1 text-[11px] text-amber-300">
              Saldo por cobrar: {formatCOP(metricas.totalSaldoPorCobrarCOP)}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Anticipos Verificados</span>
              <Banknote className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-2xl font-black text-emerald-400">
              {formatCOP(metricas.totalAnticiposVerificadosCOP)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              Transferencias y efectivo validados
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Eventos Próximos (7d)</span>
              <CalendarClock className="h-4 w-4 text-sky-400" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-2xl font-black text-white">
              {metricas.eventosProximos7Dias}
            </p>
            <p className="mt-1 text-[11px] text-sky-300">
              Enviadas o aprobadas esta semana
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Conversión & Margen</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-2xl font-black text-white">
              {metricas.tasaConversionPct}%
            </p>
            <p className="mt-1 text-[11px] text-emerald-300">
              Margen promedio: {metricas.margenPromedioPct}% · {metricas.convertidas} cerradas
            </p>
          </div>
        </section>

        {/* Barra de Filtros y Búsqueda */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
              {ESTADOS_FILTRO.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filtroEstado === item.id}
                  onClick={() => setFiltroEstado(item.id)}
                  className={`min-h-[40px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                    filtroEstado === item.id
                      ? 'border-gold-400 bg-gold-400 text-black'
                      : 'border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                aria-label="Filtrar por tipo de evento"
                value={filtroTipoEvento}
                onChange={(e) =>
                  setFiltroTipoEvento(e.target.value as 'todos' | TipoEventoCotizacion)
                }
                className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-semibold text-white focus:border-gold-400 focus:outline-none"
              >
                <option value="todos">Todos los tipos de evento</option>
                {TIPOS_EVENTO_CATALOGO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.emoji} {t.label}
                  </option>
                ))}
              </select>

              <div className="relative min-w-[230px]">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar empresa, NIT, código..."
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-9 pr-3 text-xs text-white focus:border-gold-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Estado de Carga */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((idx) => (
              <Skeleton key={idx} className="h-64 rounded-2xl bg-neutral-900" />
            ))}
          </div>
        )}

        {/* Estado de Error (prohibido silenciar errores con lista vacía) */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/20 p-6">
            <EmptyState
              icon={AlertCircle}
              title="No se pudieron cargar las cotizaciones"
              description={error}
              action={{
                label: 'Reintentar',
                onClick: recargar,
              }}
            />
          </div>
        )}

        {/* Listado de Cotizaciones o Estado Vacío */}
        {!loading && !error && cotizacionesFiltradas.length === 0 && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
            <EmptyState
              icon={Briefcase}
              title={
                cotizaciones.length === 0
                  ? 'Aún no tienes cotizaciones de eventos o catering'
                  : 'Ninguna cotización coincide con los filtros'
              }
              description={
                cotizaciones.length === 0
                  ? 'Crea tu primera propuesta comercial para empresas o celebraciones con cálculo automático de insumos, margen y envío formal por WhatsApp.'
                  : 'Prueba cambiando el filtro de estado, tipo de evento o limpiando el buscador.'
              }
              action={
                cotizaciones.length === 0
                  ? {
                      label: 'Crear Primera Cotización',
                      onClick: handleAbrirNueva,
                    }
                  : {
                      label: 'Limpiar Filtros',
                      onClick: () => {
                        setFiltroEstado('todas');
                        setFiltroTipoEvento('todos');
                        setBusqueda('');
                      },
                    }
              }
            />
          </div>
        )}

        {!loading && !error && cotizacionesFiltradas.length > 0 && (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {cotizacionesFiltradas.map((cot) => (
              <CotizacionCard
                key={cot.id}
                cotizacion={cot}
                onVerPropuesta={setCotizacionPropuesta}
                onEnviarWhatsApp={(c) => void handleEnviarWhatsApp(c)}
                onRegistrarAnticipo={setCotizacionAnticipo}
                onEditar={handleEditar}
                onConvertir={setCotizacionConvertir}
                onCambiarEstado={(c, est) => void handleCambiarEstado(c, est)}
                onEliminar={(c) => void handleEliminar(c)}
                puedeEliminar={esAdmin}
                procesando={procesandoId === cot.id}
              />
            ))}
          </section>
        )}
      </div>

      {/* Modales */}
      <CotizacionFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setCotizacionEditando(null);
        }}
        onGuardar={handleGuardarCotizacion}
        cotizacionEditar={cotizacionEditando}
        codigoSugerido={codigoSugerido}
        productos={productos}
        combos={combos}
        insumos={insumos}
        movimientosKardex={movimientos}
        responsableNombre={responsableNombre}
        guardando={guardando}
      />

      <PropuestaCotizacionModal
        cotizacion={cotizacionPropuesta}
        isOpen={Boolean(cotizacionPropuesta)}
        negocio={negocioInfo}
        onClose={() => setCotizacionPropuesta(null)}
        onEnviadaWhatsApp={(c) => void marcarEnviadaWhatsApp(c.id)}
      />

      <RegistrarAnticipoCotizacionModal
        cotizacion={cotizacionAnticipo}
        isOpen={Boolean(cotizacionAnticipo)}
        negocioNombre={negocioInfo.nombre}
        responsableNombre={responsableNombre}
        procesando={Boolean(cotizacionAnticipo && procesandoId === cotizacionAnticipo.id)}
        onClose={() => setCotizacionAnticipo(null)}
        onGuardarAnticipo={handleGuardarAnticipo}
      />

      <ConvertirCotizacionModal
        cotizacion={cotizacionConvertir}
        isOpen={Boolean(cotizacionConvertir)}
        productos={productos}
        combos={combos}
        insumos={insumos}
        procesando={Boolean(cotizacionConvertir && procesandoId === cotizacionConvertir.id)}
        onClose={() => setCotizacionConvertir(null)}
        onConfirmarConversion={handleConfirmarConversion}
      />

      <TicketVentaModal
        ticket={ticketConvertido}
        isOpen={Boolean(ticketConvertido)}
        onClose={() => setTicketConvertido(null)}
      />
    </div>
  );
};
