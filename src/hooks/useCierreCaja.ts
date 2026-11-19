import { useState, useEffect, useRef, useCallback } from 'react';
import { CierreCaja, Venta, Gasto, ArqueoEfectivo, TandaVitrina } from '../types';
import { getCierreCajaHoy, getUltimosCierres, crearCierreCaja } from '../services/cierreCajaService';
import { getCajaHoy } from '../services/cajaService';
import { getCortesXHoy, getMovimientosCajaHoy } from '../services/movimientosCajaService';
import { getLiquidacionesDomiciliariosHoy } from '../services/liquidacionDomiciliariosService';
import { useNegocio } from '../context/NegocioContext';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  calcularEfectivoEsperadoTurno,
  calcularResumenMovimientosCaja,
} from '@/utils/movimientosCajaUtils';
import { calcularResumenGastosOperativos } from '@/utils/gastosUtils';
import { calcularResumenBasesRutaTurno } from '@/utils/liquidacionDomiciliariosUtils';

export interface ResumenDiaCierre {
  totalVentas: number;
  ventasPos: number;
  ventasWhatsapp: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  ventasTandas?: number;
  ventasTandasEfectivo?: number;
  ventasTandasTransferencia?: number;
  totalGastos: number;
  gastosCajaTurno?: number;
  gastosCajaMenor?: number;
  gastosBancoOExterno?: number;
  utilidadNeta: number;
  cantidadVentas: number;
  cantidadGastos: number;
  totalDescuentos: number;
  cantidadDescuentos: number;
  totalAnuladas?: number;
  cantidadAnuladas?: number;
  montoInicialCaja: number;
  saldoCajaEsperado: number;
  totalIngresosSencillo?: number;
  totalSangrias?: number;
  totalCajaMenor?: number;
  cantidadCortesX?: number;
  totalBaseEnRutaActiva?: number;
  cantidadBasesEnRutaActivas?: number;
}

export interface UseCierreCajaResult {
  cierreHoy: CierreCaja | null;
  ultimosCierres: CierreCaja[];
  resumenDia: ResumenDiaCierre;
  loading: boolean;
  error: string | null;
  ejecutarCierreHoy: (
    notas?: string,
    extra?: {
      arqueo?: ArqueoEfectivo;
      cajeroNombre?: string;
    }
  ) => Promise<string>;
  refresh: () => Promise<void>;
}

const RESUMEN_INICIAL: ResumenDiaCierre = {
  totalVentas: 0,
  ventasPos: 0,
  ventasWhatsapp: 0,
  ventasEfectivo: 0,
  ventasTransferencia: 0,
  ventasTandas: 0,
  ventasTandasEfectivo: 0,
  ventasTandasTransferencia: 0,
  totalGastos: 0,
  utilidadNeta: 0,
  cantidadVentas: 0,
  cantidadGastos: 0,
  totalDescuentos: 0,
  cantidadDescuentos: 0,
  totalAnuladas: 0,
  cantidadAnuladas: 0,
  montoInicialCaja: 0,
  saldoCajaEsperado: 0,
  totalIngresosSencillo: 0,
  totalSangrias: 0,
  totalCajaMenor: 0,
  cantidadCortesX: 0,
};

export function useCierreCaja(): UseCierreCajaResult {
  const { negocioActual } = useNegocio();
  const tenantId = negocioActual.id;

  const [cierreHoy, setCierreHoy] = useState<CierreCaja | null>(null);
  const [ultimosCierres, setUltimosCierres] = useState<CierreCaja[]>([]);
  const [resumenDia, setResumenDia] = useState<ResumenDiaCierre>(RESUMEN_INICIAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestGenerationRef = useRef(0);

  const cargarDatos = useCallback(async () => {
    const generation = ++requestGenerationRef.current;
    setLoading(true);
    try {
      const hoyInicio = new Date();
      hoyInicio.setHours(0, 0, 0, 0);
      const hoyFin = new Date();
      hoyFin.setHours(23, 59, 59, 999);

      const [
        cierreHoyData,
        ultimosData,
        cajaHoyData,
        ventasSnap,
        gastosSnap,
        tandasSnap,
        movimientosCajaHoy,
        cortesXHoy,
        liqDomiciliariosHoy,
      ] = await Promise.all([
        getCierreCajaHoy(tenantId),
        getUltimosCierres(tenantId, 30),
        getCajaHoy(tenantId),
        getDocs(
          query(
            collection(db, 'ventas'),
            where('negocioId', '==', tenantId),
            where('fecha', '>=', Timestamp.fromDate(hoyInicio)),
            where('fecha', '<=', Timestamp.fromDate(hoyFin))
          )
        ),
        getDocs(
          query(
            collection(db, 'gastos'),
            where('negocioId', '==', tenantId),
            where('fecha', '>=', Timestamp.fromDate(hoyInicio)),
            where('fecha', '<=', Timestamp.fromDate(hoyFin))
          )
        ),
        getDocs(
          query(
            collection(db, 'tandas_vitrina'),
            where('negocioId', '==', tenantId),
            where('fecha', '>=', Timestamp.fromDate(hoyInicio)),
            where('fecha', '<=', Timestamp.fromDate(hoyFin))
          )
        ).catch(() => ({ docs: [] })),
        getMovimientosCajaHoy(tenantId).catch(() => []),
        getCortesXHoy(tenantId).catch(() => []),
        getLiquidacionesDomiciliariosHoy(tenantId).catch(() => []),
      ]);

      if (generation !== requestGenerationRef.current) return;

      let totalVentas = 0;
      let ventasPos = 0;
      let ventasWhatsapp = 0;
      let ventasEfectivo = 0;
      let ventasTransferencia = 0;
      let totalDescuentos = 0;
      let cantidadDescuentos = 0;
      let totalAnuladas = 0;
      let cantidadAnuladas = 0;
      let cantidadVentasValidas = 0;

      ventasSnap.docs.forEach((docSnap) => {
        const v = docSnap.data() as Venta;
        const total = v.total || 0;

        if (v.estado === 'anulada') {
          totalAnuladas += total;
          cantidadAnuladas += 1;
          return;
        }

        cantidadVentasValidas += 1;
        totalVentas += total;

        if (v.descuento && v.descuento > 0) {
          totalDescuentos += v.descuento;
          cantidadDescuentos += 1;
        }

        if (v.origen === 'pos') {
          ventasPos += total;
        } else {
          ventasWhatsapp += total;
        }

        if (v.metodoPago === 'transferencia') {
          ventasTransferencia += total;
        } else {
          ventasEfectivo += total;
        }
      });

      let ventasTandas = 0;
      let ventasTandasEfectivo = 0;
      let ventasTandasTransferencia = 0;

      tandasSnap.docs.forEach((docSnap) => {
        const t = docSnap.data() as TandaVitrina;
        if (t.resumen) {
          ventasTandas += t.resumen.totalVentaEstimada || 0;
          ventasTandasEfectivo += t.resumen.totalEfectivoEsperado || 0;
          ventasTandasTransferencia += t.resumen.totalTransferencias || 0;
        }
      });

      // Sumar al total general de ventas, efectivo y transferencias del turno
      totalVentas += ventasTandas;
      ventasEfectivo += ventasTandasEfectivo;
      ventasTransferencia += ventasTandasTransferencia;

      const gastosDelDiaList = gastosSnap.docs.map((docSnap) => docSnap.data() as Gasto);
      const resumenGastos = calcularResumenGastosOperativos(gastosDelDiaList);
      const totalGastos = resumenGastos.totalGastos;
      const gastosCajaTurno = resumenGastos.totalCajaTurno;
      const gastosCajaMenor = resumenGastos.totalCajaMenor;
      const gastosBancoOExterno =
        resumenGastos.totalBancoTransferencia + resumenGastos.totalEfectivoExterno;

      const montoInicialCaja = cajaHoyData?.montoInicial ?? 0;
      const resumenMovimientos = calcularResumenMovimientosCaja(movimientosCajaHoy);
      const resumenBasesRuta = calcularResumenBasesRutaTurno(liqDomiciliariosHoy);
      // Saldo en efectivo esperado: base inicial + ingresos directos + ventas en efectivo + sencillos - sangrias - caja menor - gastos de caja turno - bases en ruta activas
      const saldoCajaEsperado = calcularEfectivoEsperadoTurno({
        montoInicialCaja,
        ingresosDirectosCaja: cajaHoyData?.ingresos ?? 0,
        egresosDirectosCaja: cajaHoyData?.egresos ?? 0,
        ventasEfectivo,
        totalGastos: gastosCajaTurno,
        movimientos: movimientosCajaHoy,
        basesEnRutaActivas: resumenBasesRuta.totalBaseEnRutaActiva,
      });

      setCierreHoy(cierreHoyData);
      setUltimosCierres(ultimosData);
      setResumenDia({
        totalVentas,
        ventasPos,
        ventasWhatsapp,
        ventasEfectivo,
        ventasTransferencia,
        ventasTandas,
        ventasTandasEfectivo,
        ventasTandasTransferencia,
        totalGastos,
        gastosCajaTurno,
        gastosCajaMenor,
        gastosBancoOExterno,
        utilidadNeta: totalVentas - totalGastos,
        cantidadVentas: cantidadVentasValidas,
        cantidadGastos: gastosSnap.docs.length,
        totalDescuentos,
        cantidadDescuentos,
        totalAnuladas,
        cantidadAnuladas,
        montoInicialCaja,
        saldoCajaEsperado,
        totalIngresosSencillo: resumenMovimientos.totalIngresosSencillo,
        totalSangrias: resumenMovimientos.totalSangrias,
        totalCajaMenor: resumenMovimientos.totalCajaMenor,
        cantidadCortesX: cortesXHoy.length,
        totalBaseEnRutaActiva: resumenBasesRuta.totalBaseEnRutaActiva,
        cantidadBasesEnRutaActivas: resumenBasesRuta.cantidadBasesActivas,
      });
      setError(null);
    } catch (err) {
      if (generation !== requestGenerationRef.current) return;
      const errMsg = err instanceof Error ? err.message : 'Error desconocido al cargar cierres de caja';
      setError(errMsg);
    } finally {
      if (generation === requestGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [tenantId]);

  useEffect(() => {
    cargarDatos();
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [cargarDatos]);

  const ejecutarCierreHoy = async (
    notas?: string,
    extra?: {
      arqueo?: ArqueoEfectivo;
      cajeroNombre?: string;
    }
  ): Promise<string> => {
    try {
      const nuevoId = await crearCierreCaja(
        tenantId,
        resumenDia.totalVentas,
        resumenDia.totalGastos,
        notas,
        {
          ventasPos: resumenDia.ventasPos,
          ventasWhatsapp: resumenDia.ventasWhatsapp,
          ventasTandas: resumenDia.ventasTandas,
          ventasTandasEfectivo: resumenDia.ventasTandasEfectivo,
          ventasTandasTransferencia: resumenDia.ventasTandasTransferencia,
          totalDescuentos: resumenDia.totalDescuentos,
          cantidadDescuentos: resumenDia.cantidadDescuentos,
          totalAnuladas: resumenDia.totalAnuladas,
          cantidadAnuladas: resumenDia.cantidadAnuladas,
          arqueo: extra?.arqueo,
          cajeroNombre: extra?.cajeroNombre,
          efectivoInicial: resumenDia.montoInicialCaja,
          totalIngresosSencillo: resumenDia.totalIngresosSencillo,
          totalSangrias: resumenDia.totalSangrias,
          totalCajaMenor: resumenDia.totalCajaMenor,
          cantidadCortesX: resumenDia.cantidadCortesX,
        }
      );
      await cargarDatos();
      return nuevoId;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error al registrar el cierre de caja';
      setError(errMsg);
      throw err;
    }
  };

  return {
    cierreHoy,
    ultimosCierres,
    resumenDia,
    loading,
    error,
    ejecutarCierreHoy,
    refresh: cargarDatos,
  };
}
