import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  CircleDollarSign,
  Crown,
  Download,
  Receipt,
  Search,
  TrendingUp,
  UserCheck,
  Users,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react';
import { useMeseros, type FiltroPeriodoMeseros } from '@/hooks/useMeseros';
import type { DesempenoMesero } from '@/types/mesero';
import type { Mesa } from '@/types/mesa';
import { formatCOP } from '@/utils/formatCOP';
import { MeseroCard } from '@/components/meseros/MeseroCard';
import { LiquidarMeseroModal } from '@/components/meseros/LiquidarMeseroModal';
import { ConfigurarComisionesModal } from '@/components/meseros/ConfigurarComisionesModal';
import { ReasignarMeseroModal } from '@/components/meseros/ReasignarMeseroModal';

type TabMeseros = 'rendimiento' | 'mesas_activas' | 'liquidaciones';

export function MeserosPage() {
  const {
    negocioNombre,
    cargando,
    mesas,
    desempenos,
    resumenSalon,
    liquidaciones,
    meserosOpciones,
    filtroPeriodo,
    setFiltroPeriodo,
    busqueda,
    setBusqueda,
    rangoFechas,
    guardarConfiguracion,
    liquidarMesero,
    reasignarMesa,
    exportarCsv,
  } = useMeseros();

  const [tabActiva, setTabActiva] = useState<TabMeseros>('rendimiento');

  // Estados de Modales
  const [meseroALiquidar, setMeseroALiquidar] = useState<DesempenoMesero | null>(null);
  const [meseroAConfigurar, setMeseroAConfigurar] = useState<DesempenoMesero | null>(null);
  const [mesaAReasignar, setMesaAReasignar] = useState<Mesa | null>(null);

  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [notificacionExito, setNotificacionExito] = useState<string | null>(null);

  const mostrarExito = (msg: string) => {
    setNotificacionExito(msg);
    setTimeout(() => setNotificacionExito(null), 4000);
  };

  const handleConfirmarLiquidacion = async (input: Parameters<typeof liquidarMesero>[0]) => {
    setProcesandoAccion(true);
    try {
      await liquidarMesero(input);
      mostrarExito(`Liquidación registrada con éxito para ${input.meseroNombre}.`);
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleConfirmarConfiguracion = async (input: Parameters<typeof guardarConfiguracion>[0]) => {
    setProcesandoAccion(true);
    try {
      await guardarConfiguracion(input);
      mostrarExito(`Incentivos actualizados para ${input.nombre}.`);
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleConfirmarReasignacion = async (
    mesaId: string,
    mesero: { id?: string; nombre: string }
  ) => {
    setProcesandoAccion(true);
    try {
      await reasignarMesa(mesaId, mesero);
      mostrarExito(`Mesa reasignada a ${mesero.nombre}.`);
    } finally {
      setProcesandoAccion(false);
    }
  };

  const mesasEnServicio = mesas.filter(
    (m) => m.estado === 'ocupada' || m.estado === 'por_cobrar'
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Banner de Éxito Flotante */}
      {notificacionExito && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-emerald-500/90 text-neutral-950 font-bold px-5 py-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-5 w-5" />
          <span>{notificacionExito}</span>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-400">
              Salón & Operaciones
            </span>
            <span className="text-xs text-neutral-400">· {rangoFechas.label}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
            Gestión de Meseros y Salón
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Monitorea el desempeño operativo de tus colaboradores, incentiva con comisiones sobre ventas y liquida propinas de forma transparente.
          </p>
        </div>

        {/* Acciones Superiores */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={exportarCsv}
            disabled={desempenos.length === 0}
            className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-bold text-neutral-200 hover:border-neutral-700 hover:bg-neutral-800 hover:text-white transition-all disabled:opacity-40"
          >
            <Download className="h-4 w-4 text-amber-400" />
            <span>Exportar CSV</span>
          </button>

          <Link
            to="/mesas"
            className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2 text-xs font-black text-neutral-950 shadow-md hover:brightness-110 transition-all active:scale-95"
          >
            <Utensils className="h-4 w-4" />
            <span>Ir a Salón / Mesas</span>
          </Link>
        </div>
      </div>

      {/* Selector de Período y Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['hoy', 'semana', 'mes', 'todos'] as FiltroPeriodoMeseros[]).map((periodo) => (
            <button
              key={periodo}
              type="button"
              onClick={() => setFiltroPeriodo(periodo)}
              aria-pressed={filtroPeriodo === periodo}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                filtroPeriodo === periodo
                  ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              {periodo === 'hoy'
                ? 'Hoy'
                : periodo === 'semana'
                ? 'Semana'
                : periodo === 'mes'
                ? 'Mes'
                : 'Histórico'}
            </button>
          ))}
        </div>

        {/* Buscador de Mesero */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por mesero o mesa..."
            className="w-full min-h-[44px] rounded-2xl border border-neutral-800 bg-neutral-900/90 py-2 pl-9 pr-4 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {/* 4 KPIs Ejecutivos de Salón */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">Ventas Salón</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="font-display text-xl sm:text-2xl font-black text-white">
            {formatCOP(resumenSalon.totalVentasSalon)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {rangoFechas.label}
          </p>
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">Ticket Promedio</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="font-display text-xl sm:text-2xl font-black text-white">
            {formatCOP(resumenSalon.ticketPromedioSalon)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Por comanda atendida</p>
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">Propinas Salón</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <CircleDollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="font-display text-xl sm:text-2xl font-black text-emerald-400">
            {formatCOP(resumenSalon.totalPropinasSalon)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Voluntarias del equipo</p>
        </div>

        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-neutral-900 p-4 sm:p-5 shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
            <span className="font-black uppercase tracking-wider">Mesero Estrella</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
              <Crown className="h-4 w-4" />
            </div>
          </div>
          <p className="font-display text-lg sm:text-xl font-black text-white truncate">
            {resumenSalon.meseroEstrella ? resumenSalon.meseroEstrella.meseroNombre : 'Por definir'}
          </p>
          <p className="text-[11px] text-amber-400/80 mt-0.5 font-bold">
            {resumenSalon.meseroEstrella
              ? `${formatCOP(resumenSalon.meseroEstrella.totalVentas)} facturados`
              : 'Sin ventas registradas'}
          </p>
        </div>
      </div>

      {/* Pestañas de Vista */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
        <button
          type="button"
          onClick={() => setTabActiva('rendimiento')}
          aria-pressed={tabActiva === 'rendimiento'}
          className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            tabActiva === 'rendimiento'
              ? 'bg-neutral-800 text-white font-black border border-neutral-700 shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Award className="h-4 w-4 text-amber-400" />
          <span>Rendimiento y Ranking ({desempenos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('mesas_activas')}
          aria-pressed={tabActiva === 'mesas_activas'}
          className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            tabActiva === 'mesas_activas'
              ? 'bg-neutral-800 text-white font-black border border-neutral-700 shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <UtensilsCrossed className="h-4 w-4 text-sky-400" />
          <span>Mesas en Salón ({mesasEnServicio.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('liquidaciones')}
          aria-pressed={tabActiva === 'liquidaciones'}
          className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            tabActiva === 'liquidaciones'
              ? 'bg-neutral-800 text-white font-black border border-neutral-700 shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <UserCheck className="h-4 w-4 text-emerald-400" />
          <span>Historial Liquidaciones ({liquidaciones.length})</span>
        </button>
      </div>

      {/* Contenido según Pestaña */}
      {tabActiva === 'rendimiento' && (
        <div>
          {cargando ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent mb-3" />
              <p className="text-xs text-neutral-400">Calculando desempeño de meseros en salón...</p>
            </div>
          ) : desempenos.length === 0 ? (
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-neutral-600 mb-3" />
              <h3 className="font-display text-lg font-bold text-white">
                No hay meseros con ventas en este período
              </h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1 mb-5">
                Al abrir mesas y comandas en el salón (`/mesas`) asigna el nombre del mesero para que sus ventas, ticket promedio y propinas se computen en tiempo real.
              </p>
              <Link
                to="/mesas"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-black text-neutral-950 shadow-md hover:brightness-110"
              >
                <Utensils className="h-4 w-4" />
                <span>Ir al Modo Mesas</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {desempenos.map((d) => (
                <MeseroCard
                  key={d.meseroId}
                  desempeno={d}
                  negocioNombre={negocioNombre}
                  periodoTexto={rangoFechas.label}
                  onLiquidar={(item) => setMeseroALiquidar(item)}
                  onConfigurar={(item) => setMeseroAConfigurar(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tabActiva === 'mesas_activas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
              Mesas con Cuenta Abierta en Salón
            </h3>
            <span className="text-xs text-neutral-400">
              {mesasEnServicio.length} de {mesas.length} mesas ocupadas
            </span>
          </div>

          {mesasEnServicio.length === 0 ? (
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
              <UtensilsCrossed className="mx-auto h-12 w-12 text-neutral-600 mb-3" />
              <h3 className="font-display text-lg font-bold text-white">
                Todas las mesas se encuentran libres
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                Cuando abras una cuenta en `/mesas`, podrás ver aquí la asignación de meseros en vivo y reasignarlos con un clic.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mesasEnServicio.map((mesa) => (
                <div
                  key={mesa.id}
                  className="rounded-3xl border border-neutral-800 bg-neutral-900/90 p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">
                          {mesa.zona}
                        </span>
                        <h4 className="font-display text-lg font-black text-white">
                          {mesa.nombre}
                        </h4>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          mesa.estado === 'por_cobrar'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {mesa.estado === 'por_cobrar' ? 'Por Cobrar' : 'Ocupada'}
                      </span>
                    </div>

                    <div className="mt-3 rounded-2xl bg-neutral-950 p-3 border border-neutral-800/80">
                      <span className="text-[11px] text-neutral-400 block mb-0.5">
                        Mesero Asignado:
                      </span>
                      <p className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>{mesa.meseroNombre || mesa.mesero || 'Sin asignar'}</span>
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-neutral-400 px-1">
                      <span>Consumo Actual:</span>
                      <span className="font-bold text-white font-display text-sm">
                        {formatCOP(mesa.totalActual || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMesaAReasignar(mesa)}
                      className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs font-bold text-white hover:bg-neutral-700 transition-colors"
                    >
                      <Users className="h-4 w-4 text-amber-400" />
                      <span>Cambiar Mesero</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tabActiva === 'liquidaciones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
              Historial de Pagos de Propinas e Incentivos
            </h3>
            <span className="text-xs text-neutral-400">
              {liquidaciones.length} liquidaciones emitidas
            </span>
          </div>

          {liquidaciones.length === 0 ? (
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
              <Receipt className="mx-auto h-12 w-12 text-neutral-600 mb-3" />
              <h3 className="font-display text-lg font-bold text-white">
                No hay liquidaciones registradas aún
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                Cuando liquidez las propinas o comisiones de un mesero, el comprobante inmutable se archivará en esta sección.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {liquidaciones.map((liq) => {
                const fechaDate = liq.fecha?.toDate ? liq.fecha.toDate() : new Date();
                return (
                  <div
                    key={liq.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-bold text-white text-sm">
                            {liq.meseroNombre}
                          </h4>
                          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-300 uppercase">
                            {liq.metodoPago}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">
                          {fechaDate.toLocaleDateString('es-CO', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {liq.notas && ` · ${liq.notas}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-neutral-800 pt-2 sm:pt-0">
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                          Total Liquidado
                        </span>
                        <p className="font-display font-black text-emerald-400 text-base">
                          {formatCOP(liq.totalLiquidado)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <LiquidarMeseroModal
        isOpen={Boolean(meseroALiquidar)}
        desempeno={meseroALiquidar}
        periodoTexto={rangoFechas.label}
        onClose={() => setMeseroALiquidar(null)}
        onConfirmarLiquidacion={handleConfirmarLiquidacion}
        cargando={procesandoAccion}
      />

      <ConfigurarComisionesModal
        isOpen={Boolean(meseroAConfigurar)}
        desempeno={meseroAConfigurar}
        onClose={() => setMeseroAConfigurar(null)}
        onGuardar={handleConfirmarConfiguracion}
        cargando={procesandoAccion}
      />

      <ReasignarMeseroModal
        isOpen={Boolean(mesaAReasignar)}
        mesa={mesaAReasignar}
        meserosDisponibles={meserosOpciones}
        onClose={() => setMesaAReasignar(null)}
        onConfirmarReasignacion={handleConfirmarReasignacion}
        cargando={procesandoAccion}
      />
    </div>
  );
}
