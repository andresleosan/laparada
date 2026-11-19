import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Edit3,
  FileSpreadsheet,
  Filter,
  MessageCircle,
  Plus,
  Receipt,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';
import type {
  CategoriaGasto,
  Gasto,
  MovimientoCaja,
  OrigenFondoGasto,
  RangoFechaGastos,
  RegistrarGastoInput,
} from '@/types';
import {
  actualizarGasto,
  eliminarGasto,
  getTodosGastos,
  registrarGastoDetallado,
} from '@/services/gastosService';
import { getMovimientosCajaHoy } from '@/services/movimientosCajaService';
import { useNegocio } from '@/context/NegocioContext';
import {
  CATEGORIAS_GASTO_META,
  FONDO_CAJA_MENOR_DEFAULT_COP,
  ORIGENES_FONDO_GASTO_META,
  calcularResumenCajaMenor,
  calcularResumenGastosOperativos,
  descargarGastosOperativosCsv,
  filtrarGastosOperativos,
  generarResumenGastosWhatsApp,
  getCategoriaGastoMeta,
  getOrigenFondoGastoMeta,
} from '@/utils/gastosUtils';
import { formatCOP } from '@/utils/formatCOP';
import { formatHora } from '@/utils/dateUtils';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import { RegistrarGastoModal } from '@/components/gastos/RegistrarGastoModal';
import { ControlCajaMenorCard } from '@/components/gastos/ControlCajaMenorCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { createToast } from '@/components/ui/Toast';

const RANGOS_FECHA: { value: RangoFechaGastos; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: '7dias', label: '7 días' },
  { value: '30dias', label: '30 días' },
  { value: 'mes_actual', label: 'Este mes' },
  { value: 'todos', label: 'Todos' },
];

function getStorageKeyFondoCajaMenor(negocioId: string): string {
  return `laparada_fondo_caja_menor_${negocioId}`;
}

function leerFondoCajaMenor(negocioId: string): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return FONDO_CAJA_MENOR_DEFAULT_COP;
  }
  try {
    const raw = window.localStorage.getItem(getStorageKeyFondoCajaMenor(negocioId));
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 10000
      ? Math.round(parsed)
      : FONDO_CAJA_MENOR_DEFAULT_COP;
  } catch {
    return FONDO_CAJA_MENOR_DEFAULT_COP;
  }
}

export function GastosPage() {
  const { negocioActual, esSuperAdmin, usuarioNegocio } = useNegocio();
  const tenantId = negocioActual.id;
  const puedeAdministrar = esSuperAdmin || usuarioNegocio?.rol === 'admin';
  const responsableDefault =
    usuarioNegocio?.nombre || usuarioNegocio?.email || 'Administrador';

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [movimientosCajaHoy, setMovimientosCajaHoy] = useState<MovimientoCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [rango, setRango] = useState<RangoFechaGastos>('30dias');
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaGasto | 'todas'>('todas');
  const [origenFiltro, setOrigenFiltro] = useState<OrigenFondoGasto | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [gastoEditando, setGastoEditando] = useState<Gasto | null>(null);
  const [fondoCajaMenor, setFondoCajaMenor] = useState<number>(() =>
    leerFondoCajaMenor(tenantId)
  );

  const requestGenerationRef = useRef(0);

  useEffect(() => {
    setFondoCajaMenor(leerFondoCajaMenor(tenantId));
  }, [tenantId]);

  const cargarDatos = useCallback(async () => {
    const generation = ++requestGenerationRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const [gastosData, movsData] = await Promise.all([
        getTodosGastos(tenantId),
        getMovimientosCajaHoy(tenantId).catch(() => []),
      ]);
      if (generation !== requestGenerationRef.current) return;
      setGastos(gastosData);
      setMovimientosCajaHoy(movsData);
    } catch (err) {
      if (generation !== requestGenerationRef.current) return;
      console.error('Error cargando gastos:', err);
      setLoadError('No fue posible consultar los gastos operativos.');
    } finally {
      if (generation === requestGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [tenantId]);

  useEffect(() => {
    cargarDatos();
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [cargarDatos]);

  const gastosFiltrados = useMemo(
    () =>
      filtrarGastosOperativos(gastos, {
        rango,
        categoria: categoriaFiltro,
        origenFondo: origenFiltro,
        busqueda,
      }),
    [gastos, rango, categoriaFiltro, origenFiltro, busqueda]
  );

  const resumen = useMemo(
    () => calcularResumenGastosOperativos(gastosFiltrados),
    [gastosFiltrados]
  );

  const resumenCajaMenor = useMemo(
    () =>
      calcularResumenCajaMenor({
        gastos: gastosFiltrados,
        movimientosCaja: movimientosCajaHoy,
        fondoAsignadoCOP: fondoCajaMenor,
      }),
    [gastosFiltrados, movimientosCajaHoy, fondoCajaMenor]
  );

  const handleActualizarFondoCajaMenor = (nuevoFondo: number) => {
    setFondoCajaMenor(nuevoFondo);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(
          getStorageKeyFondoCajaMenor(tenantId),
          String(nuevoFondo)
        );
      } catch {
        // Silencioso si localStorage está restringido
      }
    }
    createToast('Tope de Caja Menor actualizado', 'success');
  };

  const handleGuardarGasto = async (input: Omit<RegistrarGastoInput, 'negocioId'>) => {
    setGuardando(true);
    try {
      if (gastoEditando) {
        await actualizarGasto(
          gastoEditando.id,
          {
            concepto: input.concepto,
            monto: input.monto,
            categoria: input.categoria,
            origenFondo: input.origenFondo,
            metodoPago: input.metodoPago,
            proveedorNombre: input.proveedorNombre,
            numeroComprobante: input.numeroComprobante,
            responsableNombre: input.responsableNombre,
            deducible: input.deducible,
            notas: input.notas,
          },
          tenantId
        );
        createToast('Gasto operativo actualizado', 'success');
      } else {
        await registrarGastoDetallado({
          ...input,
          negocioId: tenantId,
          responsableRol: usuarioNegocio?.rol,
        });
        createToast('Gasto operativo registrado', 'success');
      }
      setModalOpen(false);
      setGastoEditando(null);
      await cargarDatos();
    } catch (err) {
      console.error('Error guardando gasto:', err);
      createToast('Error al guardar el gasto operativo', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarGasto = async (gasto: Gasto) => {
    if (!window.confirm(`¿Eliminar el gasto "${gasto.concepto}" por ${formatCOP(gasto.monto)}?`)) {
      return;
    }
    try {
      await eliminarGasto(gasto.id, tenantId);
      createToast('Gasto eliminado', 'success');
      await cargarDatos();
    } catch (err) {
      console.error('Error eliminando gasto:', err);
      createToast('Error al eliminar el gasto', 'error');
    }
  };

  const handleCompartirWhatsApp = () => {
    const etiquetaPeriodo =
      RANGOS_FECHA.find((r) => r.value === rango)?.label || 'Período';
    const texto = generarResumenGastosWhatsApp(
      resumen,
      negocioActual.nombre || 'La Parada',
      etiquetaPeriodo
    );
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  };

  if (loadError && !loading) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900">
          <EmptyState
            icon={AlertCircle}
            title="No pudimos cargar los gastos operativos"
            description="No mostramos un total de $0 porque la consulta falló. Reintenta para ver los datos reales."
            action={{ label: 'Reintentar', onClick: cargarDatos }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
              Gastos Operativos &amp; Caja Menor
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              Control por categorías (Servicios Públicos, Arriendo, Aseo, Mantenimiento, Transporte) conciliado con P&amp;L y Cierre de Turno
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                descargarGastosOperativosCsv(
                  gastosFiltrados,
                  negocioActual.nombre || 'La Parada',
                  rango
                )
              }
              disabled={gastosFiltrados.length === 0}
              className="min-h-[44px] text-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              Exportar CSV
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleCompartirWhatsApp}
              disabled={gastosFiltrados.length === 0}
              className="min-h-[44px] text-xs flex items-center gap-1.5"
            >
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              WhatsApp
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setGastoEditando(null);
                setModalOpen(true);
              }}
              className="min-h-[44px] text-xs flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Registrar Gasto
            </Button>
          </div>
        </div>

        {/* 4 KPIs Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4 bg-neutral-900/90 border-neutral-800">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Total Gastos (OPEX)
            </p>
            <p className="mt-2 text-2xl font-bold text-red-400 font-display">
              {formatCOP(resumen.totalGastos)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {resumen.cantidadGastos} registro{resumen.cantidadGastos !== 1 ? 's' : ''} · Promedio {formatCOP(resumen.gastoPromedio)}
            </p>
          </Card>

          <Card className="p-4 bg-neutral-900/90 border-neutral-800">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Descontado de Caja Turno
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-400 font-display">
              {formatCOP(resumen.totalCajaTurno)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              Resta del efectivo esperado en arqueo
            </p>
          </Card>

          <Card className="p-4 bg-neutral-900/90 border-neutral-800">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Fondo Caja Menor
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-400 font-display">
              {formatCOP(resumen.totalCajaMenor)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              Disponible: {formatCOP(resumenCajaMenor.saldoDisponibleCOP)}
            </p>
          </Card>

          <Card className="p-4 bg-neutral-900/90 border-neutral-800">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Banco / Externo
            </p>
            <p className="mt-2 text-2xl font-bold text-sky-400 font-display">
              {formatCOP(resumen.totalBancoTransferencia + resumen.totalEfectivoExterno)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              Deducibles: {formatCOP(resumen.totalDeducible)}
            </p>
          </Card>
        </div>

        {/* Panel de Caja Menor + Desglose por Categorías */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5">
            <ControlCajaMenorCard
              resumen={resumenCajaMenor}
              onActualizarFondo={handleActualizarFondoCajaMenor}
              onRegistrarDesdeCajaMenor={() => {
                setGastoEditando(null);
                setModalOpen(true);
              }}
            />
          </div>

          <Card className="lg:col-span-7 p-4 sm:p-5 bg-neutral-900/90 border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gold-400" />
                <h3 className="text-sm font-bold text-white font-display">
                  Distribución por Categoría Operativa
                </h3>
              </div>
              <span className="text-[11px] text-neutral-400">
                {resumen.desgloseCategorias.length} categoría{resumen.desgloseCategorias.length !== 1 ? 's' : ''} activa{resumen.desgloseCategorias.length !== 1 ? 's' : ''}
              </span>
            </div>

            {resumen.desgloseCategorias.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-500">
                Sin gastos en el período seleccionado para graficar por categoría.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {resumen.desgloseCategorias.map((item) => {
                  const meta = getCategoriaGastoMeta(item.categoria);
                  return (
                    <div key={item.categoria} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{item.etiqueta}</span>
                          <span className="text-[10px] text-neutral-500">
                            ({item.cantidad} reg · {item.tipoCosto === 'fijo' ? 'Fijo' : 'Variable'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-200 font-display">
                            {formatCOP(item.monto)}
                          </span>
                          <span className="w-11 text-right text-[11px] text-neutral-400">
                            {item.porcentaje}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className={`h-full rounded-full ${meta.barClass}`}
                          style={{ width: `${Math.min(100, item.porcentaje)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Barra de Filtros Táctiles */}
        <Card className="p-4 bg-neutral-900/80 border-neutral-800 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Rango temporal */}
            <div className="flex flex-wrap items-center gap-1.5">
              {RANGOS_FECHA.map((item) => {
                const active = rango === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setRango(item.value)}
                    className={`min-h-[44px] rounded-xl px-3.5 text-xs font-semibold transition-all ${
                      active
                        ? 'bg-gold-400 text-black'
                        : 'bg-neutral-950 text-neutral-300 border border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Buscador */}
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar concepto, proveedor, factura..."
                aria-label="Buscar gastos operativos"
                className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Filtros por Origen del Fondo */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-neutral-800/80">
            <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1 mr-1">
              <Wallet className="h-3.5 w-3.5" />
              Origen:
            </span>
            <button
              type="button"
              aria-pressed={origenFiltro === 'todos'}
              onClick={() => setOrigenFiltro('todos')}
              className={`min-h-[36px] rounded-lg px-2.5 text-[11px] font-semibold transition-all ${
                origenFiltro === 'todos'
                  ? 'bg-neutral-200 text-black'
                  : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
              }`}
            >
              Todos
            </button>
            {ORIGENES_FONDO_GASTO_META.map((item) => {
              const active = origenFiltro === item.origen;
              return (
                <button
                  key={item.origen}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setOrigenFiltro(item.origen)}
                  className={`min-h-[36px] rounded-lg px-2.5 text-[11px] font-semibold transition-all ${
                    active
                      ? 'bg-amber-400 text-black'
                      : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  {item.etiquetaCorta}
                </button>
              );
            })}
          </div>

          {/* Pills de Categorías */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1 mr-1">
              <Filter className="h-3.5 w-3.5" />
              Categoría:
            </span>
            <button
              type="button"
              aria-pressed={categoriaFiltro === 'todas'}
              onClick={() => setCategoriaFiltro('todas')}
              className={`min-h-[36px] rounded-lg px-2.5 text-[11px] font-semibold transition-all ${
                categoriaFiltro === 'todas'
                  ? 'bg-gold-400 text-black'
                  : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
              }`}
            >
              Todas
            </button>
            {CATEGORIAS_GASTO_META.map((cat) => {
              const active = categoriaFiltro === cat.categoria;
              return (
                <button
                  key={cat.categoria}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategoriaFiltro(cat.categoria)}
                  className={`min-h-[36px] rounded-lg px-2.5 text-[11px] font-semibold transition-all ${
                    active
                      ? 'bg-gold-400 text-black'
                      : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  {cat.etiqueta}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Listado de Gastos */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : gastosFiltrados.length === 0 ? (
          <Card className="p-8 bg-neutral-900/70 border-neutral-800">
            <EmptyState
              icon={Receipt}
              title="Sin gastos registrados con estos filtros"
              description="Registra gastos de servicios públicos, arriendo, aseo, mantenimiento o transporte para conciliar tu P&L y cierre de turno."
              action={{
                label: 'Registrar Primer Gasto',
                onClick: () => {
                  setGastoEditando(null);
                  setModalOpen(true);
                },
              }}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gastosFiltrados.map((gasto) => {
              const catMeta = getCategoriaGastoMeta(gasto.categoria);
              const origenMeta = getOrigenFondoGastoMeta(gasto.origenFondo);
              const fecha = toValidAdminDate(gasto.fecha);
              const fechaStr = fecha ? fecha.toLocaleDateString('es-CO') : 'Sin fecha';
              const horaStr = fecha ? formatHora(fecha) : '--:--';

              return (
                <Card
                  key={gasto.id}
                  className="p-4 bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">
                          {gasto.concepto}
                        </h3>
                        <p className="text-[11px] text-neutral-400">
                          {fechaStr} · {horaStr}
                          {gasto.proveedorNombre ? ` · ${gasto.proveedorNombre}` : ''}
                        </p>
                      </div>
                      <span className="font-display font-black text-base text-red-400 shrink-0">
                        -{formatCOP(gasto.monto)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${catMeta.badgeClass}`}
                      >
                        {catMeta.etiqueta}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${origenMeta.badgeClass}`}
                      >
                        {origenMeta.etiquetaCorta}
                      </span>
                      {gasto.deducible && (
                        <Badge variant="disponible" className="text-[10px]">
                          Deducible
                        </Badge>
                      )}
                    </div>

                    {(gasto.numeroComprobante || gasto.responsableNombre || gasto.notas) && (
                      <div className="rounded-lg bg-neutral-950/60 border border-neutral-800/70 p-2 text-[11px] text-neutral-400 space-y-0.5">
                        {gasto.numeroComprobante && (
                          <p>
                            Comprobante:{' '}
                            <span className="text-neutral-200 font-mono">
                              {gasto.numeroComprobante}
                            </span>
                          </p>
                        )}
                        {gasto.responsableNombre && (
                          <p>Responsable: {gasto.responsableNombre}</p>
                        )}
                        {gasto.notas && <p className="italic text-neutral-500">{gasto.notas}</p>}
                      </div>
                    )}
                  </div>

                  {puedeAdministrar && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800/80">
                      <button
                        type="button"
                        aria-label={`Editar gasto ${gasto.concepto}`}
                        onClick={() => {
                          setGastoEditando(gasto);
                          setModalOpen(true);
                        }}
                        className="flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        aria-label={`Eliminar gasto ${gasto.concepto}`}
                        onClick={() => handleEliminarGasto(gasto)}
                        className="flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-xs font-medium text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <RegistrarGastoModal
        isOpen={modalOpen}
        onClose={() => {
          if (!guardando) {
            setModalOpen(false);
            setGastoEditando(null);
          }
        }}
        onSubmit={handleGuardarGasto}
        gastoEditando={gastoEditando}
        responsableDefault={responsableDefault}
        guardando={guardando}
      />
    </div>
  );
}
