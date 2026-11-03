"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pauseConversationForOperator = pauseConversationForOperator;
exports.resumeConversationBot = resumeConversationBot;
exports.isConversationPausedByOperator = isConversationPausedByOperator;
exports.cargarCatalogoVerificado = cargarCatalogoVerificado;
exports.executeLaParadaOrderTool = executeLaParadaOrderTool;
exports.procesarMensajeConDeepSeek = procesarMensajeConDeepSeek;
const admin = __importStar(require("firebase-admin"));
const node_crypto_1 = require("node:crypto");
const deepseekEngine_1 = require("../ai/deepseekEngine");
const menuGenerationService_1 = require("./menuGenerationService");
const orderProcessingService_1 = require("./orderProcessingService");
const getDb = () => admin.firestore();
const HANDOFF_PAUSE_MS = 2 * 60 * 60 * 1000; // 2 horas de relevo humano por defecto
function conversationDocId(negocioId, telefono) {
    const hash = (0, node_crypto_1.createHash)('sha256')
        .update(`${negocioId}\u0000${telefono}`)
        .digest('hex')
        .slice(0, 48);
    return `conv_${hash}`;
}
/**
 * Registra una pausa del bot cuando un operador humano interviene manualmente
 * o cuando el cliente solicita atención personalizada.
 */
async function pauseConversationForOperator(db, negocioId, telefono, motivo) {
    const ref = db.collection('_conversaciones_whatsapp').doc(conversationDocId(negocioId, telefono));
    const pausadoHasta = admin.firestore.Timestamp.fromMillis(Date.now() + HANDOFF_PAUSE_MS);
    await ref.set({
        negocioId,
        telefono,
        pausadoPorOperador: true,
        motivoPausa: motivo,
        pausadoHasta,
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
/**
 * Reactiva el bot para una conversación específica.
 */
async function resumeConversationBot(db, negocioId, telefono) {
    const ref = db.collection('_conversaciones_whatsapp').doc(conversationDocId(negocioId, telefono));
    await ref.set({
        negocioId,
        telefono,
        pausadoPorOperador: false,
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
/**
 * Verifica si la conversación está actualmente en modo humano (handoff activo).
 */
async function isConversationPausedByOperator(db, negocioId, telefono) {
    const ref = db.collection('_conversaciones_whatsapp').doc(conversationDocId(negocioId, telefono));
    const snap = await ref.get();
    if (!snap.exists)
        return false;
    const data = snap.data();
    if (data?.negocioId !== negocioId || data?.pausadoPorOperador !== true) {
        return false;
    }
    const pausadoHastaMs = typeof data?.pausadoHasta?.toMillis === 'function' ? data.pausadoHasta.toMillis() : 0;
    return pausadoHastaMs > Date.now();
}
async function cargarCatalogoVerificado(db, negocioId, busqueda) {
    const [productosSnap, combosSnap] = await Promise.all([
        db.collection('productos').where('negocioId', '==', negocioId).limit(100).get(),
        db.collection('combos').where('negocioId', '==', negocioId).limit(50).get(),
    ]);
    const items = [];
    for (const doc of productosSnap.docs) {
        const data = doc.data();
        const precio = Number(data.precio);
        if (data.disponible === false ||
            typeof data.nombre !== 'string' ||
            !data.nombre.trim() ||
            !Number.isFinite(precio) ||
            precio <= 0) {
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
        const precio = (0, menuGenerationService_1.resolveComboPrice)(data);
        if (data.disponible === false ||
            typeof data.nombre !== 'string' ||
            !data.nombre.trim() ||
            !Number.isFinite(precio) ||
            precio <= 0) {
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
        return items.filter((it) => it.nombre.toLowerCase().includes(needle) ||
            (it.categoria && it.categoria.toLowerCase().includes(needle)) ||
            (it.descripcion && it.descripcion.toLowerCase().includes(needle)));
    }
    return items;
}
/**
 * Ejecutor de las 4 herramientas del agente DeepSeek contra Firestore.
 */
async function executeLaParadaOrderTool(toolName, args, context, db = getDb()) {
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
            const ordenActual = await (0, orderProcessingService_1.obtenerOrdenPendiente)(numeroCliente);
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
            const entry = raw;
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
            const ordenExistente = await (0, orderProcessingService_1.obtenerOrdenPendiente)(numeroCliente);
            if (ordenExistente) {
                await db.collection('ordenes_pendientes').doc(ordenExistente.id).update({
                    items: [],
                    actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        const created = await (0, orderProcessingService_1.crearOrdenPendiente)(numeroCliente, verifiedItems, `ia_carrito_${queueId}`, undefined);
        const ordenActualizada = await (0, orderProcessingService_1.obtenerOrdenPendiente)(numeroCliente);
        const resumen = ordenActualizada
            ? await (0, orderProcessingService_1.generarResumenOrden)(ordenActualizada.items)
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
        const metodoPago = args.metodoPago === 'efectivo' || args.metodoPago === 'transferencia'
            ? args.metodoPago
            : null;
        const clienteNombre = typeof args.clienteNombre === 'string' && args.clienteNombre.trim()
            ? args.clienteNombre.trim().slice(0, 80)
            : 'Cliente WhatsApp';
        const referencia = typeof args.referencia === 'string' && args.referencia.trim()
            ? args.referencia.trim().slice(0, 160)
            : undefined;
        if (direccion.length < 5 || barrio.length < 2 || !metodoPago) {
            throw new Error('Para confirmar el pedido se requiere dirección (mínimo 5 caracteres), barrio y metodoPago ("efectivo" o "transferencia").');
        }
        const orden = await (0, orderProcessingService_1.obtenerOrdenPendiente)(numeroCliente);
        if (!orden || !Array.isArray(orden.items) || orden.items.length === 0) {
            throw new Error('El cliente no tiene productos en su orden pendiente. Agrega productos primero.');
        }
        // Preparar la orden en estado esperando_direccion con el método de pago offline verificado
        await db.collection('ordenes_pendientes').doc(orden.id).update({
            paso: 'esperando_direccion',
            metodoPago,
            actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        });
        const confirmResult = await (0, orderProcessingService_1.confirmarOrden)(orden.id, numeroCliente, direccion, barrio, `ia_confirm_${queueId}`, mensajeCierre ? { queueId, mensajeCierre } : undefined);
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
                itemSample: (0, orderProcessingService_1.buildWhatsAppSaleItem)({
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
                    mensaje: 'Conversación transferida a un asesor humano de La Parada. El bot quedará en pausa para no interrumpir.',
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
            .map((d) => ({
            id: d.id,
            ...d.data(),
        }))
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
        const actual = pedidos[0];
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
    throw new Error(`Herramienta desconocida: ${toolName}`);
}
async function cargarHistorialReciente(db, negocioId, telefono) {
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
            if (!texto)
                return null;
            return {
                role: (data.tipo === 'salida' ? 'assistant' : 'user'),
                content: texto.slice(0, 800),
            };
        })
            .filter((m) => m !== null);
    }
    catch {
        return [];
    }
}
/**
 * Procesa un mensaje en lenguaje natural usando la arquitectura Sarin Bot (DeepSeek + Tool Calling).
 */
async function procesarMensajeConDeepSeek(numeroCliente, contenidoMensaje, negocioId, operationContext, options) {
    const db = options?.db ?? getDb();
    const [catalogo, ordenActual, historial] = await Promise.all([
        cargarCatalogoVerificado(db, negocioId),
        (0, orderProcessingService_1.obtenerOrdenPendiente)(numeroCliente),
        cargarHistorialReciente(db, negocioId, numeroCliente),
    ]);
    const catalogoResumen = catalogo.length > 0
        ? catalogo
            .map((item) => `- [${item.tipo.toUpperCase()}] ID: "${item.id}" | ${item.nombre} | $${item.precio.toLocaleString('es-CO')} COP`)
            .join('\n')
        : 'No hay productos cargados actualmente.';
    const carritoResumen = ordenActual && Array.isArray(ordenActual.items) && ordenActual.items.length > 0
        ? ordenActual.items
            .map((it) => `- ${it.cantidad}x ${it.nombreSnapshot} (ID: ${it.productoId}, $${it.precioSnapshot.toLocaleString('es-CO')} c/u)`)
            .join('\n')
        : 'Carrito vacío (sin ítems aún).';
    const systemPrompt = (0, deepseekEngine_1.buildLaParadaSystemPrompt)({
        nombreNegocio: 'La Parada',
        mensajeBienvenida: options?.mensajeBienvenida || '¡Hola! Bienvenido a La Parada. ¿Qué te gustaría pedir hoy?',
        mensajeCierre: options?.mensajeCierre || '¡Gracias por tu pedido en La Parada! Ya está en preparación.',
        catalogoResumen,
        carritoResumen,
    });
    // Evitar duplicar el último mensaje del usuario si ya está al final del historial
    const cleanHistory = historial.length > 0 &&
        historial[historial.length - 1].role === 'user' &&
        historial[historial.length - 1].content === contenidoMensaje.trim()
        ? historial.slice(0, -1)
        : historial;
    const agentResult = await (0, deepseekEngine_1.runLaParadaOrderAgent)({
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
    return {
        accion: agentResult.accion,
        respuesta: agentResult.respuesta,
    };
}
