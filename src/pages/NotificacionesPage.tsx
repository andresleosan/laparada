import { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Flame,
  Boxes,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Volume2,
  VolumeX,
  Volume1,
  Utensils,
  ClipboardList,
  CircleDollarSign,
  Info,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useNotificaciones } from '@/hooks/useNotificaciones';
import { NotificacionCard } from '@/components/notificaciones/NotificacionCard';
import { CrearAlertaManualModal } from '@/components/notificaciones/CrearAlertaManualModal';
import { generarResumenNotificacionesWhatsApp } from '@/utils/notificacionesUtils';
import type { ModuloNotificacion, UrgenciaNotificacion } from '@/types/notificacion';

export function NotificacionesPage() {
  const { negocioActual } = useNegocio();
  const [modalManualAbierto, setModalManualAbierto] = useState(false);

  const {
    notificaciones,
    notificacionesFiltradas,
    metricas,
    noLeidasCount,
    cargando,
    filtros,
    setFiltros,
    sonidoHabilitado,
    toggleSonido,
    probarSonido,
    marcarLeida,
    marcarTodasLeidas,
    eliminar,
    crearAlerta,
  } = useNotificaciones();

  const handleCompartirWhatsApp = () => {
    const encoded = generarResumenNotificacionesWhatsApp(
      notificaciones,
      negocioActual?.nombre || 'La Parada'
    );
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleLimpiarFiltros = () => {
    setFiltros({
      modulo: 'todos',
      urgencia: 'todas',
      estado: 'todas',
      busqueda: '',
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 1. Header de Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#201f1b]">
              Centro de Notificaciones Operativas
            </h1>
            {noLeidasCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm">
                {noLeidasCount} pendientes
              </span>
            )}
          </div>
          <p className="text-sm text-[#756f63] mt-1">
            Bandeja unificada de alertas en vivo para cocina (KDS), inventario, salón y pedidos.
          </p>
        </div>

        {/* Acciones del Header */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botón Silenciar / Sonido */}
          <button
            type="button"
            onClick={toggleSonido}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
              sonidoHabilitado
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 hover:bg-emerald-500/20'
                : 'bg-neutral-200 border-neutral-300 text-neutral-600 hover:bg-neutral-300'
            }`}
            aria-label={
              sonidoHabilitado
                ? 'Silenciar alertas sonoras del sistema'
                : 'Activar timbres de alertas sonoras'
            }
          >
            {sonidoHabilitado ? (
              <>
                <Volume2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <span>Sonido: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-neutral-600" aria-hidden="true" />
                <span>Silenciado</span>
              </>
            )}
          </button>

          {/* Botón Probar Timbre */}
          <button
            type="button"
            onClick={() => probarSonido('alta')}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[#c9a84c]/50 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 text-xs font-bold transition-colors min-h-[44px]"
            title="Probar campana armónica de aviso"
          >
            <Volume1 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Probar Timbre</span>
          </button>

          {/* Botón Compartir en WhatsApp */}
          <button
            type="button"
            onClick={handleCompartirWhatsApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 min-h-[44px]"
            title="Enviar resumen de alertas por WhatsApp"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span>Compartir</span>
          </button>

          {/* Botón Emitir Alerta Manual */}
          <button
            type="button"
            onClick={() => setModalManualAbierto(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#201f1b] hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 min-h-[44px]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Emitir Alerta</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas KPI Ejecutivas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Alertas */}
        <div className="rounded-2xl border border-[#ddd7ca] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#756f63]">
              Total Alertas
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-[#201f1b]">
              <Bell className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl sm:text-3xl font-black text-[#201f1b]">
            {metricas.total}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#756f63]">
            Registros en el historial de turno
          </p>
        </div>

        {/* KPI 2: No Leídas (Pendientes) */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Pendientes
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl sm:text-3xl font-black text-amber-900">
            {metricas.noLeidas}
          </p>
          <p className="mt-1 text-[11px] font-bold text-amber-700">
            {metricas.noLeidas > 0 ? 'Requieren revisión' : 'Todo al día'}
          </p>
        </div>

        {/* KPI 3: Críticas en Fuego */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Críticas en Fuego
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-700">
              <Flame className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl sm:text-3xl font-black text-rose-900">
            {metricas.criticas}
          </p>
          <p className="mt-1 text-[11px] font-bold text-rose-700">
            {metricas.criticas > 0 ? 'Demoras > 20m o stock 0' : 'Cero emergencias'}
          </p>
        </div>

        {/* KPI 4: Altas Urgencias */}
        <div className="rounded-2xl border border-sky-500/30 bg-sky-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-900">
              Alta Urgencia
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-800">
              <Boxes className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl sm:text-3xl font-black text-sky-900">
            {metricas.altas}
          </p>
          <p className="mt-1 text-[11px] font-bold text-sky-700">
            Stock mínimo o demoras
          </p>
        </div>
      </div>

      {/* 3. Barra de Filtros y Herramientas */}
      <div className="rounded-2xl border border-[#ddd7ca] bg-white p-4 sm:p-5 shadow-sm space-y-4">
        {/* Fila 1: Buscador y Acciones masivas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#756f63]" aria-hidden="true" />
            <input
              type="text"
              value={filtros.busqueda || ''}
              onChange={(e) => setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))}
              placeholder="Buscar alertas por título, mensaje o autor..."
              className="w-full min-h-[44px] rounded-xl border border-[#ddd7ca] bg-[#fbf9f4] pl-10 pr-4 text-xs font-medium text-[#201f1b] placeholder-[#756f63] focus:border-[#c9a84c] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
            />
          </div>

          <div className="flex items-center gap-2">
            {noLeidasCount > 0 && (
              <button
                type="button"
                onClick={marcarTodasLeidas}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-500/40 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors min-h-[44px]"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                <span>Marcar todas leídas</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLimpiarFiltros}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[#ddd7ca] bg-[#fbf9f4] text-[#756f63] hover:text-[#201f1b] text-xs font-bold transition-colors min-h-[44px]"
              title="Restablecer filtros"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>

        {/* Fila 2: Filtros por Píldoras Táctiles de Módulo */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-[#756f63] mb-2">
            Módulos del Sistema
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'todos', label: 'Todos los módulos', icon: Bell },
                { id: 'cocina', label: 'Cocina & KDS', icon: Flame },
                { id: 'inventario', label: 'Bodega & Stock', icon: Boxes },
                { id: 'salon', label: 'Salón & Mesas', icon: Utensils },
                { id: 'pedidos', label: 'Pedidos Web / Kiosco', icon: ClipboardList },
                { id: 'caja', label: 'Caja & Ventas', icon: CircleDollarSign },
                { id: 'sistema', label: 'Sistema & Admin', icon: Info },
              ] as const
            ).map((mod) => {
              const Icon = mod.icon;
              const isActive = (filtros.modulo || 'todos') === mod.id;
              const conteo =
                mod.id === 'todos'
                  ? metricas.total
                  : metricas.porModulo[mod.id as ModuloNotificacion] || 0;

              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() =>
                    setFiltros((prev) => ({
                      ...prev,
                      modulo: mod.id as ModuloNotificacion | 'todos',
                    }))
                  }
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-[#201f1b] text-white border-[#201f1b] shadow-sm'
                      : 'bg-[#fbf9f4] text-[#5f5a50] border-[#ddd7ca] hover:bg-neutral-100 hover:text-[#201f1b]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{mod.label}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-amber-400 text-neutral-950 font-black' : 'bg-neutral-200 text-[#756f63]'
                    }`}
                  >
                    {conteo}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fila 3: Filtro por Urgencia y Estado de Lectura */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#eee8dd]">
          {/* Urgencia */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#756f63]">Urgencia:</span>
            <select
              value={filtros.urgencia || 'todas'}
              onChange={(e) =>
                setFiltros((prev) => ({
                  ...prev,
                  urgencia: e.target.value as UrgenciaNotificacion | 'todas',
                }))
              }
              aria-label="Filtrar por nivel de urgencia"
              className="bg-[#fbf9f4] border border-[#ddd7ca] rounded-xl px-3 py-1.5 text-xs font-bold text-[#201f1b] focus:border-[#c9a84c] focus:outline-none min-h-[44px]"
            >
              <option value="todas">Todas las urgencias</option>
              <option value="critica">🚨 Solo Críticas</option>
              <option value="alta">⚠️ Solo Altas</option>
              <option value="media">ℹ️ Solo Medias</option>
              <option value="baja">⚪ Solo Informativas</option>
            </select>
          </div>

          {/* Estado de Lectura */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#756f63]">Estado:</span>
            <select
              value={filtros.estado || 'todas'}
              onChange={(e) =>
                setFiltros((prev) => ({
                  ...prev,
                  estado: e.target.value as 'todas' | 'no_leidas' | 'leidas',
                }))
              }
              aria-label="Filtrar por estado de lectura"
              className="bg-[#fbf9f4] border border-[#ddd7ca] rounded-xl px-3 py-1.5 text-xs font-bold text-[#201f1b] focus:border-[#c9a84c] focus:outline-none min-h-[44px]"
            >
              <option value="todas">Todas las alertas</option>
              <option value="no_leidas">🔔 Solo Pendientes / No leídas</option>
              <option value="leidas">✓ Solo Leídas</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Lista de Alertas */}
      <section aria-label="Listado de alertas operativas" className="space-y-3">
        {cargando ? (
          <div className="py-16 text-center" role="status">
            <div className="animate-spin h-8 w-8 border-4 border-[#c9a84c] border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-xs font-bold text-[#756f63]">Cargando alertas en tiempo real...</p>
          </div>
        ) : notificacionesFiltradas.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#ddd7ca] bg-white p-12 text-center shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 mx-auto mb-3">
              <Bell className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-bold text-[#201f1b]">
              No hay alertas que coincidan
            </h3>
            <p className="mt-1 text-xs text-[#756f63] max-w-sm mx-auto">
              Todas las operaciones están en orden o los filtros aplicados no arrojaron resultados.
            </p>
            <button
              type="button"
              onClick={handleLimpiarFiltros}
              className="mt-4 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {notificacionesFiltradas.map((notif) => (
              <NotificacionCard
                key={notif.id}
                notificacion={notif}
                onMarcarLeida={marcarLeida}
                onEliminar={eliminar}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. Modal para emitir alerta manual */}
      <CrearAlertaManualModal
        isOpen={modalManualAbierto}
        onClose={() => setModalManualAbierto(false)}
        onCrear={crearAlerta}
      />
    </div>
  );
}
