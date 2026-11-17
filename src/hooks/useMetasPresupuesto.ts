import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  ConfiguracionMetasPresupuesto,
  GuardarMetasPresupuestoInput,
  ResumenMetasYPresupuesto,
} from '@/types';
import {
  copiarMetasPresupuestoDeMesAnterior,
  getDatosOperativosMes,
  getHistorialMetasPresupuesto,
  guardarMetasPresupuestoMes,
  onMetasPresupuestoMesChange,
  type DatosOperativosMes,
} from '@/services/metasPresupuestoService';
import { crearNotificacion } from '@/services/notificacionesService';
import {
  construirUrlWhatsAppMetas,
  descargarReporteMetasPresupuestoCSV,
  evaluarCentroMetasPresupuesto,
  generarResumenMetasWhatsApp,
  normalizarMesKey,
  obtenerMesKey,
} from '@/utils/metasPresupuestoUtils';

const STORAGE_ALERTAS_EMITIDAS_KEY = 'laparada_alertas_presupuesto_emitidas_v1';

function leerAlertasEmitidas(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_ALERTAS_EMITIDAS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function registrarAlertaEmitida(clave: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const actual = leerAlertasEmitidas();
    actual.add(clave);
    const ultimas = Array.from(actual).slice(-120);
    window.localStorage.setItem(STORAGE_ALERTAS_EMITIDAS_KEY, JSON.stringify(ultimas));
  } catch {
    // Silencioso si localStorage está restringido
  }
}

export interface UseMetasPresupuestoOptions {
  mesKeyInicial?: string;
  datosMesExternos?: (DatosOperativosMes & { mesKey: string }) | null;
}

export interface UseMetasPresupuestoResult {
  mesKey: string;
  cambiarMes: (nuevoMesKey: string) => void;
  configuracionGuardada: ConfiguracionMetasPresupuesto | null;
  resumen: ResumenMetasYPresupuesto;
  tieneMesAnteriorParaCopiar: boolean;
  loading: boolean;
  guardando: boolean;
  error: string | null;
  guardarConfiguracion: (input: GuardarMetasPresupuestoInput) => Promise<void>;
  copiarMesAnterior: () => Promise<void>;
  notificarDesviacionesEnBandeja: (forzar?: boolean) => Promise<number>;
  exportarPresupuestoCSV: () => void;
  obtenerTextoWhatsApp: () => string;
  obtenerUrlWhatsApp: () => string;
  refresh: () => Promise<void>;
}

const DATOS_VACIOS: DatosOperativosMes = {
  ventasMes: [],
  gastosMes: [],
  movimientosKardexMes: [],
  productos: [],
  combos: [],
  insumos: [],
};

export function useMetasPresupuesto(
  options: UseMetasPresupuestoOptions = {}
): UseMetasPresupuestoResult {
  const { negocioActual, usuarioNegocio, esSuperAdmin } = useNegocio();
  const tenantId = negocioActual.id;

  const [mesKey, setMesKey] = useState<string>(() =>
    normalizarMesKey(options.mesKeyInicial || obtenerMesKey())
  );
  const [configuracionGuardada, setConfiguracionGuardada] =
    useState<ConfiguracionMetasPresupuesto | null>(null);
  const [tieneMesAnteriorParaCopiar, setTieneMesAnteriorParaCopiar] = useState(false);
  const [datosMesLocales, setDatosMesLocales] = useState<DatosOperativosMes>(DATOS_VACIOS);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestGenRef = useRef(0);
  const datosMesExternos = options.datosMesExternos || null;
  const usaDatosExternos = Boolean(datosMesExternos && datosMesExternos.mesKey === mesKey);

  const cambiarMes = useCallback((nuevoMesKey: string) => {
    setMesKey(normalizarMesKey(nuevoMesKey));
  }, []);

  // 1. Suscripción en tiempo real a la configuración del mes
  useEffect(() => {
    setLoadingConfig(true);
    const unsub = onMetasPresupuestoMesChange(
      tenantId,
      mesKey,
      (cfg) => {
        setConfiguracionGuardada(cfg);
        setLoadingConfig(false);
      },
      () => {
        setLoadingConfig(false);
      }
    );
    return () => unsub();
  }, [tenantId, mesKey]);

  // 2. Verificar si existe historial de meses previos para clonar en 1 clic
  useEffect(() => {
    let cancelado = false;
    getHistorialMetasPresupuesto(tenantId, 6)
      .then((lista) => {
        if (cancelado) return;
        setTieneMesAnteriorParaCopiar(lista.some((item) => item.mesKey !== mesKey));
      })
      .catch(() => {
        if (!cancelado) setTieneMesAnteriorParaCopiar(false);
      });
    return () => {
      cancelado = true;
    };
  }, [tenantId, mesKey, configuracionGuardada?.id]);

  // 3. Cargar datos operativos del mes calendario si no vienen externos
  const cargarDatosMes = useCallback(async () => {
    if (usaDatosExternos) {
      setLoadingDatos(false);
      setError(null);
      return;
    }

    const gen = ++requestGenRef.current;
    setLoadingDatos(true);
    try {
      const datos = await getDatosOperativosMes(tenantId, mesKey);
      if (gen !== requestGenRef.current) return;
      setDatosMesLocales(datos);
      setError(null);
    } catch (err) {
      if (gen !== requestGenRef.current) return;
      const msg = err instanceof Error ? err.message : 'Error al consultar datos del mes';
      setError(`No pudimos cargar las métricas del mes ${mesKey}: ${msg}`);
    } finally {
      if (gen === requestGenRef.current) {
        setLoadingDatos(false);
      }
    }
  }, [tenantId, mesKey, usaDatosExternos]);

  useEffect(() => {
    void cargarDatosMes();
    return () => {
      requestGenRef.current += 1;
    };
  }, [cargarDatosMes]);

  const datosActivos = usaDatosExternos && datosMesExternos ? datosMesExternos : datosMesLocales;

  // 4. Cálculo puro memoizado del resumen financiero
  const resumen = useMemo<ResumenMetasYPresupuesto>(() => {
    return evaluarCentroMetasPresupuesto({
      negocioId: tenantId,
      mesKey,
      configuracion: configuracionGuardada,
      ventasMes: datosActivos.ventasMes,
      gastosMes: datosActivos.gastosMes,
      movimientosKardexMes: datosActivos.movimientosKardexMes,
      productos: datosActivos.productos,
      combos: datosActivos.combos,
      insumos: datosActivos.insumos,
    });
  }, [tenantId, mesKey, configuracionGuardada, datosActivos]);

  const nombreUsuario =
    usuarioNegocio?.nombre || (esSuperAdmin ? 'SuperAdmin' : 'Administrador');

  const guardarConfiguracion = useCallback(
    async (input: GuardarMetasPresupuestoInput) => {
      setGuardando(true);
      try {
        const guardada = await guardarMetasPresupuestoMes(
          tenantId,
          mesKey,
          input,
          nombreUsuario
        );
        setConfiguracionGuardada(guardada);
      } finally {
        setGuardando(false);
      }
    },
    [tenantId, mesKey, nombreUsuario]
  );

  const copiarMesAnterior = useCallback(async () => {
    setGuardando(true);
    try {
      const clonada = await copiarMetasPresupuestoDeMesAnterior(
        tenantId,
        mesKey,
        nombreUsuario
      );
      setConfiguracionGuardada(clonada);
    } finally {
      setGuardando(false);
    }
  }, [tenantId, mesKey, nombreUsuario]);

  const notificarDesviacionesEnBandeja = useCallback(
    async (forzar = false): Promise<number> => {
      if (!resumen.temporalidad.esMesActual || !resumen.tieneConfiguracionGuardada) {
        return 0;
      }

      const emitidas = leerAlertasEmitidas();
      const relevantes = resumen.alertas.filter(
        (a) => a.severidad === 'critica' || a.severidad === 'alta'
      );

      let enviadas = 0;
      for (const alerta of relevantes) {
        const claveUnica = `${tenantId}:${alerta.id}:${alerta.severidad}`;
        if (!forzar && emitidas.has(claveUnica)) continue;

        try {
          await crearNotificacion(tenantId, {
            modulo: 'caja',
            tipo: alerta.tipo,
            titulo: alerta.titulo,
            mensaje: alerta.mensaje,
            urgencia: alerta.severidad === 'critica' ? 'critica' : 'alta',
            enlace: alerta.rutaAccion,
            origen: forzar ? 'manual' : 'automatico',
            creadaPor: nombreUsuario,
            metadata: {
              mesKey: resumen.mesKey,
              impactoCOP: alerta.impactoCOP,
              categoria: alerta.categoria || null,
            },
          });
          registrarAlertaEmitida(claveUnica);
          enviadas += 1;
        } catch (err) {
          console.warn('No se pudo registrar alerta de desviación:', err);
        }
      }
      return enviadas;
    },
    [tenantId, resumen, nombreUsuario]
  );

  // Sincronización silenciosa deduplicada cuando detecta una alerta crítica nueva en el mes actual
  useEffect(() => {
    if (
      loadingConfig ||
      loadingDatos ||
      error ||
      !resumen.temporalidad.esMesActual ||
      !resumen.tieneConfiguracionGuardada
    ) {
      return;
    }

    const tieneCritica = resumen.alertas.some((a) => a.severidad === 'critica');
    if (tieneCritica) {
      void notificarDesviacionesEnBandeja(false);
    }
  }, [
    loadingConfig,
    loadingDatos,
    error,
    resumen.temporalidad.esMesActual,
    resumen.tieneConfiguracionGuardada,
    resumen.alertas,
    notificarDesviacionesEnBandeja,
  ]);

  const exportarPresupuestoCSV = useCallback(() => {
    descargarReporteMetasPresupuestoCSV(resumen, negocioActual.nombre || 'La Parada');
  }, [resumen, negocioActual.nombre]);

  const obtenerTextoWhatsApp = useCallback(() => {
    return generarResumenMetasWhatsApp(resumen, negocioActual.nombre || 'La Parada');
  }, [resumen, negocioActual.nombre]);

  const obtenerUrlWhatsApp = useCallback(() => {
    const texto = obtenerTextoWhatsApp();
    return construirUrlWhatsAppMetas(texto);
  }, [obtenerTextoWhatsApp]);

  return {
    mesKey,
    cambiarMes,
    configuracionGuardada,
    resumen,
    tieneMesAnteriorParaCopiar,
    loading: loadingConfig || (!usaDatosExternos && loadingDatos),
    guardando,
    error,
    guardarConfiguracion,
    copiarMesAnterior,
    notificarDesviacionesEnBandeja,
    exportarPresupuestoCSV,
    obtenerTextoWhatsApp,
    obtenerUrlWhatsApp,
    refresh: cargarDatosMes,
  };
}
