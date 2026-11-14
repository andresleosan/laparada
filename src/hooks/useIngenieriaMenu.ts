import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useNegocio } from '@/context/NegocioContext';
import { useProductos } from '@/hooks/useProductos';
import { useInventario } from '@/hooks/useInventario';
import { useKardex } from '@/hooks/useKardex';
import {
  actualizarCombo,
  actualizarProducto,
  toggleComboDestacado,
  toggleProductoDestacado,
} from '@/services/productosService';
import { getConfiguracionFiscal } from '@/services/facturacionService';
import { requireTenantId } from '@/security/tenantScope';
import { obtenerRangoFechaReporte } from '@/utils/analiticaFinancieraUtils';
import {
  construirMatrizIngenieriaMenu,
  descargarIngenieriaMenuCsv,
  FOOD_COST_OBJETIVO_DEFAULT_PCT,
} from '@/utils/ingenieriaMenuUtils';
import type {
  ItemIngenieriaMenu,
  RangoFechaReporte,
  RedondeoPrecioCOP,
  ResumenIngenieriaMenu,
  TipoItemMenuIngenieria,
  TipoPeriodoReporte,
  Venta,
} from '@/types';

export interface UseIngenieriaMenuResult {
  resumen: ResumenIngenieriaMenu;
  insumos: ReturnType<typeof useInventario>['insumos'];
  movimientosKardex: ReturnType<typeof useKardex>['movimientos'];
  categoriasDisponibles: string[];
  tipoPeriodo: TipoPeriodoReporte;
  rangoPeriodo: RangoFechaReporte;
  foodCostObjetivoPct: number;
  setFoodCostObjetivoPct: (pct: number) => void;
  redondeo: RedondeoPrecioCOP;
  setRedondeo: (redondeo: RedondeoPrecioCOP) => void;
  considerarImpuesto: boolean;
  setConsiderarImpuesto: (value: boolean) => void;
  tarifaImpuestoDetectada: number;
  etiquetaImpuestoDetectado: string;
  tipoFiltro: 'todos' | TipoItemMenuIngenieria;
  setTipoFiltro: (tipo: 'todos' | TipoItemMenuIngenieria) => void;
  categoriaFiltro: string;
  setCategoriaFiltro: (categoria: string) => void;
  incluirNoDisponibles: boolean;
  setIncluirNoDisponibles: (value: boolean) => void;
  loading: boolean;
  error: string | null;
  cambiarPeriodo: (
    tipo: TipoPeriodoReporte,
    customInicio?: Date,
    customFin?: Date
  ) => Promise<void>;
  aplicarNuevoPrecio: (
    item: ItemIngenieriaMenu,
    nuevoPrecioCOP: number
  ) => Promise<void>;
  guardarCostoReferencia: (
    item: ItemIngenieriaMenu,
    costoReferenciaCOP: number
  ) => Promise<void>;
  guardarCostoUnitarioInsumo: (
    insumoId: string,
    costoUnitarioCOP: number
  ) => Promise<void>;
  alternarDestacadoItem: (item: ItemIngenieriaMenu) => Promise<void>;
  exportarCsv: () => void;
  refresh: () => Promise<void>;
}

export function useIngenieriaMenu(): UseIngenieriaMenuResult {
  const { negocioActual } = useNegocio();
  const tenantId = requireTenantId(negocioActual.id);

  const {
    productos,
    combos,
    loading: loadingProductos,
    error: errorProductos,
    refresh: refreshProductos,
  } = useProductos();

  const {
    insumos,
    loading: loadingInsumos,
    error: errorInsumos,
    actualizar: actualizarInsumoCatalogo,
    refresh: refreshInventario,
  } = useInventario();

  const {
    movimientos: movimientosKardex,
    loading: loadingKardex,
    refresh: refreshKardex,
  } = useKardex({ insumos, limite: 300 });

  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodoReporte>('30dias');
  const [rangoPeriodo, setRangoPeriodo] = useState<RangoFechaReporte>(() =>
    obtenerRangoFechaReporte('30dias')
  );
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [errorVentas, setErrorVentas] = useState<string | null>(null);

  const [foodCostObjetivoPct, setFoodCostObjetivoPct] = useState<number>(
    FOOD_COST_OBJETIVO_DEFAULT_PCT
  );
  const [redondeo, setRedondeo] = useState<RedondeoPrecioCOP>('500');
  const [considerarImpuesto, setConsiderarImpuesto] = useState<boolean>(false);
  const [tarifaImpuestoDetectada, setTarifaImpuestoDetectada] = useState<number>(0);
  const [etiquetaImpuestoDetectado, setEtiquetaImpuestoDetectado] = useState<string>('Sin impuesto');

  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoItemMenuIngenieria>('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [incluirNoDisponibles, setIncluirNoDisponibles] = useState<boolean>(true);

  const requestGenerationRef = useRef(0);

  const cargarVentasYFiscal = useCallback(
    async (rango: RangoFechaReporte) => {
      const generation = ++requestGenerationRef.current;
      setLoadingVentas(true);

      try {
        const scopedTenant = requireTenantId(tenantId);
        const tsInicio = Timestamp.fromDate(rango.inicio);
        const tsFin = Timestamp.fromDate(rango.fin);

        const ventasQuery = query(
          collection(db, 'ventas'),
          where('negocioId', '==', scopedTenant),
          where('fecha', '>=', tsInicio),
          where('fecha', '<=', tsFin),
          orderBy('fecha', 'desc')
        );

        const [ventasSnap, configFiscal] = await Promise.all([
          getDocs(ventasQuery),
          getConfiguracionFiscal(scopedTenant),
        ]);

        if (generation !== requestGenerationRef.current) return;

        const ventasData = ventasSnap.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        } as Venta));

        setVentas(ventasData);
        setErrorVentas(null);

        if (
          configFiscal.tarifaDefault.tipo !== 'ninguno' &&
          configFiscal.tarifaDefault.porcentaje > 0 &&
          configFiscal.preciosIncluyenImpuesto
        ) {
          setTarifaImpuestoDetectada(configFiscal.tarifaDefault.porcentaje);
          setEtiquetaImpuestoDetectado(
            `${configFiscal.tarifaDefault.tipo.toUpperCase()} ${configFiscal.tarifaDefault.porcentaje}%`
          );
        } else {
          setTarifaImpuestoDetectada(0);
          setEtiquetaImpuestoDetectado('Exento / 0%');
        }
      } catch (err) {
        if (generation !== requestGenerationRef.current) return;
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        setErrorVentas(`No se pudieron cargar las ventas del período: ${msg}`);
      } finally {
        if (generation === requestGenerationRef.current) {
          setLoadingVentas(false);
        }
      }
    },
    [tenantId]
  );

  useEffect(() => {
    cargarVentasYFiscal(rangoPeriodo);
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [cargarVentasYFiscal, rangoPeriodo]);

  const cambiarPeriodo = useCallback(
    async (tipo: TipoPeriodoReporte, customInicio?: Date, customFin?: Date) => {
      const nuevoRango = obtenerRangoFechaReporte(tipo, customInicio, customFin);
      setTipoPeriodo(tipo);
      setRangoPeriodo(nuevoRango);
    },
    []
  );

  const categoriasDisponibles = useMemo(() => {
    const set = new Set<string>();
    productos.forEach((p) => {
      if (p.categoria?.trim()) set.add(p.categoria.trim());
    });
    combos.forEach((c) => {
      if (c.categoria?.trim()) set.add(c.categoria.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es-CO'));
  }, [productos, combos]);

  const tasaImpuestoAplicada = considerarImpuesto ? tarifaImpuestoDetectada : 0;

  const resumen = useMemo<ResumenIngenieriaMenu>(
    () =>
      construirMatrizIngenieriaMenu({
        productos,
        combos,
        ventas,
        insumos,
        movimientosKardex,
        periodo: rangoPeriodo,
        foodCostObjetivoPct,
        redondeo,
        tasaImpuestoIncluidoPct: tasaImpuestoAplicada,
        tipoFiltro,
        categoriaFiltro,
        incluirNoDisponibles,
      }),
    [
      productos,
      combos,
      ventas,
      insumos,
      movimientosKardex,
      rangoPeriodo,
      foodCostObjetivoPct,
      redondeo,
      tasaImpuestoAplicada,
      tipoFiltro,
      categoriaFiltro,
      incluirNoDisponibles,
    ]
  );

  const aplicarNuevoPrecio = useCallback(
    async (item: ItemIngenieriaMenu, nuevoPrecioCOP: number) => {
      const precioValido = Math.round(nuevoPrecioCOP);
      if (!Number.isFinite(precioValido) || precioValido <= 0) {
        throw new Error('El precio de venta debe ser mayor a $0 COP');
      }

      if (item.tipo === 'combo') {
        await actualizarCombo(item.id, { precioEspecial: precioValido }, tenantId);
      } else {
        await actualizarProducto(item.id, { precio: precioValido }, tenantId);
      }
      refreshProductos();
    },
    [tenantId, refreshProductos]
  );

  const guardarCostoReferencia = useCallback(
    async (item: ItemIngenieriaMenu, costoReferenciaCOP: number) => {
      const costoValido = Math.max(0, Math.round(costoReferenciaCOP));
      if (!Number.isFinite(costoValido)) {
        throw new Error('El costo de referencia debe ser un número válido');
      }

      if (item.tipo === 'combo') {
        await actualizarCombo(item.id, { costoReferencia: costoValido }, tenantId);
      } else {
        await actualizarProducto(item.id, { costoReferencia: costoValido }, tenantId);
      }
      refreshProductos();
    },
    [tenantId, refreshProductos]
  );

  const guardarCostoUnitarioInsumo = useCallback(
    async (insumoId: string, costoUnitarioCOP: number) => {
      const costoValido = Math.max(0, Math.round(costoUnitarioCOP));
      if (!Number.isFinite(costoValido)) {
        throw new Error('El costo unitario debe ser un número válido');
      }
      await actualizarInsumoCatalogo(insumoId, { costoUnitario: costoValido });
    },
    [actualizarInsumoCatalogo]
  );

  const alternarDestacadoItem = useCallback(
    async (item: ItemIngenieriaMenu) => {
      const nuevoValor = !item.destacado;
      if (item.tipo === 'combo') {
        await toggleComboDestacado(item.id, nuevoValor, tenantId);
      } else {
        await toggleProductoDestacado(item.id, nuevoValor, tenantId);
      }
      refreshProductos();
    },
    [tenantId, refreshProductos]
  );

  const exportarCsv = useCallback(() => {
    descargarIngenieriaMenuCsv(resumen, negocioActual.nombre || 'La Parada');
  }, [resumen, negocioActual.nombre]);

  const refresh = useCallback(async () => {
    refreshProductos();
    await Promise.all([
      refreshInventario(),
      refreshKardex(),
      cargarVentasYFiscal(rangoPeriodo),
    ]);
  }, [refreshProductos, refreshInventario, refreshKardex, cargarVentasYFiscal, rangoPeriodo]);

  const errorProductosMsg =
    typeof errorProductos === 'string'
      ? errorProductos
      : errorProductos?.message || null;
  const loading = loadingProductos || loadingInsumos || loadingKardex || loadingVentas;
  const error = errorProductosMsg || errorInsumos || errorVentas || null;

  return {
    resumen,
    insumos,
    movimientosKardex,
    categoriasDisponibles,
    tipoPeriodo,
    rangoPeriodo,
    foodCostObjetivoPct,
    setFoodCostObjetivoPct,
    redondeo,
    setRedondeo,
    considerarImpuesto,
    setConsiderarImpuesto,
    tarifaImpuestoDetectada,
    etiquetaImpuestoDetectado,
    tipoFiltro,
    setTipoFiltro,
    categoriaFiltro,
    setCategoriaFiltro,
    incluirNoDisponibles,
    setIncluirNoDisponibles,
    loading,
    error,
    cambiarPeriodo,
    aplicarNuevoPrecio,
    guardarCostoReferencia,
    guardarCostoUnitarioInsumo,
    alternarDestacadoItem,
    exportarCsv,
    refresh,
  };
}
