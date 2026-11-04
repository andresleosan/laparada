import { useState } from 'react';
import {
  CheckCircle2,
  ChefHat,
  Flame,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useCocinaKDS } from '@/hooks/useCocinaKDS';
import { KdsHeader } from '@/components/cocina/KdsHeader';
import { KdsFilters, type KdsLayoutView } from '@/components/cocina/KdsFilters';
import { ComandaCard } from '@/components/cocina/ComandaCard';

export function CocinaPage() {
  const {
    activos,
    pendientes,
    enPreparacion,
    listas,
    loading,
    error,
    ahora,
    canalFiltro,
    setCanalFiltro,
    busqueda,
    setBusqueda,
    sonidoHabilitado,
    toggleSonido,
    probarSonido,
    itemsPreparados,
    toggleItemPreparado,
    avanzarEstadoComanda,
    devolverACocina,
    marcarEntregada,
    totalPendientes,
    totalEnPreparacion,
    totalListos,
    tiempoMasAntiguoMin,
    actionLoadingId,
  } = useCocinaKDS();

  const [layoutView, setLayoutView] = useState<KdsLayoutView>('kanban');

  const hayFiltrosActivos = canalFiltro !== 'todos' || Boolean(busqueda.trim());
  const totalFiltrados = pendientes.length + enPreparacion.length + listas.length;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 p-4 lg:p-6 text-white space-y-4">
      {/* Cabecera de la pantalla KDS */}
      <KdsHeader
        totalPendientes={totalPendientes}
        totalEnPreparacion={totalEnPreparacion}
        totalListos={totalListos}
        tiempoMasAntiguoMin={tiempoMasAntiguoMin}
        sonidoHabilitado={sonidoHabilitado}
        onToggleSonido={toggleSonido}
        onProbarSonido={probarSonido}
      />

      {/* Barra de filtros de canal y vista */}
      <KdsFilters
        canalFiltro={canalFiltro}
        onCanalChange={setCanalFiltro}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        layoutView={layoutView}
        onLayoutViewChange={setLayoutView}
      />

      {/* Estado de carga */}
      {loading && activos.length === 0 && (
        <div className="flex flex-1 items-center justify-center p-12" role="status">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-10 w-10 border-4 border-amber-400 border-t-transparent rounded-full" />
            <p className="text-sm font-bold text-neutral-400">Conectando con la comanda de cocina...</p>
          </div>
        </div>
      )}

      {/* Estado de error */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/50 bg-red-950/40 p-4 text-center text-red-200"
        >
          <p className="font-bold">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-xs font-black text-black hover:bg-red-400 min-h-[44px]"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* Estado vacío cuando no hay pedidos en todo el turno */}
      {!loading && !error && activos.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-white/10 bg-neutral-900/40 p-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-4">
            <ChefHat className="h-10 w-10" />
          </div>
          <h2 className="font-display text-2xl font-black text-white">¡Cocina al día!</h2>
          <p className="mt-1 max-w-md text-sm text-neutral-400">
            No hay comandas pendientes en este momento. La campana sonará automáticamente al ingresar un nuevo pedido por WhatsApp, Tienda Web o Mostrador.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 rounded-xl px-4 py-2">
            <Sparkles className="h-4 w-4" />
            <span>Sistema en espera de nuevas órdenes en tiempo real</span>
          </div>
        </div>
      )}

      {/* Estado vacío cuando hay pedidos pero ninguno coincide con el filtro */}
      {!loading && !error && activos.length > 0 && totalFiltrados === 0 && hayFiltrosActivos && (
        <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-white/10 bg-neutral-900/40 p-10 text-center">
          <p className="font-display text-lg font-bold text-white">
            No se encontraron comandas con los filtros actuales
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Prueba cambiando el canal o limpiando el texto de búsqueda.
          </p>
          <button
            type="button"
            onClick={() => {
              setCanalFiltro('todos');
              setBusqueda('');
            }}
            className="mt-4 rounded-xl border border-amber-400/60 bg-amber-400/20 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/30 min-h-[44px]"
          >
            Ver todas las comandas ({activos.length})
          </button>
        </div>
      )}

      {/* Visualización de comandas: Modo Kanban (3 columnas) */}
      {!loading && !error && totalFiltrados > 0 && layoutView === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {/* Columna 1: PENDIENTES */}
          <section className="flex flex-col gap-3 rounded-2xl border border-yellow-500/30 bg-neutral-900/60 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
                <h3 className="font-display text-base font-black uppercase text-yellow-300">
                  Pendientes ({pendientes.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-neutral-400">Aguardando fuegos</span>
            </div>

            <div className="space-y-3">
              {pendientes.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500 italic">
                  Sin pedidos en cola
                </div>
              ) : (
                pendientes.map((comanda) => (
                  <ComandaCard
                    key={comanda.id}
                    comanda={comanda}
                    ahoraMs={ahora}
                    itemsPreparados={itemsPreparados}
                    onToggleItem={toggleItemPreparado}
                    onAvanzar={avanzarEstadoComanda}
                    isLoading={actionLoadingId === comanda.id}
                  />
                ))
              )}
            </div>
          </section>

          {/* Columna 2: EN PREPARACIÓN */}
          <section className="flex flex-col gap-3 rounded-2xl border border-orange-500/30 bg-neutral-900/60 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-400" />
                <h3 className="font-display text-base font-black uppercase text-orange-300">
                  En Cocina ({enPreparacion.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-neutral-400">En preparación activa</span>
            </div>

            <div className="space-y-3">
              {enPreparacion.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500 italic">
                  Fuegos libres
                </div>
              ) : (
                enPreparacion.map((comanda) => (
                  <ComandaCard
                    key={comanda.id}
                    comanda={comanda}
                    ahoraMs={ahora}
                    itemsPreparados={itemsPreparados}
                    onToggleItem={toggleItemPreparado}
                    onAvanzar={avanzarEstadoComanda}
                    isLoading={actionLoadingId === comanda.id}
                  />
                ))
              )}
            </div>
          </section>

          {/* Columna 3: LISTAS / DESPACHO */}
          <section className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-neutral-900/60 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h3 className="font-display text-base font-black uppercase text-emerald-300">
                  Listas para Entrega ({listas.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-neutral-400">Listas / En despacho</span>
            </div>

            <div className="space-y-3">
              {listas.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500 italic">
                  Sin pedidos listos esperando
                </div>
              ) : (
                listas.map((comanda) => (
                  <ComandaCard
                    key={comanda.id}
                    comanda={comanda}
                    ahoraMs={ahora}
                    itemsPreparados={itemsPreparados}
                    onToggleItem={toggleItemPreparado}
                    onAvanzar={avanzarEstadoComanda}
                    onDevolver={devolverACocina}
                    onMarcarEntregado={marcarEntregada}
                    isLoading={actionLoadingId === comanda.id}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* Visualización de comandas: Modo Lista Continua (rejilla de alta densidad) */}
      {!loading && !error && totalFiltrados > 0 && layoutView === 'lista' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...pendientes, ...enPreparacion, ...listas].map((comanda) => (
            <ComandaCard
              key={comanda.id}
              comanda={comanda}
              ahoraMs={ahora}
              itemsPreparados={itemsPreparados}
              onToggleItem={toggleItemPreparado}
              onAvanzar={avanzarEstadoComanda}
              onDevolver={devolverACocina}
              onMarcarEntregado={marcarEntregada}
              isLoading={actionLoadingId === comanda.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
