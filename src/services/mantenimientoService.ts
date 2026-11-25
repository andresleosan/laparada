import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import { registrarGastoDetallado } from '@/services/gastosService';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';
import { crearAlertaSilenciosa } from '@/services/notificacionesService';
import type {
  ActualizarEquipoMantenimientoInput,
  CrearEquipoMantenimientoInput,
  EquipoActivoMantenimiento,
  EstadoOperativoEquipo,
  OrdenMantenimiento,
  RegistrarOrdenMantenimientoInput,
  ReporteFallaEquipo,
  ReportarFallaEquipoInput,
  ResolverFallaEquipoInput,
} from '@/types/mantenimiento';
import { formatCOP } from '@/utils/formatCOP';
import { esFechaIsoValida, obtenerFechaIsoColombia, sumarDiasAFechaIso } from '@/utils/lotesInventarioUtils';
import {
  calcularProximaFechaMantenimiento,
  CATEGORIA_EQUIPO_META,
  EQUIPOS_MANTENIMIENTO_PLANTILLA_DEFAULT,
  generarCodigoActivo,
  sanitizarCostoMantenimiento,
  sanitizarFrecuenciaDias,
} from '@/utils/mantenimientoUtils';

export const COLECCION_EQUIPOS_MANTENIMIENTO = 'equipos_mantenimiento';
export const COLECCION_ORDENES_MANTENIMIENTO = 'ordenes_mantenimiento';
export const COLECCION_REPORTES_FALLA = 'reportes_falla_equipos';

function assertFechaIsoOpcional(valor: string | undefined, campo: string): string | undefined {
  const limpio = valor?.trim();
  if (!limpio) return undefined;
  if (!esFechaIsoValida(limpio)) {
    throw new Error(`La fecha "${campo}" debe tener formato válido YYYY-MM-DD`);
  }
  return limpio;
}

async function assertEquipoTenant(
  equipoId: string,
  negocioId: string
): Promise<EquipoActivoMantenimiento> {
  const tenantId = requireTenantId(negocioId);
  if (!equipoId.trim()) {
    throw new Error('Identificador de equipo requerido');
  }
  const snap = await getDoc(doc(db, COLECCION_EQUIPOS_MANTENIMIENTO, equipoId));
  if (!snap.exists()) {
    throw new Error('El equipo indicado no existe en la hoja de vida');
  }
  const data = snap.data() as Omit<EquipoActivoMantenimiento, 'id'>;
  if (data.negocioId !== tenantId) {
    throw new Error('Acceso denegado: el equipo pertenece a otro negocio');
  }
  return {
    ...data,
    id: snap.id,
  };
}

/**
 * Lista todos los equipos y activos de mantenimiento del negocio activo.
 */
export async function getEquiposMantenimiento(
  negocioId: string,
  maxLimite = 200
): Promise<EquipoActivoMantenimiento[]> {
  const tenantId = requireTenantId(negocioId);
  if (!db) return [];

  const q = query(
    collection(db, COLECCION_EQUIPOS_MANTENIMIENTO),
    where('negocioId', '==', tenantId),
    orderBy('nombre', 'asc'),
    limit(maxLimite)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (docSnap) =>
      ({
        ...docSnap.data(),
        id: docSnap.id,
      }) as EquipoActivoMantenimiento
  );
}

/**
 * Suscripción en tiempo real a la hoja de vida de activos del negocio activo.
 */
export function onEquiposMantenimientoChange(
  negocioId: string,
  callback: (equipos: EquipoActivoMantenimiento[]) => void,
  onError?: (error: Error) => void,
  maxLimite = 200
): () => void {
  const tenantId = requireTenantId(negocioId);
  if (!db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLECCION_EQUIPOS_MANTENIMIENTO),
    where('negocioId', '==', tenantId),
    orderBy('nombre', 'asc'),
    limit(maxLimite)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const lista = snapshot.docs.map(
        (docSnap) =>
          ({
            ...docSnap.data(),
            id: docSnap.id,
          }) as EquipoActivoMantenimiento
      );
      callback(lista);
    },
    (error) => {
      console.error('Error escuchando equipos_mantenimiento:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Crea un nuevo activo en la hoja de vida de equipos de cocina/seguridad.
 */
export async function crearEquipoMantenimiento(
  input: CrearEquipoMantenimientoInput,
  existentesCount = 0
): Promise<EquipoActivoMantenimiento> {
  const tenantId = requireTenantId(input.negocioId);
  const nombre = (input.nombre || '').trim();
  if (nombre.length < 2) {
    throw new Error('El nombre del equipo debe tener al menos 2 caracteres');
  }
  const ubicacion = (input.ubicacion || '').trim() || 'Cocina';
  const codigoActivo =
    (input.codigoActivo || '').trim().toUpperCase().slice(0, 40) ||
    generarCodigoActivo(input.categoria, existentesCount);

  const frecuenciaDefault =
    CATEGORIA_EQUIPO_META[input.categoria]?.frecuenciaSugeridaDias ?? 90;
  const frecuenciaPreventivoDias = sanitizarFrecuenciaDias(
    input.frecuenciaPreventivoDias ?? frecuenciaDefault,
    frecuenciaDefault
  );

  const fechaCompraIso = assertFechaIsoOpcional(input.fechaCompraIso, 'Fecha de compra');
  const garantiaHastaIso = assertFechaIsoOpcional(input.garantiaHastaIso, 'Garantía hasta');
  const ultimoMantenimientoIso = assertFechaIsoOpcional(
    input.ultimoMantenimientoIso,
    'Último mantenimiento'
  );
  let proximoMantenimientoIso = assertFechaIsoOpcional(
    input.proximoMantenimientoIso,
    'Próximo mantenimiento'
  );
  if (!proximoMantenimientoIso && ultimoMantenimientoIso) {
    proximoMantenimientoIso = calcularProximaFechaMantenimiento(
      ultimoMantenimientoIso,
      frecuenciaPreventivoDias
    );
  }
  const fechaRecargaVenceIso = assertFechaIsoOpcional(
    input.fechaRecargaVenceIso,
    'Vencimiento recarga extintor'
  );
  const fechaPruebaHidrostaticaIso = assertFechaIsoOpcional(
    input.fechaPruebaHidrostaticaIso,
    'Prueba hidrostática'
  );
  const certificadoGasVenceIso = assertFechaIsoOpcional(
    input.certificadoGasVenceIso,
    'Certificado red de gas'
  );

  const ahora = Timestamp.now();
  const payload: Omit<EquipoActivoMantenimiento, 'id'> = {
    negocioId: tenantId,
    codigoActivo,
    nombre: nombre.slice(0, 160),
    categoria: input.categoria,
    ubicacion: ubicacion.slice(0, 120),
    ...(input.marca?.trim() ? { marca: input.marca.trim().slice(0, 100) } : {}),
    ...(input.modelo?.trim() ? { modelo: input.modelo.trim().slice(0, 100) } : {}),
    ...(input.numeroSerie?.trim()
      ? { numeroSerie: input.numeroSerie.trim().slice(0, 100) }
      : {}),
    ...(fechaCompraIso ? { fechaCompraIso } : {}),
    ...(garantiaHastaIso ? { garantiaHastaIso } : {}),
    estadoOperativo: input.estadoOperativo || 'operativo',
    frecuenciaPreventivoDias,
    ...(ultimoMantenimientoIso ? { ultimoMantenimientoIso } : {}),
    ...(proximoMantenimientoIso ? { proximoMantenimientoIso } : {}),
    ...(input.tipoAgenteExtintor ? { tipoAgenteExtintor: input.tipoAgenteExtintor } : {}),
    ...(input.capacidadExtintor?.trim()
      ? { capacidadExtintor: input.capacidadExtintor.trim().slice(0, 60) }
      : {}),
    ...(fechaRecargaVenceIso ? { fechaRecargaVenceIso } : {}),
    ...(fechaPruebaHidrostaticaIso ? { fechaPruebaHidrostaticaIso } : {}),
    ...(certificadoGasVenceIso ? { certificadoGasVenceIso } : {}),
    ...(input.empresaCertificadora?.trim()
      ? { empresaCertificadora: input.empresaCertificadora.trim().slice(0, 140) }
      : {}),
    ...(input.proveedorTecnico?.trim()
      ? { proveedorTecnico: input.proveedorTecnico.trim().slice(0, 140) }
      : {}),
    ...(input.telefonoTecnico?.trim()
      ? { telefonoTecnico: input.telefonoTecnico.trim().slice(0, 40) }
      : {}),
    costoAcumuladoCOP: 0,
    totalIntervenciones: 0,
    ...(input.notas?.trim() ? { notas: input.notas.trim().slice(0, 1000) } : {}),
    activo: true,
    ...(input.creadoPor?.trim() ? { creadoPor: input.creadoPor.trim().slice(0, 120) } : {}),
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  const docRef = await addDoc(collection(db, COLECCION_EQUIPOS_MANTENIMIENTO), payload);
  return {
    ...payload,
    id: docRef.id,
  };
}

/**
 * Actualiza los datos de hoja de vida de un equipo perteneciente al negocio activo.
 */
export async function actualizarEquipoMantenimiento(
  negocioId: string,
  equipoId: string,
  updates: ActualizarEquipoMantenimientoInput
): Promise<void> {
  const actual = await assertEquipoTenant(equipoId, negocioId);

  const sanitized: Record<string, unknown> = {
    negocioId: actual.negocioId,
    codigoActivo:
      updates.codigoActivo !== undefined
        ? updates.codigoActivo.trim().toUpperCase().slice(0, 40) || actual.codigoActivo
        : actual.codigoActivo,
    nombre:
      updates.nombre !== undefined
        ? updates.nombre.trim().slice(0, 160) || actual.nombre
        : actual.nombre,
    categoria: updates.categoria ?? actual.categoria,
    ubicacion:
      updates.ubicacion !== undefined
        ? updates.ubicacion.trim().slice(0, 120) || actual.ubicacion
        : actual.ubicacion,
    estadoOperativo: updates.estadoOperativo ?? actual.estadoOperativo,
    frecuenciaPreventivoDias:
      updates.frecuenciaPreventivoDias !== undefined
        ? sanitizarFrecuenciaDias(
            updates.frecuenciaPreventivoDias,
            actual.frecuenciaPreventivoDias
          )
        : actual.frecuenciaPreventivoDias,
    costoAcumuladoCOP: sanitizarCostoMantenimiento(actual.costoAcumuladoCOP),
    totalIntervenciones: Math.max(0, Math.round(actual.totalIntervenciones || 0)),
    activo: updates.activo !== undefined ? Boolean(updates.activo) : actual.activo,
    actualizadoEn: Timestamp.now(),
  };

  const camposOpcionalesTexto: Array<keyof ActualizarEquipoMantenimientoInput> = [
    'marca',
    'modelo',
    'numeroSerie',
    'capacidadExtintor',
    'empresaCertificadora',
    'proveedorTecnico',
    'telefonoTecnico',
    'notas',
  ];
  for (const campo of camposOpcionalesTexto) {
    const val = updates[campo];
    if (typeof val === 'string' && val.trim()) {
      sanitized[campo] = val.trim().slice(0, campo === 'notas' ? 1000 : 140);
    }
  }

  if (updates.tipoAgenteExtintor) {
    sanitized.tipoAgenteExtintor = updates.tipoAgenteExtintor;
  }

  const fechaCampos: Array<[keyof ActualizarEquipoMantenimientoInput, string]> = [
    ['fechaCompraIso', 'Fecha de compra'],
    ['garantiaHastaIso', 'Garantía hasta'],
    ['ultimoMantenimientoIso', 'Último mantenimiento'],
    ['proximoMantenimientoIso', 'Próximo mantenimiento'],
    ['fechaRecargaVenceIso', 'Vencimiento recarga extintor'],
    ['fechaPruebaHidrostaticaIso', 'Prueba hidrostática'],
    ['certificadoGasVenceIso', 'Certificado red de gas'],
  ];
  for (const [key, label] of fechaCampos) {
    const rawVal = updates[key];
    if (typeof rawVal === 'string') {
      const validada = assertFechaIsoOpcional(rawVal, label);
      if (validada) sanitized[key] = validada;
    }
  }

  await updateDoc(doc(db, COLECCION_EQUIPOS_MANTENIMIENTO, equipoId), sanitized);
}

/**
 * Elimina un activo del inventario de mantenimiento del negocio activo.
 */
export async function eliminarEquipoMantenimiento(
  negocioId: string,
  equipoId: string
): Promise<void> {
  await assertEquipoTenant(equipoId, negocioId);
  await deleteDoc(doc(db, COLECCION_EQUIPOS_MANTENIMIENTO, equipoId));
}

/**
 * Inicializa la plantilla estándar de 6 equipos críticos (cocción, frío, extracción,
 * extintor Tipo K y red de gas) sin duplicar códigos existentes.
 */
export async function inicializarPlantillaEquiposMantenimiento(
  negocioId: string,
  creadoPor?: string
): Promise<{ creadosCount: number; totalExistentes: number }> {
  const tenantId = requireTenantId(negocioId);
  const existentes = await getEquiposMantenimiento(tenantId);
  const codigosExistentes = new Set(
    existentes.map((e) => e.codigoActivo.trim().toUpperCase())
  );

  const hoyIso = obtenerFechaIsoColombia();
  let creadosCount = 0;

  for (const plantilla of EQUIPOS_MANTENIMIENTO_PLANTILLA_DEFAULT) {
    if (codigosExistentes.has(plantilla.codigoActivo)) continue;

    const proximoMantenimientoIso = sumarDiasAFechaIso(
      hoyIso,
      plantilla.frecuenciaPreventivoDias
    );
    await crearEquipoMantenimiento({
      negocioId: tenantId,
      codigoActivo: plantilla.codigoActivo,
      nombre: plantilla.nombre,
      categoria: plantilla.categoria,
      ubicacion: plantilla.ubicacion,
      frecuenciaPreventivoDias: plantilla.frecuenciaPreventivoDias,
      proximoMantenimientoIso,
      ...(plantilla.tipoAgenteExtintor
        ? { tipoAgenteExtintor: plantilla.tipoAgenteExtintor }
        : {}),
      ...(plantilla.capacidadExtintor
        ? { capacidadExtintor: plantilla.capacidadExtintor }
        : {}),
      ...(plantilla.categoria === 'extintor'
        ? {
            fechaRecargaVenceIso: sumarDiasAFechaIso(hoyIso, 365),
            fechaPruebaHidrostaticaIso: sumarDiasAFechaIso(hoyIso, 365 * 5),
          }
        : {}),
      ...(plantilla.categoria === 'red_gas'
        ? {
            certificadoGasVenceIso: sumarDiasAFechaIso(hoyIso, 180),
          }
        : {}),
      notas: plantilla.notas,
      creadoPor,
    });
    creadosCount += 1;
  }

  return {
    creadosCount,
    totalExistentes: existentes.length + creadosCount,
  };
}

/**
 * Lista el historial reciente de órdenes de mantenimiento del negocio activo.
 */
export async function getOrdenesMantenimiento(
  negocioId: string,
  maxLimite = 250
): Promise<OrdenMantenimiento[]> {
  const tenantId = requireTenantId(negocioId);
  if (!db) return [];

  const q = query(
    collection(db, COLECCION_ORDENES_MANTENIMIENTO),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(maxLimite)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (docSnap) =>
      ({
        ...docSnap.data(),
        id: docSnap.id,
      }) as OrdenMantenimiento
  );
}

/**
 * Suscripción en tiempo real a las órdenes de mantenimiento del negocio activo.
 */
export function onOrdenesMantenimientoChange(
  negocioId: string,
  callback: (ordenes: OrdenMantenimiento[]) => void,
  onError?: (error: Error) => void,
  maxLimite = 250
): () => void {
  const tenantId = requireTenantId(negocioId);
  if (!db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLECCION_ORDENES_MANTENIMIENTO),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(maxLimite)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const lista = snapshot.docs.map(
        (docSnap) =>
          ({
            ...docSnap.data(),
            id: docSnap.id,
          }) as OrdenMantenimiento
      );
      callback(lista);
    },
    (error) => {
      console.error('Error escuchando ordenes_mantenimiento:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Registra una orden de mantenimiento preventivo/correctivo, actualiza las fechas y estado del activo,
 * resuelve fallas vinculadas y concilia automáticamente el egreso en `/gastos` cuando corresponde.
 */
export async function registrarOrdenMantenimiento(
  input: RegistrarOrdenMantenimientoInput
): Promise<OrdenMantenimiento> {
  const tenantId = requireTenantId(input.negocioId);
  const equipo = await assertEquipoTenant(input.equipoId, tenantId);

  const descripcionTrabajo = (input.descripcionTrabajo || '').trim();
  if (descripcionTrabajo.length < 3) {
    throw new Error('Describe el trabajo o inspección realizada (mínimo 3 caracteres)');
  }
  const tecnicoNombre = (input.tecnicoNombre || '').trim();
  if (tecnicoNombre.length < 2) {
    throw new Error('Indica el técnico o empresa responsable');
  }
  const responsableNombre = (input.responsableNombre || '').trim() || 'Administrador';
  if (responsableNombre.length < 2) {
    throw new Error('Indica el responsable interno que aprueba el mantenimiento');
  }

  const fechaIso =
    assertFechaIsoOpcional(input.fechaIso, 'Fecha de mantenimiento') ||
    obtenerFechaIsoColombia();
  const costoCOP = sanitizarCostoMantenimiento(input.costoCOP);
  const estadoEquipoResultante: EstadoOperativoEquipo =
    input.estadoEquipoResultante || 'operativo';

  const proximaFechaSugeridaIso =
    assertFechaIsoOpcional(input.proximaFechaSugeridaIso, 'Próxima fecha sugerida') ||
    calcularProximaFechaMantenimiento(fechaIso, equipo.frecuenciaPreventivoDias);

  let conciliadoConGasto = false;
  let gastoId: string | undefined;
  const debeConciliar = input.conciliarEnGastos !== false && costoCOP > 0;
  const origenFondoGasto = input.origenFondoGasto || 'caja_menor';
  const metodoPagoGasto = input.metodoPagoGasto || 'efectivo';

  if (debeConciliar) {
    const gastoCreado = await registrarGastoDetallado({
      negocioId: tenantId,
      concepto: `[Mantenimiento] ${equipo.nombre}: ${descripcionTrabajo.slice(0, 120)}`,
      monto: costoCOP,
      categoria: 'mantenimiento',
      origenFondo: origenFondoGasto,
      metodoPago: metodoPagoGasto,
      proveedorNombre: (input.proveedorTecnico || tecnicoNombre).slice(0, 140),
      numeroComprobante: input.numeroFactura?.trim().slice(0, 80),
      responsableNombre,
      responsableRol: input.responsableRol,
      deducible: true,
      notas: `Activo ${equipo.codigoActivo} · Tipo: ${input.tipo}`,
    });
    conciliadoConGasto = true;
    gastoId = gastoCreado.id;
  }

  const ahora = Timestamp.now();
  const payload: Omit<OrdenMantenimiento, 'id'> = {
    negocioId: tenantId,
    equipoId: equipo.id,
    equipoNombre: equipo.nombre,
    equipoCodigo: equipo.codigoActivo,
    categoriaEquipo: equipo.categoria,
    tipo: input.tipo,
    descripcionTrabajo: descripcionTrabajo.slice(0, 1000),
    fechaIso,
    fecha: ahora,
    tecnicoNombre: tecnicoNombre.slice(0, 120),
    ...(input.proveedorTecnico?.trim()
      ? { proveedorTecnico: input.proveedorTecnico.trim().slice(0, 140) }
      : {}),
    ...(input.telefonoTecnico?.trim()
      ? { telefonoTecnico: input.telefonoTecnico.trim().slice(0, 40) }
      : {}),
    ...(input.numeroFactura?.trim()
      ? { numeroFactura: input.numeroFactura.trim().slice(0, 80) }
      : {}),
    costoCOP,
    conciliadoConGasto,
    ...(gastoId ? { gastoId } : {}),
    ...(conciliadoConGasto ? { origenFondoGasto, metodoPagoGasto } : {}),
    proximaFechaSugeridaIso,
    ...(input.fallaRelacionadaId?.trim()
      ? { fallaRelacionadaId: input.fallaRelacionadaId.trim() }
      : {}),
    estadoEquipoResultante,
    responsableNombre: responsableNombre.slice(0, 120),
    ...(input.notas?.trim() ? { notas: input.notas.trim().slice(0, 1000) } : {}),
    creadoEn: ahora,
  };

  const ordenRef = await addDoc(collection(db, COLECCION_ORDENES_MANTENIMIENTO), payload);

  const equipoUpdates: Record<string, unknown> = {
    negocioId: tenantId,
    codigoActivo: equipo.codigoActivo,
    nombre: equipo.nombre,
    categoria: equipo.categoria,
    estadoOperativo: estadoEquipoResultante,
    frecuenciaPreventivoDias: equipo.frecuenciaPreventivoDias,
    ultimoMantenimientoIso: fechaIso,
    proximoMantenimientoIso: proximaFechaSugeridaIso,
    costoAcumuladoCOP: sanitizarCostoMantenimiento(equipo.costoAcumuladoCOP) + costoCOP,
    totalIntervenciones: Math.max(0, Math.round(equipo.totalIntervenciones || 0)) + 1,
    activo: equipo.activo !== false,
    actualizadoEn: ahora,
  };

  if (input.tipo === 'recarga_extintor') {
    equipoUpdates.fechaRecargaVenceIso = proximaFechaSugeridaIso;
  }
  if (input.tipo === 'inspeccion_gas') {
    equipoUpdates.certificadoGasVenceIso = proximaFechaSugeridaIso;
  }
  if (input.proveedorTecnico?.trim()) {
    equipoUpdates.proveedorTecnico = input.proveedorTecnico.trim().slice(0, 140);
  }

  await updateDoc(doc(db, COLECCION_EQUIPOS_MANTENIMIENTO, equipo.id), equipoUpdates);

  if (input.fallaRelacionadaId?.trim()) {
    const fallaRef = doc(db, COLECCION_REPORTES_FALLA, input.fallaRelacionadaId.trim());
    const fallaSnap = await getDoc(fallaRef);
    if (fallaSnap.exists() && fallaSnap.data()?.negocioId === tenantId) {
      await updateDoc(fallaRef, {
        estado: 'resuelta',
        actualizadoEn: ahora,
        resueltoEn: ahora,
        resueltoPor: responsableNombre.slice(0, 120),
        resolucionNotas: descripcionTrabajo.slice(0, 500),
        ordenMantenimientoId: ordenRef.id,
      });
    }
  }

  if (costoCOP > 0 || input.fallaRelacionadaId) {
    registrarEventoAuditoriaSilencioso({
      negocioId: tenantId,
      categoria: conciliadoConGasto ? 'movimiento_caja' : 'ajuste_inventario',
      severidad: costoCOP >= 300000 ? 'alta' : 'informativa',
      titulo: `Mantenimiento ${input.tipo}: ${equipo.nombre}`,
      descripcion: `${descripcionTrabajo.slice(0, 160)} · Costo: ${formatCOP(costoCOP)}${
        conciliadoConGasto ? ' (Conciliado en /gastos)' : ''
      }.`,
      montoImpacto: costoCOP,
      responsableNombre,
      responsableRol: input.responsableRol,
      entidadTipo: conciliadoConGasto ? 'caja' : 'seguridad',
      referenciaId: ordenRef.id,
      detallesForenses: {
        equipoId: equipo.id,
        codigoActivo: equipo.codigoActivo,
        tipo: input.tipo,
        conciliadoConGasto,
        ...(gastoId ? { gastoId } : {}),
      },
    });
  }

  return {
    ...payload,
    id: ordenRef.id,
  };
}

/**
 * Elimina una orden del historial (uso administrativo).
 */
export async function eliminarOrdenMantenimiento(
  negocioId: string,
  ordenId: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const ref = doc(db, COLECCION_ORDENES_MANTENIMIENTO, ordenId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data()?.negocioId !== tenantId) {
    throw new Error('Orden de mantenimiento no encontrada en este negocio');
  }
  await deleteDoc(ref);
}

/**
 * Lista los reportes de falla de equipos del negocio activo.
 */
export async function getReportesFallaEquipos(
  negocioId: string,
  maxLimite = 200
): Promise<ReporteFallaEquipo[]> {
  const tenantId = requireTenantId(negocioId);
  if (!db) return [];

  const q = query(
    collection(db, COLECCION_REPORTES_FALLA),
    where('negocioId', '==', tenantId),
    orderBy('creadoEn', 'desc'),
    limit(maxLimite)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (docSnap) =>
      ({
        ...docSnap.data(),
        id: docSnap.id,
      }) as ReporteFallaEquipo
  );
}

/**
 * Suscripción en tiempo real a reportes de fallas de cocina/equipos del negocio activo.
 */
export function onReportesFallaEquiposChange(
  negocioId: string,
  callback: (fallas: ReporteFallaEquipo[]) => void,
  onError?: (error: Error) => void,
  maxLimite = 200
): () => void {
  const tenantId = requireTenantId(negocioId);
  if (!db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLECCION_REPORTES_FALLA),
    where('negocioId', '==', tenantId),
    orderBy('creadoEn', 'desc'),
    limit(maxLimite)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const lista = snapshot.docs.map(
        (docSnap) =>
          ({
            ...docSnap.data(),
            id: docSnap.id,
          }) as ReporteFallaEquipo
      );
      callback(lista);
    },
    (error) => {
      console.error('Error escuchando reportes_falla_equipos:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Registra una falla operativa desde KDS Cocina o desde el panel, actualiza el estado
 * del equipo afectado y emite alerta inmediata en tiempo real.
 */
export async function reportarFallaEquipo(
  input: ReportarFallaEquipoInput
): Promise<ReporteFallaEquipo> {
  const tenantId = requireTenantId(input.negocioId);
  const equipoNombre = (input.equipoNombre || '').trim();
  if (!equipoNombre) {
    throw new Error('Selecciona o escribe el nombre del equipo con falla');
  }
  const descripcion = (input.descripcion || '').trim();
  if (descripcion.length < 3) {
    throw new Error('Describe la falla observada (mínimo 3 caracteres)');
  }
  const reportadoPor = (input.reportadoPor || '').trim() || 'Operador Cocina';
  if (reportadoPor.length < 2) {
    throw new Error('Indica el nombre de quien reporta la falla');
  }

  const fechaIso =
    assertFechaIsoOpcional(input.fechaIso, 'Fecha de falla') ||
    obtenerFechaIsoColombia();

  let equipoVerificado: EquipoActivoMantenimiento | null = null;
  if (input.equipoId?.trim()) {
    equipoVerificado = await assertEquipoTenant(input.equipoId.trim(), tenantId);
  }

  const ahora = Timestamp.now();
  const payload: Omit<ReporteFallaEquipo, 'id'> = {
    negocioId: tenantId,
    ...(equipoVerificado ? { equipoId: equipoVerificado.id } : {}),
    equipoNombre: (equipoVerificado?.nombre || equipoNombre).slice(0, 160),
    categoriaEquipo: equipoVerificado?.categoria || input.categoriaEquipo,
    ...(input.estacionCocina ? { estacionCocina: input.estacionCocina } : {}),
    severidad: input.severidad,
    detieneOperacion: Boolean(input.detieneOperacion),
    descripcion: descripcion.slice(0, 1000),
    estado: 'abierta',
    origenReporte: input.origenReporte,
    reportadoPor: reportadoPor.slice(0, 120),
    ...(input.reportadoRol?.trim()
      ? { reportadoRol: input.reportadoRol.trim().slice(0, 60) }
      : {}),
    fechaIso,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  const docRef = await addDoc(collection(db, COLECCION_REPORTES_FALLA), payload);

  if (equipoVerificado) {
    const nuevoEstadoEquipo: EstadoOperativoEquipo = payload.detieneOperacion
      ? 'fuera_servicio'
      : 'con_falla';
    await updateDoc(doc(db, COLECCION_EQUIPOS_MANTENIMIENTO, equipoVerificado.id), {
      estadoOperativo: nuevoEstadoEquipo,
      actualizadoEn: ahora,
    });
  }

  crearAlertaSilenciosa(tenantId, {
    modulo: 'cocina',
    tipo: 'falla_equipo_kds',
    titulo: `Falla en equipo: ${payload.equipoNombre}`,
    mensaje: `${payload.detieneOperacion ? 'DETIENE OPERACIÓN · ' : ''}${payload.descripcion}`,
    urgencia:
      payload.detieneOperacion || payload.severidad === 'critica' ? 'critica' : 'alta',
    enlace: '/mantenimiento',
    origen: 'automatico',
    creadaPor: payload.reportadoPor,
    metadata: {
      fallaId: docRef.id,
      equipoId: equipoVerificado?.id || '',
      severidad: payload.severidad,
      origenReporte: payload.origenReporte,
    },
  });

  return {
    ...payload,
    id: docRef.id,
  };
}

/**
 * Actualiza el estado de un reporte de falla (en atención, resuelta o descartada).
 */
export async function actualizarEstadoFallaEquipo(
  negocioId: string,
  fallaId: string,
  input: ResolverFallaEquipoInput
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  if (!fallaId.trim()) throw new Error('ID de reporte de falla requerido');

  const docRef = doc(db, COLECCION_REPORTES_FALLA, fallaId);
  const snap = await getDoc(docRef);
  if (!snap.exists() || snap.data()?.negocioId !== tenantId) {
    throw new Error('Reporte de falla no encontrado en este negocio');
  }

  const ahora = Timestamp.now();
  const esCierre = input.estado === 'resuelta' || input.estado === 'descartada';

  const updates: Record<string, unknown> = {
    estado: input.estado,
    actualizadoEn: ahora,
  };
  if (esCierre) {
    updates.resueltoEn = ahora;
    updates.resueltoPor = (input.resueltoPor || 'Administrador').trim().slice(0, 120);
    if (input.resolucionNotas?.trim()) {
      updates.resolucionNotas = input.resolucionNotas.trim().slice(0, 500);
    }
    if (input.ordenMantenimientoId?.trim()) {
      updates.ordenMantenimientoId = input.ordenMantenimientoId.trim();
    }
  }

  await updateDoc(docRef, updates);
}

/**
 * Elimina un reporte de falla (uso administrativo).
 */
export async function eliminarReporteFalla(
  negocioId: string,
  fallaId: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const ref = doc(db, COLECCION_REPORTES_FALLA, fallaId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data()?.negocioId !== tenantId) {
    throw new Error('Reporte de falla no encontrado en este negocio');
  }
  await deleteDoc(ref);
}
