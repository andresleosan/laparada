// src/hooks/useContabilidad.ts
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
import type {
  AsientoContableExportacion,
  ConciliacionContableCerrada,
  ConsolidadoLibroFiscal,
  LiquidacionFormulario310,
  MapeoPlanCuentasPUC,
  RangoFechaContable,
  ResumenConciliacionContable,
  SoftwareContableTarget,
  TipoPeriodoContable,
} from '@/types/contabilidad';
import type { CierreCaja, Gasto, Venta } from '@/types';
import type { ConfiguracionFiscal } from '@/types/facturacion';
import { getConfiguracionFiscal } from '@/services/facturacionService';
import {
  getConfiguracionPuc,
  getConciliacionesCerradas,
  guardarConciliacionCerrada,
  guardarConfiguracionPuc,
  onConciliacionesCerradasChange,
} from '@/services/contabilidadService';
import {
  calcularConciliacionVentasVsCaja,
  calcularLiquidacionFormulario310,
  descargarArchivoCsv,
  exportarConciliacionCSV,
  exportarFormulario310CSV,
  exportarLibroFiscalCSV,
  exportarSoftwareContableCSV,
  generarAsientosContablesVentas,
  generarLibroFiscalDiario,
  generarResumenWhatsAppContable,
  getMapeoPucDefault,
  getRangoFechaContable,
} from '@/utils/contabilidadUtils';

export function useContabilidad() {
  const { negocioActual } = useNegocio();
  const negocioId = negocioActual.id;

  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodoContable>('bimestre_actual');
  const [anoSeleccionado, setAnoSeleccionado] = useState<number>(() => new Date().getFullYear());
  const [bimestreSeleccionado, setBimestreSeleccionado] = useState<number>(() => {
    const mes = new Date().getMonth();
    return Math.floor(mes / 2) + 1;
  });
  const [customRange, setCustomRange] = useState<{ inicio: Date; fin: Date } | undefined>(undefined);

  // Datos crudos
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cierres, setCierres] = useState<CierreCaja[]>([]);
  const [configuracionFiscal, setConfiguracionFiscal] = useState<ConfiguracionFiscal | null>(null);
  const [mapeoPuc, setMapeoPuc] = useState<MapeoPlanCuentasPUC>(getMapeoPucDefault());
  const [conciliacionesCerradas, setConciliacionesCerradas] = useState<ConciliacionContableCerrada[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestGenRef = useRef(0);

  // Rango contable calculado de manera reactiva
  const rangoPeriodo: RangoFechaContable = useMemo(() => {
    return getRangoFechaContable(
      tipoPeriodo,
      new Date(anoSeleccionado, (bimestreSeleccionado - 1) * 2, 1),
      customRange,
      bimestreSeleccionado
    );
  }, [tipoPeriodo, anoSeleccionado, bimestreSeleccionado, customRange]);

  // Cargar configuración fiscal y PUC
  useEffect(() => {
    if (!negocioId) return;

    let mounted = true;
    Promise.all([
      getConfiguracionFiscal(negocioId),
      getConfiguracionPuc(negocioId),
    ])
      .then(([cfgFiscal, cfgPuc]) => {
        if (!mounted) return;
        setConfiguracionFiscal(cfgFiscal);
        setMapeoPuc(cfgPuc);
      })
      .catch((err) => {
        console.error('Error al cargar configuración fiscal/PUC:', err);
      });

    const unsubConc = onConciliacionesCerradasChange(negocioId, (items) => {
      if (mounted) setConciliacionesCerradas(items);
    });

    return () => {
      mounted = false;
      unsubConc();
    };
  }, [negocioId]);

  // Cargar ventas, gastos y cierres para el rango contable activo
  const cargarDatosPeriodo = useCallback(
    async (rango: RangoFechaContable) => {
      if (!negocioId) return;
      const gen = ++requestGenRef.current;
      setLoading(true);
      setError(null);

      try {
        const tsInicio = Timestamp.fromDate(rango.inicio);
        const tsFin = Timestamp.fromDate(rango.fin);

        const [ventasSnap, gastosSnap, cierresSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'ventas'),
              where('negocioId', '==', negocioId),
              where('fecha', '>=', tsInicio),
              where('fecha', '<=', tsFin),
              orderBy('fecha', 'desc')
            )
          ),
          getDocs(
            query(
              collection(db, 'gastos'),
              where('negocioId', '==', negocioId),
              where('fecha', '>=', tsInicio),
              where('fecha', '<=', tsFin),
              orderBy('fecha', 'desc')
            )
          ),
          getDocs(
            query(
              collection(db, 'cierres_caja'),
              where('negocioId', '==', negocioId),
              where('fecha', '>=', tsInicio),
              where('fecha', '<=', tsFin),
              orderBy('fecha', 'desc')
            )
          ),
        ]);

        if (gen !== requestGenRef.current) return;

        const ventasList = ventasSnap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as Venta[];

        const gastosList = gastosSnap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as Gasto[];

        const cierresList = cierresSnap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as CierreCaja[];

        setVentas(ventasList);
        setGastos(gastosList);
        setCierres(cierresList);
        setLoading(false);
      } catch (err: unknown) {
        if (gen !== requestGenRef.current) return;
        console.error('Error al consultar datos contables:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Error de conexión al consultar los registros contables.'
        );
        setLoading(false);
      }
    },
    [negocioId]
  );

  useEffect(() => {
    cargarDatosPeriodo(rangoPeriodo);
  }, [cargarDatosPeriodo, rangoPeriodo]);

  // Cálculos contables memoizados
  const libroFiscal: ConsolidadoLibroFiscal = useMemo(() => {
    return generarLibroFiscalDiario(ventas, gastos, rangoPeriodo, configuracionFiscal);
  }, [ventas, gastos, rangoPeriodo, configuracionFiscal]);

  const formulario310: LiquidacionFormulario310 = useMemo(() => {
    return calcularLiquidacionFormulario310(
      ventas,
      rangoPeriodo.ano,
      rangoPeriodo.bimestre || bimestreSeleccionado,
      configuracionFiscal
    );
  }, [ventas, rangoPeriodo, bimestreSeleccionado, configuracionFiscal]);

  const conciliacion: ResumenConciliacionContable = useMemo(() => {
    return calcularConciliacionVentasVsCaja(ventas, cierres, gastos, rangoPeriodo);
  }, [ventas, cierres, gastos, rangoPeriodo]);

  const asientosContables: AsientoContableExportacion[] = useMemo(() => {
    return generarAsientosContablesVentas(ventas, mapeoPuc, negocioActual.nombre);
  }, [ventas, mapeoPuc, negocioActual.nombre]);

  // Acciones de control y periodo
  const cambiarPeriodo = (
    nuevoTipo: TipoPeriodoContable,
    nuevoAno?: number,
    nuevoBimestre?: number
  ) => {
    if (nuevoAno) setAnoSeleccionado(nuevoAno);
    if (nuevoBimestre) setBimestreSeleccionado(nuevoBimestre);
    setTipoPeriodo(nuevoTipo);
  };

  const cambiarRangoPersonalizado = (inicio: Date, fin: Date) => {
    setCustomRange({ inicio, fin });
    setTipoPeriodo('personalizado');
  };

  const guardarMapeo = async (nuevoMapeo: Partial<MapeoPlanCuentasPUC>) => {
    if (!negocioId) return;
    await guardarConfiguracionPuc(negocioId, nuevoMapeo);
    setMapeoPuc((prev) => ({ ...prev, ...nuevoMapeo }));
  };

  const registrarCierreConciliacion = async (periodoMes: string, notas?: string) => {
    if (!negocioId) return;
    const docId = await guardarConciliacionCerrada(
      negocioId,
      conciliacion,
      periodoMes,
      'Administrador',
      notas
    );
    const listaActualizada = await getConciliacionesCerradas(negocioId);
    setConciliacionesCerradas(listaActualizada);
    return docId;
  };

  // Disparadores de exportación
  const exportarLibroFiscal = () => {
    const nit = configuracionFiscal?.nit || '222222222222';
    const csv = exportarLibroFiscalCSV(libroFiscal, negocioActual.nombre, nit);
    const fechaArchivo = new Date().toISOString().slice(0, 10);
    descargarArchivoCsv(csv, `libro_fiscal_art616_${negocioId}_${fechaArchivo}.csv`);
  };

  const exportarFormulario310 = () => {
    const nit = configuracionFiscal?.nit || '222222222222';
    const csv = exportarFormulario310CSV(formulario310, negocioActual.nombre, nit);
    descargarArchivoCsv(
      csv,
      `formulario_310_dian_bimestre_${formulario310.bimestre}_${formulario310.anoGravable}.csv`
    );
  };

  const exportarConciliacion = () => {
    const csv = exportarConciliacionCSV(conciliacion, negocioActual.nombre);
    const fechaArchivo = new Date().toISOString().slice(0, 10);
    descargarArchivoCsv(csv, `conciliacion_caja_ventas_${negocioId}_${fechaArchivo}.csv`);
  };

  const exportarSoftware = (software: SoftwareContableTarget) => {
    const csv = exportarSoftwareContableCSV(asientosContables, software, negocioActual.nombre);
    const fechaArchivo = new Date().toISOString().slice(0, 10);
    descargarArchivoCsv(
      csv,
      `interfaz_${software}_${negocioId}_${fechaArchivo}.csv`
    );
  };

  const obtenerMensajeWhatsApp = () => {
    return generarResumenWhatsAppContable(
      formulario310,
      conciliacion,
      libroFiscal,
      negocioActual.nombre
    );
  };

  const refresh = () => {
    cargarDatosPeriodo(rangoPeriodo);
  };

  return {
    // Estados y rango
    tipoPeriodo,
    anoSeleccionado,
    bimestreSeleccionado,
    rangoPeriodo,
    loading,
    error,
    // Datos crudos y configuraciones
    ventas,
    gastos,
    cierres,
    configuracionFiscal,
    mapeoPuc,
    conciliacionesCerradas,
    // Consolidados y auditoría
    libroFiscal,
    formulario310,
    conciliacion,
    asientosContables,
    // Acciones
    cambiarPeriodo,
    cambiarRangoPersonalizado,
    guardarMapeo,
    registrarCierreConciliacion,
    exportarLibroFiscal,
    exportarFormulario310,
    exportarConciliacion,
    exportarSoftware,
    obtenerMensajeWhatsApp,
    refresh,
  };
}
