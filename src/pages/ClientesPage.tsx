// src/pages/ClientesPage.tsx
import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Sparkles,
  CircleDollarSign,
  Receipt,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useClientes } from '@/hooks/useClientes';
import type { Cliente, NuevoClienteInput } from '@/types';
import { ClienteCard } from '@/components/clientes/ClienteCard';
import { NuevoClienteModal } from '@/components/clientes/NuevoClienteModal';
import { EditarClienteModal } from '@/components/clientes/EditarClienteModal';
import { ClienteDetalleModal } from '@/components/clientes/ClienteDetalleModal';
import { calcularKpisClientes, esClienteFrecuente } from '@/utils/clienteUtils';
import { formatCOP } from '@/utils/formatCOP';
import { createToast } from '@/components/ui/Toast';

type FiltroTab = 'todos' | 'frecuentes' | 'con_direccion';

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
  } = useClientes(negocioActual.id);

  const [busqueda, setBusqueda] = useState('');
  const [tabActivo, setTabActivo] = useState<FiltroTab>('todos');

  // Modales
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState<Cliente | null>(null);
  const [clienteADetalle, setClienteADetalle] = useState<Cliente | null>(null);
  const [guardando, setGuardando] = useState(false);

  // KPIs globales
  const kpis = useMemo(() => calcularKpisClientes(clientes), [clientes]);

  // Filtrado reactivo combinado: búsqueda de texto + pestañas
  const clientesFiltrados = useMemo(() => {
    let base = buscarClientes(busqueda);
    if (tabActivo === 'frecuentes') {
      base = base.filter((c) => esClienteFrecuente(c));
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

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gold-400/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-gold-400 border border-gold-400/30">
              {negocioActual.nombre || 'La Parada'}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white mt-1">
            Directorio de Clientes
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Frecuencia de consumo, compras habituales y datos de contacto fidelizados por local.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalNuevoOpen(true)}
          className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-gold-400 hover:bg-gold-500 px-4 py-2.5 text-xs font-bold text-base-dark transition-all shadow-lg shadow-gold-400/10 active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Nuevo Cliente
        </button>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Clientes</span>
            <Users className="h-4 w-4 text-gold-400" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-black text-white">{kpis.totalClientes}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Registrados en el local</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Clientes VIP</span>
            <Sparkles className="h-4 w-4 text-gold-400" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-black text-gold-400">{kpis.clientesFrecuentes}</p>
          <p className="text-[11px] text-neutral-400 mt-1">≥ 3 compras completadas</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Consumo Total</span>
            <CircleDollarSign className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-black text-emerald-400 truncate">
            {formatCOP(kpis.totalConsumidoGlobal)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">Facturado a clientes</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ticket Promedio</span>
            <Receipt className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-black text-white truncate">
            {formatCOP(kpis.ticketPromedioGlobal)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">Por cada compra registrada</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 sm:p-4">
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
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="tablist">
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
            aria-selected={tabActivo === 'frecuentes'}
            onClick={() => setTabActivo('frecuentes')}
            className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              tabActivo === 'frecuentes'
                ? 'bg-gold-400 text-base-dark'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            VIP / Frecuentes ({kpis.clientesFrecuentes})
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

      {/* Contenido: Listado o Estados */}
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
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-neutral-800 text-neutral-400">
            <UserCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="font-display text-base font-bold text-white">
            {busqueda ? 'No se encontraron clientes' : 'Aún no hay clientes registrados'}
          </h3>
          <p className="mt-1 text-xs text-neutral-400 max-w-sm mx-auto">
            {busqueda
              ? `No hay clientes que coincidan con "${busqueda}". Intenta con otro término o limpia los filtros.`
              : 'Los clientes se registrarán automáticamente al vender en POS, Domicilios o WhatsApp, o puedes registrar uno manualmente.'}
          </p>
          {busqueda ? (
            <button
              type="button"
              onClick={() => {
                setBusqueda('');
                setTabActivo('todos');
              }}
              className="mt-4 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 transition-colors"
            >
              Limpiar búsqueda
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
      />
    </div>
  );
}
