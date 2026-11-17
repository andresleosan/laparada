import type {
  AlertaDesviacionPresupuesto,
  CategoriaGasto,
  CategoriaPresupuestoMeta,
  Combo,
  ConfiguracionMetasPresupuesto,
  Gasto,
  GuardarMetasPresupuestoInput,
  Insumo,
  LineaEjecucionPresupuesto,
  MapaPresupuestoCategorias,
  MovimientoKardex,
  Producto,
  ProgresoMetaComercial,
  ProgresoTemporalMes,
  RangoFechaReporte,
  ResultadoPuntoEquilibrio,
  ResumenMetasYPresupuesto,
  SeveridadAlertaPresupuesto,
  Venta,
} from '@/types';
import { calcularEstadoResultados } from './analiticaFinancieraUtils';
import { toValidAdminDate } from './adminAnalytics';
import { formatCOP } from './formatCOP';

const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const CATEGORIAS_PRESUPUESTO_META: CategoriaPresupuestoMeta[] = [
  {
    categoria: 'salarios',
    nombre: 'Salarios y Nómina',
    descripcion: 'Turnos, sueldos fijos, prestaciones y bonos del equipo',
    tipoCostoDefault: 'fijo',
  },
  {
    categoria: 'servicios',
    nombre: 'Servicios y Local',
    descripcion: 'Energía, agua, internet, POS y obligaciones fijas del local',
    tipoCostoDefault: 'fijo',
  },
  {
    categoria: 'mantenimiento',
    nombre: 'Mantenimiento',
    descripcion: 'Reparaciones de freidoras, refrigeración, aseo y equipos',
    tipoCostoDefault: 'fijo',
  },
  {
    categoria: 'insumos',
    nombre: 'Compras de Insumos',
    descripcion: 'Reposición de materias primas, empaques y caja menor',
    tipoCostoDefault: 'variable',
  },
  {
    categoria: 'gas',
    nombre: 'Gas y Combustible',
    descripcion: 'Pipetas, red de gas natural y carbón de cocina',
    tipoCostoDefault: 'variable',
  },
  {
    categoria: 'domiciliario',
    nombre: 'Domicilios y Logística',
    descripcion: 'Carreras externas, combustible de entregas y envíos',
    tipoCostoDefault: 'variable',
  },
  {
    categoria: 'varios',
    nombre: 'Gastos Varios',
    descripcion: 'Imprevistos operativos, papelería y compras menores',
    tipoCostoDefault: 'variable',
  },
  {
    categoria: 'otros',
    nombre: 'Otros Gastos',
    descripcion: 'Publicidad local, comisiones u otros egresos administrativos',
    tipoCostoDefault: 'variable',
  },
];

export function safePositiveNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return num;
}

export function safeCurrencyInt(value: unknown, fallback = 0): number {
  return Math.round(safePositiveNumber(value, fallback));
}

export function clampPercentage(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Number(num.toFixed(1))));
}

/**
 * Obtiene el identificador de mes calendario en hora local (`YYYY-MM`).
 */
export function obtenerMesKey(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${anio}-${mes}`;
}

export function esMesKeyValido(mesKey: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test((mesKey || '').trim());
}

export function normalizarMesKey(mesKey?: string, referencia: Date = new Date()): string {
  const limpio = (mesKey || '').trim();
  return esMesKeyValido(limpio) ? limpio : obtenerMesKey(referencia);
}

export function obtenerMesKeyAnterior(mesKey: string): string {
  const limpio = normalizarMesKey(mesKey);
  const [anioStr, mesStr] = limpio.split('-');
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  if (mes === 1) {
    return `${anio - 1}-12`;
  }
  return `${anio}-${String(mes - 1).padStart(2, '0')}`;
}

export function obtenerMesKeySiguiente(mesKey: string): string {
  const limpio = normalizarMesKey(mesKey);
  const [anioStr, mesStr] = limpio.split('-');
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  if (mes === 12) {
    return `${anio + 1}-01`;
  }
  return `${anio}-${String(mes + 1).padStart(2, '0')}`;
}

export function formatearEtiquetaMesKey(mesKey: string): string {
  const limpio = normalizarMesKey(mesKey);
  const [anioStr, mesStr] = limpio.split('-');
  const mesIdx = Number(mesStr) - 1;
  return `${MESES_ES[mesIdx] || mesStr} ${anioStr}`;
}

/**
 * Calcula los límites exactos del mes calendario y su avance temporal al día de referencia.
 */
export function calcularProgresoTemporalMes(
  mesKey: string,
  ahora: Date = new Date()
): ProgresoTemporalMes {
  const key = normalizarMesKey(mesKey, ahora);
  const [anioStr, mesStr] = key.split('-');
  const anio = Number(anioStr);
  const mesIdx = Number(mesStr) - 1;

  const inicio = new Date(anio, mesIdx, 1, 0, 0, 0, 0);
  const fin = new Date(anio, mesIdx + 1, 0, 23, 59, 59, 999);
  const diasEnMes = fin.getDate();

  const mesActualKey = obtenerMesKey(ahora);
  const esMesActual = key === mesActualKey;
  const esMesPasado = key < mesActualKey;
  const esMesFuturo = key > mesActualKey;

  let diasTranscurridos = diasEnMes;
  if (esMesActual) {
    diasTranscurridos = Math.min(diasEnMes, Math.max(1, ahora.getDate()));
  } else if (esMesFuturo) {
    diasTranscurridos = 0;
  }

  const diasRestantes = esMesActual
    ? Math.max(0, diasEnMes - diasTranscurridos)
    : esMesFuturo
    ? diasEnMes
    : 0;

  const diasRestantesIncluyendoHoy = esMesActual
    ? Math.max(1, diasEnMes - diasTranscurridos + 1)
    : esMesFuturo
    ? diasEnMes
    : 0;

  const porcentajeMesTranscurrido =
    diasEnMes > 0 ? Number(((diasTranscurridos / diasEnMes) * 100).toFixed(1)) : 0;

  return {
    mesKey: key,
    etiquetaMes: formatearEtiquetaMesKey(key),
    inicio,
    fin,
    diasEnMes,
    diasTranscurridos,
    diasRestantes,
    diasRestantesIncluyendoHoy,
    porcentajeMesTranscurrido,
    esMesActual,
    esMesFuturo,
    esMesPasado,
  };
}

export function getMapaPresupuestosDefault(): MapaPresupuestoCategorias {
  const mapa = {} as MapaPresupuestoCategorias;
  for (const item of CATEGORIAS_PRESUPUESTO_META) {
    mapa[item.categoria] = {
      presupuestoCOP: 0,
      tipoCosto: item.tipoCostoDefault,
    };
  }
  return mapa;
}

export function sanitizarMapaPresupuestos(
  parcial?: Partial<Record<CategoriaGasto, Partial<{ presupuestoCOP: number; tipoCosto: 'fijo' | 'variable' }>>>
): MapaPresupuestoCategorias {
  const base = getMapaPresupuestosDefault();
  if (!parcial) return base;

  for (const meta of CATEGORIAS_PRESUPUESTO_META) {
    const entrada = parcial[meta.categoria];
    if (!entrada) continue;
    base[meta.categoria] = {
      presupuestoCOP: safeCurrencyInt(entrada.presupuestoCOP, 0),
      tipoCosto:
        entrada.tipoCosto === 'fijo' || entrada.tipoCosto === 'variable'
          ? entrada.tipoCosto
          : meta.tipoCostoDefault,
    };
  }
  return base;
}

export function getConfiguracionMetasDefault(
  negocioId: string,
  mesKey: string
): ConfiguracionMetasPresupuesto {
  const key = normalizarMesKey(mesKey);
  return {
    id: `${negocioId}_${key}`,
    negocioId,
    mesKey: key,
    metaVentasMensualCOP: 0,
    metaUtilidadNetaMensualCOP: 0,
    costosFijosBaseCOP: 0,
    foodCostObjetivoPct: 35,
    umbralAlertaGastoPct: 80,
    presupuestosPorCategoria: getMapaPresupuestosDefault(),
    notas: '',
    configuradoManualmente: false,
  };
}

export type PlantillaPresupuestoTipo = 'puesto_rapido' | 'restaurante_medio' | 'alto_volumen';

/**
 * Genera una plantilla didáctica en COP lista para editar según tamaño del negocio.
 */
export function construirPlantillaRapidaPresupuesto(
  tipo: PlantillaPresupuestoTipo
): GuardarMetasPresupuestoInput {
  const base = getMapaPresupuestosDefault();

  if (tipo === 'puesto_rapido') {
    base.salarios = { presupuestoCOP: 1600000, tipoCosto: 'fijo' };
    base.servicios = { presupuestoCOP: 450000, tipoCosto: 'fijo' };
    base.mantenimiento = { presupuestoCOP: 150000, tipoCosto: 'fijo' };
    base.insumos = { presupuestoCOP: 1200000, tipoCosto: 'variable' };
    base.gas = { presupuestoCOP: 320000, tipoCosto: 'variable' };
    base.domiciliario = { presupuestoCOP: 350000, tipoCosto: 'variable' };
    base.varios = { presupuestoCOP: 180000, tipoCosto: 'variable' };
    base.otros = { presupuestoCOP: 150000, tipoCosto: 'variable' };

    return {
      metaVentasMensualCOP: 12000000,
      metaUtilidadNetaMensualCOP: 2500000,
      costosFijosBaseCOP: 1200000,
      foodCostObjetivoPct: 35,
      umbralAlertaGastoPct: 80,
      presupuestosPorCategoria: base,
      notas: 'Plantilla base para puesto o cocina rápida',
    };
  }

  if (tipo === 'alto_volumen') {
    base.salarios = { presupuestoCOP: 7500000, tipoCosto: 'fijo' };
    base.servicios = { presupuestoCOP: 1800000, tipoCosto: 'fijo' };
    base.mantenimiento = { presupuestoCOP: 600000, tipoCosto: 'fijo' };
    base.insumos = { presupuestoCOP: 4500000, tipoCosto: 'variable' };
    base.gas = { presupuestoCOP: 950000, tipoCosto: 'variable' };
    base.domiciliario = { presupuestoCOP: 1400000, tipoCosto: 'variable' };
    base.varios = { presupuestoCOP: 500000, tipoCosto: 'variable' };
    base.otros = { presupuestoCOP: 450000, tipoCosto: 'variable' };

    return {
      metaVentasMensualCOP: 45000000,
      metaUtilidadNetaMensualCOP: 9000000,
      costosFijosBaseCOP: 4200000,
      foodCostObjetivoPct: 33,
      umbralAlertaGastoPct: 80,
      presupuestosPorCategoria: base,
      notas: 'Plantilla para operación de alto flujo y múltiples canales',
    };
  }

  // restaurante_medio
  base.salarios = { presupuestoCOP: 3600000, tipoCosto: 'fijo' };
  base.servicios = { presupuestoCOP: 950000, tipoCosto: 'fijo' };
  base.mantenimiento = { presupuestoCOP: 300000, tipoCosto: 'fijo' };
  base.insumos = { presupuestoCOP: 2200000, tipoCosto: 'variable' };
  base.gas = { presupuestoCOP: 550000, tipoCosto: 'variable' };
  base.domiciliario = { presupuestoCOP: 650000, tipoCosto: 'variable' };
  base.varios = { presupuestoCOP: 300000, tipoCosto: 'variable' };
  base.otros = { presupuestoCOP: 250000, tipoCosto: 'variable' };

  return {
    metaVentasMensualCOP: 22000000,
    metaUtilidadNetaMensualCOP: 4500000,
    costosFijosBaseCOP: 2400000,
    foodCostObjetivoPct: 35,
    umbralAlertaGastoPct: 80,
    presupuestosPorCategoria: base,
    notas: 'Plantilla estándar para restaurante con salón y domicilios',
  };
}

/**
 * Evalúa ejecución presupuestal de las 8 categorías de gasto en el mes.
 */
export function evaluarPresupuestoCategorias(
  gastosMes: Gasto[],
  config: ConfiguracionMetasPresupuesto,
  temporalidad: ProgresoTemporalMes
): LineaEjecucionPresupuesto[] {
  const ejecutadoPorCat: Record<string, number> = {};
  const cantidadPorCat: Record<string, number> = {};

  for (const gasto of gastosMes) {
    const monto = safePositiveNumber(gasto.monto, 0);
    if (monto <= 0) continue;
    const cat = (gasto.categoria || 'otros').toLowerCase().trim();
    ejecutadoPorCat[cat] = (ejecutadoPorCat[cat] || 0) + monto;
    cantidadPorCat[cat] = (cantidadPorCat[cat] || 0) + 1;
  }

  const umbralAlerta = clampPercentage(config.umbralAlertaGastoPct, 50, 99, 80);
  const ratioMes =
    temporalidad.diasEnMes > 0
      ? temporalidad.diasTranscurridos / temporalidad.diasEnMes
      : 1;

  return CATEGORIAS_PRESUPUESTO_META.map((meta) => {
    const cfgCat = config.presupuestosPorCategoria?.[meta.categoria] || {
      presupuestoCOP: 0,
      tipoCosto: meta.tipoCostoDefault,
    };

    const presupuestadoCOP = safeCurrencyInt(cfgCat.presupuestoCOP, 0);
    const ejecutadoCOP = safeCurrencyInt(ejecutadoPorCat[meta.categoria] || 0, 0);
    const disponibleCOP = presupuestadoCOP - ejecutadoCOP;
    const excedidoCOP = Math.max(0, ejecutadoCOP - presupuestadoCOP);
    const porcentajeEjecucion =
      presupuestadoCOP > 0
        ? Number(((ejecutadoCOP / presupuestadoCOP) * 100).toFixed(1))
        : ejecutadoCOP > 0
        ? 100
        : 0;

    const esperadoAlDia = Math.round(presupuestadoCOP * ratioMes);
    const desviacionRitmoCOP = ejecutadoCOP - esperadoAlDia;
    const porcentajeEsperadoRitmo = Number((ratioMes * 100).toFixed(1));

    let estado: LineaEjecucionPresupuesto['estado'] = 'controlado';
    if (presupuestadoCOP === 0 && ejecutadoCOP > 0) {
      estado = 'sin_presupuesto';
    } else if (presupuestadoCOP > 0 && ejecutadoCOP > presupuestadoCOP) {
      estado = 'excedido';
    } else if (presupuestadoCOP > 0 && porcentajeEjecucion >= umbralAlerta) {
      estado = 'alerta';
    }

    return {
      categoria: meta.categoria,
      nombre: meta.nombre,
      descripcion: meta.descripcion,
      tipoCosto: cfgCat.tipoCosto,
      presupuestadoCOP,
      ejecutadoCOP,
      disponibleCOP,
      excedidoCOP,
      porcentajeEjecucion,
      porcentajeEsperadoRitmo,
      desviacionRitmoCOP,
      estado,
      cantidadRegistros: cantidadPorCat[meta.categoria] || 0,
    };
  });
}

/**
 * Calcula el Punto de Equilibrio (Break-Even Point) en tiempo real combinando costos fijos,
 * gastos variables, CMV de recetas vendidas y margen de contribución.
 */
export function calcularPuntoEquilibrio(params: {
  ventasNetasMesCOP: number;
  cantidadVentasMes: number;
  ticketPromedioMesCOP: number;
  cmvRealCOP: number;
  mermasMesCOP: number;
  lineasPresupuesto: LineaEjecucionPresupuesto[];
  config: ConfiguracionMetasPresupuesto;
  temporalidad: ProgresoTemporalMes;
}): ResultadoPuntoEquilibrio {
  const {
    ventasNetasMesCOP,
    cantidadVentasMes,
    ticketPromedioMesCOP,
    cmvRealCOP,
    mermasMesCOP,
    lineasPresupuesto,
    config,
    temporalidad,
  } = params;

  const costosFijosBase = safeCurrencyInt(config.costosFijosBaseCOP, 0);

  let presupuestoFijosCategorias = 0;
  let ejecutadoFijosCategorias = 0;
  let ejecutadoVariablesCategorias = 0;

  for (const linea of lineasPresupuesto) {
    if (linea.tipoCosto === 'fijo') {
      presupuestoFijosCategorias += linea.presupuestadoCOP;
      ejecutadoFijosCategorias += linea.ejecutadoCOP;
    } else {
      ejecutadoVariablesCategorias += linea.ejecutadoCOP;
    }
  }

  const costosFijosPresupuestadosCOP = costosFijosBase + presupuestoFijosCategorias;
  const costosFijosRealesCOP = costosFijosBase + ejecutadoFijosCategorias;
  const costosFijosConsideradosCOP = Math.max(
    costosFijosPresupuestadosCOP,
    costosFijosRealesCOP
  );

  const costosVariablesRealesCOP = Math.max(
    0,
    Math.round(cmvRealCOP + mermasMesCOP + ejecutadoVariablesCategorias)
  );

  const foodCostObj = clampPercentage(config.foodCostObjetivoPct, 5, 85, 35);
  const margenContribucionEstimadoPct = Number((100 - foodCostObj).toFixed(1));

  const margenContribucionRealPct =
    ventasNetasMesCOP > 0
      ? Number(
          (((ventasNetasMesCOP - costosVariablesRealesCOP) / ventasNetasMesCOP) * 100).toFixed(1)
        )
      : 0;

  // Para evitar distorsiones al inicio del mes cuando apenas hay 1-4 ventas y se compró gas o insumos,
  // aplicamos el margen real solo cuando hay volumen representativo (>= 5 ventas) y margen positivo saludable (>= 15%).
  const usarMargenReal =
    cantidadVentasMes >= 5 &&
    ventasNetasMesCOP > 0 &&
    margenContribucionRealPct >= 15 &&
    margenContribucionRealPct <= 95;

  const margenContribucionAplicadoPct = usarMargenReal
    ? margenContribucionRealPct
    : margenContribucionEstimadoPct;

  const fuenteMargen: ResultadoPuntoEquilibrio['fuenteMargen'] = usarMargenReal
    ? 'real'
    : 'objetivo_estimado';

  const ratioMargen = margenContribucionAplicadoPct / 100;
  const puntoEquilibrioMensualCOP =
    costosFijosConsideradosCOP > 0 && ratioMargen > 0
      ? Math.round(costosFijosConsideradosCOP / ratioMargen)
      : 0;

  const puntoEquilibrioDiarioCOP =
    temporalidad.diasEnMes > 0 && puntoEquilibrioMensualCOP > 0
      ? Math.round(puntoEquilibrioMensualCOP / temporalidad.diasEnMes)
      : 0;

  const pedidosEquilibrioMes =
    ticketPromedioMesCOP > 0 && puntoEquilibrioMensualCOP > 0
      ? Math.ceil(puntoEquilibrioMensualCOP / ticketPromedioMesCOP)
      : 0;

  const porcentajeEquilibrioAlcanzado =
    puntoEquilibrioMensualCOP > 0
      ? Number(((ventasNetasMesCOP / puntoEquilibrioMensualCOP) * 100).toFixed(1))
      : ventasNetasMesCOP > 0
      ? 100
      : 0;

  const faltanteParaEquilibrioCOP = Math.max(0, puntoEquilibrioMensualCOP - ventasNetasMesCOP);
  const superavitSobreEquilibrioVentasCOP = Math.max(
    0,
    ventasNetasMesCOP - puntoEquilibrioMensualCOP
  );
  const utilidadEstimadaPostEquilibrioCOP = Math.round(
    superavitSobreEquilibrioVentasCOP * ratioMargen
  );

  const equilibrioAlcanzado =
    puntoEquilibrioMensualCOP > 0
      ? ventasNetasMesCOP >= puntoEquilibrioMensualCOP
      : costosFijosConsideradosCOP === 0 && ventasNetasMesCOP > 0;

  const promedioDiarioActual =
    temporalidad.diasTranscurridos > 0
      ? ventasNetasMesCOP / temporalidad.diasTranscurridos
      : 0;

  const diaEstimadoEquilibrio =
    promedioDiarioActual > 0 && puntoEquilibrioMensualCOP > 0
      ? Math.ceil(puntoEquilibrioMensualCOP / promedioDiarioActual)
      : null;

  return {
    costosFijosPresupuestadosCOP,
    costosFijosRealesCOP,
    costosFijosConsideradosCOP,
    costosVariablesRealesCOP,
    margenContribucionRealPct,
    margenContribucionEstimadoPct,
    margenContribucionAplicadoPct,
    fuenteMargen,
    puntoEquilibrioMensualCOP,
    puntoEquilibrioDiarioCOP,
    pedidosEquilibrioMes,
    porcentajeEquilibrioAlcanzado,
    faltanteParaEquilibrioCOP,
    superavitSobreEquilibrioVentasCOP,
    utilidadEstimadaPostEquilibrioCOP,
    equilibrioAlcanzado,
    diaEstimadoEquilibrio,
  };
}

/**
 * Evalúa el progreso de la meta comercial de ventas y utilidad para el mes y el día actual.
 */
export function calcularProgresoMetaComercial(params: {
  ventasNetasMesCOP: number;
  ventasHoyCOP: number;
  utilidadNetaMesCOP: number;
  config: ConfiguracionMetasPresupuesto;
  temporalidad: ProgresoTemporalMes;
}): ProgresoMetaComercial {
  const {
    ventasNetasMesCOP,
    ventasHoyCOP,
    utilidadNetaMesCOP,
    config,
    temporalidad,
  } = params;

  const metaVentasMensualCOP = safeCurrencyInt(config.metaVentasMensualCOP, 0);
  const metaUtilidadNetaMensualCOP = safeCurrencyInt(config.metaUtilidadNetaMensualCOP, 0);

  const metaDiariaBaseCOP =
    temporalidad.diasEnMes > 0 && metaVentasMensualCOP > 0
      ? Math.round(metaVentasMensualCOP / temporalidad.diasEnMes)
      : 0;

  const faltanteMetaMesCOP = Math.max(0, metaVentasMensualCOP - ventasNetasMesCOP);

  const metaDiariaRequeridaRestanteCOP =
    temporalidad.diasRestantesIncluyendoHoy > 0 && faltanteMetaMesCOP > 0
      ? Math.round(faltanteMetaMesCOP / temporalidad.diasRestantesIncluyendoHoy)
      : 0;

  const porcentajeCumplimiento =
    metaVentasMensualCOP > 0
      ? Number(((ventasNetasMesCOP / metaVentasMensualCOP) * 100).toFixed(1))
      : 0;

  const ventaEsperadaAlDiaCOP =
    temporalidad.diasEnMes > 0 && metaVentasMensualCOP > 0
      ? Math.round((metaVentasMensualCOP / temporalidad.diasEnMes) * temporalidad.diasTranscurridos)
      : 0;

  const desviacionRitmoCOP = ventasNetasMesCOP - ventaEsperadaAlDiaCOP;
  const porcentajeDesviacionRitmo =
    ventaEsperadaAlDiaCOP > 0
      ? Number(((desviacionRitmoCOP / ventaEsperadaAlDiaCOP) * 100).toFixed(1))
      : 0;

  const enRitmoMeta =
    metaVentasMensualCOP > 0 ? ventasNetasMesCOP >= ventaEsperadaAlDiaCOP : true;

  const ventaDiariaPromedioActualCOP =
    temporalidad.diasTranscurridos > 0
      ? Math.round(ventasNetasMesCOP / temporalidad.diasTranscurridos)
      : 0;

  const proyeccionCierreMesCOP =
    temporalidad.esMesActual && temporalidad.diasTranscurridos > 0
      ? Math.round(ventaDiariaPromedioActualCOP * temporalidad.diasEnMes)
      : ventasNetasMesCOP;

  const porcentajeCumplimientoUtilidad =
    metaUtilidadNetaMensualCOP > 0
      ? Number(((utilidadNetaMesCOP / metaUtilidadNetaMensualCOP) * 100).toFixed(1))
      : 0;

  return {
    metaVentasMensualCOP,
    ventasNetasMesCOP,
    ventasHoyCOP,
    metaDiariaBaseCOP,
    metaDiariaRequeridaRestanteCOP,
    porcentajeCumplimiento,
    ventaEsperadaAlDiaCOP,
    desviacionRitmoCOP,
    porcentajeDesviacionRitmo,
    enRitmoMeta,
    ventaDiariaPromedioActualCOP,
    proyeccionCierreMesCOP,
    faltanteMetaMesCOP,
    metaUtilidadNetaMensualCOP,
    utilidadNetaActualCOP: utilidadNetaMesCOP,
    porcentajeCumplimientoUtilidad,
  };
}

/**
 * Genera alertas priorizadas de desviación presupuestal, exceso en categorías,
 * Food Cost fuera de rango y ritmo comercial bajo.
 */
export function generarAlertasDesviacion(params: {
  lineasPresupuesto: LineaEjecucionPresupuesto[];
  config: ConfiguracionMetasPresupuesto;
  porcentajeCmvReal: number;
  cmvRealCOP: number;
  ventasNetasMesCOP: number;
  puntoEquilibrio: ResultadoPuntoEquilibrio;
  metaComercial: ProgresoMetaComercial;
  temporalidad: ProgresoTemporalMes;
}): AlertaDesviacionPresupuesto[] {
  const {
    lineasPresupuesto,
    config,
    porcentajeCmvReal,
    cmvRealCOP,
    ventasNetasMesCOP,
    puntoEquilibrio,
    metaComercial,
    temporalidad,
  } = params;

  const alertas: AlertaDesviacionPresupuesto[] = [];

  for (const linea of lineasPresupuesto) {
    if (linea.estado === 'excedido') {
      alertas.push({
        id: `exceso_${linea.categoria}_${config.mesKey}`,
        severidad: 'critica',
        tipo: 'presupuesto_excedido',
        categoria: linea.categoria,
        titulo: `${linea.nombre} excedió el presupuesto`,
        mensaje: `Llevas ${formatCOP(linea.ejecutadoCOP)} de ${formatCOP(linea.presupuestadoCOP)} asignados (${linea.porcentajeEjecucion}%). Sobregiro de ${formatCOP(linea.excedidoCOP)}.`,
        impactoCOP: linea.excedidoCOP,
        porcentajeActual: linea.porcentajeEjecucion,
        rutaAccion: '/gastos',
        etiquetaAccion: 'Auditar gastos',
      });
    } else if (linea.estado === 'alerta') {
      alertas.push({
        id: `alerta_${linea.categoria}_${config.mesKey}`,
        severidad: 'alta',
        tipo: 'presupuesto_preventivo',
        categoria: linea.categoria,
        titulo: `${linea.nombre} al ${linea.porcentajeEjecucion}% del tope`,
        mensaje: `Has ejecutado ${formatCOP(linea.ejecutadoCOP)} y solo quedan ${formatCOP(linea.disponibleCOP)} disponibles para el resto del mes.`,
        impactoCOP: linea.ejecutadoCOP,
        porcentajeActual: linea.porcentajeEjecucion,
        rutaAccion: '/gastos',
        etiquetaAccion: 'Revisar categoría',
      });
    } else if (linea.estado === 'sin_presupuesto') {
      alertas.push({
        id: `sin_presupuesto_${linea.categoria}_${config.mesKey}`,
        severidad: 'media',
        tipo: 'gasto_sin_presupuesto',
        categoria: linea.categoria,
        titulo: `Gastos en ${linea.nombre} sin presupuesto asignado`,
        mensaje: `Se registraron ${formatCOP(linea.ejecutadoCOP)} (${linea.cantidadRegistros} movimientos) en una categoría con tope en $0.`,
        impactoCOP: linea.ejecutadoCOP,
        rutaAccion: '/reportes',
        etiquetaAccion: 'Asignar presupuesto',
      });
    }
  }

  // Desviación en Food Cost (CMV real vs objetivo)
  const foodCostObj = clampPercentage(config.foodCostObjetivoPct, 5, 85, 35);
  if (ventasNetasMesCOP > 0 && cmvRealCOP > 0 && porcentajeCmvReal > foodCostObj) {
    const excesoPuntos = Number((porcentajeCmvReal - foodCostObj).toFixed(1));
    const impactoCmvCOP = Math.round(ventasNetasMesCOP * (excesoPuntos / 100));
    alertas.push({
      id: `food_cost_${config.mesKey}`,
      severidad: excesoPuntos >= 7 ? 'critica' : 'alta',
      tipo: 'food_cost_excedido',
      titulo: `Food Cost en ${porcentajeCmvReal}% (objetivo: ${foodCostObj}%)`,
      mensaje: `El costo de recetas supera la meta en ${excesoPuntos} pts (+${formatCOP(impactoCmvCOP)}). Revisa precios o porciones en Ingeniería de Menú.`,
      impactoCOP: impactoCmvCOP,
      porcentajeActual: porcentajeCmvReal,
      rutaAccion: '/ingenieria-menu',
      etiquetaAccion: 'Revisar escandallos',
    });
  }

  // Ritmo comercial bajo vs meta del mes (solo cuando el mes actual lleva al menos 3 días)
  if (
    temporalidad.esMesActual &&
    temporalidad.diasTranscurridos >= 3 &&
    metaComercial.metaVentasMensualCOP > 0 &&
    !metaComercial.enRitmoMeta &&
    metaComercial.porcentajeDesviacionRitmo <= -15
  ) {
    alertas.push({
      id: `ritmo_meta_${config.mesKey}`,
      severidad: metaComercial.porcentajeDesviacionRitmo <= -30 ? 'alta' : 'media',
      tipo: 'ritmo_ventas_bajo',
      titulo: `Ritmo comercial ${Math.abs(metaComercial.porcentajeDesviacionRitmo)}% bajo la meta`,
      mensaje: `Debes promediar ${formatCOP(metaComercial.metaDiariaRequeridaRestanteCOP)}/día en los próximos ${temporalidad.diasRestantesIncluyendoHoy} días para cumplir la meta mensual.`,
      impactoCOP: Math.abs(metaComercial.desviacionRitmoCOP),
      porcentajeActual: metaComercial.porcentajeCumplimiento,
      rutaAccion: '/promociones',
      etiquetaAccion: 'Impulsar ventas',
    });
  }

  // Alerta de Break-Even en riesgo hacia final de mes
  if (
    temporalidad.esMesActual &&
    temporalidad.porcentajeMesTranscurrido >= 65 &&
    puntoEquilibrio.puntoEquilibrioMensualCOP > 0 &&
    !puntoEquilibrio.equilibrioAlcanzado &&
    puntoEquilibrio.porcentajeEquilibrioAlcanzado < temporalidad.porcentajeMesTranscurrido - 15
  ) {
    alertas.push({
      id: `breakeven_riesgo_${config.mesKey}`,
      severidad: 'alta',
      tipo: 'deficit_equilibrio',
      titulo: `Punto de Equilibrio al ${puntoEquilibrio.porcentajeEquilibrioAlcanzado}% en tramo final`,
      mensaje: `Faltan ${formatCOP(puntoEquilibrio.faltanteParaEquilibrioCOP)} en ventas para cubrir los costos fijos del mes.`,
      impactoCOP: puntoEquilibrio.faltanteParaEquilibrioCOP,
      porcentajeActual: puntoEquilibrio.porcentajeEquilibrioAlcanzado,
      rutaAccion: '/pos',
      etiquetaAccion: 'Ver operación',
    });
  }

  const prioridad: Record<SeveridadAlertaPresupuesto, number> = {
    critica: 0,
    alta: 1,
    media: 2,
  };

  return alertas.sort(
    (a, b) => prioridad[a.severidad] - prioridad[b.severidad] || b.impactoCOP - a.impactoCOP
  );
}

/**
 * Calcula las ventas netas del día de hoy dentro del arreglo de ventas del mes.
 */
export function calcularVentasNetasDeHoy(
  ventasMes: Venta[],
  ahora: Date = new Date()
): number {
  const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
  const hoyFin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

  let suma = 0;
  for (const venta of ventasMes) {
    if (venta.estado === 'anulada') continue;
    const fechaVenta = toValidAdminDate(venta.fecha);
    if (!fechaVenta) continue;
    if (fechaVenta >= hoyInicio && fechaVenta <= hoyFin) {
      const bruta =
        typeof venta.subtotal === 'number' && venta.subtotal > 0
          ? venta.subtotal
          : Math.max(0, safePositiveNumber(venta.total) + safePositiveNumber(venta.descuento) - safePositiveNumber(venta.propina));
      const neta = Math.max(0, bruta - safePositiveNumber(venta.descuento));
      suma += neta;
    }
  }
  return Math.round(suma);
}

export interface EvaluarCentroMetasParams {
  negocioId: string;
  mesKey: string;
  configuracion: ConfiguracionMetasPresupuesto | null;
  ventasMes: Venta[];
  gastosMes: Gasto[];
  movimientosKardexMes: MovimientoKardex[];
  productos: Producto[];
  combos: Combo[];
  insumos: Insumo[];
  ahora?: Date;
}

/**
 * Orquestador puro completo del Centro de Metas Comerciales, Presupuesto Operativo
 * y Punto de Equilibrio (Break-Even Point).
 */
export function evaluarCentroMetasPresupuesto(
  params: EvaluarCentroMetasParams
): ResumenMetasYPresupuesto {
  const ahora = params.ahora || new Date();
  const temporalidad = calcularProgresoTemporalMes(params.mesKey, ahora);
  const config =
    params.configuracion || getConfiguracionMetasDefault(params.negocioId, temporalidad.mesKey);

  const periodoPL: RangoFechaReporte = {
    tipo: 'personalizado',
    inicio: temporalidad.inicio,
    fin: temporalidad.fin,
    etiqueta: temporalidad.etiquetaMes,
  };

  const pl = calcularEstadoResultados({
    ventas: params.ventasMes,
    gastos: params.gastosMes,
    movimientosKardex: params.movimientosKardexMes,
    productos: params.productos,
    combos: params.combos,
    insumos: params.insumos,
    periodo: periodoPL,
  });

  const lineasPresupuesto = evaluarPresupuestoCategorias(
    params.gastosMes,
    config,
    temporalidad
  );

  const totalPresupuestoOpexCOP = lineasPresupuesto.reduce(
    (acc, l) => acc + l.presupuestadoCOP,
    0
  );
  const totalEjecutadoOpexCOP = lineasPresupuesto.reduce(
    (acc, l) => acc + l.ejecutadoCOP,
    0
  );
  const disponibleTotalOpexCOP = totalPresupuestoOpexCOP - totalEjecutadoOpexCOP;
  const porcentajeEjecucionOpex =
    totalPresupuestoOpexCOP > 0
      ? Number(((totalEjecutadoOpexCOP / totalPresupuestoOpexCOP) * 100).toFixed(1))
      : totalEjecutadoOpexCOP > 0
      ? 100
      : 0;

  const ventasHoyCOP = temporalidad.esMesActual
    ? calcularVentasNetasDeHoy(params.ventasMes, ahora)
    : 0;

  const puntoEquilibrio = calcularPuntoEquilibrio({
    ventasNetasMesCOP: pl.ventasNetas,
    cantidadVentasMes: pl.cantidadVentasValidas,
    ticketPromedioMesCOP: pl.ticketPromedio,
    cmvRealCOP: pl.cmvInsumos,
    mermasMesCOP: pl.totalMermasCOP,
    lineasPresupuesto,
    config,
    temporalidad,
  });

  const metaComercial = calcularProgresoMetaComercial({
    ventasNetasMesCOP: pl.ventasNetas,
    ventasHoyCOP,
    utilidadNetaMesCOP: pl.utilidadNeta,
    config,
    temporalidad,
  });

  const alertas = generarAlertasDesviacion({
    lineasPresupuesto,
    config,
    porcentajeCmvReal: pl.porcentajeCMV,
    cmvRealCOP: pl.cmvInsumos,
    ventasNetasMesCOP: pl.ventasNetas,
    puntoEquilibrio,
    metaComercial,
    temporalidad,
  });

  const tieneCriticas = alertas.some((a) => a.severidad === 'critica');
  const tieneAltas = alertas.some((a) => a.severidad === 'alta');
  const saludPresupuestal: ResumenMetasYPresupuesto['saludPresupuestal'] = tieneCriticas
    ? 'critica'
    : tieneAltas
    ? 'atencion'
    : 'optima';

  return {
    mesKey: temporalidad.mesKey,
    temporalidad,
    configuracion: config,
    tieneConfiguracionGuardada: Boolean(params.configuracion?.configuradoManualmente ?? params.configuracion),
    totalPresupuestoOpexCOP,
    totalEjecutadoOpexCOP,
    disponibleTotalOpexCOP,
    porcentajeEjecucionOpex,
    cmvRealCOP: pl.cmvInsumos,
    porcentajeCmvReal: pl.porcentajeCMV,
    mermasMesCOP: pl.totalMermasCOP,
    utilidadNetaMesCOP: pl.utilidadNeta,
    cantidadVentasMes: pl.cantidadVentasValidas,
    ticketPromedioMesCOP: pl.ticketPromedio,
    lineasPresupuesto,
    puntoEquilibrio,
    metaComercial,
    alertas,
    saludPresupuestal,
  };
}

/**
 * Calcula una previsualización instantánea en el modal de configuración (What-If).
 */
export function calcularPreviewConfiguracionMetas(input: GuardarMetasPresupuestoInput): {
  totalPresupuestoOpexCOP: number;
  costosFijosTotalesCOP: number;
  costosVariablesPresupuestadosCOP: number;
  margenContribucionEstimadoPct: number;
  puntoEquilibrioMensualCOP: number;
  puntoEquilibrioDiarioCOP: number;
  utilidadProyectadaEnMetaCOP: number;
} {
  let totalPresupuestoOpexCOP = 0;
  let fijosCategorias = 0;
  let variablesCategorias = 0;

  for (const meta of CATEGORIAS_PRESUPUESTO_META) {
    const cfg = input.presupuestosPorCategoria[meta.categoria];
    const monto = safeCurrencyInt(cfg?.presupuestoCOP, 0);
    totalPresupuestoOpexCOP += monto;
    if (cfg?.tipoCosto === 'fijo') {
      fijosCategorias += monto;
    } else {
      variablesCategorias += monto;
    }
  }

  const costosFijosTotalesCOP = safeCurrencyInt(input.costosFijosBaseCOP, 0) + fijosCategorias;
  const foodCostPct = clampPercentage(input.foodCostObjetivoPct, 5, 85, 35);
  const margenContribucionEstimadoPct = Number((100 - foodCostPct).toFixed(1));
  const ratio = margenContribucionEstimadoPct / 100;

  const puntoEquilibrioMensualCOP =
    costosFijosTotalesCOP > 0 && ratio > 0
      ? Math.round(costosFijosTotalesCOP / ratio)
      : 0;
  const puntoEquilibrioDiarioCOP = Math.round(puntoEquilibrioMensualCOP / 30);

  const metaVentas = safeCurrencyInt(input.metaVentasMensualCOP, 0);
  const cmvEstimadoEnMeta = Math.round(metaVentas * (foodCostPct / 100));
  const utilidadProyectadaEnMetaCOP =
    metaVentas - cmvEstimadoEnMeta - costosFijosTotalesCOP - variablesCategorias;

  return {
    totalPresupuestoOpexCOP,
    costosFijosTotalesCOP,
    costosVariablesPresupuestadosCOP: variablesCategorias,
    margenContribucionEstimadoPct,
    puntoEquilibrioMensualCOP,
    puntoEquilibrioDiarioCOP,
    utilidadProyectadaEnMetaCOP,
  };
}

/**
 * Genera el reporte CSV (con UTF-8 BOM para Excel) del Centro de Metas, Break-Even y Presupuesto.
 */
export function generarReporteMetasPresupuestoCSV(
  resumen: ResumenMetasYPresupuesto,
  negocioNombre: string
): string {
  const esc = (valor: string | number) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const lineas: string[] = [];

  lineas.push(
    `"CENTRO DE METAS, PRESUPUESTO Y PUNTO DE EQUILIBRIO - ${(negocioNombre || 'LA PARADA').toUpperCase()}"`
  );
  lineas.push(`"Mes Evaluado:",${esc(resumen.temporalidad.etiquetaMes)},${esc(resumen.mesKey)}`);
  lineas.push(`"Generado:",${esc(new Date().toLocaleString('es-CO'))}`);
  lineas.push('');

  lineas.push('"1. METAS COMERCIALES","VALOR (COP)","INDICADOR"');
  lineas.push(`"Meta de Ventas Mensual",${resumen.metaComercial.metaVentasMensualCOP},"100%"`);
  lineas.push(`"Ventas Netas Acumuladas",${resumen.metaComercial.ventasNetasMesCOP},"${resumen.metaComercial.porcentajeCumplimiento}%"`);
  lineas.push(`"Proyección de Cierre al Ritmo Actual",${resumen.metaComercial.proyeccionCierreMesCOP},""`);
  lineas.push(`"Meta Diaria Requerida (Días Restantes)",${resumen.metaComercial.metaDiariaRequeridaRestanteCOP},""`);
  lineas.push(`"Utilidad Neta Real del Mes",${resumen.utilidadNetaMesCOP},""`);
  lineas.push('');

  lineas.push('"2. PUNTO DE EQUILIBRIO (BREAK-EVEN)","VALOR","DETALLE"');
  lineas.push(`"Costos Fijos Considerados (COP)",${resumen.puntoEquilibrio.costosFijosConsideradosCOP},"Base + Fijos"`);
  lineas.push(`"Margen de Contribución Aplicado (%)",${resumen.puntoEquilibrio.margenContribucionAplicadoPct},"${resumen.puntoEquilibrio.fuenteMargen}"`);
  lineas.push(`"Punto de Equilibrio Mensual (COP)",${resumen.puntoEquilibrio.puntoEquilibrioMensualCOP},"${resumen.puntoEquilibrio.porcentajeEquilibrioAlcanzado}% alcanzado"`);
  lineas.push(`"Punto de Equilibrio Diario (COP)",${resumen.puntoEquilibrio.puntoEquilibrioDiarioCOP},""`);
  lineas.push(`"Pedidos Necesarios para Equilibrio",${resumen.puntoEquilibrio.pedidosEquilibrioMes},"Ticket prom: ${resumen.ticketPromedioMesCOP}"`);
  lineas.push('');

  lineas.push('"3. EJECUCIÓN DE PRESUPUESTO OPERATIVO","TIPO","PRESUPUESTADO (COP)","EJECUTADO (COP)","DISPONIBLE (COP)","% EJECUCIÓN","ESTADO"');
  for (const linea of resumen.lineasPresupuesto) {
    lineas.push(
      [
        esc(linea.nombre),
        esc(linea.tipoCosto.toUpperCase()),
        linea.presupuestadoCOP,
        linea.ejecutadoCOP,
        linea.disponibleCOP,
        `"${linea.porcentajeEjecucion}%"`,
        esc(linea.estado.toUpperCase()),
      ].join(',')
    );
  }
  lineas.push(
    [
      '"TOTAL OPEX"',
      '""',
      resumen.totalPresupuestoOpexCOP,
      resumen.totalEjecutadoOpexCOP,
      resumen.disponibleTotalOpexCOP,
      `"${resumen.porcentajeEjecucionOpex}%"`,
      esc(resumen.saludPresupuestal.toUpperCase()),
    ].join(',')
  );

  if (resumen.alertas.length > 0) {
    lineas.push('');
    lineas.push('"4. ALERTAS DE DESVIACIÓN DETECTADAS","SEVERIDAD","IMPACTO (COP)","MENSAJE"');
    for (const alerta of resumen.alertas) {
      lineas.push(
        [
          esc(alerta.titulo),
          esc(alerta.severidad.toUpperCase()),
          alerta.impactoCOP,
          esc(alerta.mensaje),
        ].join(',')
      );
    }
  }

  return '\uFEFF' + lineas.join('\r\n');
}

export function descargarReporteMetasPresupuestoCSV(
  resumen: ResumenMetasYPresupuesto,
  negocioNombre: string
): void {
  const contenido = generarReporteMetasPresupuestoCSV(resumen, negocioNombre);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  const slug = (negocioNombre || 'negocio').toLowerCase().replace(/[^a-z0-9]/g, '_');

  enlace.href = url;
  enlace.setAttribute('download', `Presupuesto_Metas_${slug}_${resumen.mesKey}.csv`);
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

/**
 * Genera el resumen ejecutivo formateado para enviar por WhatsApp a socios/administración.
 */
export function generarResumenMetasWhatsApp(
  resumen: ResumenMetasYPresupuesto,
  negocioNombre: string
): string {
  const { metaComercial, puntoEquilibrio, temporalidad, alertas } = resumen;
  const estadoBE = puntoEquilibrio.equilibrioAlcanzado
    ? `✅ *Equilibrio Superado* (+${formatCOP(puntoEquilibrio.superavitSobreEquilibrioVentasCOP)} sobre el punto cero)`
    : `⚖️ Faltan *${formatCOP(puntoEquilibrio.faltanteParaEquilibrioCOP)}* para cubrir costos fijos`;

  const lineas = [
    `📊 *Pulso Financiero — ${negocioNombre}*`,
    `📅 Mes: *${temporalidad.etiquetaMes}* (${temporalidad.diasTranscurridos}/${temporalidad.diasEnMes} días)`,
    '',
    `🎯 *Meta Comercial:*`,
    `• Vendido: *${formatCOP(metaComercial.ventasNetasMesCOP)}* / ${formatCOP(metaComercial.metaVentasMensualCOP)} (${metaComercial.porcentajeCumplimiento}%)`,
    `• Proyección cierre: *${formatCOP(metaComercial.proyeccionCierreMesCOP)}*`,
    '',
    `⚖️ *Punto de Equilibrio (Break-Even):*`,
    `• Equilibrio Mensual: *${formatCOP(puntoEquilibrio.puntoEquilibrioMensualCOP)}* (${formatCOP(puntoEquilibrio.puntoEquilibrioDiarioCOP)}/día)`,
    `• Estado: ${estadoBE}`,
    '',
    `💼 *Presupuesto OPEX:*`,
    `• Ejecutado: *${formatCOP(resumen.totalEjecutadoOpexCOP)}* / ${formatCOP(resumen.totalPresupuestoOpexCOP)} (${resumen.porcentajeEjecucionOpex}%)`,
    `• Food Cost (CMV): *${resumen.porcentajeCmvReal}%* (Meta: ${resumen.configuracion.foodCostObjetivoPct}%)`,
  ];

  if (alertas.length > 0) {
    lineas.push('');
    lineas.push(`🚨 *Alertas de Desviación (${alertas.length}):*`);
    for (const alerta of alertas.slice(0, 3)) {
      lineas.push(`• ${alerta.titulo}`);
    }
  }

  return lineas.join('\n');
}

export function construirUrlWhatsAppMetas(texto: string, telefono?: string): string {
  const limpio = (telefono || '').replace(/\D/g, '');
  const base = limpio ? `https://wa.me/${limpio}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(texto)}`;
}
