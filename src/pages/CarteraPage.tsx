import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Download,
  FileSpreadsheet,
  MessageCircle,
  Plus,
  Search,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useCartera } from '@/hooks/useCartera';
import { useClientes } from '@/hooks/useClientes';
import type {
  ConfigurarCuentaCorrienteInput,
  CuentaCorriente,
  EstadoCarteraCliente,
  RegistrarAbonoCarteraInput,
} from '@/types';
import { CuentaCorrienteCard } from '@/components/cartera/CuentaCorrienteCard';
import { ConfigurarCupoModal } from '@/components/cartera/ConfigurarCupoModal';
import { RegistrarAbonoModal } from '@/components/cartera/RegistrarAbonoModal';
import { EstadoCuentaModal } from '@/components/cartera/EstadoCuentaModal';
import {
  filtrarFilasCartera,
  generarCsvCarteraPorCobrar,
  generarMensajeEstadoCuentaWhatsApp,
  generarMensajeRecordatorioCobroWhatsApp,
  generarUrlWhatsAppCartera,
  getEtiquetaBucketMora,
  parseFechaCartera,
} from '@/utils/carteraUtils';
import { formatCOP } from '@/utils/formatCOP';
import { createToast } from '@/components/ui/Toast';

type TabCartera = 'cuentas' | 'vencida' | 'movimientos';
type FiltroEstado = EstadoCarteraCliente | 'todas' | 'con_saldo';

export function CarteraPage() {
  const { negocioActual, usuarioNegocio } = useNegocio();
  const {
    movimientos,
    filasCartera,
    metricas,
    loading,
    error,
    guardarConfiguracionCuenta,
    registrarAbono,
  } = useCartera(negocioActual.id);
  const { clientes } = useClientes(negocioActual.id);

  const [tab, setTab] = useState<TabCartera>('cuentas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas');

  const [modalCupoOpen, setModalCupoOpen] = useState(false);
  const [cuentaAEditar, setCuentaAEditar] = useState<CuentaCorriente | null>(null);
  const [cuentaParaAbono, setCuentaParaAbono] = useState<CuentaCorriente | null>(null);
  const [cuentaEstadoDetalle, setCuentaEstadoDetalle] = useState<CuentaCorriente | null>(null);
  const [guardando, setGuardando] = useState(false);

  const filasFiltradas = useMemo(
    () =>
      filtrarFilasCartera(filasCartera, {
        busqueda,
        estado: filtroEstado,
      }),
    [filasCartera, busqueda, filtroEstado]
  );

  const filasVencidasYPorVencer = useMemo(
    () =>
      filasCartera.filter(
        ({ cuenta, evaluacion }) =>
          cuenta.saldoActual > 0 &&
          (evaluacion.estadoCartera === 'vencida' || evaluacion.estadoCartera === 'por_vencer')
      ),
    [filasCartera]
  );

  const movimientosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return movimientos;
    return movimientos.filter((m) =>
      [m.clienteNombre, m.clienteTelefono, m.codigoComprobante, m.notas || '', m.mesaNombre || '']
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [movimientos, busqueda]);

  const handleGuardarCupo = async (input: ConfigurarCuentaCorrienteInput) => {
    setGuardando(true);
    try {
      await guardarConfiguracionCuenta({
        ...input,
        responsableNombre: usuarioNegocio?.nombre || usuarioNegocio?.email || 'Administrador',
      });
      createToast(
        cuentaAEditar
          ? `Cupo actualizado para ${input.clienteNombre}`
          : `Cuenta corriente habilitada para ${input.clienteNombre}`,
        'success'
      );
      setCuentaAEditar(null);
      setModalCupoOpen(false);
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarAbono = async (input: RegistrarAbonoCarteraInput) => {
    setGuardando(true);
    try {
      const res = await registrarAbono({
        ...input,
        responsableNombre: usuarioNegocio?.nombre || usuarioNegocio?.email || 'Cajero',
      });
      createToast(
        `Abono de ${formatCOP(res.movimiento.monto)} registrado (${res.movimiento.codigoComprobante})`,
        'success'
      );
      return res;
    } finally {
      setGuardando(false);
    }
  };

  const handleAbrirWhatsApp = (fila: (typeof filasCartera)[number]) => {
    const { cuenta, evaluacion } = fila;
    const movsCuenta = movimientos.filter((m) => m.cuentaCorrienteId === cuenta.id);
    const mensaje =
      evaluacion.diasMora > 0 || evaluacion.estadoCartera === 'por_vencer'
        ? generarMensajeRecordatorioCobroWhatsApp(
            cuenta,
            evaluacion,
            negocioActual.nombre || 'La Parada'
          )
        : generarMensajeEstadoCuentaWhatsApp(
            cuenta,
            movsCuenta,
            negocioActual.nombre || 'La Parada'
          );
    const url = generarUrlWhatsAppCartera(cuenta.clienteTelefono, mensaje);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleExportarCsv = () => {
    if (filasFiltradas.length === 0) {
      createToast('No hay cuentas en el filtro actual para exportar', 'info');
      return;
    }
    const csv = generarCsvCarteraPorCobrar(filasFiltradas);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cartera_por_cobrar_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    createToast(`Reporte CSV de cartera (${filasFiltradas.length} cuentas) descargado`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-gold-400/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-gold-400 border border-gold-400/30">
              {negocioActual.nombre || 'La Parada'}
            </span>
            <span className="rounded-full bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              Crédito Offline Controlado
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white mt-1">
            Cuentas Corrientes & Cartera por Cobrar
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Administra cupos de fiado controlado, abonos en efectivo o transferencia y recordatorios de cobro por WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportarCsv}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 text-xs font-bold text-neutral-200 hover:bg-neutral-700 transition-colors"
          >
            <Download className="h-4 w-4 text-gold-400" aria-hidden="true" />
            Exportar Cartera CSV
          </button>

          <button
            type="button"
            onClick={() => {
              setCuentaAEditar(null);
              setModalCupoOpen(true);
            }}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-gold-400 px-4 text-xs font-black text-base-dark hover:bg-gold-500 transition-all shadow-lg shadow-gold-400/10"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Habilitar Cupo de Crédito
          </button>
        </div>
      </div>

      {/* KPIs de Cartera */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Cartera por Cobrar</span>
            <Wallet className="h-4 w-4 text-gold-400" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-black text-gold-400">
            {formatCOP(metricas.totalCarteraPorCobrar)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            {metricas.clientesConSaldo} de {metricas.clientesConCuenta} cuentas con saldo
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Cartera Vencida</span>
            <AlertTriangle
              className={`h-4 w-4 ${metricas.totalCarteraVencida > 0 ? 'text-red-400' : 'text-emerald-400'}`}
              aria-hidden="true"
            />
          </div>
          <p
            className={`font-display text-2xl font-black ${
              metricas.totalCarteraVencida > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {formatCOP(metricas.totalCarteraVencida)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            {metricas.clientesEnMora} cliente(s) en mora
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Recaudo del Mes</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-black text-emerald-400">
            {formatCOP(metricas.recaudadoMesTotal)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            Efec: {formatCOP(metricas.recaudadoMesEfectivo)} · Transf: {formatCOP(metricas.recaudadoMesTransferencia)}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Cupo Disponible</span>
            <CreditCard className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-black text-white">
            {formatCOP(metricas.cupoTotalDisponible)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            Uso global: {metricas.porcentajeUtilizacionGlobal}% de {formatCOP(metricas.cupoTotalAsignado)}
          </p>
        </div>
      </div>

      {/* Pestañas principales */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          type="button"
          aria-pressed={tab === 'cuentas'}
          onClick={() => setTab('cuentas')}
          className={`min-h-[44px] inline-flex items-center gap-2 rounded-xl px-4 text-xs font-bold transition-colors ${
            tab === 'cuentas'
              ? 'bg-gold-400 text-base-dark'
              : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          Cuentas Corrientes ({filasCartera.length})
        </button>

        <button
          type="button"
          aria-pressed={tab === 'vencida'}
          onClick={() => setTab('vencida')}
          className={`min-h-[44px] inline-flex items-center gap-2 rounded-xl px-4 text-xs font-bold transition-colors ${
            tab === 'vencida'
              ? 'bg-red-500 text-white'
              : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white'
          }`}
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Cartera Vencida & Alertas ({filasVencidasYPorVencer.length})
        </button>

        <button
          type="button"
          aria-pressed={tab === 'movimientos'}
          onClick={() => setTab('movimientos')}
          className={`min-h-[44px] inline-flex items-center gap-2 rounded-xl px-4 text-xs font-bold transition-colors ${
            tab === 'movimientos'
              ? 'bg-gold-400 text-base-dark'
              : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          Historial de Movimientos ({movimientos.length})
        </button>
      </div>

      {/* Buscador y filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente, teléfono, empresa o NIT..."
            aria-label="Buscar cuentas corrientes"
            className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
          />
        </div>

        {tab === 'cuentas' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'todas', label: 'Todas' },
                { id: 'con_saldo', label: 'Con Saldo' },
                { id: 'vencida', label: 'Vencidas' },
                { id: 'por_vencer', label: 'Por Vencer' },
                { id: 'al_dia', label: 'Al Día' },
                { id: 'bloqueada', label: 'Bloqueadas' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={filtroEstado === opt.id}
                onClick={() => setFiltroEstado(opt.id)}
                className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                  filtroEstado === opt.id
                    ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Estado de error */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {/* Contenido por pestaña */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/60"
            />
          ))}
        </div>
      ) : tab === 'cuentas' ? (
        filasFiltradas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/50 p-10 text-center space-y-3">
            <CreditCard className="mx-auto h-10 w-10 text-neutral-600" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-white">
              {filasCartera.length === 0
                ? 'Aún no hay cuentas corrientes habilitadas'
                : 'Ninguna cuenta coincide con los filtros'}
            </h2>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Habilita un cupo de crédito offline para tus clientes frecuentes o convenios de empresas y controla cada consumo y abono desde el POS y Mesas.
            </p>
            <button
              type="button"
              onClick={() => {
                setCuentaAEditar(null);
                setModalCupoOpen(true);
              }}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-gold-400 px-4 text-xs font-black text-base-dark hover:bg-gold-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Habilitar Primera Cuenta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filasFiltradas.map((fila) => (
              <CuentaCorrienteCard
                key={fila.cuenta.id}
                fila={fila}
                onRegistrarAbono={() => setCuentaParaAbono(fila.cuenta)}
                onVerEstadoCuenta={() => setCuentaEstadoDetalle(fila.cuenta)}
                onConfigurarCupo={() => {
                  setCuentaAEditar(fila.cuenta);
                  setModalCupoOpen(true);
                }}
                onEnviarRecordatorioWhatsApp={() => handleAbrirWhatsApp(fila)}
              />
            ))}
          </div>
        )
      ) : tab === 'vencida' ? (
        filasVencidasYPorVencer.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-10 text-center space-y-2">
            <TrendingUp className="mx-auto h-10 w-10 text-emerald-400" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-white">
              ¡Excelente! No hay cartera vencida ni próxima a vencer
            </h2>
            <p className="text-xs text-neutral-400">
              Todas las cuentas con saldo están dentro de su plazo de pago acordado.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filasVencidasYPorVencer.map((fila) => {
              const { cuenta, evaluacion } = fila;
              return (
                <div
                  key={cuenta.id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{cuenta.clienteNombre}</span>
                      {cuenta.empresa && (
                        <span className="text-xs text-neutral-400">· {cuenta.empresa}</span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          evaluacion.diasMora > 0
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {evaluacion.diasMora > 0
                          ? `${evaluacion.diasMora}d mora · ${getEtiquetaBucketMora(evaluacion.bucketMora)}`
                          : `Vence en ${evaluacion.diasParaVencer}d`}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Tel: {cuenta.clienteTelefono} · Saldo:{' '}
                      <strong className="font-display text-gold-400">
                        {formatCOP(cuenta.saldoActual)}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAbrirWhatsApp(fila)}
                      className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      Cobrar WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setCuentaParaAbono(cuenta)}
                      className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-gold-400 px-3.5 text-xs font-black text-base-dark hover:bg-gold-500"
                    >
                      <Wallet className="h-4 w-4" aria-hidden="true" />
                      Abonar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : movimientosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/50 p-10 text-center text-sm text-neutral-400">
          No hay movimientos de cartera registrados todavía.
        </div>
      ) : (
        <div className="space-y-2">
          {movimientosFiltrados.map((mov) => {
            const esAbono = mov.tipo === 'abono' || mov.tipo === 'ajuste_abono';
            const fecha = parseFechaCartera(mov.fecha);
            return (
              <div
                key={mov.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/90 p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                      esAbono
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                        : 'border-amber-500/30 bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {esAbono ? (
                      <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">
                        {mov.clienteNombre}
                      </span>
                      <span className="font-mono text-[10px] rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-300">
                        {mov.codigoComprobante}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      {esAbono
                        ? `Abono (${mov.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'})`
                        : `Consumo a crédito (${mov.mesaNombre || mov.origen || 'POS'})`}
                      {fecha
                        ? ` · ${fecha.toLocaleString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : ''}
                      {mov.referenciaTransferencia ? ` · Ref: ${mov.referenciaTransferencia}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-display text-base font-black ${
                      esAbono ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {esAbono ? '-' : '+'}
                    {formatCOP(mov.monto)}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Saldo: {formatCOP(mov.saldoResultante)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      <ConfigurarCupoModal
        isOpen={modalCupoOpen}
        clientes={clientes}
        cuentaEditar={cuentaAEditar}
        guardando={guardando}
        onClose={() => {
          setModalCupoOpen(false);
          setCuentaAEditar(null);
        }}
        onGuardar={handleGuardarCupo}
      />

      <RegistrarAbonoModal
        isOpen={Boolean(cuentaParaAbono)}
        cuenta={cuentaParaAbono}
        negocioNombre={negocioActual.nombre || 'La Parada'}
        guardando={guardando}
        onClose={() => setCuentaParaAbono(null)}
        onConfirmarAbono={handleConfirmarAbono}
      />

      <EstadoCuentaModal
        isOpen={Boolean(cuentaEstadoDetalle)}
        cuenta={cuentaEstadoDetalle}
        movimientos={movimientos}
        negocioNombre={negocioActual.nombre || 'La Parada'}
        onClose={() => setCuentaEstadoDetalle(null)}
        onRegistrarAbono={(cuenta) => {
          setCuentaEstadoDetalle(null);
          setCuentaParaAbono(cuenta);
        }}
      />
    </div>
  );
}
