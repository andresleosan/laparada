import { useState, useMemo } from 'react';
import {
  Building2,
  Receipt,
  Plus,
  Download,
  Search,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Users,
  Filter,
} from 'lucide-react';
import { useProveedores, type FiltroEstadoFactura } from '@/hooks/useProveedores';
import { useInventario } from '@/hooks/useInventario';
import { useNegocio } from '@/context/NegocioContext';
import { ProveedorCard } from '@/components/proveedores/ProveedorCard';
import { FacturaCompraCard } from '@/components/proveedores/FacturaCompraCard';
import { NuevoProveedorModal } from '@/components/proveedores/NuevoProveedorModal';
import { NuevaFacturaCompraModal } from '@/components/proveedores/NuevaFacturaCompraModal';
import { AbonarFacturaModal } from '@/components/proveedores/AbonarFacturaModal';
import { DetalleFacturaModal } from '@/components/proveedores/DetalleFacturaModal';
import { CATEGORIAS_PROVEEDOR_CONFIG } from '@/utils/proveedoresUtils';
import { formatCOP } from '@/utils/formatCOP';
import type { Proveedor, FacturaCompra, CategoriaProveedor } from '@/types/proveedor';

type PestañaProveedores = 'facturas' | 'directorio' | 'vencimientos';

export function ProveedoresPage() {
  const { negocioActual } = useNegocio();
  const negocioId = negocioActual?.id || '';
  const {
    proveedores,
    facturas,
    cargando,
    error,
    busqueda,
    setBusqueda,
    filtroCategoria,
    setFiltroCategoria,
    filtroEstado,
    setFiltroEstado,
    metricas,
    totalesPorProveedor,
    facturasFiltradas,
    proveedoresFiltrados,
    crearProveedorAction,
    actualizarProveedorAction,
    eliminarProveedorAction,
    crearFacturaAction,
    registrarPagoAction,
    anularFacturaAction,
    exportarCsvAction,
  } = useProveedores();

  const { insumos } = useInventario();

  const [pestañaActiva, setPestañaActiva] = useState<PestañaProveedores>('facturas');

  // Modales
  const [modalProveedorAbierto, setModalProveedorAbierto] = useState(false);
  const [proveedorAEditar, setProveedorAEditar] = useState<Proveedor | null>(null);

  const [modalFacturaAbierto, setModalFacturaAbierto] = useState(false);
  const [proveedorPreseleccionado, setProveedorPreseleccionado] = useState<Proveedor | null>(null);

  const [modalAbonoAbierto, setModalAbonoAbierto] = useState(false);
  const [facturaAAbonar, setFacturaAAbonar] = useState<FacturaCompra | null>(null);

  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [facturaADetalle, setFacturaADetalle] = useState<FacturaCompra | null>(null);

  // Map para resolución rápida de proveedor en facturas
  const proveedorMap = useMemo(() => {
    return new Map(proveedores.map((p) => [p.id, p]));
  }, [proveedores]);

  // Manejadores
  const handleAbrirNuevoProveedor = () => {
    setProveedorAEditar(null);
    setModalProveedorAbierto(true);
  };

  const handleEditarProveedor = (prov: Proveedor) => {
    setProveedorAEditar(prov);
    setModalProveedorAbierto(true);
  };

  const handleEliminarProveedor = async (prov: Proveedor) => {
    const resumen = totalesPorProveedor[prov.id];
    if (resumen && resumen.saldoPendiente > 0) {
      alert(`No se puede eliminar el proveedor "${prov.nombre}" porque tiene facturas con saldo pendiente (${formatCOP(resumen.saldoPendiente)}).`);
      return;
    }

    if (confirm(`¿Estás seguro de eliminar el proveedor "${prov.nombre}"?`)) {
      try {
        await eliminarProveedorAction(prov.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al eliminar el proveedor');
      }
    }
  };

  const handleNuevaFacturaParaProveedor = (prov: Proveedor) => {
    setProveedorPreseleccionado(prov);
    setModalFacturaAbierto(true);
  };

  const handleAbrirNuevaFacturaGeneral = () => {
    setProveedorPreseleccionado(null);
    setModalFacturaAbierto(true);
  };

  const handleAbonar = (fac: FacturaCompra) => {
    setFacturaAAbonar(fac);
    setModalAbonoAbierto(true);
  };

  const handleVerDetalle = (fac: FacturaCompra) => {
    setFacturaADetalle(fac);
    setModalDetalleAbierto(true);
  };

  const handleAnularFactura = async (fac: FacturaCompra) => {
    const motivo = prompt(`Ingresa el motivo justificado para anular la factura "${fac.numeroFactura}":`);
    if (motivo && motivo.trim().length > 0) {
      try {
        await anularFacturaAction(fac.id, motivo.trim());
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al anular la factura');
      }
    }
  };

  // Facturas para el panel de vencimientos ordenadas por fecha
  const facturasPendientesVencimiento = useMemo(() => {
    return facturas
      .filter((f) => f.estado !== 'anulada' && f.estado !== 'pagada' && f.saldoPendiente > 0)
      .sort((a, b) => {
        const timeA = a.fechaVencimiento && typeof a.fechaVencimiento.toDate === 'function'
          ? a.fechaVencimiento.toDate().getTime()
          : new Date(a.fechaVencimiento as unknown as string).getTime();
        const timeB = b.fechaVencimiento && typeof b.fechaVencimiento.toDate === 'function'
          ? b.fechaVencimiento.toDate().getTime()
          : new Date(b.fechaVencimiento as unknown as string).getTime();
        return timeA - timeB;
      });
  }, [facturas]);

  const renderContenido = () => {
    if (cargando) {
      return (
        <div className="p-12 text-center text-neutral-400 bg-neutral-900 rounded-2xl border border-neutral-800">
          <div className="animate-spin h-8 w-8 border-4 border-gold-400 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">Cargando proveedores y facturas...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 text-center text-rose-300 bg-rose-500/10 rounded-2xl border border-rose-500/30">
          <p className="font-semibold text-sm mb-1">Error al cargar datos</p>
          <p className="text-xs">{error}</p>
        </div>
      );
    }

    if (pestañaActiva === 'facturas') {
      if (facturasFiltradas.length === 0) {
        return (
          <div className="p-12 text-center bg-neutral-900/60 rounded-2xl border border-neutral-800">
            <Receipt className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg text-white mb-1">
              No hay facturas registradas
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mb-4">
              {busqueda || filtroEstado !== 'todas'
                ? 'No encontramos facturas que coincidan con los filtros aplicados.'
                : 'Registra tus compras a proveedores de contado o crédito para controlar vencimientos.'}
            </p>
            {proveedores.length > 0 && (
              <button
                type="button"
                onClick={handleAbrirNuevaFacturaGeneral}
                className="h-11 px-5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-bold text-sm inline-flex items-center gap-2 transition-colors shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Primera Factura</span>
              </button>
            )}
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facturasFiltradas.map((fac) => (
            <FacturaCompraCard
              key={fac.id}
              factura={fac}
              proveedor={proveedorMap.get(fac.proveedorId)}
              onAbonar={handleAbonar}
              onVerDetalle={handleVerDetalle}
              onAnular={handleAnularFactura}
            />
          ))}
        </div>
      );
    }

    if (pestañaActiva === 'directorio') {
      if (proveedoresFiltrados.length === 0) {
        return (
          <div className="p-12 text-center bg-neutral-900/60 rounded-2xl border border-neutral-800">
            <Building2 className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg text-white mb-1">
              No hay proveedores en el directorio
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mb-4">
              {busqueda || filtroCategoria !== 'todas'
                ? 'No hay proveedores que coincidan con la búsqueda o categoría.'
                : 'Añade a tus proveedores de carnes, pan, quesos, verduras y empaques.'}
            </p>
            <button
              type="button"
              onClick={handleAbrirNuevoProveedor}
              className="h-11 px-5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-bold text-sm inline-flex items-center gap-2 transition-colors shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Proveedor</span>
            </button>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proveedoresFiltrados.map((prov) => (
            <ProveedorCard
              key={prov.id}
              proveedor={prov}
              resumen={totalesPorProveedor[prov.id]}
              onEditar={handleEditarProveedor}
              onNuevaFactura={handleNuevaFacturaParaProveedor}
              onEliminar={handleEliminarProveedor}
            />
          ))}
        </div>
      );
    }

    // Programación de Pagos (Vencimientos)
    if (facturasPendientesVencimiento.length === 0) {
      return (
        <div className="p-12 text-center bg-neutral-900/60 rounded-2xl border border-neutral-800">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-white mb-1">
            ¡Al día! No hay pagos pendientes
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
            Todas las facturas de proveedores se encuentran saldadas o no registran deudas pendientes.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
          <span>
            Mostrando {facturasPendientesVencimiento.length} facturas con saldo por liquidar ordenadas por vencimiento próximo.
          </span>
          <span className="font-display font-bold text-gold-400 text-sm">
            Total programado: {formatCOP(metricas.deudaTotal)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facturasPendientesVencimiento.map((fac) => (
            <FacturaCompraCard
              key={fac.id}
              factura={fac}
              proveedor={proveedorMap.get(fac.proveedorId)}
              onAbonar={handleAbonar}
              onVerDetalle={handleVerDetalle}
              onAnular={handleAnularFactura}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                Proveedores y Cuentas por Pagar
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400">
                Compras de insumos, crédito comercial a plazos y programación de pagos
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Acción Global */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportarCsvAction}
            disabled={facturas.length === 0}
            className="h-11 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 hover:border-neutral-700 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4 text-gold-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handleAbrirNuevoProveedor}
            className="h-11 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors border border-neutral-700 shadow"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>+ Nuevo Proveedor</span>
          </button>

          <button
            type="button"
            onClick={handleAbrirNuevaFacturaGeneral}
            disabled={proveedores.length === 0}
            className="h-11 px-4 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-lg disabled:opacity-40"
          >
            <Receipt className="w-4 h-4" />
            <span>+ Registrar Compra</span>
          </button>
        </div>
      </div>

      {/* 4 KPIs de Alto Nivel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Deuda Total Pendiente */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Deuda Total Pendiente</span>
            <DollarSign className="w-4 h-4 text-gold-400" />
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-white">
            {formatCOP(metricas.deudaTotal)}
          </div>
          <span className="text-xs text-neutral-400 mt-1 block">
            Cuentas por pagar activas en bodega
          </span>
        </div>

        {/* KPI 2: Vencidas / En Mora */}
        <div
          className={`rounded-xl p-4 sm:p-5 border shadow transition-all ${
            metricas.cantidadVencidas > 0
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Vencidas (En Mora)</span>
            <AlertTriangle className={`w-4 h-4 ${metricas.cantidadVencidas > 0 ? 'text-rose-400' : 'text-neutral-500'}`} />
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-white">
            {formatCOP(metricas.totalVencido)}
          </div>
          <span className="text-xs mt-1 block">
            {metricas.cantidadVencidas === 0
              ? 'Sin facturas vencidas 🎉'
              : `${metricas.cantidadVencidas} ${metricas.cantidadVencidas === 1 ? 'factura expirada' : 'facturas expiradas'}`}
          </span>
        </div>

        {/* KPI 3: Por Vencer en 7 días */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Por Vencer (7 días)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-amber-400">
            {formatCOP(metricas.totalPorVencerSemana)}
          </div>
          <span className="text-xs text-neutral-400 mt-1 block">
            {metricas.cantidadPorVencerSemana} {metricas.cantidadPorVencerSemana === 1 ? 'compromiso esta semana' : 'compromisos esta semana'}
          </span>
        </div>

        {/* KPI 4: Proveedores Aliados */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Proveedores Aliados</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-white">
            {metricas.proveedoresActivos}
          </div>
          <span className="text-xs text-neutral-400 mt-1 block">
            {proveedores.length} registrados en el catálogo
          </span>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo */}
      <div className="flex items-center justify-between border-b border-neutral-800 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setPestañaActiva('facturas')}
            className={`h-11 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              pestañaActiva === 'facturas'
                ? 'border-gold-400 text-gold-400 bg-gold-400/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Facturas & Cuentas ({facturas.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setPestañaActiva('directorio')}
            className={`h-11 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              pestañaActiva === 'directorio'
                ? 'border-gold-400 text-gold-400 bg-gold-400/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Directorio de Proveedores ({proveedores.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setPestañaActiva('vencimientos')}
            className={`h-11 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              pestañaActiva === 'vencimientos'
                ? 'border-gold-400 text-gold-400 bg-gold-400/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Programación de Pagos ({facturasPendientesVencimiento.length})</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo de Búsqueda */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={
              pestañaActiva === 'directorio'
                ? 'Buscar proveedor por nombre, contacto, NIT o teléfono...'
                : 'Buscar factura por número, proveedor o concepto...'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
          />
        </div>

        {/* Filtros específicos según pestaña */}
        {pestañaActiva === 'facturas' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                ['todas', 'Todas'],
                ['pendientes', 'Pendientes'],
                ['por_vencer', 'Por Vencer'],
                ['vencidas', 'Vencidas'],
                ['pagadas', 'Pagadas'],
                ['anuladas', 'Anuladas'],
              ] as [FiltroEstadoFactura, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFiltroEstado(key)}
                className={`h-9 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  filtroEstado === key
                    ? 'bg-gold-400 text-neutral-950 border-gold-400 shadow'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {pestañaActiva === 'directorio' && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-500 shrink-0" />
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value as CategoriaProveedor | 'todas')}
              className="px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-gold-400 focus:outline-none"
            >
              <option value="todas">Todas las categorías</option>
              {Object.entries(CATEGORIAS_PROVEEDOR_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Contenido Dinámico */}
      {renderContenido()}

      {/* Modales */}
      <NuevoProveedorModal
        isOpen={modalProveedorAbierto}
        onClose={() => setModalProveedorAbierto(false)}
        onSubmit={async (data) => {
          if (proveedorAEditar) {
            await actualizarProveedorAction(proveedorAEditar.id, data);
          } else {
            await crearProveedorAction(data);
          }
        }}
        proveedorAEditar={proveedorAEditar}
      />

      <NuevaFacturaCompraModal
        isOpen={modalFacturaAbierto}
        onClose={() => setModalFacturaAbierto(false)}
        onSubmit={async (data) => {
          await crearFacturaAction(data);
        }}
        proveedores={proveedores.filter((p) => p.activo)}
        insumos={insumos}
        proveedorPreseleccionado={proveedorPreseleccionado}
      />

      <AbonarFacturaModal
        isOpen={modalAbonoAbierto}
        onClose={() => setModalAbonoAbierto(false)}
        factura={facturaAAbonar}
        onSubmit={async (facturaId, data) => {
          await registrarPagoAction(facturaId, data);
        }}
      />

      <DetalleFacturaModal
        isOpen={modalDetalleAbierto}
        onClose={() => setModalDetalleAbierto(false)}
        factura={facturaADetalle}
        negocioId={negocioId || ''}
        onAbrirAbono={handleAbonar}
      />
    </div>
  );
}
