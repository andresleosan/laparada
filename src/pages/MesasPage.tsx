import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  DollarSign,
  Hourglass,
  LayoutGrid,
  Plus,
  QrCode,
  Search,
  Sparkles,
  Utensils,
  Wand2,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useProductos } from '@/hooks/useProductos';
import { useMesas } from '@/hooks/useMesas';
import { useMeseros } from '@/hooks/useMeseros';
import { useListaEspera } from '@/hooks/useListaEspera';
import type { EstadoMesa, Mesa } from '@/types/mesa';
import type { TurnoEspera } from '@/types/espera';
import type { TicketVentaData } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { filtrarMesasCompatibles } from '@/utils/esperaUtils';
import { MesaCard } from '@/components/mesas/MesaCard';
import { AbrirMesaModal } from '@/components/mesas/AbrirMesaModal';
import { DetalleMesaModal } from '@/components/mesas/DetalleMesaModal';
import { NuevaMesaModal } from '@/components/mesas/NuevaMesaModal';
import { TicketVentaModal } from '@/components/pos/TicketVentaModal';
import { MesaQrModal } from '@/components/mesas/MesaQrModal';
import { AsignarMesaEsperaModal } from '@/components/espera/AsignarMesaEsperaModal';
import { despejarLlamadoMesa } from '@/services/mesasService';

export function MesasPage() {
  const { negocioActual } = useNegocio();
  const { productos, combos } = useProductos();
  const {
    mesas,
    mesasFiltradas,
    loading,
    error,
    zonasDisponibles,
    filtroEstado,
    setFiltroEstado,
    filtroZona,
    setFiltroZona,
    busqueda,
    setBusqueda,
    totalMesas,
    totalLibres,
    totalOcupadas,
    totalPorCobrar,
    totalVentasAbiertas,
    mesaSeleccionada,
    seleccionarMesa,
    cuentaActiva,
    cargandoCuenta,
    abrirMesaAction,
    agregarRondaAction,
    precerrarMesaAction,
    cobrarMesaAction,
    registrarPagoParcialAction,
    cancelarCuentaAction,
    transferirMesaAction,
    unirMesasAction,
    crearMesaAction,
    autoInicializarMesas,
  } = useMesas(negocioActual.id);
  const { meserosOpciones, reasignarMesa } = useMeseros();
  const { turnosActivos, sentarEnMesa } = useListaEspera(negocioActual.id, mesas);

  // Estados de Modales
  const [mesaParaAbrir, setMesaParaAbrir] = useState<Mesa | null>(null);
  const [mesaParaQr, setMesaParaQr] = useState<Mesa | null>(null);
  const [turnoParaSentar, setTurnoParaSentar] = useState<TurnoEspera | null>(null);
  const [modalNuevaMesaOpen, setModalNuevaMesaOpen] = useState(false);
  const [ticketComprobante, setTicketComprobante] = useState<TicketVentaData | null>(null);
  const [modalTicketOpen, setModalTicketOpen] = useState(false);
  const [inicializandoDefaults, setInicializandoDefaults] = useState(false);

  const siguienteNumeroMesa = useMemo(() => {
    if (mesas.length === 0) return 1;
    const maxNum = Math.max(...mesas.map((m) => m.numero || 0));
    return maxNum + 1;
  }, [mesas]);

  const handleCobrarMesa = async (params: {
    mesaId: string;
    cuentaId: string;
    metodoPago: Parameters<typeof cobrarMesaAction>[0]['metodoPago'];
    propina?: number;
    descuento?: number;
    descuentoMotivo?: string;
    montoRecibido?: number;
    clienteNombre?: string;
    clienteTelefono?: string;
  }) => {
    const ticket = await cobrarMesaAction({
      ...params,
      negocioNombre: negocioActual.nombre,
      negocioSlug: negocioActual.slug,
      negocioDireccion: negocioActual.direccion,
      negocioTelefono: negocioActual.telefono,
    });
    setTicketComprobante(ticket);
    setModalTicketOpen(true);
  };

  const handlePagoParcial = async (params: {
    mesaId: string;
    cuentaId: string;
    monto: number;
    metodoPago: Parameters<typeof cobrarMesaAction>[0]['metodoPago'];
    propina?: number;
    clienteNombre?: string;
    notas?: string;
    montoRecibido?: number;
  }) => {
    const res = await registrarPagoParcialAction({
      ...params,
      negocioNombre: negocioActual.nombre,
      negocioSlug: negocioActual.slug,
      negocioDireccion: negocioActual.direccion,
      negocioTelefono: negocioActual.telefono,
    });
    setTicketComprobante(res.ticket);
    setModalTicketOpen(true);
  };

  const handleAutoInicializar = async () => {
    if (inicializandoDefaults) return;
    setInicializandoDefaults(true);
    try {
      await autoInicializarMesas();
    } finally {
      setInicializandoDefaults(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-dark p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Encabezado Principal */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Utensils className="h-5 w-5" />
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
              Modo Mesas & Salón
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400">
            Control de mesas en vivo, cuentas acumulativas, comanda a Cocina (KDS) y precierre en {negocioActual.nombre}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {mesas.length === 0 && !loading && (
            <button
              type="button"
              onClick={handleAutoInicializar}
              disabled={inicializandoDefaults}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-neutral-900 border border-amber-500/30 px-4 py-2.5 text-xs font-bold text-amber-300 hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4 text-amber-400" />
              {inicializandoDefaults ? 'Creando...' : 'Auto-crear 6 Mesas'}
            </button>
          )}

          <Link
            to="/espera"
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-2.5 text-xs font-bold text-neutral-200 hover:border-amber-400 hover:text-white transition-all"
          >
            <Hourglass className="h-4 w-4 text-amber-400" />
            <span>Lista de Espera</span>
            {turnosActivos.length > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-neutral-950">
                {turnosActivos.length}
              </span>
            )}
          </Link>

          <Link
            to="/meseros"
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-2.5 text-xs font-bold text-neutral-200 hover:border-amber-400 hover:text-white transition-all"
          >
            <Award className="h-4 w-4 text-amber-400" />
            <span>Meseros & Comisiones</span>
          </Link>

          {mesas.length > 0 && (
            <button
              type="button"
              onClick={() => setMesaParaQr(mesas[0])}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-2.5 text-xs font-bold text-neutral-200 hover:border-amber-400 hover:text-white transition-all"
            >
              <QrCode className="h-4 w-4 text-amber-400" />
              <span>QR Salón</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setModalNuevaMesaOpen(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2.5 text-sm font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Nueva Mesa
          </button>
        </div>
      </header>

      {/* Banner de asignación rápida si hay mesa libre y grupos en lista de espera */}
      {totalLibres > 0 && turnosActivos.length > 0 && (() => {
        const primerTurno = turnosActivos[0];
        const compatibles = filtrarMesasCompatibles(
          mesas,
          primerTurno.personas,
          primerTurno.zonaPreferida
        );
        if (compatibles.length === 0) return null;

        return (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-3.5">
            <div className="flex items-center gap-2.5 text-xs text-emerald-100">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <strong>{compatibles[0].nombre}</strong> está libre para{' '}
                <strong className="text-amber-400">
                  {primerTurno.codigoTurno} ({primerTurno.clienteNombre} • {primerTurno.personas} pers.)
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTurnoParaSentar(primerTurno)}
                className="min-h-[40px] rounded-xl bg-emerald-500 px-3.5 text-xs font-black text-neutral-950 hover:bg-emerald-400 transition-colors"
              >
                Sentar en Mesa
              </button>
              <Link
                to="/espera"
                className="min-h-[40px] inline-flex items-center rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs font-semibold text-neutral-200 hover:border-amber-400"
              >
                Ver cola ({turnosActivos.length})
              </Link>
            </div>
          </div>
        );
      })()}

      {/* 4 KPIs de Salón */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs uppercase font-bold tracking-wider">Total Mesas</span>
            <LayoutGrid className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 font-display text-2xl sm:text-3xl font-black text-white">
            {totalMesas}
          </div>
          <span className="text-[11px] text-neutral-500">Puntos de atención activos</span>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-4 shadow-lg">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs uppercase font-bold tracking-wider">Mesas Libres</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 font-display text-2xl sm:text-3xl font-black text-emerald-400">
            {totalLibres}
          </div>
          <span className="text-[11px] text-emerald-400/80">Listas para comensales</span>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 shadow-lg">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs uppercase font-bold tracking-wider">Ocupadas / Activas</span>
            <Utensils className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 font-display text-2xl sm:text-3xl font-black text-amber-400">
            {totalOcupadas + totalPorCobrar}
          </div>
          <span className="text-[11px] text-amber-300/80">
            {totalPorCobrar > 0 ? `${totalPorCobrar} pidiendo cuenta` : 'Consumiendo en salón'}
          </span>
        </div>

        <div className="rounded-2xl border border-gold-400/30 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-gold-400">
            <span className="text-xs uppercase font-bold tracking-wider">En Cuentas Abiertas</span>
            <DollarSign className="h-4 w-4 text-gold-400" />
          </div>
          <div className="mt-2 font-display text-2xl sm:text-3xl font-black text-amber-400 truncate">
            {formatCOP(totalVentasAbiertas)}
          </div>
          <span className="text-[11px] text-neutral-400">Consumo pendiente de cobro</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
        {/* Filtros por Estado */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'todas', label: 'Todas', count: totalMesas },
              { id: 'libre', label: 'Libres', count: totalLibres },
              { id: 'ocupada', label: 'Ocupadas', count: totalOcupadas },
              { id: 'por_cobrar', label: 'Por Cobrar', count: totalPorCobrar },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFiltroEstado(tab.id as EstadoMesa | 'todas')}
              aria-pressed={filtroEstado === tab.id}
              className={`flex items-center gap-1.5 min-h-[44px] rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                filtroEstado === tab.id
                  ? 'bg-amber-400 text-neutral-950 shadow-md font-black'
                  : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  filtroEstado === tab.id ? 'bg-neutral-950 text-amber-400' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Zona y Buscador */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {zonasDisponibles.length > 0 && (
            <div className="w-full sm:w-auto">
              <select
                value={filtroZona}
                onChange={(e) => setFiltroZona(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-bold text-neutral-200 focus:border-amber-400 focus:outline-none"
              >
                <option value="todas">Todas las Zonas</option>
                {zonasDisponibles.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar mesa o mesero..."
              className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Cuadrícula de Mesas */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin inline-block h-8 w-8 border-4 border-amber-400 border-t-transparent rounded-full mb-3" />
          <p className="text-sm text-neutral-400 font-medium">Cargando mapa de mesas...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/50 bg-red-950/20 p-6 text-center">
          <p className="text-sm text-red-300 font-semibold">{error}</p>
        </div>
      ) : mesasFiltradas.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mesasFiltradas.map((mesa) => (
            <MesaCard
              key={mesa.id}
              mesa={mesa}
              onAbrir={(m) => setMesaParaAbrir(m)}
              onVerDetalle={(m) => seleccionarMesa(m)}
              onCobrarDirecto={(m) => seleccionarMesa(m)}
              onVerQr={(m) => setMesaParaQr(m)}
              onDespejarLlamado={async (m) => {
                try {
                  await despejarLlamadoMesa(negocioActual.id, m.id);
                } catch (err) {
                  console.warn('Error al despejar llamado:', err);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-12 text-center">
          <Utensils className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">
            {mesas.length === 0 ? 'No hay mesas registradas en el local' : 'No hay mesas con los filtros seleccionados'}
          </h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mb-5">
            {mesas.length === 0
              ? 'Puedes crear las mesas de tu restaurante una por una o generar 6 mesas estándar automáticamente.'
              : 'Intenta cambiar el estado, la zona o limpiar el término de búsqueda.'}
          </p>

          {mesas.length === 0 ? (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleAutoInicializar}
                disabled={inicializandoDefaults}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2.5 text-xs font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                <Wand2 className="h-4 w-4" />
                Configurar 6 Mesas Iniciales
              </button>
              <button
                type="button"
                onClick={() => setModalNuevaMesaOpen(true)}
                className="min-h-[44px] rounded-xl bg-neutral-800 px-4 py-2.5 text-xs font-bold text-white border border-neutral-700 hover:bg-neutral-700 transition-colors"
              >
                Crear Mesa Manual
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setFiltroEstado('todas');
                setFiltroZona('todas');
                setBusqueda('');
              }}
              className="min-h-[44px] rounded-xl bg-neutral-800 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-700 transition-colors"
            >
              Restablecer Filtros
            </button>
          )}
        </div>
      )}

      {/* Modal para Abrir Mesa */}
      <AbrirMesaModal
        isOpen={Boolean(mesaParaAbrir)}
        mesa={mesaParaAbrir}
        meserosDisponibles={meserosOpciones}
        onClose={() => setMesaParaAbrir(null)}
        onSubmit={async (params) => {
          await abrirMesaAction(params.mesaId, params);
          setMesaParaAbrir(null);
        }}
      />

      {/* Modal de Detalle de Mesa y Rondas */}
      <DetalleMesaModal
        isOpen={Boolean(mesaSeleccionada)}
        mesa={mesaSeleccionada}
        cuenta={cuentaActiva}
        mesas={mesas}
        cargandoCuenta={cargandoCuenta}
        productos={productos}
        combos={combos}
        negocioNombre={negocioActual.nombre}
        onClose={() => seleccionarMesa(null)}
        onAgregarRonda={agregarRondaAction}
        onPrecerrar={precerrarMesaAction}
        onCobrar={handleCobrarMesa}
        onPagoParcial={handlePagoParcial}
        onCancelarCuenta={cancelarCuentaAction}
        onTransferirMesa={transferirMesaAction}
        onUnirMesas={unirMesasAction}
        onReasignarMesero={reasignarMesa}
        meserosDisponibles={meserosOpciones}
      />

      {/* Modal de Nueva Mesa */}
      <NuevaMesaModal
        isOpen={modalNuevaMesaOpen}
        zonasExistentes={zonasDisponibles}
        siguienteNumero={siguienteNumeroMesa}
        onClose={() => setModalNuevaMesaOpen(false)}
        onSubmit={async (data) => {
          await crearMesaAction(data);
          setModalNuevaMesaOpen(false);
        }}
      />

      {/* Modal de Comprobante Térmico / Ticket de Venta */}
      {ticketComprobante && (
        <TicketVentaModal
          isOpen={modalTicketOpen}
          ticket={ticketComprobante}
          onClose={() => setModalTicketOpen(false)}
        />
      )}

      {/* Modal de Código QR de Mesa */}
      <MesaQrModal
        isOpen={Boolean(mesaParaQr)}
        mesa={mesaParaQr}
        negocioNombre={negocioActual.nombre}
        negocioSlug={negocioActual.slug}
        onClose={() => setMesaParaQr(null)}
      />

      {/* Modal para sentar directamente a un grupo de lista de espera */}
      <AsignarMesaEsperaModal
        isOpen={Boolean(turnoParaSentar)}
        turno={turnoParaSentar}
        mesas={mesas}
        meseros={meserosOpciones}
        onClose={() => setTurnoParaSentar(null)}
        onConfirmar={async (params) => {
          await sentarEnMesa(params);
        }}
      />
    </div>
  );
}
