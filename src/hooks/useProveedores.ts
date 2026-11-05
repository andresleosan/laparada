import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  Proveedor,
  FacturaCompra,
  CategoriaProveedor,
  CrearFacturaCompraInput,
  RegistrarPagoFacturaInput,
} from '@/types/proveedor';
import {
  onProveedoresChange,
  onFacturasCompraChange,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  crearFacturaCompra,
  registrarPagoFactura,
  anularFacturaCompra,
} from '@/services/proveedoresService';
import {
  calcularMetricasCuentasPorPagar,
  calcularTotalesPorProveedor,
  determinarEstadoVencimiento,
  exportarCuentasPorPagarCsv,
} from '@/utils/proveedoresUtils';

export type FiltroEstadoFactura =
  | 'todas'
  | 'pendientes'
  | 'por_vencer'
  | 'vencidas'
  | 'pagadas'
  | 'anuladas';

export function useProveedores() {
  const { negocioActual } = useNegocio();
  const negocioId = negocioActual?.id || '';
  const negocio = negocioActual;
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [facturas, setFacturas] = useState<FacturaCompra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros interactivos
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaProveedor | 'todas'>('todas');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoFactura>('todas');

  useEffect(() => {
    if (!negocioId) {
      setProveedores([]);
      setFacturas([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    let unsubProveedores: (() => void) | undefined;
    let unsubFacturas: (() => void) | undefined;

    try {
      unsubProveedores = onProveedoresChange(negocioId, (listaProveedores) => {
        setProveedores(listaProveedores);
        setCargando(false);
      });

      unsubFacturas = onFacturasCompraChange(negocioId, (listaFacturas) => {
        setFacturas(listaFacturas);
        setCargando(false);
      });
    } catch (err) {
      console.error('Error suscribiendo a proveedores y facturas:', err);
      setError(err instanceof Error ? err.message : 'Error al conectar con la base de datos.');
      setCargando(false);
    }

    return () => {
      unsubProveedores?.();
      unsubFacturas?.();
    };
  }, [negocioId]);

  // Métricas de alto nivel
  const metricas = useMemo(() => {
    return calcularMetricasCuentasPorPagar(facturas, proveedores);
  }, [facturas, proveedores]);

  // Resumen contable agrupado por proveedor
  const totalesPorProveedor = useMemo(() => {
    return calcularTotalesPorProveedor(facturas);
  }, [facturas]);

  // Facturas filtradas
  const facturasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return facturas.filter((fac) => {
      // Filtro por estado / semáforo
      if (filtroEstado !== 'todas') {
        const semaforo = determinarEstadoVencimiento(fac);
        if (filtroEstado === 'vencidas' && semaforo !== 'vencida') return false;
        if (filtroEstado === 'por_vencer' && semaforo !== 'por_vencer') return false;
        if (filtroEstado === 'pagadas' && fac.estado !== 'pagada') return false;
        if (filtroEstado === 'anuladas' && fac.estado !== 'anulada') return false;
        if (
          filtroEstado === 'pendientes'
          && (fac.estado === 'pagada' || fac.estado === 'anulada')
        ) {
          return false;
        }
      }

      // Filtro por texto de búsqueda
      if (q) {
        const provMatch = fac.proveedorNombre.toLowerCase().includes(q);
        const numMatch = fac.numeroFactura.toLowerCase().includes(q);
        const notasMatch = fac.notas?.toLowerCase().includes(q) || false;
        const itemMatch = fac.items.some((i) => i.descripcion.toLowerCase().includes(q));
        if (!provMatch && !numMatch && !notasMatch && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [facturas, filtroEstado, busqueda]);

  // Proveedores filtrados
  const proveedoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return proveedores.filter((prov) => {
      if (filtroCategoria !== 'todas' && prov.categoria !== filtroCategoria) {
        return false;
      }

      if (q) {
        const nombreMatch = prov.nombre.toLowerCase().includes(q);
        const contactoMatch = prov.contacto?.toLowerCase().includes(q) || false;
        const telMatch = prov.telefono.includes(q);
        const nitMatch = prov.nit?.toLowerCase().includes(q) || false;
        if (!nombreMatch && !contactoMatch && !telMatch && !nitMatch) {
          return false;
        }
      }

      return true;
    });
  }, [proveedores, filtroCategoria, busqueda]);

  // Acciones
  const crearProveedorAction = useCallback(
    async (data: Omit<Proveedor, 'id' | 'negocioId' | 'creadoEn' | 'actualizadoEn'>) => {
      if (!negocioId) throw new Error('No hay negocio activo seleccionado');
      return crearProveedor({ ...data, negocioId });
    },
    [negocioId]
  );

  const actualizarProveedorAction = useCallback(
    async (id: string, updates: Partial<Omit<Proveedor, 'id' | 'negocioId' | 'creadoEn'>>) => {
      if (!negocioId) throw new Error('No hay negocio activo seleccionado');
      return actualizarProveedor(id, updates, negocioId);
    },
    [negocioId]
  );

  const eliminarProveedorAction = useCallback(
    async (id: string) => {
      if (!negocioId) throw new Error('No hay negocio activo seleccionado');
      return eliminarProveedor(id, negocioId);
    },
    [negocioId]
  );

  const crearFacturaAction = useCallback(
    async (data: Omit<CrearFacturaCompraInput, 'negocioId'>) => {
      if (!negocioId) throw new Error('No hay negocio activo seleccionado');
      return crearFacturaCompra({ ...data, negocioId });
    },
    [negocioId]
  );

  const registrarPagoAction = useCallback(
    async (facturaId: string, pagoInput: RegistrarPagoFacturaInput) => {
      if (!negocioId) throw new Error('No hay negocio activo seleccionado');
      return registrarPagoFactura(negocioId, facturaId, pagoInput);
    },
    [negocioId]
  );

  const anularFacturaAction = useCallback(
    async (facturaId: string, motivo: string) => {
      if (!negocioId) throw new Error('No hay negocio activo seleccionado');
      return anularFacturaCompra(negocioId, facturaId, motivo);
    },
    [negocioId]
  );

  const exportarCsvAction = useCallback(() => {
    exportarCuentasPorPagarCsv(facturas, proveedores, negocio?.nombre || 'La Parada');
  }, [facturas, proveedores, negocio?.nombre]);

  return {
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
  };
}
