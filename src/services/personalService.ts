import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  EmpleadoPersonal,
  TurnoPersonal,
  ValePersonal,
  LiquidacionNomina,
  CrearTurnoInput,
  CrearValeInput,
  CrearLiquidacionInput,
} from '@/types/personal';
import type { Venta } from '@/types';
import { requireTenantId } from '@/security/tenantScope';
import {
  calcularHorasTrabajadas,
  calcularTotalDevengadoTurno,
  MOTIVOS_VALE_CONFIG,
} from '@/utils/personalUtils';
import { crearGasto } from './gastosService';

async function assertEmpleadoTenant(id: string, negocioId: string): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const snapshot = await getDoc(doc(db, 'empleados_personal', id));
  if (!snapshot.exists() || snapshot.data().negocioId !== tenantId) {
    throw new Error('El colaborador no pertenece al negocio activo');
  }
  return tenantId;
}

async function assertTurnoTenant(id: string, negocioId: string): Promise<TurnoPersonal> {
  const tenantId = requireTenantId(negocioId);
  const snapshot = await getDoc(doc(db, 'turnos_personal', id));
  if (!snapshot.exists() || snapshot.data().negocioId !== tenantId) {
    throw new Error('El turno no pertenece al negocio activo');
  }
  return { ...snapshot.data(), id: snapshot.id } as TurnoPersonal;
}

async function assertValeTenant(id: string, negocioId: string): Promise<ValePersonal> {
  const tenantId = requireTenantId(negocioId);
  const snapshot = await getDoc(doc(db, 'vales_personal', id));
  if (!snapshot.exists() || snapshot.data().negocioId !== tenantId) {
    throw new Error('El vale no pertenece al negocio activo');
  }
  return { ...snapshot.data(), id: snapshot.id } as ValePersonal;
}

/**
 * Obtener todos los colaboradores del negocio
 */
export async function getEmpleadosPersonal(negocioId: string): Promise<EmpleadoPersonal[]> {
  const tenantId = requireTenantId(negocioId);
  const ref = collection(db, 'empleados_personal');
  const q = query(ref, where('negocioId', '==', tenantId), orderBy('nombre', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    ...docSnap.data(),
    id: docSnap.id,
  } as EmpleadoPersonal));
}

/**
 * Suscripción en tiempo real a los colaboradores del negocio
 */
export function onEmpleadosPersonalChange(
  negocioId: string,
  callback: (empleados: EmpleadoPersonal[]) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const ref = collection(db, 'empleados_personal');
  const q = query(ref, where('negocioId', '==', tenantId), orderBy('nombre', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const empleados = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      } as EmpleadoPersonal));
      callback(empleados);
    },
    (error) => {
      console.error('Error in onEmpleadosPersonalChange listener:', error);
    }
  );
}

/**
 * Crear un nuevo colaborador operativo
 */
export async function crearEmpleadoPersonal(
  data: Omit<EmpleadoPersonal, 'id' | 'creadoEn' | 'actualizadoEn'>
): Promise<string> {
  const tenantId = requireTenantId(data.negocioId);
  const ref = collection(db, 'empleados_personal');
  const now = Timestamp.now();

  const docRef = await addDoc(ref, {
    ...data,
    negocioId: tenantId,
    nombre: data.nombre.trim(),
    telefono: data.telefono.trim(),
    documento: data.documento?.trim() || '',
    email: data.email?.trim() || '',
    tarifaTurno: Math.max(0, Math.round(Number(data.tarifaTurno) || 0)),
    sueldoBase: Math.max(0, Math.round(Number(data.sueldoBase) || 0)),
    participaPropinas: Boolean(data.participaPropinas),
    activo: data.activo ?? true,
    notas: data.notas?.trim() || '',
    creadoEn: now,
    actualizadoEn: now,
  });

  return docRef.id;
}

/**
 * Actualizar datos de un colaborador
 */
export async function actualizarEmpleadoPersonal(
  id: string,
  updates: Partial<Omit<EmpleadoPersonal, 'id' | 'negocioId' | 'creadoEn'>>,
  negocioId: string
): Promise<void> {
  await assertEmpleadoTenant(id, negocioId);
  const docRef = doc(db, 'empleados_personal', id);
  await updateDoc(docRef, {
    ...updates,
    actualizadoEn: Timestamp.now(),
  });
}

/**
 * Eliminar un colaborador
 */
export async function eliminarEmpleadoPersonal(id: string, negocioId: string): Promise<void> {
  await assertEmpleadoTenant(id, negocioId);
  await deleteDoc(doc(db, 'empleados_personal', id));
}

/**
 * Suscripción en tiempo real a los turnos del personal
 */
export function onTurnosPersonalChange(
  negocioId: string,
  callback: (turnos: TurnoPersonal[]) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const ref = collection(db, 'turnos_personal');
  const q = query(ref, where('negocioId', '==', tenantId), orderBy('fecha', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const turnos = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      } as TurnoPersonal));
      callback(turnos);
    },
    (error) => {
      console.error('Error in onTurnosPersonalChange listener:', error);
    }
  );
}

/**
 * Registrar un nuevo turno (en curso o completado)
 */
export async function registrarTurnoPersonal(
  negocioId: string,
  input: CrearTurnoInput
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const ref = collection(db, 'turnos_personal');
  const now = Timestamp.now();

  const valorTurno = Math.max(0, Math.round(Number(input.valorTurno) || 0));
  const bonoTurno = Math.max(0, Math.round(Number(input.bonoTurno) || 0));
  const totalDevengado = calcularTotalDevengadoTurno(valorTurno, bonoTurno);

  const horasCalculadas =
    typeof input.horasTrabajadas === 'number' && input.horasTrabajadas > 0
      ? input.horasTrabajadas
      : calcularHorasTrabajadas(input.horaEntrada, input.horaSalida);

  const estado = input.estado || (input.horaSalida ? 'completado' : 'en_curso');

  const docRef = await addDoc(ref, {
    negocioId: tenantId,
    empleadoId: input.empleadoId,
    empleadoNombre: input.empleadoNombre.trim(),
    cargo: input.cargo,
    fecha: input.fecha,
    horaEntrada: input.horaEntrada,
    horaSalida: input.horaSalida || '',
    horasTrabajadas: Math.max(0, horasCalculadas),
    tipoTurno: input.tipoTurno,
    valorTurno,
    bonoTurno,
    totalDevengado,
    estado,
    notas: input.notas?.trim() || '',
    creadoEn: now,
    actualizadoEn: now,
  } as Omit<TurnoPersonal, 'id'>);

  return docRef.id;
}

/**
 * Finalizar / Cerrar un turno que estaba en curso marcando hora de salida
 */
export async function cerrarTurnoPersonal(
  negocioId: string,
  turnoId: string,
  horaSalida: string,
  bonoTurnoAdicional?: number
): Promise<void> {
  const turno = await assertTurnoTenant(turnoId, negocioId);
  const horas = calcularHorasTrabajadas(turno.horaEntrada, horaSalida);
  const bonoFinal =
    typeof bonoTurnoAdicional === 'number'
      ? Math.max(0, Math.round(bonoTurnoAdicional))
      : turno.bonoTurno || 0;
  const totalDevengado = calcularTotalDevengadoTurno(turno.valorTurno, bonoFinal);

  await updateDoc(doc(db, 'turnos_personal', turnoId), {
    horaSalida,
    horasTrabajadas: horas > 0 ? horas : turno.horasTrabajadas,
    bonoTurno: bonoFinal,
    totalDevengado,
    estado: 'completado',
    actualizadoEn: Timestamp.now(),
  });
}

/**
 * Anular un turno registrado
 */
export async function anularTurnoPersonal(
  negocioId: string,
  turnoId: string,
  motivo: string
): Promise<void> {
  const turno = await assertTurnoTenant(turnoId, negocioId);
  if (turno.estado === 'liquidado') {
    throw new Error('No se puede anular un turno que ya fue pagado en una liquidación');
  }
  await updateDoc(doc(db, 'turnos_personal', turnoId), {
    estado: 'anulado',
    notas: `${turno.notas ? `${turno.notas} | ` : ''}Anulado: ${motivo.trim()}`,
    actualizadoEn: Timestamp.now(),
  });
}

/**
 * Suscripción en tiempo real a los vales y adelantos del personal
 */
export function onValesPersonalChange(
  negocioId: string,
  callback: (vales: ValePersonal[]) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const ref = collection(db, 'vales_personal');
  const q = query(ref, where('negocioId', '==', tenantId), orderBy('fecha', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const vales = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      } as ValePersonal));
      callback(vales);
    },
    (error) => {
      console.error('Error in onValesPersonalChange listener:', error);
    }
  );
}

/**
 * Registrar un vale o adelanto de nómina
 */
export async function registrarValePersonal(
  negocioId: string,
  input: CrearValeInput
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const monto = Math.max(0, Math.round(Number(input.monto) || 0));
  if (monto <= 0) {
    throw new Error('El monto del vale o adelanto debe ser mayor a $ 0');
  }

  const now = Timestamp.now();
  let gastoId: string | undefined;

  if (input.crearGastoCaja) {
    const motivoLabel = MOTIVOS_VALE_CONFIG[input.motivo]?.label || 'Vale de Personal';
    gastoId = await crearGasto({
      negocioId: tenantId,
      concepto: `Vale/Adelanto: ${input.empleadoNombre} (${motivoLabel})`,
      monto,
      categoria: 'salarios',
      fecha: input.fecha,
      notas: input.notas?.trim() || 'Adelanto entregado por caja para descontar en nómina',
    });
  }

  const docRef = await addDoc(collection(db, 'vales_personal'), {
    negocioId: tenantId,
    empleadoId: input.empleadoId,
    empleadoNombre: input.empleadoNombre.trim(),
    fecha: input.fecha,
    monto,
    motivo: input.motivo,
    metodoEntrega: input.metodoEntrega,
    estado: 'pendiente_descuento',
    autorizadoPor: input.autorizadoPor?.trim() || 'Administrador',
    ...(gastoId ? { gastoId } : {}),
    notas: input.notas?.trim() || '',
    creadoEn: now,
    actualizadoEn: now,
  });

  return docRef.id;
}

/**
 * Anular un vale o adelanto pendiente
 */
export async function anularValePersonal(
  negocioId: string,
  valeId: string,
  motivo: string
): Promise<void> {
  const vale = await assertValeTenant(valeId, negocioId);
  if (vale.estado === 'descontado') {
    throw new Error('No se puede anular un vale que ya fue descontado en una liquidación');
  }
  await updateDoc(doc(db, 'vales_personal', valeId), {
    estado: 'anulado',
    notas: `${vale.notas ? `${vale.notas} | ` : ''}Anulado: ${motivo.trim()}`,
    actualizadoEn: Timestamp.now(),
  });
}

/**
 * Suscripción en tiempo real a las liquidaciones de nómina
 */
export function onLiquidacionesNominaChange(
  negocioId: string,
  callback: (liquidaciones: LiquidacionNomina[]) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const ref = collection(db, 'liquidaciones_nomina');
  const q = query(ref, where('negocioId', '==', tenantId), orderBy('fechaLiquidacion', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const liquidaciones = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      } as LiquidacionNomina));
      callback(liquidaciones);
    },
    (error) => {
      console.error('Error in onLiquidacionesNominaChange listener:', error);
    }
  );
}

/**
 * Ejecutar y registrar una liquidación de nómina operativa marcando atómicamente
 * los turnos como 'liquidado' y los vales como 'descontado'.
 */
export async function registrarLiquidacionNomina(
  negocioId: string,
  input: CrearLiquidacionInput
): Promise<LiquidacionNomina> {
  const tenantId = requireTenantId(negocioId);
  const now = Timestamp.now();

  const totalTurnosValor = Math.max(0, Math.round(Number(input.totalTurnosValor) || 0));
  const totalBonos = Math.max(0, Math.round(Number(input.totalBonos) || 0));
  const totalPropinas = Math.max(0, Math.round(Number(input.totalPropinas) || 0));
  const totalValesDescontados = Math.max(0, Math.round(Number(input.totalValesDescontados) || 0));
  const netoPagado = Math.max(
    0,
    totalTurnosValor + totalBonos + totalPropinas - totalValesDescontados
  );

  let gastoId: string | undefined;

  if (input.registrarGastoSalarios && netoPagado > 0) {
    gastoId = await crearGasto({
      negocioId: tenantId,
      concepto: `Liquidación Nómina: ${input.empleadoNombre} (${input.turnosIds.length} turnos)`,
      monto: netoPagado,
      categoria: 'salarios',
      fecha: now,
      notas: `Periodo ${input.periodoDesde} al ${input.periodoHasta}. Medio: ${input.metodoPago}. ${input.notas || ''}`.trim(),
    });
  }

  const batch = writeBatch(db);
  const liquidacionRef = doc(collection(db, 'liquidaciones_nomina'));

  const payload: Omit<LiquidacionNomina, 'id'> = {
    negocioId: tenantId,
    empleadoId: input.empleadoId,
    empleadoNombre: input.empleadoNombre.trim(),
    cargo: input.cargo,
    fechaLiquidacion: now,
    periodoDesde: input.periodoDesde,
    periodoHasta: input.periodoHasta,
    cantidadTurnos: input.turnosIds.length,
    turnosIds: input.turnosIds,
    valesIds: input.valesIds,
    totalTurnosValor,
    totalBonos,
    totalPropinas,
    totalValesDescontados,
    netoPagado,
    metodoPago: input.metodoPago,
    referenciaPago: input.referenciaPago?.trim() || '',
    pagadoPor: input.pagadoPor?.trim() || 'Administrador',
    ...(gastoId ? { gastoId } : {}),
    notas: input.notas?.trim() || '',
    creadoEn: now,
  };

  batch.set(liquidacionRef, payload);

  for (const turnoId of input.turnosIds) {
    batch.update(doc(db, 'turnos_personal', turnoId), {
      estado: 'liquidado',
      liquidacionId: liquidacionRef.id,
      actualizadoEn: now,
    });
  }

  for (const valeId of input.valesIds) {
    batch.update(doc(db, 'vales_personal', valeId), {
      estado: 'descontado',
      liquidacionId: liquidacionRef.id,
      actualizadoEn: now,
    });
  }

  await batch.commit();

  return {
    ...payload,
    id: liquidacionRef.id,
  };
}

/**
 * Obtiene las ventas recientes del negocio para consolidar el fondo de propinas recaudadas
 */
export async function getVentasRecientesParaPropinas(
  negocioId: string,
  diasAtras: number = 7
): Promise<Venta[]> {
  const tenantId = requireTenantId(negocioId);
  const fechaMin = new Date();
  fechaMin.setDate(fechaMin.getDate() - Math.max(1, diasAtras));
  fechaMin.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, 'ventas'),
    where('negocioId', '==', tenantId),
    where('fecha', '>=', Timestamp.fromDate(fechaMin)),
    orderBy('fecha', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    ...docSnap.data(),
    id: docSnap.id,
  } as Venta));
}

