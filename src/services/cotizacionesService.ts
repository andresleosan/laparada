import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';
import { registrarCompraCliente } from '@/services/clientesService';
import { crearAlertaSilenciosa } from '@/services/notificacionesService';
import { getCombos, getProductos } from '@/services/productosService';
import type {
  Combo,
  ConvertirCotizacionInput,
  CotizacionComercial,
  CrearCotizacionInput,
  Domicilio,
  EntradaInventario,
  EstadoAnticipoCotizacion,
  EstadoCotizacion,
  Insumo,
  MetodoPago,
  ModalidadEntregaEvento,
  Producto,
  RegistrarAnticipoCotizacionInput,
  ResultadoConversionCotizacion,
  TicketVentaData,
  TipoEventoCotizacion,
  Venta,
} from '@/types';
import {
  calcularTotalesCotizacion,
  construirItemsVentaDesdeCotizacion,
  normalizarItemsCotizacion,
} from '@/utils/cotizacionesUtils';
import { formatCOP } from '@/utils/formatCOP';
import { calcularConsumoInsumos } from '@/utils/recetasEscandallo';

const COLECCION_COTIZACIONES = 'cotizaciones';

const ESTADOS_EDITABLES = new Set<EstadoCotizacion>([
  'borrador',
  'enviada',
  'aprobada',
  'rechazada',
  'vencida',
]);

const TIPOS_EVENTO_VALIDOS = new Set<TipoEventoCotizacion>([
  'corporativo',
  'fiesta_cumpleanos',
  'boda_aniversario',
  'coffee_break',
  'refrigerio_escolar',
  'evento_privado',
  'otro',
]);

const MODALIDADES_VALIDAS = new Set<ModalidadEntregaEvento>([
  'domicilio_evento',
  'recoger_local',
  'evento_salon',
]);

const METODOS_PAGO_OFFLINE = new Set<MetodoPago>(['efectivo', 'transferencia']);

const ESTADOS_ANTICIPO_VALIDOS = new Set<EstadoAnticipoCotizacion>([
  'sin_anticipo',
  'pendiente',
  'verificado',
]);

export interface FiltrosQueryCotizaciones {
  estado?: EstadoCotizacion;
  limite?: number;
}

export function validarDatosCotizacion(input: CrearCotizacionInput): void {
  const nombre = input.clienteNombre?.trim();
  if (!nombre || nombre.length < 2 || nombre.length > 120) {
    throw new Error('El nombre del cliente o contacto debe tener entre 2 y 120 caracteres.');
  }

  const telefono = input.clienteTelefono?.trim();
  if (!telefono || telefono.length < 7 || telefono.length > 25) {
    throw new Error('El teléfono del contacto debe tener entre 7 y 25 caracteres.');
  }

  if (input.empresa && input.empresa.trim().length > 140) {
    throw new Error('El nombre de la empresa no debe exceder 140 caracteres.');
  }

  if (input.nitEmpresa && input.nitEmpresa.trim().length > 30) {
    throw new Error('El NIT o documento de la empresa no debe exceder 30 caracteres.');
  }

  if (!TIPOS_EVENTO_VALIDOS.has(input.tipoEvento)) {
    throw new Error('El tipo de evento seleccionado no es válido.');
  }

  if (!MODALIDADES_VALIDAS.has(input.modalidadEntrega)) {
    throw new Error('La modalidad de entrega del evento no es válida.');
  }

  if (!input.fechaEvento?.trim()) {
    throw new Error('La fecha programada del evento es obligatoria.');
  }

  if (!input.fechaVencimiento?.trim()) {
    throw new Error('La fecha de vigencia de la cotización es obligatoria.');
  }

  const invitados = Number(input.invitados);
  if (!Number.isInteger(invitados) || invitados < 1 || invitados > 5000) {
    throw new Error('La cantidad de invitados debe ser un número entero entre 1 y 5.000.');
  }

  const itemsLimpios = normalizarItemsCotizacion(input.items);
  if (itemsLimpios.length === 0) {
    throw new Error('Debes incluir al menos un producto, combo o servicio en la cotización.');
  }

  for (const item of itemsLimpios) {
    if (item.cantidad < 1 || item.precioUnitario < 0) {
      throw new Error(`El ítem "${item.nombre}" tiene cantidad o precio inválido.`);
    }
  }

  if (input.descuento !== undefined) {
    const desc = Number(input.descuento);
    if (!Number.isFinite(desc) || desc < 0) {
      throw new Error('El descuento comercial no puede ser negativo.');
    }
  }

  if (input.descuentoPorcentaje !== undefined) {
    const pct = Number(input.descuentoPorcentaje);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new Error('El porcentaje de descuento debe estar entre 0% y 100%.');
    }
  }

  if (input.costoLogistica !== undefined) {
    const log = Number(input.costoLogistica);
    if (!Number.isFinite(log) || log < 0) {
      throw new Error('El costo de logística o transporte no puede ser negativo.');
    }
  }

  if (input.anticipoMonto !== undefined) {
    const ant = Number(input.anticipoMonto);
    if (!Number.isFinite(ant) || ant < 0 || ant > 500_000_000) {
      throw new Error('El monto del anticipo debe ser un entero entre $0 y $500.000.000 COP.');
    }
  }

  if (input.anticipoMetodo !== undefined && !METODOS_PAGO_OFFLINE.has(input.anticipoMetodo)) {
    throw new Error('Solo se permiten métodos de pago offline (transferencia o efectivo).');
  }

  if (input.anticipoEstado !== undefined && !ESTADOS_ANTICIPO_VALIDOS.has(input.anticipoEstado)) {
    throw new Error('El estado del anticipo no es válido.');
  }

  if (input.estado !== undefined && !ESTADOS_EDITABLES.has(input.estado)) {
    throw new Error('El estado inicial de la cotización no es válido.');
  }
}

function construirPayloadCotizacion(
  tenantId: string,
  input: CrearCotizacionInput
): Omit<CotizacionComercial, 'id' | 'creadoEn' | 'actualizadoEn'> {
  const itemsLimpios = normalizarItemsCotizacion(input.items);
  const totales = calcularTotalesCotizacion({
    items: itemsLimpios,
    descuento: input.descuento,
    descuentoPorcentaje: input.descuentoPorcentaje,
    costoLogistica: input.costoLogistica,
    anticipoMonto: input.anticipoMonto,
    anticipoEstado: input.anticipoEstado,
  });

  const anticipoMonto = totales.anticipoAplicable;
  const anticipoEstado: EstadoAnticipoCotizacion =
    anticipoMonto > 0
      ? input.anticipoEstado && input.anticipoEstado !== 'sin_anticipo'
        ? input.anticipoEstado
        : 'pendiente'
      : 'sin_anticipo';

  const costoEstimadoInsumos = Math.max(0, Math.round(Number(input.costoEstimadoInsumos) || 0));
  const utilidadEstimada =
    typeof input.utilidadEstimada === 'number' && Number.isFinite(input.utilidadEstimada)
      ? Math.round(input.utilidadEstimada)
      : totales.totalCotizado - costoEstimadoInsumos;
  const margenEstimadoPct =
    typeof input.margenEstimadoPct === 'number' && Number.isFinite(input.margenEstimadoPct)
      ? Number(input.margenEstimadoPct.toFixed(1))
      : totales.totalCotizado > 0
        ? Number(((utilidadEstimada / totales.totalCotizado) * 100).toFixed(1))
        : 0;

  const codigoLimpio =
    input.codigo?.trim().toUpperCase() ||
    `COT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

  return {
    negocioId: tenantId,
    codigo: codigoLimpio,
    clienteNombre: input.clienteNombre.trim(),
    ...(input.empresa?.trim() ? { empresa: input.empresa.trim() } : {}),
    ...(input.nitEmpresa?.trim() ? { nitEmpresa: input.nitEmpresa.trim() } : {}),
    clienteTelefono: input.clienteTelefono.trim(),
    ...(input.clienteEmail?.trim() ? { clienteEmail: input.clienteEmail.trim() } : {}),
    tipoEvento: input.tipoEvento,
    modalidadEntrega: input.modalidadEntrega,
    fechaEvento: input.fechaEvento.trim(),
    ...(input.horaEvento?.trim() ? { horaEvento: input.horaEvento.trim() } : {}),
    fechaVencimiento: input.fechaVencimiento.trim(),
    invitados: Math.max(1, Math.floor(Number(input.invitados) || 1)),
    ...(input.direccionEvento?.trim() ? { direccionEvento: input.direccionEvento.trim() } : {}),
    ...(input.barrioEvento?.trim() ? { barrioEvento: input.barrioEvento.trim() } : {}),
    ...(input.notasEvento?.trim() ? { notasEvento: input.notasEvento.trim() } : {}),
    ...(input.condicionesComerciales?.trim()
      ? { condicionesComerciales: input.condicionesComerciales.trim() }
      : {}),
    items: itemsLimpios,
    subtotal: totales.subtotal,
    descuento: totales.descuento,
    ...(typeof input.descuentoPorcentaje === 'number' && input.descuentoPorcentaje > 0
      ? { descuentoPorcentaje: Number(Math.min(100, input.descuentoPorcentaje).toFixed(1)) }
      : {}),
    ...(input.descuentoMotivo?.trim() ? { descuentoMotivo: input.descuentoMotivo.trim() } : {}),
    costoLogistica: totales.costoLogistica,
    totalCotizado: totales.totalCotizado,
    costoEstimadoInsumos,
    utilidadEstimada,
    margenEstimadoPct,
    anticipoMonto,
    ...(anticipoMonto > 0 ? { anticipoMetodo: input.anticipoMetodo || 'transferencia' } : {}),
    anticipoEstado,
    ...(input.anticipoReferencia?.trim()
      ? { anticipoReferencia: input.anticipoReferencia.trim() }
      : {}),
    ...(input.anticipoFotoPath?.trim() ? { anticipoFotoPath: input.anticipoFotoPath.trim() } : {}),
    ...(anticipoEstado === 'verificado' ? { anticipoVerificadoEn: new Date().toISOString() } : {}),
    saldoPendiente: totales.saldoPendiente,
    estado: input.estado || 'borrador',
    ...(input.responsableNombre?.trim()
      ? { responsableNombre: input.responsableNombre.trim() }
      : {}),
  };
}

/**
 * Crea una nueva cotización comercial / propuesta de evento en Firestore acotada al tenant.
 */
export async function crearCotizacion(
  negocioId: string,
  input: CrearCotizacionInput
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  validarDatosCotizacion(input);

  const payload = construirPayloadCotizacion(tenantId, input);
  const docRef = await addDoc(collection(db, COLECCION_COTIZACIONES), {
    ...payload,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Actualiza una cotización existente (impide editar cotizaciones ya convertidas a venta).
 */
export async function actualizarCotizacion(
  negocioId: string,
  cotizacionId: string,
  input: CrearCotizacionInput
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const cleanId = cotizacionId?.trim();
  if (!cleanId) {
    throw new Error('El ID de la cotización es obligatorio.');
  }

  validarDatosCotizacion(input);

  const cotRef = doc(db, COLECCION_COTIZACIONES, cleanId);
  const snap = await getDoc(cotRef);
  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('La cotización no pertenece al negocio activo.');
  }

  const actual = snap.data() as CotizacionComercial;
  if (actual.estado === 'convertida') {
    throw new Error('No se puede editar una cotización que ya fue convertida a venta.');
  }

  const payload = construirPayloadCotizacion(tenantId, {
    ...input,
    codigo: input.codigo || actual.codigo,
  });

  await updateDoc(cotRef, {
    ...payload,
    empresa: payload.empresa ?? deleteField(),
    nitEmpresa: payload.nitEmpresa ?? deleteField(),
    clienteEmail: payload.clienteEmail ?? deleteField(),
    horaEvento: payload.horaEvento ?? deleteField(),
    direccionEvento: payload.direccionEvento ?? deleteField(),
    barrioEvento: payload.barrioEvento ?? deleteField(),
    notasEvento: payload.notasEvento ?? deleteField(),
    condicionesComerciales: payload.condicionesComerciales ?? deleteField(),
    descuentoPorcentaje: payload.descuentoPorcentaje ?? deleteField(),
    descuentoMotivo: payload.descuentoMotivo ?? deleteField(),
    anticipoMetodo: payload.anticipoMetodo ?? deleteField(),
    anticipoReferencia: payload.anticipoReferencia ?? deleteField(),
    anticipoFotoPath: payload.anticipoFotoPath ?? deleteField(),
    actualizadoEn: serverTimestamp(),
  });
}

/**
 * Cambia el estado comercial de una cotización (borrador -> enviada -> aprobada / rechazada).
 */
export async function actualizarEstadoCotizacion(
  negocioId: string,
  cotizacionId: string,
  nuevoEstado: Exclude<EstadoCotizacion, 'convertida'>
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const cleanId = cotizacionId?.trim();
  if (!cleanId) {
    throw new Error('El ID de la cotización es obligatorio.');
  }
  if (!ESTADOS_EDITABLES.has(nuevoEstado)) {
    throw new Error('El estado indicado para la cotización no es válido.');
  }

  const cotRef = doc(db, COLECCION_COTIZACIONES, cleanId);
  const snap = await getDoc(cotRef);
  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('La cotización no pertenece al negocio activo.');
  }
  if (snap.data().estado === 'convertida') {
    throw new Error('Una cotización convertida a venta no puede cambiar de estado.');
  }

  await updateDoc(cotRef, {
    estado: nuevoEstado,
    ...(nuevoEstado === 'aprobada' ? { aprobadaEn: new Date().toISOString() } : {}),
    actualizadoEn: serverTimestamp(),
  });
}

/**
 * Registra o verifica un anticipo 100% offline (transferencia bancaria / Nequi / Daviplata / efectivo)
 * sobre una cotización, actualizando el saldo pendiente y opcionalmente aprobando el evento.
 */
export async function registrarAnticipoCotizacion(
  negocioId: string,
  cotizacionId: string,
  input: RegistrarAnticipoCotizacionInput
): Promise<{ anticipoMonto: number; saldoPendiente: number }> {
  const tenantId = requireTenantId(negocioId);
  const cleanId = cotizacionId?.trim();
  if (!cleanId) {
    throw new Error('El ID de la cotización es obligatorio.');
  }

  const monto = Number(input.anticipoMonto);
  if (!Number.isInteger(monto) || monto < 0 || monto > 500_000_000) {
    throw new Error('El anticipo debe ser un monto entero entre $0 y $500.000.000 COP.');
  }
  if (!METODOS_PAGO_OFFLINE.has(input.anticipoMetodo)) {
    throw new Error('El método de pago del anticipo debe ser transferencia o efectivo.');
  }
  if (!ESTADOS_ANTICIPO_VALIDOS.has(input.anticipoEstado)) {
    throw new Error('El estado del anticipo no es válido.');
  }

  const refLimpia = input.anticipoReferencia?.trim() || '';
  if (refLimpia.length > 140) {
    throw new Error('La referencia del comprobante no debe exceder 140 caracteres.');
  }

  const cotRef = doc(db, COLECCION_COTIZACIONES, cleanId);
  const snap = await getDoc(cotRef);
  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('La cotización no pertenece al negocio activo.');
  }

  const actual = { ...snap.data(), id: snap.id } as CotizacionComercial;
  if (actual.estado === 'convertida') {
    throw new Error('Esta cotización ya fue convertida a venta y liquidada.');
  }
  if (monto > actual.totalCotizado) {
    throw new Error(
      `El anticipo (${formatCOP(monto)}) no puede superar el total cotizado (${formatCOP(actual.totalCotizado)}).`
    );
  }

  const estadoAnticipoFinal: EstadoAnticipoCotizacion =
    monto === 0 ? 'sin_anticipo' : input.anticipoEstado;
  const saldoPendiente = Math.max(
    0,
    actual.totalCotizado - (estadoAnticipoFinal === 'sin_anticipo' ? 0 : monto)
  );
  const aprobarAutomaticamente =
    Boolean(input.aprobarSiVerificado) &&
    estadoAnticipoFinal === 'verificado' &&
    monto > 0 &&
    actual.estado !== 'rechazada';

  await updateDoc(cotRef, {
    anticipoMonto: monto,
    anticipoMetodo: monto > 0 ? input.anticipoMetodo : deleteField(),
    anticipoEstado: estadoAnticipoFinal,
    anticipoReferencia: refLimpia ? refLimpia : deleteField(),
    ...(input.anticipoFotoPath?.trim()
      ? { anticipoFotoPath: input.anticipoFotoPath.trim() }
      : {}),
    ...(estadoAnticipoFinal === 'verificado'
      ? { anticipoVerificadoEn: new Date().toISOString() }
      : { anticipoVerificadoEn: deleteField() }),
    saldoPendiente,
    ...(aprobarAutomaticamente
      ? { estado: 'aprobada' as EstadoCotizacion, aprobadaEn: new Date().toISOString() }
      : {}),
    actualizadoEn: serverTimestamp(),
  });

  if (estadoAnticipoFinal === 'verificado' && monto > 0) {
    crearAlertaSilenciosa(tenantId, {
      modulo: 'caja',
      tipo: 'anticipo_cotizacion_verificado',
      titulo: `Anticipo verificado · ${actual.codigo}`,
      mensaje: `${actual.empresa || actual.clienteNombre} abonó ${formatCOP(monto)} (${input.anticipoMetodo}). Saldo pendiente: ${formatCOP(saldoPendiente)}.`,
      urgencia: 'media',
      enlace: '/cotizaciones',
      origen: 'automatico',
      creadaPor: input.responsableNombre || 'Caja',
      metadata: {
        cotizacionId: cleanId,
        codigo: actual.codigo,
        anticipoMonto: monto,
        saldoPendiente,
      },
    });
  }

  return { anticipoMonto: monto, saldoPendiente };
}

/**
 * Registra el envío formal de la cotización por WhatsApp y avanza borrador -> enviada.
 */
export async function marcarCotizacionEnviadaWhatsApp(
  negocioId: string,
  cotizacionId: string
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const cleanId = cotizacionId?.trim();
  if (!cleanId) {
    throw new Error('El ID de la cotización es obligatorio.');
  }

  const cotRef = doc(db, COLECCION_COTIZACIONES, cleanId);
  const snap = await getDoc(cotRef);
  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('La cotización no pertenece al negocio activo.');
  }

  const actual = snap.data() as CotizacionComercial;
  const fechaIso = new Date().toISOString();

  await updateDoc(cotRef, {
    enviadaWhatsAppEn: fechaIso,
    ...(actual.estado === 'borrador' ? { estado: 'enviada' as EstadoCotizacion } : {}),
    actualizadoEn: serverTimestamp(),
  });

  return fechaIso;
}

/**
 * CONVERSIÓN ATÓMICA EN 1 CLIC (runTransaction):
 * - Verifica aislamiento multi-tenant e idempotencia (impide doble conversión).
 * - Crea la Venta oficial (`ventas/cotizacion_{id}` sin campo `id`).
 * - Opcionalmente despacha la Comanda de Cocina KDS (`domicilios/kds_cot_{id}` con `ventaId` preasignado para evitar doble facturación al entregar).
 * - Descuenta atómicamente los insumos de escandallo en `inventario` y registra el movimiento en `entradas_inventario` (Kardex).
 * - Marca la cotización como `convertida` con trazabilidad completa (`ventaId`, `comandaId`).
 */
export async function convertirCotizacionAVentaYComanda(
  negocioId: string,
  cotizacionId: string,
  input: ConvertirCotizacionInput,
  catalogo?: { productos?: Producto[]; combos?: Combo[] }
): Promise<ResultadoConversionCotizacion> {
  const tenantId = requireTenantId(negocioId);
  const cleanId = cotizacionId?.trim();
  if (!cleanId) {
    throw new Error('El ID de la cotización es obligatorio para convertirla.');
  }

  if (!METODOS_PAGO_OFFLINE.has(input.metodoPagoSaldo)) {
    throw new Error('El método de pago de liquidación debe ser efectivo o transferencia.');
  }

  const enviarAKDS = input.enviarAKDS !== false;
  const descontarInventario = input.descontarInventario !== false;

  // Precargar catálogo antes de entrar en la transacción para poder calcular consumos de escandallo
  const [productosCatalogo, combosCatalogo] = descontarInventario
    ? [
        catalogo?.productos ?? (await getProductos(tenantId)),
        catalogo?.combos ?? (await getCombos(tenantId)),
      ]
    : [[], []];

  const cotRef = doc(db, COLECCION_COTIZACIONES, cleanId);
  const ventaIdDeterminista = `cotizacion_${cleanId}`;
  const ventaRef = doc(db, 'ventas', ventaIdDeterminista);
  const comandaIdDeterminista = `kds_cot_${cleanId}`;
  const comandaRef = doc(db, 'domicilios', comandaIdDeterminista);

  let cotizacionSnapshotData: CotizacionComercial | null = null;
  let itemsVentaFinal: ReturnType<typeof construirItemsVentaDesdeCotizacion> = [];
  let insumosDescontadosCount = 0;

  await runTransaction(db, async (transaction) => {
    const cotSnap = await transaction.get(cotRef);
    if (!cotSnap.exists() || cotSnap.data().negocioId !== tenantId) {
      throw new Error('La cotización no pertenece al negocio activo.');
    }

    const cot = { ...cotSnap.data(), id: cotSnap.id } as CotizacionComercial;
    if (cot.estado === 'convertida' || cot.ventaId) {
      throw new Error(
        `La cotización ${cot.codigo} ya fue convertida anteriormente a la venta #${(cot.ventaId || '').slice(-6).toUpperCase()}.`
      );
    }
    if (cot.estado === 'rechazada') {
      throw new Error('No se puede convertir una cotización rechazada.');
    }

    const itemsVenta = construirItemsVentaDesdeCotizacion(cot.items, cot.costoLogistica);
    if (itemsVenta.length === 0) {
      throw new Error('La cotización no tiene ítems válidos para facturar.');
    }

    const consumos = descontarInventario
      ? calcularConsumoInsumos(itemsVenta, productosCatalogo, combosCatalogo)
      : [];

    // TODAS LAS LECTURAS DE INVENTARIO ANTES DE CUALQUIER ESCRITURA EN LA TRANSACCIÓN
    const lecturasInsumos: Array<{
      insumoId: string;
      nombreSnapshot: string;
      cantidadTotal: number;
      unidadSnapshot?: string;
      insumoRef: ReturnType<typeof doc>;
      insumoData: Insumo | null;
    }> = [];

    for (const consumo of consumos) {
      const insRef = doc(db, 'inventario', consumo.insumoId);
      const insSnap = await transaction.get(insRef);
      if (insSnap.exists() && insSnap.data().negocioId === tenantId) {
        lecturasInsumos.push({
          ...consumo,
          insumoRef: insRef,
          insumoData: { ...insSnap.data(), id: insSnap.id } as Insumo,
        });
      }
    }

    const ahora = Timestamp.now();
    const ahoraIso = new Date().toISOString();
    const tipoEntregaVenta =
      cot.modalidadEntrega === 'domicilio_evento' ? 'domicilio' : 'mostrador';
    const tipoServicioComanda =
      cot.modalidadEntrega === 'domicilio_evento'
        ? 'domicilio'
        : cot.modalidadEntrega === 'evento_salon'
          ? 'salon'
          : 'para_llevar';

    const clienteLabel = cot.empresa
      ? `${cot.clienteNombre} (${cot.empresa})`
      : cot.clienteNombre;

    const ventaPayload: Omit<Venta, 'id'> = {
      negocioId: tenantId,
      items: itemsVenta,
      subtotal: cot.subtotal + (cot.costoLogistica || 0),
      ...(cot.descuento > 0 ? { descuento: cot.descuento } : {}),
      ...(cot.descuento > 0
        ? { descuentoMotivo: cot.descuentoMotivo || `Descuento evento ${cot.codigo}` }
        : {}),
      total: cot.totalCotizado,
      metodoPago: input.metodoPagoSaldo,
      tipoEntrega: tipoEntregaVenta,
      tipoServicio: tipoServicioComanda,
      origen: 'pos',
      fecha: ahora,
      clienteNombre: clienteLabel,
      clienteTelefono: cot.clienteTelefono,
      ...(cot.direccionEvento ? { direccion: cot.direccionEvento } : {}),
      ...(cot.barrioEvento ? { barrio: cot.barrioEvento } : {}),
      ...(cot.anticipoFotoPath ? { fotoTransferenciaPath: cot.anticipoFotoPath } : {}),
      numeroTurno: cot.codigo,
      cotizacionId: cleanId,
      cotizacionCodigo: cot.codigo,
      ...(cot.anticipoMonto > 0 ? { anticipoAplicado: cot.anticipoMonto } : {}),
      ...(input.datosFiscales?.consecutivoFiscal
        ? { consecutivoFiscal: input.datosFiscales.consecutivoFiscal }
        : {}),
      ...(typeof input.datosFiscales?.baseGravable === 'number'
        ? { baseGravable: input.datosFiscales.baseGravable }
        : {}),
      ...(typeof input.datosFiscales?.valorImpuesto === 'number'
        ? { valorImpuesto: input.datosFiscales.valorImpuesto }
        : {}),
      ...(typeof input.datosFiscales?.tarifaImpuesto === 'number'
        ? { tarifaImpuesto: input.datosFiscales.tarifaImpuesto }
        : {}),
      ...(input.datosFiscales?.tipoImpuesto
        ? { tipoImpuesto: input.datosFiscales.tipoImpuesto }
        : {}),
      ...(input.datosFiscales?.resolucionDian
        ? { resolucionDian: input.datosFiscales.resolucionDian }
        : {}),
    };

    // 1. Escribir Venta oficial (sin campo `id`, cumpliendo firestore.rules)
    transaction.set(ventaRef, ventaPayload);

    // 2. Despachar Comanda de Cocina (KDS) vinculada a `ventaId`
    if (enviarAKDS) {
      const partesNotaCocina = [
        `EVENTO ${cot.codigo} (${cot.invitados} inv.)`,
        cot.fechaEvento
          ? `Programado: ${cot.fechaEvento}${cot.horaEvento ? ` ${cot.horaEvento}` : ''}`
          : '',
        cot.notasEvento?.trim() || '',
        input.notasCocinaExtra?.trim() || '',
      ].filter(Boolean);

      const comandaPayload: Omit<Domicilio, 'id'> = {
        negocioId: tenantId,
        clienteNombre: clienteLabel,
        clienteTelefono: cot.clienteTelefono,
        direccion:
          cot.modalidadEntrega === 'domicilio_evento'
            ? cot.direccionEvento || 'Sede del Evento Corporativo'
            : cot.modalidadEntrega === 'evento_salon'
              ? 'Evento en Salón'
              : 'Recoger en Local · Catering',
        barrio:
          cot.modalidadEntrega === 'domicilio_evento'
            ? cot.barrioEvento || 'Evento'
            : 'Catering',
        items: itemsVenta,
        total: cot.totalCotizado,
        metodoPago: input.metodoPagoSaldo,
        origen: 'pos',
        estado: 'pendiente',
        pagado: true,
        ventaId: ventaIdDeterminista,
        cotizacionId: cleanId,
        numeroTurno: cot.codigo,
        tipoServicio: tipoServicioComanda,
        notas: partesNotaCocina.join(' · '),
        creadoEn: ahora,
        actualizadoEn: ahora,
      };
      transaction.set(comandaRef, comandaPayload);
    }

    // 3. Descontar stock de insumos e insertar movimientos en Kardex atómicamente
    for (const lectura of lecturasInsumos) {
      if (!lectura.insumoData) continue;
      const stockPrevio =
        typeof lectura.insumoData.stockActual === 'number' &&
        Number.isFinite(lectura.insumoData.stockActual)
          ? Math.max(0, lectura.insumoData.stockActual)
          : 0;
      const nuevoStock = Number(Math.max(0, stockPrevio - lectura.cantidadTotal).toFixed(4));
      const costoUnitario =
        typeof lectura.insumoData.costoUnitario === 'number' &&
        lectura.insumoData.costoUnitario > 0
          ? Math.round(lectura.insumoData.costoUnitario)
          : 0;

      transaction.update(lectura.insumoRef, {
        stockActual: nuevoStock,
        actualizadoEn: ahora,
      });

      const kardexRef = doc(collection(db, 'entradas_inventario'));
      const kardexEntry: Omit<EntradaInventario, 'id'> = {
        negocioId: tenantId,
        insumoId: lectura.insumoId,
        insumoNombre: lectura.insumoData.nombre || lectura.nombreSnapshot,
        cantidad: -lectura.cantidadTotal,
        costo: Math.round(lectura.cantidadTotal * costoUnitario),
        ...(costoUnitario > 0 ? { costoUnitario } : {}),
        proveedor: `Evento ${cot.codigo}`,
        fecha: ahora,
        tipoMovimiento: 'salida_venta',
        stockPrevio,
        stockResultante: nuevoStock,
        notas: `Conversión Cotización ${cot.codigo} (${clienteLabel})`,
        responsable: input.responsableNombre || 'Caja / Eventos',
        unidadMedida: lectura.insumoData.unidad || lectura.unidadSnapshot || 'unid',
      };
      transaction.set(kardexRef, kardexEntry);
      insumosDescontadosCount += 1;
    }

    // 4. Actualizar estado de la cotización a 'convertida'
    transaction.update(cotRef, {
      estado: 'convertida' as EstadoCotizacion,
      ventaId: ventaIdDeterminista,
      ...(enviarAKDS ? { comandaId: comandaIdDeterminista } : {}),
      convertidaEn: ahora,
      metodoPagoLiquidacion: input.metodoPagoSaldo,
      saldoPendiente: 0,
      ...(cot.anticipoMonto > 0
        ? {
            anticipoEstado: 'verificado' as EstadoAnticipoCotizacion,
            anticipoVerificadoEn: cot.anticipoVerificadoEn || ahoraIso,
          }
        : {}),
      actualizadoEn: ahora,
    });

    cotizacionSnapshotData = cot;
    itemsVentaFinal = itemsVenta;
  });

  if (!cotizacionSnapshotData) {
    throw new Error('No se pudo completar la conversión atómica de la cotización.');
  }

  const cotFinal: CotizacionComercial = cotizacionSnapshotData;
  const clienteCompleto = cotFinal.empresa
    ? `${cotFinal.clienteNombre} (${cotFinal.empresa})`
    : cotFinal.clienteNombre;

  // Efectos secundarios no bloqueantes (clientes, notificaciones KDS, auditoría forense)
  if (cotFinal.clienteTelefono && cotFinal.clienteTelefono.trim().length >= 7) {
    registrarCompraCliente(tenantId, {
      telefono: cotFinal.clienteTelefono.trim(),
      nombre: clienteCompleto,
      direccion: cotFinal.direccionEvento,
      barrio: cotFinal.barrioEvento,
      monto: cotFinal.totalCotizado,
      items: itemsVentaFinal,
      origen: 'pos',
    }).catch((err) => {
      console.warn('No se pudo actualizar directorio de clientes al convertir cotización:', err);
    });
  }

  crearAlertaSilenciosa(tenantId, {
    modulo: enviarAKDS ? 'cocina' : 'pedidos',
    tipo: 'cotizacion_convertida_evento',
    titulo: `Evento ${cotFinal.codigo} convertido a producción`,
    mensaje: `${clienteCompleto} (${cotFinal.invitados} invitados) por ${formatCOP(cotFinal.totalCotizado)}. ${enviarAKDS ? 'Comanda enviada a Cocina KDS.' : 'Venta registrada en caja.'}`,
    urgencia: 'alta',
    enlace: enviarAKDS ? '/cocina' : '/ventas',
    origen: 'automatico',
    creadaPor: input.responsableNombre || 'Caja / Eventos',
    metadata: {
      cotizacionId: cleanId,
      codigo: cotFinal.codigo,
      ventaId: ventaIdDeterminista,
      comandaId: enviarAKDS ? comandaIdDeterminista : null,
      totalCotizado: cotFinal.totalCotizado,
    },
  });

  if (cotFinal.descuento > 0) {
    registrarEventoAuditoriaSilencioso({
      negocioId: tenantId,
      categoria: 'cortesia_descuento',
      titulo: `Descuento en Evento ${cotFinal.codigo}`,
      descripcion: `Descuento comercial de ${formatCOP(cotFinal.descuento)} aplicado al convertir la cotización ${cotFinal.codigo} (${clienteCompleto}).`,
      motivo: cotFinal.descuentoMotivo || 'Negociación comercial evento / catering',
      montoImpacto: cotFinal.descuento,
      responsableNombre: input.responsableNombre || 'Administrador',
      responsableRol: 'admin',
      entidadTipo: 'venta',
      referenciaId: ventaIdDeterminista,
      detallesForenses: {
        cotizacionId: cleanId,
        cotizacionCodigo: cotFinal.codigo,
        subtotalBruto: cotFinal.subtotal,
        descuentoCOP: cotFinal.descuento,
        totalCobrado: cotFinal.totalCotizado,
        insumosDescontados: insumosDescontadosCount,
      },
    });
  }

  const ticket: TicketVentaData = {
    ventaId: ventaIdDeterminista,
    negocioNombre: input.negocioNombre || 'La Parada',
    negocioSlug: input.negocioSlug,
    negocioDireccion: input.negocioDireccion,
    negocioTelefono: input.negocioTelefono,
    fecha: new Date(),
    items: itemsVentaFinal,
    subtotal: cotFinal.subtotal + (cotFinal.costoLogistica || 0),
    ...(cotFinal.descuento > 0
      ? {
          descuento: cotFinal.descuento,
          descuentoMotivo: cotFinal.descuentoMotivo || `Evento ${cotFinal.codigo}`,
        }
      : {}),
    total: cotFinal.totalCotizado,
    metodoPago: input.metodoPagoSaldo,
    tipoEntrega: cotFinal.modalidadEntrega === 'domicilio_evento' ? 'domicilio' : 'mostrador',
    clienteNombre: clienteCompleto,
    clienteTelefono: cotFinal.clienteTelefono,
    direccionEntrega: cotFinal.direccionEvento,
    barrioEntrega: cotFinal.barrioEvento,
    mesaNombre: `Evento ${cotFinal.codigo}`,
    ...(input.datosFiscales?.consecutivoFiscal && input.datosFiscales.razonSocial
      ? {
          datosFiscales: {
            razonSocial: input.datosFiscales.razonSocial,
            nombreComercial: input.datosFiscales.nombreComercial,
            nit: input.datosFiscales.nit || '',
            dv: input.datosFiscales.dv,
            regimen: input.datosFiscales.regimen || '',
            responsabilidad: input.datosFiscales.responsabilidad || '',
            direccionFiscal: input.datosFiscales.direccionFiscal || '',
            municipio: input.datosFiscales.municipio || '',
            departamento: input.datosFiscales.departamento || '',
            telefono: input.datosFiscales.telefono,
            consecutivoFiscal: input.datosFiscales.consecutivoFiscal,
            numeroResolucion: input.datosFiscales.resolucionDian || '',
            prefijo: input.datosFiscales.prefijo || '',
            rangoTexto: input.datosFiscales.rangoTexto || '',
            vigenciaTexto: input.datosFiscales.vigenciaTexto || '',
            baseGravable: input.datosFiscales.baseGravable,
            impuesto: input.datosFiscales.valorImpuesto,
            tarifa: input.datosFiscales.tarifaImpuesto,
            tipoImpuesto: input.datosFiscales.tipoImpuesto,
            leyenda: input.datosFiscales.leyenda,
          },
        }
      : {}),
  };

  return {
    ventaId: ventaIdDeterminista,
    ...(enviarAKDS ? { comandaId: comandaIdDeterminista } : {}),
    insumosDescontados: insumosDescontadosCount,
    ticket,
  };
}

/**
 * Elimina una cotización no convertida (restringido a administradores por reglas de Firestore).
 */
export async function eliminarCotizacion(
  negocioId: string,
  cotizacionId: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const cleanId = cotizacionId?.trim();
  if (!cleanId) {
    throw new Error('El ID de la cotización es obligatorio.');
  }

  const cotRef = doc(db, COLECCION_COTIZACIONES, cleanId);
  const snap = await getDoc(cotRef);
  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('La cotización no pertenece al negocio activo.');
  }
  if (snap.data().estado === 'convertida') {
    throw new Error('No se puede eliminar una cotización ya convertida a venta contable.');
  }

  await deleteDoc(cotRef);
}

/**
 * Consulta las cotizaciones comerciales del negocio activo.
 */
export async function getCotizaciones(
  negocioId: string,
  filtros: FiltrosQueryCotizaciones = {}
): Promise<CotizacionComercial[]> {
  const tenantId = requireTenantId(negocioId);
  const colRef = collection(db, COLECCION_COTIZACIONES);

  let q = filtros.estado
    ? query(
        colRef,
        where('negocioId', '==', tenantId),
        where('estado', '==', filtros.estado),
        orderBy('fechaEvento', 'asc')
      )
    : query(colRef, where('negocioId', '==', tenantId), orderBy('creadoEn', 'desc'));

  if (filtros.limite && filtros.limite > 0) {
    q = query(q, limit(filtros.limite));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    ...docSnap.data(),
    id: docSnap.id,
  })) as CotizacionComercial[];
}

/**
 * Suscripción en tiempo real a las cotizaciones del negocio activo.
 */
export function suscribirCotizaciones(
  negocioId: string,
  onUpdate: (cotizaciones: CotizacionComercial[]) => void,
  onError?: (error: Error) => void,
  filtros: FiltrosQueryCotizaciones = {}
): () => void {
  const tenantId = requireTenantId(negocioId);
  const colRef = collection(db, COLECCION_COTIZACIONES);

  let q = filtros.estado
    ? query(
        colRef,
        where('negocioId', '==', tenantId),
        where('estado', '==', filtros.estado),
        orderBy('fechaEvento', 'asc')
      )
    : query(colRef, where('negocioId', '==', tenantId), orderBy('creadoEn', 'desc'));

  if (filtros.limite && filtros.limite > 0) {
    q = query(q, limit(filtros.limite));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const lista = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      })) as CotizacionComercial[];
      onUpdate(lista);
    },
    (error) => {
      console.error('Error en suscripción a cotizaciones:', error);
      onError?.(error);
    }
  );
}
