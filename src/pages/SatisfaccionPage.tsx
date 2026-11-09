import { useState } from 'react';
import {
  Star,
  Search,
  Download,
  Settings,
  AlertTriangle,
  ThumbsUp,
  TrendingUp,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useSatisfaccion } from '@/hooks/useSatisfaccion';
import type {
  EncuestaSatisfaccion,
  CanalSatisfaccion,
} from '@/types/satisfaccion';
import { EncuestaCard } from '@/components/satisfaccion/EncuestaCard';
import { ResponderQuejaModal } from '@/components/satisfaccion/ResponderQuejaModal';
import { ConfiguracionSatisfaccionModal } from '@/components/satisfaccion/ConfiguracionSatisfaccionModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

type TabFiltro = 'todas' | '5' | '4' | '3' | '1-2' | 'quejas_pendientes';

export function SatisfaccionPage() {
  const { negocioActual } = useNegocio();
  const {
    encuestas,
    encuestasFiltradas,
    configuracion,
    kpis,
    loading,
    filtros,
    setFiltros,
    actualizarFiltro,
    limpiarFiltros,
    cambiarEstado,
    eliminarEncuestaAction,
    guardarConfiguracionAction,
    exportarCsv,
  } = useSatisfaccion(negocioActual.id);

  // Estados de modales
  const [modalConfigOpen, setModalConfigOpen] = useState(false);
  const [encuestaAGestionar, setEncuestaAGestionar] = useState<EncuestaSatisfaccion | null>(null);

  // Pestaña activa
  const [tabActivo, setTabActivo] = useState<TabFiltro>('todas');

  // Manejo de pestañas
  const handleCambiarTab = (tab: TabFiltro) => {
    setTabActivo(tab);
    if (tab === 'todas') {
      setFiltros((prev) => ({ ...prev, calificacion: 'todas', soloQuejas: false }));
    } else if (tab === 'quejas_pendientes') {
      setFiltros((prev) => ({
        ...prev,
        calificacion: 'todas',
        soloQuejas: true,
        estado: 'nueva',
      }));
    } else {
      setFiltros((prev) => ({ ...prev, calificacion: tab, soloQuejas: false }));
    }
  };

  // Semáforo de NPS
  const getNpsInfo = (nps: number) => {
    if (nps >= 50) {
      return {
        label: 'Excelente Lealtad',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/15 border-emerald-500/30',
      };
    }
    if (nps >= 0) {
      return {
        label: 'Favorable / Aceptable',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/15 border-yellow-500/30',
      };
    }
    return {
      label: 'Zona Crítica',
      color: 'text-rose-400',
      bg: 'bg-rose-500/15 border-rose-500/30',
    };
  };

  const npsInfo = getNpsInfo(kpis.indiceNps);

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado Principal */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black font-display tracking-tight text-white">
              Satisfacción del Cliente & Reseñas
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/30">
              NPS & Google Reviews
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Monitorea el pulso de comensales en mesa y domicilio, contiene quejas y viraliza tus 5 estrellas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="secondary"
            onClick={exportarCsv}
            disabled={encuestas.length === 0}
            className="min-h-[44px] flex items-center gap-2 text-xs"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Exportar CSV</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => setModalConfigOpen(true)}
            className="min-h-[44px] flex items-center gap-2 text-xs"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
            <span>Configurar Google & Alertas</span>
          </Button>
        </div>
      </header>

      {/* 4 KPIs Ejecutivos de Alto Nivel */}
      <section
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        aria-label="Indicadores clave de satisfacción"
      >
        {/* KPI 1: Calificación Promedio */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Calificación Promedio</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-display text-white">
              {kpis.calificacionPromedio > 0 ? kpis.calificacionPromedio : '—'}
            </span>
            <span className="text-sm text-neutral-400 font-semibold">/ 5.0</span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${
                  s <= Math.round(kpis.calificacionPromedio)
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-neutral-800 text-neutral-700'
                }`}
                aria-hidden="true"
              />
            ))}
            <span className="text-xs text-neutral-400 ml-1.5">
              {kpis.tasaCincoEstrellas}% son 5★
            </span>
          </div>
        </div>

        {/* KPI 2: Índice NPS */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Net Promoter Score (NPS)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-display text-white">
              {kpis.indiceNps > 0 ? `+${kpis.indiceNps}` : kpis.indiceNps}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${npsInfo.bg} ${npsInfo.color}`}>
              {npsInfo.label}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            {kpis.promotoresCount} promotores · {kpis.pasivosCount} pasivos · {kpis.detractoresCount} detractores
          </p>
        </div>

        {/* KPI 3: Total Encuestas */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Encuestas Respondidas</span>
            <ThumbsUp className="w-4 h-4 text-sky-400" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-display text-white">
              {kpis.totalEncuestas}
            </span>
            <span className="text-xs text-neutral-400">respuestas totales</span>
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            Canales: Salón, Domicilios, Kiosco y POS
          </p>
        </div>

        {/* KPI 4: Quejas Activas */}
        <div
          className={`rounded-2xl p-5 shadow-lg border relative overflow-hidden ${
            kpis.quejasPendientes > 0
              ? 'bg-rose-950/20 border-rose-500/50'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Quejas Operativas</span>
            <AlertTriangle
              className={`w-4 h-4 ${kpis.quejasPendientes > 0 ? 'text-rose-400 animate-pulse' : 'text-neutral-500'}`}
              aria-hidden="true"
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-black font-display ${
                kpis.quejasPendientes > 0 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {kpis.quejasPendientes}
            </span>
            <span className="text-xs text-neutral-400">pendientes de resolver</span>
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            {kpis.quejasResueltas} resueltas históricamente
          </p>
        </div>
      </section>

      {/* Desglose de Dimensiones y Top Etiquetas */}
      {kpis.totalEncuestas > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Dimensiones Específicas */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
              Calidad por Dimensiones del Servicio
            </h2>
            <div className="space-y-3">
              {/* Comida */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-300 font-medium">🍔 Calidad de Comida y Sazón</span>
                  <span className="font-bold text-amber-400">{kpis.promedioComida} / 5.0</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${(kpis.promedioComida / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Servicio */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-300 font-medium">👏 Atención y Servicio de Meseros</span>
                  <span className="font-bold text-amber-400">{kpis.promedioServicio} / 5.0</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${(kpis.promedioServicio / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Rapidez */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-300 font-medium">⚡ Tiempo de Entrega y Espera</span>
                  <span className="font-bold text-amber-400">{kpis.promedioTiempo} / 5.0</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${(kpis.promedioTiempo / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Empaque */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-300 font-medium">📦 Empaque y Temperatura (Domicilio)</span>
                  <span className="font-bold text-amber-400">{kpis.promedioEmpaque} / 5.0</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${(kpis.promedioEmpaque / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Top Etiquetas Mencionadas */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                Lo Más Mencionado por los Comensales
              </h2>

              {/* Positivas */}
              <div className="mb-4">
                <span className="text-xs font-medium text-emerald-400 block mb-2">
                  ✨ Fortalezas más elogiadas:
                </span>
                {kpis.topTagsPositivos.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {kpis.topTagsPositivos.map((t) => (
                      <span
                        key={t.tag}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      >
                        <span>{t.label}</span>
                        <strong className="text-white font-bold bg-emerald-500/30 px-1 rounded">
                          {t.count}
                        </strong>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 italic">Aún no hay etiquetas positivas registradas.</p>
                )}
              </div>

              {/* Constructivas */}
              <div>
                <span className="text-xs font-medium text-rose-400 block mb-2">
                  ⚠️ Puntos a corregir en cocina/servicio:
                </span>
                {kpis.topTagsConstructivos.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {kpis.topTagsConstructivos.map((t) => (
                      <span
                        key={t.tag}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      >
                        <span>{t.label}</span>
                        <strong className="text-white font-bold bg-rose-500/30 px-1 rounded">
                          {t.count}
                        </strong>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 italic">Cero quejas críticas con etiquetas registradas.</p>
                )}
              </div>
            </div>

            {configuracion.googleBusinessUrl && (
              <div className="pt-3 mt-3 border-t border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
                <span>Google Maps enlazado</span>
                <span className="text-amber-400 font-medium">Activo</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <section className="space-y-3">
        {/* Pestañas de Filtrado Rápido */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'todas', label: 'Todas las Reseñas', count: kpis.totalEncuestas },
            { id: '5', label: '⭐ 5 Estrellas', count: kpis.promotoresCount },
            { id: '4', label: '⭐ 4 Estrellas' },
            { id: '3', label: '⭐ 3 Estrellas', count: kpis.pasivosCount },
            { id: '1-2', label: '🚨 1-2 Estrellas (Quejas)', count: kpis.detractoresCount },
            { id: 'quejas_pendientes', label: '⚠️ Solo Pendientes', count: kpis.quejasPendientes },
          ].map((tab) => {
            const isSelected = tabActivo === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCambiarTab(tab.id as TabFiltro)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-amber-400 text-neutral-950 border-amber-400 shadow-md font-bold'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isSelected
                        ? 'bg-neutral-950 text-amber-400 font-bold'
                        : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Buscador y Selector de Canal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={filtros.busqueda || ''}
              onChange={(e) => actualizarFiltro('busqueda', e.target.value)}
              placeholder="Buscar por comensal, teléfono, mesa, comentario o ticket..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/80 min-h-[44px]"
            />
          </div>

          <div>
            <select
              value={filtros.canal || 'todos'}
              onChange={(e) => actualizarFiltro('canal', e.target.value as CanalSatisfaccion | 'todos')}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400/80 min-h-[44px] cursor-pointer"
            >
              <option value="todos">Todos los canales</option>
              <option value="mesa">Salón / Mesas</option>
              <option value="domicilio">Domicilios</option>
              <option value="mostrador_pos">Mostrador POS</option>
              <option value="kiosco">Kiosco Táctil</option>
              <option value="tienda_web">Tienda Web</option>
            </select>
          </div>
        </div>
      </section>

      {/* Listado de Encuestas */}
      {loading ? (
        <div className="py-16 text-center text-neutral-400">
          <div className="animate-spin h-8 w-8 border-4 border-amber-400 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs">Cargando encuestas de satisfacción...</p>
        </div>
      ) : encuestasFiltradas.length === 0 ? (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-12 text-center">
          <EmptyState
            title="No se encontraron encuestas"
            description={
              encuestas.length === 0
                ? 'Aún no hay calificaciones registradas. Comparte el enlace de calificación con tus comensales en tickets térmicos o WhatsApp.'
                : 'No hay encuestas que coincidan con los filtros seleccionados.'
            }
          />
          {encuestas.length > 0 && (
            <div className="mt-4">
              <Button type="button" variant="secondary" size="sm" onClick={limpiarFiltros}>
                Restablecer Filtros
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {encuestasFiltradas.map((encuesta) => (
            <EncuestaCard
              key={encuesta.id}
              encuesta={encuesta}
              nombreNegocio={negocioActual.nombre}
              googleBusinessUrl={configuracion.googleBusinessUrl}
              onGestionar={(e) => setEncuestaAGestionar(e)}
              onEliminar={(e) => eliminarEncuestaAction(e.id)}
            />
          ))}
        </div>
      )}

      {/* Modal de Configuración */}
      <ConfiguracionSatisfaccionModal
        isOpen={modalConfigOpen}
        negocioId={negocioActual.id}
        configuracion={configuracion}
        onGuardar={guardarConfiguracionAction}
        onClose={() => setModalConfigOpen(false)}
      />

      {/* Modal para Responder / Gestionar Queja */}
      <ResponderQuejaModal
        isOpen={Boolean(encuestaAGestionar)}
        encuesta={encuestaAGestionar}
        onGuardar={cambiarEstado}
        onClose={() => setEncuestaAGestionar(null)}
      />
    </div>
  );
}
export default SatisfaccionPage;
