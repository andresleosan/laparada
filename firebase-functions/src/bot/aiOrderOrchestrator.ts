import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import {
  AgentToolExecutionOutcome,
  AgentToolExecutorContext,
  buildLaParadaSystemPrompt,
  completeDeepSeekChat,
  DeepSeekClientOptions,
  EngineMessage,
  runLaParadaOrderAgent,
} from '../ai/deepseekEngine';
import { resolveComboPrice } from './menuGenerationService';
import {
  BotOperationContext,
  BotProcessingResult,
  buildWhatsAppSaleItem,
  confirmarOrden,
  crearOrdenPendiente,
  generarResumenOrden,
  obtenerOrdenPendiente,
} from './orderProcessingService';

const getDb = () => admin.firestore();
const HANDOFF_PAUSE_MS = 2 * 60 * 60 * 1000; // 2 horas de relevo humano por defecto

function conversationDocId(negocioId: string, telefono: string): string {
  const hash = createHash('sha256')
    .update(`${negocioId}\u0000${telefono}`)
    .digest('hex')
    .slice(0, 48);
  return `conv_${hash}`;
}

/**
 * Registra una pausa del bot cuando un operador humano interviene manualmente
 * o cuando el cliente solicita atención personalizada.
 */
export async function pauseConversationForOperator(
  db: admin.firestore.Firestore,
  negocioId: string,
  telefono: string,
  motivo: 'operador_manual' | 'solicitud_cliente' | 'smb_echo'
): Promise<void> {
  const ref = db.collection('_conversaciones_whatsapp').doc(conversationDocId(negocioId, telefono));
  const pausadoHasta = admin.firestore.Timestamp.fromMillis(Date.now() + HANDOFF_PAUSE_MS);
  await ref.set(
    {
      negocioId,
      telefono,
      pausadoPorOperador: true,
      motivoPausa: motivo,
      pausadoHasta,
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Reactiva el bot para una conversación específica.
 */
export async function resumeConversationBot(
  db: admin.firestore.Firestore,
  negocioId: string,
  telefono: string
): Promise<void> {
  const ref = db.collection('_conversaciones_whatsapp').doc(conversationDocId(negocioId, telefono));
  await ref.set(
    {
      negocioId,
      telefono,
      pausadoPorOperador: false,
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Verifica si la conversación está actualmente en modo humano (handoff activo).
 */
export async function isConversationPausedByOperator(
  db: admin.firestore.Firestore,
  negocioId: string,
  telefono: string
): Promise<boolean> {
  const ref = db.collection('_conversaciones_whatsapp').doc(conversationDocId(negocioId, telefono));
  const snap = await ref.get();
  if (!snap.exists) return false;
  const data = snap.data();
  if (data?.negocioId !== negocioId || data?.pausadoPorOperador !== true) {
    return false;
  }
  const pausadoHastaMs =
    typeof data?.pausadoHasta?.toMillis === 'function' ? data.pausadoHasta.toMillis() : 0;
  return pausadoHastaMs > Date.now();
}

export interface CatalogItemSummary {
  id: string;
  tipo: 'producto' | 'combo';
  nombre: string;
  precio: number;
  categoria?: string;
  descripcion?: string;
}

export async function cargarCatalogoVerificado(
  db: admin.firestore.Firestore,
  negocioId: string,
  busqueda?: string
): Promise<CatalogItemSummary[]> {
  const [productosSnap, combosSnap] = await Promise.all([
    db.collection('productos').where('negocioId', '==', negocioId).limit(100).get(),
    db.collection('combos').where('negocioId', '==', negocioId).limit(50).get(),
  ]);

  const items: CatalogItemSummary[] = [];

  for (const doc of productosSnap.docs) {
    const data = doc.data();
    const precio = Number(data.precio);
    if (
      data.disponible === false ||
      typeof data.nombre !== 'string' ||
      !data.nombre.trim() ||
      !Number.isFinite(precio) ||
      precio <= 0
    ) {
      continue;
    }
    items.push({
      id: doc.id,
      tipo: 'producto',
      nombre: data.nombre.trim(),
      precio,
      ...(typeof data.categoria === 'string' && data.categoria ? { categoria: data.categoria } : {}),
      ...(typeof data.descripcion === 'string' && data.descripcion
        ? { descripcion: data.descripcion.slice(0, 100) }
        : {}),
    });
  }

  for (const doc of combosSnap.docs) {
    const data = doc.data();
    const precio = resolveComboPrice(data);
    if (
      data.disponible === false ||
      typeof data.nombre !== 'string' ||
      !data.nombre.trim() ||
      !Number.isFinite(precio) ||
      precio <= 0
    ) {
      continue;
    }
    items.push({
      id: doc.id,
      tipo: 'combo',
      nombre: data.nombre.trim(),
      precio,
      categoria: typeof data.categoria === 'string' && data.categoria ? data.categoria : 'Combos',
      ...(typeof data.descripcion === 'string' && data.descripcion
        ? { descripcion: data.descripcion.slice(0, 100) }
        : {}),
    });
  }

  if (busqueda && busqueda.trim()) {
    const needle = busqueda.trim().toLowerCase();
    return items.filter(
      (it) =>
        it.nombre.toLowerCase().includes(needle) ||
        (it.categoria && it.categoria.toLowerCase().includes(needle)) ||
        (it.descripcion && it.descripcion.toLowerCase().includes(needle))
    );
  }

  return items;
}

/**
 * Ejecutor de las 4 herramientas del agente DeepSeek contra Firestore.
 */
export async function executeLaParadaOrderTool(
  toolName: string,
  args: Record<string, unknown>,
  context: AgentToolExecutorContext,
  db: admin.firestore.Firestore = getDb()
): Promise<AgentToolExecutionOutcome> {
  const { negocioId, numeroCliente, queueId, mensajeCierre } = context;

  if (toolName === 'consultar_menu') {
    const busqueda = typeof args.busqueda === 'string' ? args.busqueda : undefined;
    const items = await cargarCatalogoVerificado(db, negocioId, busqueda);
    return {
      accion: 'menu_consultado_ia',
      output: {
        totalEncontrados: items.length,
        catalogo: items.map((item) => ({
          productoId: item.id,
          catalogoTipo: item.tipo,
          nombre: item.nombre,
          precioCOP: item.precio,
          categoria: item.categoria || 'General',
          descripcion: item.descripcion || '',
        })),
      },
    };
  }

  if (toolName === 'modificar_carrito') {
    const operacion = args.operacion;
    if (operacion !== 'agregar' && operacion !== 'reemplazar' && operacion !== 'vaciar') {
      throw new Error('Operación de carrito inválida');
    }

    if (operacion === 'vaciar') {
      const ordenActual = await obtenerOrdenPendiente(numeroCliente);
      if (ordenActual) {
        await db.collection('ordenes_pendientes').doc(ordenActual.id).update({
          estado: 'expirada',
          actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      return {
        accion: 'orden_cancelada_ia',
        output: { carritoVacio: true, mensaje: 'La orden pendiente fue vaciada.' },
      };
    }

    const rawItems = Array.isArray(args.items) ? args.items : [];
    if (rawItems.length === 0 || rawItems.length > 10) {
      throw new Error('Debes indicar entre 1 y 10 productos o combos válidos');
    }

    const catalogo = await cargarCatalogoVerificado(db, negocioId);
    const catalogMap = new Map(catalogo.map((item) => [`${item.tipo}:${item.id}`, item]));

    const verifiedItems = rawItems.map((raw) => {
      if (!raw || typeof raw !== 'object') {
        throw new Error('Formato de item inválido');
      }
      const entry = raw as Record<string, unknown>;
      const productoId = typeof entry.productoId === 'string' ? entry.productoId.trim() : '';
      const catalogoTipo = entry.catalogoTipo === 'combo' ? 'combo' : 'producto';
      const cantidad = Number(entry.cantidad);
      if (!productoId || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) {
        throw new Error(`Cantidad o ID inválido para ${productoId}`);
      }
      const found = catalogMap.get(`${catalogoTipo}:${productoId}`);
      if (!found) {
        throw new Error(`El producto o combo con ID "${productoId}" no existe o no está disponible`);
      }
      return {
        productoId: found.id,
        catalogoTipo: found.tipo,
        nombreSnapshot: found.nombre,
        precioSnapshot: found.precio,
        cantidad,
        ...(found.categoria ? { categoria: found.categoria } : {}),
      };
    });

    if (operacion === 'reemplazar') {
      const ordenExistente = await obtenerOrdenPendiente(numeroCliente);
      if (ordenExistente) {
        await db.collection('ordenes_pendientes').doc(ordenExistente.id).update({
          items: [],
          actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    const created = await crearOrdenPendiente(
      numeroCliente,
      verifiedItems,
      `ia_carrito_${queueId}`,
      undefined
    );
    const ordenActualizada = await obtenerOrdenPendiente(numeroCliente);
    const resumen = ordenActualizada
      ? await generarResumenOrden(ordenActualizada.items)
      : { resumen: created.result.respuesta, total: 0 };

    return {
      accion: 'items_agregados',
      output: {
        ordenId: ordenActualizada?.id || created.ordenId,
        totalCOP: resumen.total,
        resumen: resumen.resumen,
        items: ordenActualizada?.items || verifiedItems,
      },
    };
  }

  if (toolName === 'confirmar_pedido') {
    const direccion = typeof args.direccion === 'string' ? args.direccion.trim() : '';
    const barrio = typeof args.barrio === 'string' ? args.barrio.trim() : '';
    const metodoPago =
      args.metodoPago === 'efectivo' || args.metodoPago === 'transferencia'
        ? args.metodoPago
        : null;
    const clienteNombre =
      typeof args.clienteNombre === 'string' && args.clienteNombre.trim()
        ? args.clienteNombre.trim().slice(0, 80)
        : 'Cliente WhatsApp';
    const referencia =
      typeof args.referencia === 'string' && args.referencia.trim()
        ? args.referencia.trim().slice(0, 160)
        : undefined;

    if (direccion.length < 5 || barrio.length < 2 || !metodoPago) {
      throw new Error(
        'Para confirmar el pedido se requiere dirección (mínimo 5 caracteres), barrio y metodoPago ("efectivo" o "transferencia").'
      );
    }

    const orden = await obtenerOrdenPendiente(numeroCliente);
    if (!orden || !Array.isArray(orden.items) || orden.items.length === 0) {
      throw new Error('El cliente no tiene productos en su orden pendiente. Agrega productos primero.');
    }

    // Preparar la orden en estado esperando_direccion con el método de pago offline verificado
    await db.collection('ordenes_pendientes').doc(orden.id).update({
      paso: 'esperando_direccion',
      metodoPago,
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    const confirmResult = await confirmarOrden(
      orden.id,
      numeroCliente,
      direccion,
      barrio,
      `ia_confirm_${queueId}`,
      mensajeCierre ? { queueId, mensajeCierre } : undefined
    );

    if (confirmResult.accion === 'orden_confirmada' && (clienteNombre !== 'Cliente WhatsApp' || referencia)) {
      const domiciliosSnap = await db
        .collection('domicilios')
        .where('negocioId', '==', negocioId)
        .where('clienteTelefono', '==', numeroCliente)
        .limit(5)
        .get();
      const latest = domiciliosSnap.docs[0];
      if (latest) {
        await latest.ref.update({
          clienteNombre,
          ...(referencia ? { notas: referencia } : {}),
        });
      }
    }

    return {
      accion: confirmResult.accion,
      output: {
        confirmado: confirmResult.accion === 'orden_confirmada',
        mensajeConfirmacion: confirmResult.respuesta,
        metodoPagoOffline: metodoPago,
        itemSample: buildWhatsAppSaleItem({
          catalogoTipo: orden.items[0].catalogoTipo,
          referenciaId: orden.items[0].productoId,
          nombre: orden.items[0].nombreSnapshot,
          cantidad: orden.items[0].cantidad,
          precioUnitario: orden.items[0].precioSnapshot,
        }),
      },
    };
  }

  if (toolName === 'consultar_estado_o_escalar') {
    const accion = args.accion;
    if (accion === 'hablar_con_humano') {
      await pauseConversationForOperator(db, negocioId, numeroCliente, 'solicitud_cliente');
      return {
        accion: 'escalado_a_humano',
        output: {
          escalado: true,
          mensaje:
            'Conversación transferida a un asesor humano de La Parada. El bot quedará en pausa para no interrumpir.',
        },
      };
    }

    const snapshot = await db
      .collection('domicilios')
      .where('negocioId', '==', negocioId)
      .where('clienteTelefono', '==', numeroCliente)
      .limit(10)
      .get();

    const pedidos = snapshot.docs
      .map(
        (d) =>
          ({
            id: d.id,
            ...(d.data() as {
              estado?: string;
              codigoPublico?: string;
              total?: number;
              direccion?: string;
            }),
          })
      )
      .filter((p) => p.estado !== 'entregado');

    if (pedidos.length === 0) {
      return {
        accion: 'rastreo_sin_pedido',
        output: {
          pedidoActivo: false,
          mensaje: 'No se encontró ningún pedido activo en curso para este número.',
        },
      };
    }

    const actual = pedidos[0] as {
      id: string;
      codigoPublico?: string;
      estado?: string;
      total?: number;
      direccion?: string;
    };
    return {
      accion: 'rastreo_enviado',
      output: {
        pedidoActivo: true,
        codigo: actual.codigoPublico || actual.id,
        estado: actual.estado || 'pendiente',
        totalCOP: actual.total || 0,
        direccion: actual.direccion || '',
      },
    };
  }

  if (toolName === 'agendar_reserva') {
    const clienteNombre =
      typeof args.clienteNombre === 'string' && args.clienteNombre.trim()
        ? args.clienteNombre.trim().slice(0, 80)
        : 'Cliente WhatsApp';
    const fechaHoraReserva =
      typeof args.fechaHoraReserva === 'string' && args.fechaHoraReserva.trim()
        ? args.fechaHoraReserva.trim().slice(0, 80)
        : '';
    const personas = Number(args.personas);
    const notas =
      typeof args.notas === 'string' && args.notas.trim()
        ? args.notas.trim().slice(0, 300)
        : undefined;

    if (!fechaHoraReserva || !Number.isInteger(personas) || personas < 1 || personas > 50) {
      throw new Error(
        'Para agendar la reserva se requiere fechaHoraReserva válida y cantidad de personas (entre 1 y 50).'
      );
    }

    const docRef = db.collection('reservas').doc();
    const reservaData = {
      negocioId,
      clienteNombre,
      clienteTelefono: numeroCliente,
      fechaHoraReserva,
      personas,
      ...(notas ? { notas } : {}),
      estado: 'confirmada',
      origen: 'whatsapp',
      creadoEn: admin.firestore.FieldValue.serverTimestamp(),
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(reservaData);

    return {
      accion: 'reserva_agendada',
      output: {
        reservaId: docRef.id,
        confirmada: true,
        clienteNombre,
        fechaHoraReserva,
        personas,
        ...(notas ? { notas } : {}),
        mensaje: `Reserva agendada exitosamente para ${clienteNombre} (${personas} personas) el ${fechaHoraReserva}.`,
      },
    };
  }

  throw new Error(`Herramienta desconocida: ${toolName}`);
}

async function cargarHistorialReciente(
  db: admin.firestore.Firestore,
  negocioId: string,
  telefono: string
): Promise<EngineMessage[]> {
  try {
    const snap = await db
      .collection('mensajes_whatsapp')
      .where('negocioId', '==', negocioId)
      .where('telefono', '==', telefono)
      .orderBy('creadoEn', 'desc')
      .limit(6)
      .get();

    return snap.docs
      .reverse()
      .map((doc) => {
        const data = doc.data();
        const texto = typeof data.contenido === 'string' ? data.contenido.trim() : '';
        if (!texto) return null;
        return {
          role: (data.tipo === 'salida' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: texto.slice(0, 800),
        };
      })
      .filter((m): m is { role: 'assistant' | 'user'; content: string } => m !== null);
  } catch {
    return [];
  }
}

/**
 * Procesa un mensaje en lenguaje natural usando la arquitectura Sarin Bot (DeepSeek + Tool Calling).
 */
export async function procesarMensajeConDeepSeek(
  numeroCliente: string,
  contenidoMensaje: string,
  negocioId: string,
  operationContext?: BotOperationContext,
  options?: {
    mensajeBienvenida?: string;
    mensajeCierre?: string;
    completeChatFn?: typeof completeDeepSeekChat;
    clientOptions?: DeepSeekClientOptions;
    db?: admin.firestore.Firestore;
  }
): Promise<BotProcessingResult> {
  const db = options?.db ?? getDb();

  // Validar vigencia de suscripción y saldo de cuota de IA por tenant
  const negocioRef = db.collection('negocios').doc(negocioId);
  const negocioSnap = await negocioRef.get();
  const negocioData = negocioSnap.exists ? negocioSnap.data() : null;

  if (negocioId !== 'laparada') {
    if (!negocioData || negocioData.estado !== 'activo') {
      await pauseConversationForOperator(db, negocioId, numeroCliente, 'smb_echo');
      return {
        accion: 'error',
        respuesta:
          'Lo sentimos, este canal de atención no se encuentra operativo en este momento. Un asesor humano te responderá en breve.',
      };
    }

    if (negocioData.suscripcionVenceEn) {
      const venceEnMs =
        typeof negocioData.suscripcionVenceEn.toMillis === 'function'
          ? negocioData.suscripcionVenceEn.toMillis()
          : typeof negocioData.suscripcionVenceEn === 'number'
            ? negocioData.suscripcionVenceEn
            : new Date(negocioData.suscripcionVenceEn).getTime();

      if (venceEnMs < Date.now()) {
        await pauseConversationForOperator(db, negocioId, numeroCliente, 'smb_echo');
        return {
          accion: 'error',
          respuesta:
            'Lo sentimos, la atención automatizada de este establecimiento se encuentra suspendida por vencimiento de suscripción. Un encargado te atenderá pronto.',
        };
      }
    }

    const cuota =
      typeof negocioData.cuotaRespuestasIA === 'number' ? negocioData.cuotaRespuestasIA : 300;
    const usadas =
      typeof negocioData.respuestasIAUsadas === 'number' ? negocioData.respuestasIAUsadas : 0;
    if (usadas >= cuota) {
      await pauseConversationForOperator(db, negocioId, numeroCliente, 'smb_echo');
      return {
        accion: 'error',
        respuesta:
          'Lo sentimos, el asistente virtual ha alcanzado el límite de respuestas asignadas a este local. En breve un asesor te responderá personalmente.',
      };
    }
  }

  const [catalogo, ordenActual, historial] = await Promise.all([
    cargarCatalogoVerificado(db, negocioId),
    obtenerOrdenPendiente(numeroCliente),
    cargarHistorialReciente(db, negocioId, numeroCliente),
  ]);

  const catalogoResumen =
    catalogo.length > 0
      ? catalogo
          .map(
            (item) =>
              `- [${item.tipo.toUpperCase()}] ID: "${item.id}" | ${item.nombre} | $${item.precio.toLocaleString('es-CO')} COP`
          )
          .join('\n')
      : 'No hay productos cargados actualmente.';

  const carritoResumen =
    ordenActual && Array.isArray(ordenActual.items) && ordenActual.items.length > 0
      ? ordenActual.items
          .map(
            (it) =>
              `- ${it.cantidad}x ${it.nombreSnapshot} (ID: ${it.productoId}, $${it.precioSnapshot.toLocaleString('es-CO')} c/u)`
          )
          .join('\n')
      : 'Carrito vacío (sin ítems aún).';

  const systemPrompt = buildLaParadaSystemPrompt({
    nombreNegocio: 'La Parada',
    mensajeBienvenida:
      options?.mensajeBienvenida || '¡Hola! Bienvenido a La Parada. ¿Qué te gustaría pedir hoy?',
    mensajeCierre:
      options?.mensajeCierre || '¡Gracias por tu pedido en La Parada! Ya está en preparación.',
    catalogoResumen,
    carritoResumen,
  });

  // Evitar duplicar el último mensaje del usuario si ya está al final del historial
  const cleanHistory =
    historial.length > 0 &&
    historial[historial.length - 1].role === 'user' &&
    historial[historial.length - 1].content === contenidoMensaje.trim()
      ? historial.slice(0, -1)
      : historial;

  const agentResult = await runLaParadaOrderAgent({
    userMessage: contenidoMensaje,
    history: cleanHistory,
    systemPrompt,
    context: {
      negocioId,
      numeroCliente,
      queueId: operationContext?.queueId || `turn_${Date.now()}`,
      mensajeCierre: options?.mensajeCierre ?? operationContext?.mensajeCierre,
    },
    executeTool: (name, args, ctx) => executeLaParadaOrderTool(name, args, ctx, db),
    completeChatFn: options?.completeChatFn,
    clientOptions: options?.clientOptions,
  });

  // Incrementar atómicamente el consumo de respuestas de IA en el tenant
  if (negocioSnap.exists) {
    negocioRef
      .update({
        respuestasIAUsadas: admin.firestore.FieldValue.increment(1),
        ultimaRespuestaIAEn: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch((err) => console.error('Error incrementando respuestasIAUsadas:', err));
  }

  return {
    accion: agentResult.accion,
    respuesta: agentResult.respuesta,
  };
}

