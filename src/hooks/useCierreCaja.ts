import { useState, useEffect, useRef, useCallback } from 'react';
import { CierreCaja, Venta, Gasto, ArqueoEfectivo } from '../types';
import { getCierreCajaHoy, getUltimosCierres, crearCierreCaja } from '../services/cierreCajaService';
import { getCajaHoy } from '../services/cajaService';
import { useNegocio } from '../context/NegocioContext';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface ResumenDiaCierre {
  totalVentas: number;
  ventasPos: number;
  ventasWhatsapp: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  totalGastos: number;
  utilidadNeta: number;
  cantidadVentas: number;
  cantidadGastos: number;
  montoInicialCaja: number;
  saldoCajaEsperado: number;
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
  totalGastos: 0,
  utilidadNeta: 0,
  cantidadVentas: 0,
  cantidadGastos: 0,
  montoInicialCaja: 0,
  saldoCajaEsperado: 0,
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

      const [cierreHoyData, ultimosData, cajaHoyData, ventasSnap, gastosSnap] = await Promise.all([
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
      ]);

      if (generation !== requestGenerationRef.current) return;

      let totalVentas = 0;
      let ventasPos = 0;
      let ventasWhatsapp = 0;
      let ventasEfectivo = 0;
      let ventasTransferencia = 0;

      ventasSnap.docs.forEach((docSnap) => {
        const v = docSnap.data() as Venta;
        const total = v.total || 0;
        totalVentas += total;

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

      let totalGastos = 0;
      gastosSnap.docs.forEach((docSnap) => {
        const g = docSnap.data() as Gasto;
        totalGastos += g.monto || 0;
      });

      const montoInicialCaja = cajaHoyData?.montoInicial ?? 0;
      // Saldo en efectivo esperado: base inicial + ingresos directos a caja + ventas en efectivo - gastos
      const saldoCajaEsperado = Math.max(
        0,
        montoInicialCaja + (cajaHoyData?.ingresos ?? 0) + ventasEfectivo - totalGastos
      );

      setCierreHoy(cierreHoyData);
      setUltimosCierres(ultimosData);
      setResumenDia({
        totalVentas,
        ventasPos,
        ventasWhatsapp,
        ventasEfectivo,
        ventasTransferencia,
        totalGastos,
        utilidadNeta: totalVentas - totalGastos,
        cantidadVentas: ventasSnap.docs.length,
        cantidadGastos: gastosSnap.docs.length,
        montoInicialCaja,
        saldoCajaEsperado,
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
          arqueo: extra?.arqueo,
          cajeroNombre: extra?.cajeroNombre,
          efectivoInicial: resumenDia.montoInicialCaja,
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
