// src/pages/ClientesPage.tsx
import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Sparkles,
  Gift,
  AlertTriangle,
  Download,
  RefreshCw,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useClientes } from '@/hooks/useClientes';
import type { Cliente, NuevoClienteInput } from '@/types';
import { ClienteCard } from '@/components/clientes/ClienteCard';
import { NuevoClienteModal } from '@/components/clientes/NuevoClienteModal';
import { EditarClienteModal } from '@/components/clientes/EditarClienteModal';
import { ClienteDetalleModal } from '@/components/clientes/ClienteDetalleModal';
import { CampanaWhatsAppModal } from '@/components/clientes/CampanaWhatsAppModal';
import {
  calcularKpisFidelizacion,
  evaluarEstadoRiesgoCliente,
  evaluarNivelFidelizacion,
  exportarCampanaClientesCsv,
} from '@/utils/fidelizacionUtils';
import { createToast } from '@/components/ui/Toast';

type FiltroTab = 'todos' | 'vip' | 'en_riesgo' | 'recompensas' | 'inactivos' | 'con_direccion';

export function ClientesPage() {
  const { negocioActual } = useNegocio();
  const {
    clientes,
    loading,
    error,
    buscarClientes,
    crearCliente,
    actualizarCliente,
    eliminarCliente,
    canjearRecompensa,
    ajustarSellos,
  } = useClientes(negocioActual.id);

  const [busqueda, setBusqueda] = useState('');
  const [tabActivo, setTabActivo] = useState<FiltroTab>('todos');

  // Modales
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState<Cliente | null>(null);
  const [clienteADetalle, setClienteADetalle] = useState<Cliente | null>(null);
  const [clienteACampana, setClienteACampana] = useState<Cliente | null>(null);
  const [guardando, setGuardando] = useState(false);

  // KPIs globales de Fidelización y Retención
  const kpis = useMemo(() => calcularKpisFidelizacion(clientes), [clientes]);

  // Filtrado reactivo combinado: búsqueda de texto + pestañas
  const clientesFiltrados = useMemo(() => {
    let base = buscarClientes(busqueda);
    if (tabActivo === 'vip') {
      base = base.filter((c) => evaluarNivelFidelizacion(c).nivel !== 'bronce');
    } else if (tabActivo === 'en_riesgo') {
      base = base.filter((c) => evaluarEstadoRiesgoCliente(c).estado === 'en_riesgo');
    } else if (tabActivo === 'recompensas') {
      base = base.filter((c) => (c.recompensasDisponibles || 0) > 0);
    } else if (tabActivo === 'inactivos') {
      base = base.filter((c) => evaluarEstadoRiesgoCliente(c).estado === 'inactivo');
    } else if (tabActivo === 'con_direccion') {
      base = base.filter((c) => c.direcciones.length > 0);
    }
    return base;
  }, [buscarClientes, busqueda, tabActivo]);

  const handleCrearCliente = async (datos: NuevoClienteInput) => {
    setGuardando(true);
    try {
      const nuevo = await crearCliente(datos);
      createToast(`¡Cliente ${nuevo.nombre} registrado con éxito!`, 'success');
      setModalNuevoOpen(false);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al registrar el cliente';
      createToast(mensaje, 'error');
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  const handleActualizarCliente = async (clienteId: string, updates: Partial<Cliente>) => {
    setGuardando(true);
    try {
      await actualizarCliente(clienteId, updates);
      createToast('Cliente actualizado correctamente', 'success');
      setClienteAEditar(null);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al actualizar el cliente';
      createToast(mensaje, 'error');
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCliente = async (cliente: Cliente) => {
    const confirmado = window.confirm(
      `¿Estás seguro de eliminar a ${cliente.nombre} del directorio? Su historial de ventas en el sistema no se borrará.`
    );
    if (!confirmado) return;

    try {
      await eliminarCliente(cliente.id);
      createToast(`Cliente ${cliente.nombre} eliminado`, 'info');
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al eliminar cliente';
      createToast(mensaje, 'error');
    }
  };

  const handleCanjearRecompensa = async (clienteId: string) => {
    try {
      const res = await canjearRecompensa(clienteId);
      createToast('¡Recompensa canjeada con éxito! Puedes aplicar la cortesía o descuento', 'success');
      if (clienteADetalle && clienteADetalle.id === clienteId) {
        setClienteADetalle({
          ...clienteADetalle,
          recompensasDisponibles: res.recompensasDisponibles,
          recompensasRedimidas: res.recompensasRedimidas,
        });
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al canjear recompensa';
      createToast(mensaje, 'error');
    }
  };

  const handleAjustarSellos = async (clienteId: string, delta: number) => {
    try {
      const res = await ajustarSellos(clienteId, delta);
      createToast(
        delta > 0
          ? `+${delta} sello(s) añadido(s) con éxito`
          : `${delta} sello(s) ajustado(s)`,
        'success'
      );
      if (clienteADetalle && clienteADetalle.id === clienteId) {
        setClienteADetalle({
          ...clienteADetalle,
          sellosActuales: res.sellosActuales,
          recompensasDisponibles: res.recompensasDisponibles,
        });
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al ajustar sellos';
      createToast(mensaje, 'error');
    }
  };

  const handleExportarCsvCampana = () => {
    if (clientesFiltrados.length === 0) {
      createToast('No hay clientes en el filtro actual para exportar', 'info');
      return;
    }
    const csvContent = exportarCampanaClientesCsv(clientesFiltrados, tabActivo);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `campana_clientes_${tabActivo}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    createToast(`Archivo CSV de campaña (${clientesFiltrados.length} clientes) descargado`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gold-400/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-gold-400 border border-gold-400/30">
              {negocioActual.nombre || 'La Parada'}
            </span>
            <span className="rounded-full bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              VIP & Fidelización
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white mt-1">
            Directorio de Clientes & Fidelización VIP
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Tarjetas de sellos, prevención de fuga de clientes y campañas directas por WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportarCsvCampana}
            className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-3.5 py-2.5 text-xs font-bold text-neutral-200 transition-colors"
            title="Exportar segmento a Excel CSV para WhatsApp Masivo"
          >
            <Download className="h-4 w-4 text-gold-400" aria-hidden="true" />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => setModalNuevoOpen(true)}
            className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-gold-400 hover:bg-gold-500 px-4 py-2.5 text-xs font-bold text-base-dark transition-all shadow-lg shadow-gold-400/10 active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Fidelización y Retención */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Clientes & Tasa Retención */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Clientes</span>
            <Users className="h-4 w-4 text-gold-400" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-black text-white">{kpis.totalClientes}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mt-1">
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>{kpis.tasaRetencion}% retención activa</span>
          </div>
        </div>

        {/* Clientes VIP / Leyendas */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Clientes VIP</span>
            <Sparkles className="h-4 w-4 text-gold-400" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-black text-gold-400">{kpis.clientesVip}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Plata, Oro y Diamante</p>
        </div>

        {/* Clientes En Riesgo (15-30 días sin comprar) */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">En Riesgo de Fuga</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-black text-amber-400">{kpis.clientesEnRiesgo}</p>
          <p className="text-[11px] text-neutral-400 mt-1">15 a 30 días sin ordenar</p>
        </div>

        {/* Recompensas Disponibles para Canjear */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Recompensas Listas</span>
            <Gift className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-black text-emerald-400 truncate">
            {kpis.recompensasDisponiblesTotal}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            {kpis.recompensasRedimidasTotal} canjeadas en total
          </p>
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Pestañas Segmentadas */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 sm:p-4">
        {/* Input de Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" aria-hidden="true" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono, barrio o dirección..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
          />
        </div>

        {/* Pestañas de Filtro */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tabActivo === 'todos'}
            onClick={() => setTabActivo('todos')}
            className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              tabActivo === 'todos'
                ? 'bg-gold-400 text-base-dark'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            Todos ({clientes.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tabActivo === 'vip'}
            onClick={() => setTabActivo('vip')}
            className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              tabActivo === 'vip'
                ? 'bg-gold-400 text-base-dark'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            VIP ({kpis.clientesVip})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tabActivo === 'en_riesgo'}
            onClick={() => setTabActivo('en_riesgo')}
            className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              tabActivo === 'en_riesgo'
                ? 'bg-amber-500 text-base-dark font-bold'
                : 'bg-neutral-800 text-amber-300 hover:bg-neutral-700'
            }`}
          >
            En Riesgo ({kpis.clientesEnRiesgo})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tabActivo === 'recompensas'}
            onClick={() => setTabActivo('recompensas')}
            className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              tabActivo === 'recompensas'
                ? 'bg-emerald-500 text-base-dark font-bold'
                : 'bg-neutral-800 text-emerald-300 hover:bg-neutral-700'
            }`}
          >
            Con Premio ({kpis.recompensasDisponiblesTotal})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tabActivo === 'inactivos'}
            onClick={() => setTabActivo('inactivos')}
            className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              tabActivo === 'inactivos'
                ? 'bg-rose-500 text-white font-bold'
                : 'bg-neutral-800 text-rose-300 hover:bg-neutral-700'
            }`}
          >
            Inactivos ({kpis.clientesInactivos})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tabActivo === 'con_direccion'}
            onClick={() => setTabActivo('con_direccion')}
            className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              tabActivo === 'con_direccion'
                ? 'bg-gold-400 text-base-dark'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            Con Domicilio
          </button>
        </div>
      </div>

      {/* Contenido: Listado de Clientes o Estados Vacíos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <div className="animate-spin h-8 w-8 border-4 border-gold-400 border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-semibold">Cargando directorio de clientes...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-8 text-center text-red-400">
          <p className="text-sm font-bold mb-2">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-800 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      ) : clientesFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientesFiltrados.map((cliente) => (
            <ClienteCard
              key={cliente.id}
              cliente={cliente}
              onVerDetalle={(c) => setClienteADetalle(c)}
              onEditar={(c) => setClienteAEditar(c)}
              onEliminar={handleEliminarCliente}
              onLanzarCampana={(c) => setClienteACampana(c)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-neutral-800 text-neutral-400">
            <UserCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="font-display text-base font-bold text-white">
            {busqueda
              ? 'No se encontraron clientes'
              : tabActivo !== 'todos'
                ? `No hay clientes en la categoría "${tabActivo}"`
                : 'Aún no hay clientes registrados'}
          </h3>
          <p className="mt-1 text-xs text-neutral-400 max-w-sm mx-auto">
            {busqueda
              ? `No hay clientes que coincidan con "${busqueda}". Intenta con otro término o limpia los filtros.`
              : tabActivo !== 'todos'
                ? 'Todos tus clientes están al día o no cumplen con los criterios de este segmento.'
                : 'Los clientes se registrarán automáticamente al vender en POS, Domicilios o WhatsApp, o puedes registrar uno manualmente.'}
          </p>
          {busqueda || tabActivo !== 'todos' ? (
            <button
              type="button"
              onClick={() => {
                setBusqueda('');
                setTabActivo('todos');
              }}
              className="mt-4 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 transition-colors"
            >
              Ver todos los clientes
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModalNuevoOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold-400 hover:bg-gold-500 px-4 py-2 text-xs font-bold text-base-dark transition-all"
            >
              <UserPlus className="h-4 w-4" />
              Registrar primer cliente
            </button>
          )}
        </div>
      )}

      {/* Modales */}
      <NuevoClienteModal
        isOpen={modalNuevoOpen}
        onClose={() => setModalNuevoOpen(false)}
        onSubmit={handleCrearCliente}
        cargando={guardando}
      />

      <EditarClienteModal
        cliente={clienteAEditar}
        isOpen={Boolean(clienteAEditar)}
        onClose={() => setClienteAEditar(null)}
        onSubmit={handleActualizarCliente}
        cargando={guardando}
      />

      <ClienteDetalleModal
        cliente={clienteADetalle}
        negocioId={negocioActual.id}
        isOpen={Boolean(clienteADetalle)}
        onClose={() => setClienteADetalle(null)}
        onEditar={(c) => {
          setClienteADetalle(null);
          setClienteAEditar(c);
        }}
        onCanjearRecompensa={handleCanjearRecompensa}
        onAjustarSellos={handleAjustarSellos}
        onLanzarCampana={(c) => {
          setClienteADetalle(null);
          setClienteACampana(c);
        }}
      />

      <CampanaWhatsAppModal
        cliente={clienteACampana}
        isOpen={Boolean(clienteACampana)}
        onClose={() => setClienteACampana(null)}
        nombreNegocio={negocioActual.nombre || 'La Parada'}
      />
    </div>
  );
}
