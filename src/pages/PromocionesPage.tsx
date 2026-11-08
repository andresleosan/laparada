// src/pages/PromocionesPage.tsx
import { useState } from 'react';
import {
  Download,
  Flame,
  Gift,
  Percent,
  Plus,
  Search,
  Sparkles,
  Tag,
  Ticket,
} from 'lucide-react';
import { usePromociones, type TabPromociones } from '@/hooks/usePromociones';
import { useCategorias } from '@/hooks/useCategorias';
import { useProductos } from '@/hooks/useProductos';
import { PromocionCard } from '@/components/promociones/PromocionCard';
import { NuevaPromocionModal } from '@/components/promociones/NuevaPromocionModal';
import { CuponQrModal } from '@/components/promociones/CuponQrModal';
import { PromocionBadgeBanner } from '@/components/promociones/PromocionBadgeBanner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import type { Promocion } from '@/types/promocion';

export function PromocionesPage() {
  const {
    promocionesFiltradas,
    happyHoursEnVivo,
    kpis,
    cargando,
    reloj,
    tab,
    setTab,
    canalFiltro,
    setCanalFiltro,
    busqueda,
    setBusqueda,
    negocioNombre,
    negocioSlug,
    crearPromocionAction,
    actualizarPromocionAction,
    toggleActivarAction,
    eliminarPromocionAction,
    descargarCsv,
  } = usePromociones();

  const { categorias } = useCategorias();
  const { productos } = useProductos();

  const [modalNuevaOpen, setModalNuevaOpen] = useState(false);
  const [promocionAEditar, setPromocionAEditar] = useState<Promocion | null>(null);
  const [cuponQrSeleccionado, setCuponQrSeleccionado] = useState<Promocion | null>(null);

  const abrirModalCrear = () => {
    setPromocionAEditar(null);
    setModalNuevaOpen(true);
  };

  const abrirModalEditar = (promo: Promocion) => {
    setPromocionAEditar(promo);
    setModalNuevaOpen(true);
  };

  const abrirModalQr = (promo: Promocion) => {
    setCuponQrSeleccionado(promo);
  };

  const tabs: Array<{ id: TabPromociones; label: string; icon: React.ElementType; badge?: number }> = [
    { id: 'todas', label: 'Todas', icon: Tag, badge: kpis.totalPromociones },
    { id: 'happy_hour', label: 'Happy Hour 🔥', icon: Flame, badge: kpis.happyHoursEnVivo },
    { id: 'dos_por_uno', label: '2x1 Especial', icon: Gift },
    { id: 'categoria', label: '% Por Categoría', icon: Percent },
    { id: 'cupones', label: 'Cupones QR', icon: Ticket, badge: kpis.cuponesActivos },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Encabezado de la Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
              Promociones & Happy Hour
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="h-3 w-3" /> Automatizadas
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Descuentos dinámicos por franja horaria, 2x1 y cupones con código QR para mostrador y tienda web.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={descargarCsv}
            className="flex items-center gap-2 min-h-[44px]"
            aria-label="Exportar catálogo de promociones a Excel CSV"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={abrirModalCrear}
            className="bg-gold-400 text-black hover:bg-gold-500 font-bold flex items-center gap-2 min-h-[44px] shadow-lg shadow-gold-400/10"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Promoción</span>
          </Button>
        </div>
      </div>

      {/* 2. Banner de Happy Hour en Vivo si hay alguna activa en este minuto */}
      {happyHoursEnVivo.length > 0 && (
        <PromocionBadgeBanner promocionesEnVivo={happyHoursEnVivo} />
      )}

      {/* 3. Grid de KPIs Operativos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-neutral-800 bg-neutral-900/80 p-4">
          <span className="text-xs text-neutral-400 font-medium">Total Promociones</span>
          <p className="text-2xl sm:text-3xl font-black text-white font-display mt-1">
            {kpis.totalPromociones}
          </p>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">Configuradas</span>
        </Card>

        <Card className="border border-neutral-800 bg-neutral-900/80 p-4">
          <span className="text-xs text-emerald-400 font-medium">Promociones Activas</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-display mt-1">
            {kpis.activas}
          </p>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">Disponibles</span>
        </Card>

        <Card className="border border-amber-500/30 bg-amber-950/20 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-medium flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" /> Happy Hour en Vivo
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-300 font-display mt-1">
            {kpis.happyHoursEnVivo}
          </p>
          <span className="text-[11px] text-amber-400/80 mt-0.5 block">Activas en este instante</span>
        </Card>

        <Card className="border border-purple-500/30 bg-purple-950/20 p-4">
          <span className="text-xs text-purple-300 font-medium">Cupones Canjeados</span>
          <p className="text-2xl sm:text-3xl font-black text-purple-300 font-display mt-1">
            {kpis.totalCanjesCupones}
          </p>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">
            {kpis.cuponesActivos} códigos vigentes
          </span>
        </Card>
      </div>

      {/* 4. Barra de Pestañas y Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Pestañas de categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {tabs.map((t) => {
            const Icon = t.icon;
            const activa = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap min-h-[40px] border ${
                  activa
                    ? 'border-gold-400 bg-gold-400 text-black shadow-md'
                    : 'border-neutral-800 bg-neutral-900/90 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${activa ? 'text-black' : 'text-neutral-400'}`} />
                <span>{t.label}</span>
                {typeof t.badge === 'number' && t.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activa ? 'bg-black/20 text-black' : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Buscador y filtro de canal */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar promoción o código..."
              className="pl-8 text-xs py-1.5"
            />
          </div>

          <select
            value={canalFiltro}
            onChange={(e) => setCanalFiltro(e.target.value as any)}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 focus:border-gold-400 focus:outline-none min-h-[40px]"
            aria-label="Filtrar por canal"
          >
            <option value="todos">Todos los canales</option>
            <option value="pos">Mostrador POS</option>
            <option value="storefront">Tienda Web</option>
          </select>
        </div>
      </div>

      {/* 5. Catálogo de Promociones */}
      {cargando ? (
        <div className="py-20 text-center" role="status">
          <div className="animate-spin h-8 w-8 border-4 border-gold-400 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-neutral-400">Cargando promociones del negocio...</p>
        </div>
      ) : promocionesFiltradas.length === 0 ? (
        <Card className="border border-dashed border-neutral-800 bg-neutral-950/40 p-12 text-center">
          <Sparkles className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white font-display">No hay promociones en esta sección</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
            {busqueda
              ? 'No se encontraron promociones que coincidan con la búsqueda.'
              : 'Configura un Happy Hour o un cupón 2x1 para impulsar las ventas en las horas de menor afluencia.'}
          </p>
          <div className="mt-4">
            <Button
              type="button"
              variant="primary"
              onClick={abrirModalCrear}
              className="bg-gold-400 text-black hover:bg-gold-500 font-bold text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Crear Primera Promoción
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {promocionesFiltradas.map((promo) => (
            <PromocionCard
              key={promo.id}
              promocion={promo}
              negocioNombre={negocioNombre}
              negocioSlug={negocioSlug}
              reloj={reloj}
              onEditar={abrirModalEditar}
              onEliminar={eliminarPromocionAction}
              onToggleActivo={toggleActivarAction}
              onVerQr={abrirModalQr}
            />
          ))}
        </div>
      )}

      {/* 6. Modales */}
      <NuevaPromocionModal
        isOpen={modalNuevaOpen}
        promocionEditar={promocionAEditar}
        categorias={categorias}
        productos={productos}
        onGuardar={async (datos) => {
          if (promocionAEditar) {
            await actualizarPromocionAction(promocionAEditar.id, datos);
          } else {
            await crearPromocionAction(datos);
          }
        }}
        onClose={() => {
          setModalNuevaOpen(false);
          setPromocionAEditar(null);
        }}
      />

      <CuponQrModal
        isOpen={Boolean(cuponQrSeleccionado)}
        promocion={cuponQrSeleccionado}
        negocioNombre={negocioNombre}
        negocioSlug={negocioSlug}
        onClose={() => setCuponQrSeleccionado(null)}
      />
    </div>
  );
}
