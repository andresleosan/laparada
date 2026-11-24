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
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';
import { crearAlertaSilenciosa } from '@/services/notificacionesService';
import type {
  ChecklistTurnoBpm,
  ConfiguracionBpm,
  EquipoBpmConfig,
  EstadoAceiteBpm,
  EstadoChecklistBpm,
  EstadoConformidadTempBpm,
  FreidoraBpmConfig,
  GuardarChecklistBpmInput,
  RegistrarAceiteBpmInput,
  RegistrarTemperaturaBpmInput,
  RegistroAceiteBpm,
  RegistroTemperaturaBpm,
} from '@/types/bpm';
import {
  calcularMetricasChecklist,
  crearConfiguracionBpmDefault,
  evaluarConformidadTemperatura,
  evaluarEstadoAceite,
  obtenerHoraColombia,
  RANGOS_NORMATIVOS_BPM,
  validarTemperaturaFisica,
} from '@/utils/bpmUtils';
import { esFechaIsoValida, obtenerFechaIsoColombia } from '@/utils/lotesInventarioUtils';

export const COLECCION_CONFIG_BPM = 'configuraciones_bpm';
export const COLECCION_TEMPERATURAS_BPM = 'registros_temperatura_bpm';
export const COLECCION_ACEITE_BPM = 'registros_aceite_bpm';
export const COLECCION_CHECKLISTS_BPM = 'checklists_bpm';

export type ColeccionRegistroBpm =
  | typeof COLECCION_TEMPERATURAS_BPM
  | typeof COLECCION_ACEITE_BPM
  | typeof COLECCION_CHECKLISTS_BPM;

function normalizarConfiguracionBpm(
  tenantId: string,
  raw: Partial<ConfiguracionBpm> | undefined
): ConfiguracionBpm {
  const base = crearConfiguracionBpmDefault(tenantId);
  if (!raw) return base;

  return {
    negocioId: tenantId,
    equiposFrio:
      Array.isArray(raw.equiposFrio) && raw.equiposFrio.length > 0
        ? raw.equiposFrio
        : base.equiposFrio,
    freidoras:
      Array.isArray(raw.freidoras) && raw.freidoras.length > 0
        ? raw.freidoras
        : base.freidoras,
    plantillaApertura:
      Array.isArray(raw.plantillaApertura) && raw.plantillaApertura.length > 0
        ? raw.plantillaApertura
        : base.plantillaApertura,
    plantillaCierre:
      Array.isArray(raw.plantillaCierre) && raw.plantillaCierre.length > 0
        ? raw.plantillaCierre
        : base.plantillaCierre,
    ...(raw.actualizadoPor ? { actualizadoPor: raw.actualizadoPor } : {}),
    ...(raw.actualizadoEn ? { actualizadoEn: raw.actualizadoEn } : {}),
  };
}

/**
 * Obtiene la configuración BPM del negocio activo, aplicando la plantilla INVIMA por defecto si no existe.
 */
export async function getConfiguracionBpm(negocioId: string): Promise<ConfiguracionBpm> {
  const tenantId = requireTenantId(negocioId);
  if (!db) return crearConfiguracionBpmDefault(tenantId);

  const docRef = doc(db, COLECCION_CONFIG_BPM, tenantId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    return crearConfiguracionBpmDefault(tenantId);
  }
  return normalizarConfiguracionBpm(tenantId, snap.data() as Partial<ConfiguracionBpm>);
}

/**
 * Suscripción en tiempo real a la configuración BPM del negocio activo.
 */
export function onConfiguracionBpmChange(
  negocioId: string,
  callback: (config: ConfiguracionBpm) => void,
  onError?: (error: Error) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  if (!db) {
    callback(crearConfiguracionBpmDefault(tenantId));
    return () => {};
  }

  const docRef = doc(db, COLECCION_CONFIG_BPM, tenantId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        callback(crearConfiguracionBpmDefault(tenantId));
        return;
      }
      callback(
        normalizarConfiguracionBpm(tenantId, snap.data() as Partial<ConfiguracionBpm>)
      );
    },
    (error) => {
      console.error('Error escuchando configuraciones_bpm:', error);
      if (onError) onError(error);
    }
  );
}

function sanitizarEquiposConfig(equipos: EquipoBpmConfig[]): EquipoBpmConfig[] {
  if (!Array.isArray(equipos) || equipos.length === 0) {
    throw new Error('Debe configurar al menos un equipo de cadena de frío o calor');
  }
  if (equipos.length > 100) {
    throw new Error('Máximo 100 equipos permitidos en la configuración BPM');
  }

  return equipos.map((eq, index) => {
    const nombre = (eq.nombre || '').trim();
    if (!nombre) {
      throw new Error(`El equipo #${index + 1} requiere un nombre válido`);
    }
    const min = validarTemperaturaFisica(Number(eq.tempMinOptimaC));
    const max = validarTemperaturaFisica(Number(eq.tempMaxOptimaC));
    if (min > max) {
      throw new Error(`El rango térmico de "${nombre}" tiene mínimo mayor al máximo`);
    }
    return {
      id: (eq.id || `eq-${index + 1}`).trim(),
      nombre: nombre.slice(0, 120),
      tipo: eq.tipo,
      ubicacion: (eq.ubicacion || 'Cocina').trim().slice(0, 120),
      tempMinOptimaC: min,
      tempMaxOptimaC: max,
      activo: eq.activo !== false,
    };
  });
}

function sanitizarFreidorasConfig(freidoras: FreidoraBpmConfig[]): FreidoraBpmConfig[] {
  if (!Array.isArray(freidoras)) {
    throw new Error('La lista de freidoras es inválida');
  }
  if (freidoras.length > 50) {
    throw new Error('Máximo 50 freidoras permitidas en la configuración BPM');
  }

  return freidoras.map((fr, index) => {
    const nombre = (fr.nombre || '').trim();
    if (!nombre) {
      throw new Error(`La freidora #${index + 1} requiere un nombre válido`);
    }
    const capacidadLitros = Number(fr.capacidadLitros);
    if (!Number.isFinite(capacidadLitros) || capacidadLitros <= 0 || capacidadLitros > 500) {
      throw new Error(`Capacidad inválida para la freidora "${nombre}"`);
    }
    const cicloMaxDiasCambio = Math.trunc(Number(fr.cicloMaxDiasCambio));
    if (!Number.isFinite(cicloMaxDiasCambio) || cicloMaxDiasCambio < 1 || cicloMaxDiasCambio > 30) {
      throw new Error(`Ciclo máximo de días inválido para "${nombre}"`);
    }
    return {
      id: (fr.id || `fre-${index + 1}`).trim(),
      nombre: nombre.slice(0, 120),
      capacidadLitros: Math.round(capacidadLitros * 10) / 10,
      cicloMaxDiasCambio,
      activo: fr.activo !== false,
    };
  });
}

/**
 * Guarda la configuración de equipos térmicos, freidoras y plantillas BPM para el negocio activo.
 */
export async function guardarConfiguracionBpm(
  negocioId: string,
  input: Partial<Omit<ConfiguracionBpm, 'negocioId'>> & { actualizadoPor?: string }
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const base = crearConfiguracionBpmDefault(tenantId);

  const equiposFrio = sanitizarEquiposConfig(input.equiposFrio ?? base.equiposFrio);
  const freidoras = sanitizarFreidorasConfig(input.freidoras ?? base.freidoras);
  const plantillaApertura =
    Array.isArray(input.plantillaApertura) && input.plantillaApertura.length > 0
      ? input.plantillaApertura.slice(0, 50)
      : base.plantillaApertura;
  const plantillaCierre =
    Array.isArray(input.plantillaCierre) && input.plantillaCierre.length > 0
      ? input.plantillaCierre.slice(0, 50)
      : base.plantillaCierre;

  const payload: ConfiguracionBpm = {
    negocioId: tenantId,
    equiposFrio,
    freidoras,
    plantillaApertura,
    plantillaCierre,
    actualizadoPor: (input.actualizadoPor || 'Administrador').trim().slice(0, 120),
    actualizadoEn: Timestamp.now(),
  };

  await setDoc(doc(db, COLECCION_CONFIG_BPM, tenantId), payload);
}

/**
 * Registra una lectura de temperatura BPM, valida conformidad INVIMA y emite alerta/auditoría en desvíos.
 */
export async function registrarTemperaturaBpm(
  negocioId: string,
  input: RegistrarTemperaturaBpmInput
): Promise<{ id: string; estadoConformidad: EstadoConformidadTempBpm }> {
  const tenantId = requireTenantId(negocioId);
  const equipoId = (input.equipoId || '').trim();
  const equipoNombre = (input.equipoNombre || '').trim();
  const responsableNombre = (input.responsableNombre || '').trim();

  if (!equipoId || !equipoNombre) {
    throw new Error('Selecciona el equipo de frío o calor a registrar');
  }
  if (responsableNombre.length < 2) {
    throw new Error('El nombre del responsable debe tener al menos 2 caracteres');
  }

  const temperaturaC = validarTemperaturaFisica(input.temperaturaC);
  const norm = RANGOS_NORMATIVOS_BPM[input.tipoEquipo] ?? RANGOS_NORMATIVOS_BPM.refrigeracion;
  const tempMinOptimaC =
    typeof input.tempMinOptimaC === 'number' && Number.isFinite(input.tempMinOptimaC)
      ? validarTemperaturaFisica(input.tempMinOptimaC)
      : norm.minOptimoC;
  const tempMaxOptimaC =
    typeof input.tempMaxOptimaC === 'number' && Number.isFinite(input.tempMaxOptimaC)
      ? validarTemperaturaFisica(input.tempMaxOptimaC)
      : norm.maxOptimoC;

  const estadoConformidad = evaluarConformidadTemperatura(temperaturaC, input.tipoEquipo, {
    min: tempMinOptimaC,
    max: tempMaxOptimaC,
  });

  const accionCorrectiva = (input.accionCorrectiva || '').trim();
  if (estadoConformidad === 'critico' && accionCorrectiva.length < 3) {
    throw new Error(
      'Una temperatura crítica fuera de rango exige registrar la acción correctiva inmediata'
    );
  }

  const fechaIso =
    input.fechaIso && esFechaIsoValida(input.fechaIso)
      ? input.fechaIso
      : obtenerFechaIsoColombia();
  const horaTexto = (input.horaTexto || obtenerHoraColombia()).trim();
  const ahoraTs = Timestamp.now();

  const payload: Omit<RegistroTemperaturaBpm, 'id'> = {
    negocioId: tenantId,
    equipoId,
    equipoNombre: equipoNombre.slice(0, 160),
    tipoEquipo: input.tipoEquipo,
    ...(input.ubicacion ? { ubicacion: input.ubicacion.trim().slice(0, 120) } : {}),
    franja: input.franja,
    fechaIso,
    horaTexto,
    temperaturaC,
    tempMinOptimaC,
    tempMaxOptimaC,
    estadoConformidad,
    ...(accionCorrectiva ? { accionCorrectiva: accionCorrectiva.slice(0, 500) } : {}),
    resuelto: estadoConformidad === 'conforme',
    ...(input.observaciones?.trim()
      ? { observaciones: input.observaciones.trim().slice(0, 500) }
      : {}),
    responsableNombre: responsableNombre.slice(0, 120),
    ...(input.responsableRol ? { responsableRol: input.responsableRol.trim() } : {}),
    fecha: ahoraTs,
    creadoEn: ahoraTs,
  };

  const docRef = await addDoc(collection(db, COLECCION_TEMPERATURAS_BPM), payload);

  if (estadoConformidad === 'critico' || estadoConformidad === 'alerta') {
    crearAlertaSilenciosa(tenantId, {
      modulo: 'cocina',
      tipo:
        estadoConformidad === 'critico'
          ? 'bpm_temperatura_critica'
          : 'bpm_temperatura_alerta',
      titulo:
        estadoConformidad === 'critico'
          ? `Desviación Térmica Crítica: ${equipoNombre} (${temperaturaC} °C)`
          : `Temperatura Preventiva: ${equipoNombre} (${temperaturaC} °C)`,
      mensaje: accionCorrectiva
        ? `Rango óptimo ${tempMinOptimaC} °C a ${tempMaxOptimaC} °C. Acción: ${accionCorrectiva}`
        : `Rango óptimo ${tempMinOptimaC} °C a ${tempMaxOptimaC} °C. Vigilar equipo en turno.`,
      urgencia: estadoConformidad === 'critico' ? 'critica' : 'alta',
      enlace: '/bpm',
      origen: 'automatico',
      creadaPor: responsableNombre,
      metadata: {
        registroId: docRef.id,
        equipoId,
        temperaturaC,
        estadoConformidad,
        fechaIso,
      },
    });
  }

  if (estadoConformidad === 'critico') {
    registrarEventoAuditoriaSilencioso({
      negocioId: tenantId,
      categoria: 'ajuste_inventario',
      severidad: 'critica',
      titulo: `Desviación Crítica Cadena de Frío: ${equipoNombre} (${temperaturaC} °C)`,
      descripcion: `Lectura crítica fuera de rango INVIMA (${tempMinOptimaC} °C a ${tempMaxOptimaC} °C) en franja ${input.franja}.`,
      motivo: accionCorrectiva,
      montoImpacto: 0,
      responsableNombre,
      responsableRol: input.responsableRol,
      entidadTipo: 'inventario',
      referenciaId: docRef.id,
      detallesForenses: {
        equipoId,
        equipoNombre,
        temperaturaC,
        franja: input.franja,
        fechaIso,
      },
    });
  }

  return { id: docRef.id, estadoConformidad };
}

/**
 * Marca una desviación térmica previa como resuelta dejando constancia de la acción correctiva.
 */
export async function resolverDesviacionTemperaturaBpm(
  negocioId: string,
  registroId: string,
  input: {
    accionCorrectiva: string;
    resueltoPor: string;
    observaciones?: string;
  }
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  if (!registroId) throw new Error('ID de registro térmico requerido');

  const accionCorrectiva = (input.accionCorrectiva || '').trim();
  const resueltoPor = (input.resueltoPor || '').trim();
  if (accionCorrectiva.length < 3) {
    throw new Error('Describe la acción correctiva aplicada para cerrar la desviación');
  }
  if (resueltoPor.length < 2) {
    throw new Error('Indica quién verificó y resolvió la desviación');
  }

  const docRef = doc(db, COLECCION_TEMPERATURAS_BPM, registroId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('El registro de temperatura no existe');
  }
  const data = snap.data() as Partial<RegistroTemperaturaBpm>;
  if (data.negocioId !== tenantId) {
    throw new Error('Acceso denegado sobre el registro de otro negocio');
  }

  await updateDoc(docRef, {
    accionCorrectiva: accionCorrectiva.slice(0, 500),
    resuelto: true,
    resueltoPor: resueltoPor.slice(0, 120),
    resueltoEn: Timestamp.now(),
    ...(input.observaciones?.trim()
      ? { observaciones: input.observaciones.trim().slice(0, 500) }
      : {}),
  });
}

/**
 * Consulta el historial reciente de registros de temperatura del negocio activo.
 */
export async function getRegistrosTemperaturaBpm(
  negocioId: string,
  maxLimite = 250
): Promise<RegistroTemperaturaBpm[]> {
  const tenantId = requireTenantId(negocioId);
  if (!db) return [];

  const q = query(
    collection(db, COLECCION_TEMPERATURAS_BPM),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(maxLimite)
  );
  const snapshot = await getDocs(q);
  if (!snapshot || !Array.isArray(snapshot.docs)) return [];

  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as Omit<RegistroTemperaturaBpm, 'id'>),
    id: docSnap.id,
  }));
}

/**
 * Suscripción en tiempo real a los registros de temperatura BPM del negocio activo.
 */
export function onRegistrosTemperaturaBpmChange(
  negocioId: string,
  callback: (registros: RegistroTemperaturaBpm[]) => void,
  onError?: (error: Error) => void,
  maxLimite = 250
): () => void {
  const tenantId = requireTenantId(negocioId);
  if (!db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLECCION_TEMPERATURAS_BPM),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(maxLimite)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const lista = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Omit<RegistroTemperaturaBpm, 'id'>),
        id: docSnap.id,
      }));
      callback(lista);
    },
    (error) => {
      console.error('Error escuchando registros_temperatura_bpm:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Registra un evento inmutable de cambio, filtrado o inspección de aceite en freidora.
 */
export async function registrarEventoAceiteBpm(
  negocioId: string,
  input: RegistrarAceiteBpmInput
): Promise<{ id: string; estadoAceite: EstadoAceiteBpm }> {
  const tenantId = requireTenantId(negocioId);
  const freidoraId = (input.freidoraId || '').trim();
  const freidoraNombre = (input.freidoraNombre || '').trim();
  const responsableNombre = (input.responsableNombre || '').trim();

  if (!freidoraId || !freidoraNombre) {
    throw new Error('Selecciona la freidora para registrar el control de aceite');
  }
  if (responsableNombre.length < 2) {
    throw new Error('El nombre del responsable debe tener al menos 2 caracteres');
  }

  let litrosCambiados: number | undefined;
  if (input.litrosCambiados !== undefined && input.litrosCambiados !== null) {
    const val = Number(input.litrosCambiados);
    if (!Number.isFinite(val) || val < 0 || val > 500) {
      throw new Error('La cantidad de litros debe estar entre 0 y 500');
    }
    litrosCambiados = Math.round(val * 10) / 10;
  }

  const estadoAceite = evaluarEstadoAceite({
    tipoEvento: input.tipoEvento,
    colorAceite: input.colorAceite,
    espumaExcesiva: input.espumaExcesiva,
    olorRancio: input.olorRancio,
    humoBajoPunto: input.humoBajoPunto,
  });

  const fechaIso =
    input.fechaIso && esFechaIsoValida(input.fechaIso)
      ? input.fechaIso
      : obtenerFechaIsoColombia();
  const horaTexto = (input.horaTexto || obtenerHoraColombia()).trim();
  const ahoraTs = Timestamp.now();

  const payload: Omit<RegistroAceiteBpm, 'id'> = {
    negocioId: tenantId,
    freidoraId,
    freidoraNombre: freidoraNombre.slice(0, 160),
    tipoEvento: input.tipoEvento,
    colorAceite: input.colorAceite,
    espumaExcesiva: Boolean(input.espumaExcesiva),
    olorRancio: Boolean(input.olorRancio),
    humoBajoPunto: Boolean(input.humoBajoPunto),
    estadoAceite,
    ...(litrosCambiados !== undefined ? { litrosCambiados } : {}),
    ...(input.loteAceiteNuevo?.trim()
      ? { loteAceiteNuevo: input.loteAceiteNuevo.trim().slice(0, 80) }
      : {}),
    ...(input.disposicionUsado ? { disposicionUsado: input.disposicionUsado } : {}),
    ...(input.gestorResiduosNombre?.trim()
      ? { gestorResiduosNombre: input.gestorResiduosNombre.trim().slice(0, 120) }
      : {}),
    ...(input.observaciones?.trim()
      ? { observaciones: input.observaciones.trim().slice(0, 500) }
      : {}),
    fechaIso,
    horaTexto,
    responsableNombre: responsableNombre.slice(0, 120),
    ...(input.responsableRol ? { responsableRol: input.responsableRol.trim() } : {}),
    fecha: ahoraTs,
    creadoEn: ahoraTs,
  };

  const docRef = await addDoc(collection(db, COLECCION_ACEITE_BPM), payload);

  if (estadoAceite === 'cambiar_inmediato' && input.tipoEvento !== 'cambio_completo') {
    crearAlertaSilenciosa(tenantId, {
      modulo: 'cocina',
      tipo: 'bpm_cambio_aceite_urgente',
      titulo: `Cambio de Aceite Urgente: ${freidoraNombre}`,
      mensaje: `Inspección detectó aceite degradado (${input.colorAceite}). Realizar cambio total y lavado de cuba.`,
      urgencia: 'critica',
      enlace: '/bpm',
      origen: 'automatico',
      creadaPor: responsableNombre,
      metadata: { registroId: docRef.id, freidoraId, fechaIso },
    });

    registrarEventoAuditoriaSilencioso({
      negocioId: tenantId,
      categoria: 'ajuste_inventario',
      severidad: 'alta',
      titulo: `Aceite Rechazado en Freidora: ${freidoraNombre}`,
      descripcion: `Inspección sensorial marcó aceite para cambio inmediato (${input.colorAceite}).`,
      montoImpacto: 0,
      responsableNombre,
      responsableRol: input.responsableRol,
      entidadTipo: 'inventario',
      referenciaId: docRef.id,
      detallesForenses: {
        freidoraId,
        freidoraNombre,
        colorAceite: input.colorAceite,
        fechaIso,
      },
    });
  }

  return { id: docRef.id, estadoAceite };
}

/**
 * Consulta el historial reciente de eventos de aceite de freidoras.
 */
export async function getRegistrosAceiteBpm(
  negocioId: string,
  maxLimite = 200
): Promise<RegistroAceiteBpm[]> {
  const tenantId = requireTenantId(negocioId);
  if (!db) return [];

  const q = query(
    collection(db, COLECCION_ACEITE_BPM),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(maxLimite)
  );
  const snapshot = await getDocs(q);
  if (!snapshot || !Array.isArray(snapshot.docs)) return [];

  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as Omit<RegistroAceiteBpm, 'id'>),
    id: docSnap.id,
  }));
}

/**
 * Suscripción en tiempo real a los registros de aceite de freidoras del negocio activo.
 */
export function onRegistrosAceiteBpmChange(
  negocioId: string,
  callback: (registros: RegistroAceiteBpm[]) => void,
  onError?: (error: Error) => void,
  maxLimite = 200
): () => void {
  const tenantId = requireTenantId(negocioId);
  if (!db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLECCION_ACEITE_BPM),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(maxLimite)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const lista = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Omit<RegistroAceiteBpm, 'id'>),
        id: docSnap.id,
      }));
      callback(lista);
    },
    (error) => {
      console.error('Error escuchando registros_aceite_bpm:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Guarda el avance o cierra formalmente un checklist diario de apertura o cierre de turno.
 */
export async function guardarChecklistTurnoBpm(
  negocioId: string,
  input: GuardarChecklistBpmInput
): Promise<{
  id: string;
  estado: EstadoChecklistBpm;
  porcentajeCumplimiento: number;
}> {
  const tenantId = requireTenantId(negocioId);
  const responsableNombre = (input.responsableNombre || '').trim();
  if (responsableNombre.length < 2) {
    throw new Error('El nombre del responsable debe tener al menos 2 caracteres');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('El checklist debe contener al menos un punto de verificación');
  }
  if (input.items.length > 50) {
    throw new Error('El checklist no puede superar los 50 puntos');
  }

  const itemsLimpios = input.items.map((item) => ({
    id: item.id,
    categoria: item.categoria,
    titulo: item.titulo,
    descripcion: item.descripcion,
    critico: Boolean(item.critico),
    estado: item.estado,
    ...(item.observacion?.trim()
      ? { observacion: item.observacion.trim().slice(0, 300) }
      : {}),
  }));

  const metricas = calcularMetricasChecklist(itemsLimpios, Boolean(input.finalizar));
  if (input.finalizar && metricas.itemsPendientes > 0) {
    throw new Error(
      `Faltan ${metricas.itemsPendientes} punto(s) por verificar antes de firmar el checklist`
    );
  }

  const fechaIso =
    input.fechaIso && esFechaIsoValida(input.fechaIso)
      ? input.fechaIso
      : obtenerFechaIsoColombia();
  const docId = input.id?.trim() || `${tenantId}_${fechaIso}_${input.tipo}`;
  const docRef = doc(db, COLECCION_CHECKLISTS_BPM, docId);
  const ahoraTs = Timestamp.now();

  const basePayload: Omit<ChecklistTurnoBpm, 'id' | 'creadoEn' | 'actualizadoEn'> = {
    negocioId: tenantId,
    tipo: input.tipo,
    fechaIso,
    estado: metricas.estado,
    items: itemsLimpios,
    totalItems: metricas.totalItems,
    itemsCumplidos: metricas.itemsCumplidos,
    itemsNoConformes: metricas.itemsNoConformes,
    itemsNa: metricas.itemsNa,
    itemsPendientes: metricas.itemsPendientes,
    hallazgosCriticosCount: metricas.hallazgosCriticosCount,
    porcentajeCumplimiento: metricas.porcentajeCumplimiento,
    ...(input.observacionesGenerales?.trim()
      ? { observacionesGenerales: input.observacionesGenerales.trim().slice(0, 500) }
      : {}),
    responsableNombre: responsableNombre.slice(0, 120),
    ...(input.responsableRol ? { responsableRol: input.responsableRol.trim() } : {}),
    ...(input.finalizar
      ? {
          cerradoPor: responsableNombre.slice(0, 120),
          cerradoEn: ahoraTs,
        }
      : {}),
  };

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) {
      transaction.set(docRef, {
        ...basePayload,
        creadoEn: ahoraTs,
        actualizadoEn: ahoraTs,
      });
      return;
    }

    const prev = snap.data() as Partial<ChecklistTurnoBpm>;
    if (prev.negocioId !== tenantId) {
      throw new Error('Acceso denegado sobre el checklist de otro negocio');
    }

    transaction.update(docRef, {
      ...basePayload,
      creadoEn: prev.creadoEn || ahoraTs,
      actualizadoEn: ahoraTs,
    });
  });

  if (input.finalizar && metricas.hallazgosCriticosCount > 0) {
    crearAlertaSilenciosa(tenantId, {
      modulo: 'cocina',
      tipo: 'bpm_checklist_hallazgo_critico',
      titulo: `Hallazgos Críticos en Checklist de ${
        input.tipo === 'apertura' ? 'Apertura' : 'Cierre'
      } (${metricas.hallazgosCriticosCount})`,
      mensaje: `El checklist del ${fechaIso} cerró con ${metricas.itemsNoConformes} no conformidad(es). Revisar en /bpm.`,
      urgencia: 'alta',
      enlace: '/bpm',
      origen: 'automatico',
      creadaPor: responsableNombre,
      metadata: {
        checklistId: docId,
        tipo: input.tipo,
        fechaIso,
        hallazgosCriticosCount: metricas.hallazgosCriticosCount,
      },
    });

    registrarEventoAuditoriaSilencioso({
      negocioId: tenantId,
      categoria: 'acceso_personal',
      severidad: 'alta',
      titulo: `Checklist BPM ${input.tipo} con ${metricas.hallazgosCriticosCount} hallazgo(s) crítico(s)`,
      descripcion: `Cumplimiento registrado: ${metricas.porcentajeCumplimiento}% (${metricas.itemsNoConformes} no conformes).`,
      montoImpacto: 0,
      responsableNombre,
      responsableRol: input.responsableRol,
      entidadTipo: 'seguridad',
      referenciaId: docId,
      detallesForenses: {
        tipo: input.tipo,
        fechaIso,
        hallazgosCriticos: metricas.hallazgosCriticosCount,
        porcentajeCumplimiento: metricas.porcentajeCumplimiento,
      },
    });
  }

  return {
    id: docId,
    estado: metricas.estado,
    porcentajeCumplimiento: metricas.porcentajeCumplimiento,
  };
}

/**
 * Consulta el historial reciente de checklists BPM de apertura y cierre.
 */
export async function getChecklistsBpm(
  negocioId: string,
  maxLimite = 120
): Promise<ChecklistTurnoBpm[]> {
  const tenantId = requireTenantId(negocioId);
  if (!db) return [];

  const q = query(
    collection(db, COLECCION_CHECKLISTS_BPM),
    where('negocioId', '==', tenantId),
    orderBy('fechaIso', 'desc'),
    orderBy('actualizadoEn', 'desc'),
    limit(maxLimite)
  );
  const snapshot = await getDocs(q);
  if (!snapshot || !Array.isArray(snapshot.docs)) return [];

  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as Omit<ChecklistTurnoBpm, 'id'>),
    id: docSnap.id,
  }));
}

/**
 * Suscripción en tiempo real a los checklists diarios BPM del negocio activo.
 */
export function onChecklistsBpmChange(
  negocioId: string,
  callback: (checklists: ChecklistTurnoBpm[]) => void,
  onError?: (error: Error) => void,
  maxLimite = 120
): () => void {
  const tenantId = requireTenantId(negocioId);
  if (!db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLECCION_CHECKLISTS_BPM),
    where('negocioId', '==', tenantId),
    orderBy('fechaIso', 'desc'),
    orderBy('actualizadoEn', 'desc'),
    limit(maxLimite)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const lista = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Omit<ChecklistTurnoBpm, 'id'>),
        id: docSnap.id,
      }));
      callback(lista);
    },
    (error) => {
      console.error('Error escuchando checklists_bpm:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Elimina un registro BPM perteneciente al negocio activo (operación restringida a administradores en reglas).
 */
export async function eliminarRegistroBpm(
  negocioId: string,
  coleccion: ColeccionRegistroBpm,
  registroId: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  if (!registroId) throw new Error('ID de registro requerido');

  const docRef = doc(db, coleccion, registroId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const data = snap.data() as { negocioId?: string };
  if (data.negocioId !== tenantId) {
    throw new Error('Acceso denegado sobre el registro de otro negocio');
  }
  await deleteDoc(docRef);
}
