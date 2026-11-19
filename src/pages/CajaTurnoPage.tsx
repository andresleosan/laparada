import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Bike,
  ClipboardCheck,
  FileSpreadsheet,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useCaja } from '@/hooks/useCaja';
import { useCierreCaja } from '@/hooks/useCierreCaja';
import { useMovimientosCaja } from '@/hooks/useMovimientosCaja';
import { useLiquidacionDomiciliarios } from '@/hooks/useLiquidacionDomiciliarios';
import { useDomicilios } from '@/hooks/useDomicilios';
import { onEmpleadosPersonalChange } from '@/services/personalService';
import type {
  CorteXParcial,
  LiquidacionDomiciliario,
  MovimientoCaja,
  RegistrarCorteXInput,
  RegistrarMovimientoCajaInput,
  TipoMovimientoCaja,
} from '@/types';
import {
  ModalEntregarBaseRuta,
  type RepartidorOption,
} from '@/components/repartidor/ModalEntregarBaseRuta';
import { ModalLiquidarDomiciliario } from '@/components/repartidor/ModalLiquidarDomiciliario';
import { ActaLiquidacionModal } from '@/components/repartidor/ActaLiquidacionModal';
import { useEffect } from 'react';
import {
  ComprobanteMovimientoCajaModal,
  CorteXModal,
  MovimientoCajaCard,
  RegistrarMovimientoCajaModal,
} from '@/components/caja';
import {
  filtrarMovimientosCaja,
} from '@/utils/movimientosCajaUtils';
import { formatCOP } from '@/utils/formatCOP';
import { formatHora } from '@/utils/dateUtils';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { createToast } from '@/components/ui/Toast';

type TabCaja = 'movimientos' | 'cortes_x' | 'domiciliarios';
type FiltroTipoMov = TipoMovimientoCaja | 'todos';

export function CajaTurnoPage() {
  const { negocioActual, usuarioNegocio } = useNegocio();
  const {
    cajaActual,
    loading: loadingCaja,
    crearCajaHoy,
    refresh: refreshCaja,
  } = useCaja();
  const {
    resumenDia,
    loading: loadingCierre,
    refresh: refreshCierre,
  } = useCierreCaja();

  const efectivoEsperadoTurno =
    cajaActual?.saldoActual !== undefined
      ? Math.max(0, cajaActual.saldoActual)
      : resumenDia.saldoCajaEsperado;

  const {
    movimientos,
    cortesX,
    resumen,
    loading: loadingMovs,
    error,
    registrarMovimiento,
    ejecutarCorteX,
    exportarCSV,
  } = useMovimientosCaja(efectivoEsperadoTurno);

  const {
    liquidaciones: liquidacionesDomiciliarios,
    basesActivas,
    actasLiquidadas,
    resumenBasesRuta,
    idsYaLiquidados,
    entregarBase,
    liquidarRepartidor,
    exportarCSV: exportarCsvDomiciliarios,
  } = useLiquidacionDomiciliarios();

  const { entregados: domiciliosEntregados } = useDomicilios();
  const [repartidoresLista, setRepartidoresLista] = useState<RepartidorOption[]>([]);
  const [modalBaseRutaOpen, setModalBaseRutaOpen] = useState(false);
  const [baseParaLiquidar, setBaseParaLiquidar] = useState<LiquidacionDomiciliario | null>(null);
  const [actaLiquidacion, setActaLiquidacion] = useState<LiquidacionDomiciliario | null>(null);
  const [guardandoRuta, setGuardandoRuta] = useState(false);

  useEffect(() => {
    const unsub = onEmpleadosPersonalChange(negocioActual.id, (empleados) => {
      const activos = empleados
        .filter((e) => e.activo && (e.cargo === 'domiciliario' || e.cargo === 'cajero'))
        .map((e) => ({ id: e.id, nombre: e.nombre }));
      setRepartidoresLista(activos);
    });
    return () => unsub();
  }, [negocioActual.id]);

  const [tab, setTab] = useState<TabCaja>('movimientos');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoMov>('todos');
  const [busqueda, setBusqueda] = useState('');

  const [modalMovimientoOpen, setModalMovimientoOpen] = useState(false);
  const [tipoMovimientoInicial, setTipoMovimientoInicial] =
    useState<TipoMovimientoCaja>('sangria_caja_fuerte');
  const [modalCorteXOpen, setModalCorteXOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [movimientoComprobante, setMovimientoComprobante] =
    useState<MovimientoCaja | null>(null);
  const [corteXComprobante, setCorteXComprobante] =
    useState<CorteXParcial | null>(null);

  const [baseAperturaStr, setBaseAperturaStr] = useState('100000');
  const [abriendoCaja, setAbriendoCaja] = useState(false);

  const responsableDefault =
    usuarioNegocio?.nombre || usuarioNegocio?.email || 'Cajero de Turno';

  const movimientosFiltrados = useMemo(
    () =>
      filtrarMovimientosCaja(movimientos, {
        tipo: filtroTipo,
        busqueda,
      }),
    [movimientos, filtroTipo, busqueda]
  );

  const abrirModalMovimiento = (tipo: TipoMovimientoCaja) => {
    setTipoMovimientoInicial(tipo);
    setModalMovimientoOpen(true);
  };

  const handleConfirmarMovimiento = async (
    input: Omit<RegistrarMovimientoCajaInput, 'negocioId' | 'responsableRol'>
  ) => {
    setGuardando(true);
    try {
      const creado = await registrarMovimiento({
        ...input,
        cajaId: cajaActual?.id,
      });
      setModalMovimientoOpen(false);
      setMovimientoComprobante(creado);
      await Promise.all([refreshCaja(), refreshCierre()]);
      createToast(
        `Movimiento ${creado.codigoComprobante} registrado (${formatCOP(creado.monto)})`,
        'success'
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmarCorteX = async (
    input: Omit<RegistrarCorteXInput, 'negocioId'>
  ) => {
    setGuardando(true);
    try {
      const creado = await ejecutarCorteX({
        ...input,
        cajaId: cajaActual?.id,
      });
      setModalCorteXOpen(false);
      setCorteXComprobante(creado);
      await Promise.all([refreshCaja(), refreshCierre()]);
      createToast(`Acta de Corte X ${creado.codigoCorte} emitida`, 'success');
    } finally {
      setGuardando(false);
    }
  };

  const handleAbrirCajaRapido = async () => {
    const monto = Math.max(0, Math.round(Number(baseAperturaStr) || 0));
    setAbriendoCaja(true);
    try {
      await crearCajaHoy(monto);
      await refreshCierre();
      createToast(`Caja abierta con base ${formatCOP(monto)}`, 'success');
    } catch {
      createToast('No se pudo abrir la caja', 'error');
    } finally {
      setAbriendoCaja(false);
    }
  };

  const isLoading = loadingCaja || loadingCierre || loadingMovs;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-14 w-72 rounded-xl" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900">
          <EmptyState
            icon={AlertTriangle}
            title="Error al cargar la caja en turno"
            description={error}
            action={{ label: 'Reintentar', onClick: () => void refreshCaja() }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col gap-4 border-b border-neutral-800 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  Movimientos de Caja & Corte X
                </h1>
                <p className="text-xs text-neutral-400 sm:text-sm">
                  Sangrías a caja fuerte, egresos de caja menor, ingresos de sencillo y relevos de turno
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => abrirModalMovimiento('sangria_caja_fuerte')}
              className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold"
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <span>Sangría / Retiro</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => abrirModalMovimiento('egreso_caja_menor')}
              className="min-h-[44px] flex items-center gap-1.5 text-xs"
            >
              <ArrowUpRight className="h-4 w-4 text-rose-400" aria-hidden="true" />
              <span>Caja Menor</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => abrirModalMovimiento('ingreso_sencillo')}
              className="min-h-[44px] flex items-center gap-1.5 text-xs"
            >
              <ArrowDownLeft className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Ingreso Sencillo</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalCorteXOpen(true)}
              className="min-h-[44px] flex items-center gap-1.5 text-xs border-sky-500/40 text-sky-300"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Corte X (Relevo)</span>
            </Button>

            <Link
              to="/gastos"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs font-semibold text-neutral-200 transition-colors hover:border-amber-400/50 hover:text-amber-300"
            >
              <Receipt className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span>Gastos &amp; Caja Menor</span>
            </Link>

            {movimientos.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={exportarCSV}
                aria-label="Exportar movimientos de caja a CSV"
                className="min-h-[44px] flex items-center gap-1.5 text-xs"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>CSV</span>
              </Button>
            )}
          </div>
        </div>

        {/* Apertura rápida si aún no hay caja iniciada hoy */}
        {!cajaActual && (
          <Card className="border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-amber-300">
                  La caja del día aún no ha sido abierta
                </h2>
                <p className="text-xs text-neutral-300">
                  Inicia la caja con la base en efectivo para llevar el saldo exacto en el cajón.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  aria-label="Base inicial de caja en COP"
                  value={baseAperturaStr}
                  onChange={(e) => setBaseAperturaStr(e.target.value)}
                  className="h-11 w-32 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-xs text-white"
                />
                <Button
                  type="button"
                  variant="primary"
                  loading={abriendoCaja}
                  onClick={handleAbrirCajaRapido}
                  className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Abrir Caja</span>
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Alerta preventiva de exceso de efectivo */}
        {resumen.alertaExcesoEfectivo && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-amber-300">
                  Exceso de efectivo en cajón ({formatCOP(efectivoEsperadoTurno)})
                </p>
                <p className="text-xs text-neutral-300">
                  Supera el umbral de seguridad ({formatCOP(resumen.umbralAlertaSangria)}). Se recomienda realizar una sangría a caja fuerte.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => abrirModalMovimiento('sangria_caja_fuerte')}
              className="min-h-[44px] shrink-0 text-xs font-bold"
            >
              Hacer Sangría Ahora
            </Button>
          </div>
        )}

        {/* 4 KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
          <Card className="border-neutral-800 bg-neutral-900/90 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Efectivo Esperado en Cajón
            </span>
            <p className="mt-2 font-display text-2xl font-black text-gold-400">
              {formatCOP(efectivoEsperadoTurno)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-400">
              Base {formatCOP(resumenDia.montoInicialCaja)} + Ventas {formatCOP(resumenDia.ventasEfectivo)}
            </p>
          </Card>

          <Card className="border-neutral-800 bg-neutral-900/90 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Sangrías a Caja Fuerte
            </span>
            <p className="mt-2 font-display text-2xl font-black text-amber-400">
              -{formatCOP(resumen.totalSangrias)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-400">
              {resumen.cantidadSangrias} retiro(s) resguardado(s)
            </p>
          </Card>

          <Card className="border-neutral-800 bg-neutral-900/90 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Caja Menor & Sencillos
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-lg font-black text-emerald-400">
                +{formatCOP(resumen.totalIngresosSencillo)}
              </span>
              <span className="text-neutral-600">/</span>
              <span className="font-display text-lg font-black text-rose-400">
                -{formatCOP(resumen.totalCajaMenor)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              {resumen.cantidadIngresosSencillo} sencillo(s) · {resumen.cantidadCajaMenor} caja menor
            </p>
          </Card>

          <Card className="border-neutral-800 bg-neutral-900/90 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Cortes X de Relevo
            </span>
            <p className="mt-2 font-display text-2xl font-black text-sky-400">
              {cortesX.length}
            </p>
            <p className="mt-1 text-[11px] text-neutral-400">
              Arqueos parciales auditados hoy
            </p>
          </Card>
        </div>

        {/* Pestañas */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={tab === 'movimientos'}
              onClick={() => setTab('movimientos')}
              className={`min-h-[44px] rounded-xl px-4 text-xs font-bold transition-colors ${
                tab === 'movimientos'
                  ? 'bg-gold-400 text-black'
                  : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              Movimientos del Turno ({movimientos.length})
            </button>

            <button
              type="button"
              aria-pressed={tab === 'cortes_x'}
              onClick={() => setTab('cortes_x')}
              className={`min-h-[44px] rounded-xl px-4 text-xs font-bold transition-colors ${
                tab === 'cortes_x'
                  ? 'bg-gold-400 text-black'
                  : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              Cortes X / Relevos ({cortesX.length})
            </button>

            <button
              type="button"
              aria-pressed={tab === 'domiciliarios'}
              onClick={() => setTab('domiciliarios')}
              className={`min-h-[44px] rounded-xl px-4 text-xs font-bold transition-colors ${
                tab === 'domiciliarios'
                  ? 'bg-gold-400 text-black'
                  : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              Domiciliarios / Ruta ({liquidacionesDomiciliarios.length})
            </button>
          </div>

          {tab === 'movimientos' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-neutral-500" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Buscar comprobante o motivo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="h-11 rounded-xl border border-neutral-800 bg-neutral-900 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
                />
              </div>

              {(
                [
                  { id: 'todos', label: 'Todos' },
                  { id: 'sangria_caja_fuerte', label: 'Sangrías' },
                  { id: 'egreso_caja_menor', label: 'Caja Menor' },
                  { id: 'ingreso_sencillo', label: 'Sencillos' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filtroTipo === f.id}
                  onClick={() => setFiltroTipo(f.id)}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-semibold transition-colors ${
                    filtroTipo === f.id
                      ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Listado */}
        {tab === 'movimientos' ? (
          movimientosFiltrados.length > 0 ? (
            <div className="space-y-3">
              {movimientosFiltrados.map((mov) => (
                <MovimientoCajaCard
                  key={mov.id}
                  movimiento={mov}
                  onVerComprobante={setMovimientoComprobante}
                />
              ))}
            </div>
          ) : (
            <Card className="border-neutral-800 bg-neutral-900/60">
              <EmptyState
                icon={Banknote}
                title="Sin movimientos de caja registrados hoy"
                description="Registra sangrías a caja fuerte, egresos de caja menor o ingresos de sencillo para mantener el control exacto del cajón."
                action={{
                  label: 'Registrar Sangría o Movimiento',
                  onClick: () => abrirModalMovimiento('sangria_caja_fuerte'),
                }}
              />
            </Card>
          )
        ) : tab === 'cortes_x' ? (
          cortesX.length > 0 ? (
          <div className="space-y-3">
            {cortesX.map((corte) => {
              const fechaObj = toValidAdminDate(corte.fecha);
              return (
                <Card
                  key={corte.id}
                  className="flex flex-col gap-3 border-neutral-800 bg-neutral-900/90 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sky-400">
                        {corte.codigoCorte}
                      </span>
                      {fechaObj && (
                        <span className="text-xs text-neutral-400">
                          {formatHora(fechaObj)}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          corte.arqueo.estadoCuadre === 'cuadrado'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : corte.arqueo.estadoCuadre === 'sobrante'
                              ? 'bg-sky-500/15 text-sky-300'
                              : 'bg-red-500/15 text-red-300'
                        }`}
                      >
                        {corte.arqueo.estadoCuadre === 'cuadrado'
                          ? 'Cuadrado ($0)'
                          : corte.arqueo.estadoCuadre === 'sobrante'
                            ? `Sobrante +${formatCOP(corte.arqueo.diferencia)}`
                            : `Faltante -${formatCOP(Math.abs(corte.arqueo.diferencia))}`}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      Entrega: {corte.cajeroSaliente}
                      {corte.cajeroEntrante ? ` ➔ Recibe: ${corte.cajeroEntrante}` : ''}
                    </p>
                    <p className="text-xs text-neutral-400">
                      Esperado: {formatCOP(corte.efectivoEsperado)} · Contado:{' '}
                      {formatCOP(corte.arqueo.totalFisico)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setCorteXComprobante(corte)}
                    className="min-h-[44px] flex items-center gap-1.5 text-xs"
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    <span>Ver Acta Corte X</span>
                  </Button>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-neutral-800 bg-neutral-900/60">
            <EmptyState
              icon={RefreshCw}
              title="No se han emitido Cortes X hoy"
              description="Realiza un arqueo parcial de relevo cuando cambie el cajero sin cerrar la jornada contable."
              action={{
                label: 'Emitir Corte X de Relevo',
                onClick: () => setModalCorteXOpen(true),
              }}
            />
          </Card>
          )
        ) : (
          <div className="space-y-4">
            {/* Cabecera acciones domiciliarios */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase text-neutral-400">
                    Base Activa en Calle
                  </span>
                  <p className="font-display text-xl font-black text-amber-400">
                    {formatCOP(resumenBasesRuta.totalBaseEnRutaActiva)}
                  </p>
                </div>
                <div className="h-8 w-px bg-neutral-800" />
                <div>
                  <span className="text-[11px] font-bold uppercase text-neutral-400">
                    Efectivo Rendido Hoy
                  </span>
                  <p className="font-display text-xl font-black text-emerald-400">
                    {formatCOP(resumenBasesRuta.totalEfectivoRendidoHoy)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={exportarCsvDomiciliarios}
                  className="min-h-[44px] gap-1.5 text-xs"
                >
                  <FileSpreadsheet className="h-4 w-4 text-gold-400" />
                  <span>Exportar CSV</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => setModalBaseRutaOpen(true)}
                  className="min-h-[44px] gap-1.5 bg-amber-500 text-xs font-bold text-neutral-950 hover:bg-amber-400"
                >
                  <Bike className="h-4 w-4" />
                  <span>Entregar Base a Repartidor</span>
                </Button>
              </div>
            </div>

            {basesActivas.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Bases Activas en Ruta ({basesActivas.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {basesActivas.map((base) => (
                    <Card
                      key={base.id}
                      className="flex items-center justify-between gap-3 border-amber-500/30 bg-amber-500/5 p-4"
                    >
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {base.codigoActa} · EN RUTA
                        </span>
                        <p className="text-sm font-bold text-white">
                          {base.domiciliarioNombre}
                        </p>
                        <p className="text-xs text-neutral-400">
                          Base entregada: {formatCOP(base.montoBaseInicial)} · Por {base.entregadoPor}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setBaseParaLiquidar(base)}
                        className="min-h-[44px] gap-1.5 bg-emerald-500 text-xs font-bold text-neutral-950 hover:bg-emerald-400"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Liquidar</span>
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {actasLiquidadas.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Actas Liquidadas y Conciliadas Hoy ({actasLiquidadas.length})
                </h3>
                <div className="space-y-2.5">
                  {actasLiquidadas.map((acta) => (
                    <Card
                      key={acta.id}
                      className="flex flex-col gap-3 border-neutral-800 bg-neutral-900/90 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {acta.codigoActa}
                          </span>
                          <span className="text-sm font-bold text-white">
                            {acta.domiciliarioNombre}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              acta.diferencia === 0
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : acta.diferencia > 0
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-rose-500/15 text-rose-300'
                            }`}
                          >
                            {acta.diferencia === 0
                              ? 'Cuadrado ($0)'
                              : acta.diferencia > 0
                              ? `Sobrante +${formatCOP(acta.diferencia)}`
                              : `Faltante -${formatCOP(Math.abs(acta.diferencia))}`}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">
                          Base: {formatCOP(acta.montoBaseInicial)} · {acta.totalEntregas} entregas · Entregado: {formatCOP(acta.efectivoEntregadoFisico)} · Transf.: {formatCOP(acta.totalTransferencias)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setActaLiquidacion(acta)}
                        className="min-h-[44px] gap-1.5 text-xs"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Ver Acta</span>
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              basesActivas.length === 0 && (
                <Card className="border-neutral-800 bg-neutral-900/60">
                  <EmptyState
                    icon={Bike}
                    title="Sin bases ni liquidaciones de domiciliarios hoy"
                    description="Entrega una base de sencillo al salir a ruta y liquida las entregas al regresar para mantener el cajón cuadrado."
                    action={{
                      label: 'Entregar Base a Repartidor',
                      onClick: () => setModalBaseRutaOpen(true),
                    }}
                  />
                </Card>
              )
            )}
          </div>
        )}

        {/* Modales */}
        <RegistrarMovimientoCajaModal
          isOpen={modalMovimientoOpen}
          tipoInicial={tipoMovimientoInicial}
          efectivoActualEsperado={efectivoEsperadoTurno}
          cajaId={cajaActual?.id}
          responsableDefault={responsableDefault}
          guardando={guardando}
          onClose={() => setModalMovimientoOpen(false)}
          onConfirmar={handleConfirmarMovimiento}
        />

        <CorteXModal
          isOpen={modalCorteXOpen}
          cajaId={cajaActual?.id}
          cajeroSalienteDefault={responsableDefault}
          efectivoInicial={resumenDia.montoInicialCaja}
          ventasEfectivo={resumenDia.ventasEfectivo}
          ventasTransferencia={resumenDia.ventasTransferencia}
          ingresosSencillo={resumen.totalIngresosSencillo}
          sangriasCajaFuerte={resumen.totalSangrias}
          egresosCajaMenor={resumen.totalCajaMenor}
          gastosOperativos={resumenDia.totalGastos}
          efectivoEsperado={efectivoEsperadoTurno}
          guardando={guardando}
          onClose={() => setModalCorteXOpen(false)}
          onConfirmar={handleConfirmarCorteX}
        />

        <ComprobanteMovimientoCajaModal
          isOpen={Boolean(movimientoComprobante || corteXComprobante)}
          movimiento={movimientoComprobante}
          corteX={corteXComprobante}
          negocio={negocioActual}
          onClose={() => {
            setMovimientoComprobante(null);
            setCorteXComprobante(null);
          }}
        />

        <ModalEntregarBaseRuta
          isOpen={modalBaseRutaOpen}
          repartidores={repartidoresLista}
          entregadoPorDefault={responsableDefault}
          loading={guardandoRuta}
          onClose={() => setModalBaseRutaOpen(false)}
          onConfirmar={async (datos) => {
            setGuardandoRuta(true);
            try {
              const creada = await entregarBase(datos);
              createToast(
                `Base ${creada.codigoActa} (${formatCOP(creada.montoBaseInicial)}) entregada a ${creada.domiciliarioNombre}`,
                'success'
              );
              setModalBaseRutaOpen(false);
              await Promise.all([refreshCaja(), refreshCierre()]);
            } catch (err) {
              createToast(err instanceof Error ? err.message : 'Error entregando base', 'error');
            } finally {
              setGuardandoRuta(false);
            }
          }}
        />

        <ModalLiquidarDomiciliario
          isOpen={Boolean(baseParaLiquidar)}
          baseActiva={baseParaLiquidar}
          domiciliarioId={baseParaLiquidar?.domiciliarioId || ''}
          domiciliarioNombre={baseParaLiquidar?.domiciliarioNombre || ''}
          domiciliosEntregados={domiciliosEntregados}
          idsYaLiquidados={idsYaLiquidados}
          loading={guardandoRuta}
          onClose={() => setBaseParaLiquidar(null)}
          onConfirmar={async (datos) => {
            setGuardandoRuta(true);
            try {
              const acta = await liquidarRepartidor({
                ...datos,
                domiciliosEntregados,
                cajeroReceptor: responsableDefault,
              });
              createToast(`Liquidación ${acta.codigoActa} conciliada con caja`, 'success');
              setBaseParaLiquidar(null);
              setActaLiquidacion(acta);
              await Promise.all([refreshCaja(), refreshCierre()]);
            } catch (err) {
              createToast(err instanceof Error ? err.message : 'Error liquidando ruta', 'error');
            } finally {
              setGuardandoRuta(false);
            }
          }}
        />

        <ActaLiquidacionModal
          acta={actaLiquidacion}
          negocioNombre={negocioActual.nombre || 'La Parada'}
          onClose={() => setActaLiquidacion(null)}
        />
      </div>
    </div>
  );
}
