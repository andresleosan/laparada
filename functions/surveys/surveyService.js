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
exports.enviarEncuestasAutomaticas = void 0;
exports.crearEncuestaNPS = crearEncuestaNPS;
exports.crearEncuestaEntrega = crearEncuestaEntrega;
exports.enviarEncuestaWhatsApp = enviarEncuestaWhatsApp;
exports.registrarRespuestaEncuesta = registrarRespuestaEncuesta;
exports.calcularNPS = calcularNPS;
exports.obtenerAnalisisSatisfaccion = obtenerAnalisisSatisfaccion;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v2/scheduler"));
/**
 * Crea una encuesta NPS (Net Promoter Score)
 */
function crearEncuestaNPS(clienteId, ventaId) {
    const ahora = new Date();
    const expiracion = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días
    return {
        id: admin.firestore().collection('surveys').doc().id,
        clienteId,
        ventaId,
        tipo: 'nps',
        codigo: Math.random().toString(36).substring(7).toUpperCase(),
        respondido: false,
        enviadoEn: ahora,
        expiradoEn: expiracion,
    };
}
/**
 * Crea encuesta de satisfacción de entrega
 */
function crearEncuestaEntrega(clienteId, ventaId) {
    return {
        id: admin.firestore().collection('surveys').doc().id,
        clienteId,
        ventaId,
        tipo: 'entrega',
        codigo: Math.random().toString(36).substring(7).toUpperCase(),
        respondido: false,
        enviadoEn: new Date(),
        expiradoEn: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días
    };
}
/**
 * Envía encuesta por WhatsApp
 */
async function enviarEncuestaWhatsApp(survey, numeroCliente, nombreCliente) {
    try {
        const mensajes = {
            nps: `Hola ${nombreCliente || 'cliente'}! 👋\n\n¿Qué tan probable es que nos recomiendes a un amigo?\n(Responde con un número del 1 al 10)`,
            satisfaccion: `Hola ${nombreCliente || 'cliente'}! 😊\n\n¿Qué tan satisfecho estás con nuestro servicio?\n(1 = Muy insatisfecho, 10 = Muy satisfecho)`,
            entrega: `¿Cómo fue tu experiencia de entrega? 🚗\n(1 = Muy mala, 5 = Excelente)`,
            producto: `¿Qué te pareció la calidad de tu pedido? 🍔\n(1 = Muy mala, 5 = Excelente)`,
            general: `Cuéntanos tu opinión en: ${survey.enlace || 'link'} `,
        };
        const mensaje = mensajes[survey.tipo];
        // Aquí iría integración con WhatsApp Business API
        console.log(`Enviar WhatsApp a ${numeroCliente}: ${mensaje}`);
        // Actualizar estado
        const db = admin.firestore();
        await db.collection('surveys').doc(survey.id).update({
            enviador: 'whatsapp',
            enviadoEn: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        console.error('Error enviando encuesta WhatsApp:', error);
        throw error;
    }
}
/**
 * Registra respuesta de encuesta
 */
async function registrarRespuestaEncuesta(surveyId, calificacion, comentario) {
    try {
        const db = admin.firestore();
        // Obtener encuesta
        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) {
            throw new Error('Encuesta no encontrada');
        }
        const survey = surveyDoc.data();
        // Categorizar respuesta
        let categorizacion = 'neutral';
        if (survey.tipo === 'nps') {
            if (calificacion >= 9)
                categorizacion = 'positivo'; // Promotores
            else if (calificacion <= 6)
                categorizacion = 'negativo'; // Detractores
        }
        else {
            if (calificacion >= 4)
                categorizacion = 'positivo';
            else if (calificacion <= 2)
                categorizacion = 'negativo';
        }
        // Crear respuesta
        const respuesta = {
            id: db.collection('survey_responses').doc().id,
            clienteId: survey.clienteId,
            ventaId: survey.ventaId,
            tipo: survey.tipo,
            calificacion,
            comentario,
            categorizacion,
            creadoEn: new Date(),
        };
        // Guardar respuesta
        await db.collection('survey_responses').doc(respuesta.id).set(respuesta);
        // Marcar encuesta como respondida
        await db.collection('surveys').doc(surveyId).update({
            respondido: true,
            respondidoEn: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Respuesta registrada: ${survey.tipo} = ${calificacion}`);
        return respuesta;
    }
    catch (error) {
        console.error('Error registrando respuesta:', error);
        throw error;
    }
}
/**
 * Calcula NPS (Net Promoter Score)
 */
async function calcularNPS(dias = 30) {
    try {
        const db = admin.firestore();
        const hace30Dias = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
        // Obtener respuestas NPS
        const respuestas = await db
            .collection('survey_responses')
            .where('tipo', '==', 'nps')
            .where('creadoEn', '>=', hace30Dias)
            .get();
        let promotores = 0;
        let pasivos = 0;
        let detractores = 0;
        respuestas.docs.forEach(doc => {
            const data = doc.data();
            if (data.calificacion >= 9)
                promotores++;
            else if (data.calificacion >= 7)
                pasivos++;
            else
                detractores++;
        });
        const total = respuestas.size;
        const nps = total > 0 ? Math.round(((promotores - detractores) / total) * 100) : 0;
        return { nps, promotores, pasivos, detractores, total };
    }
    catch (error) {
        console.error('Error calculando NPS:', error);
        throw error;
    }
}
/**
 * Obtiene análisis de satisfacción
 */
async function obtenerAnalisisSatisfaccion(dias = 30) {
    try {
        const db = admin.firestore();
        const hace30Dias = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
        // Respuestas recientes
        const respuestasRecientes = await db
            .collection('survey_responses')
            .where('creadoEn', '>=', hace30Dias)
            .orderBy('creadoEn', 'desc')
            .limit(100)
            .get();
        let positivos = 0;
        let neutros = 0;
        let negativos = 0;
        let sumaCalificaciones = 0;
        respuestasRecientes.docs.forEach(doc => {
            const data = doc.data();
            if (data.categorizacion === 'positivo')
                positivos++;
            else if (data.categorizacion === 'neutral')
                neutros++;
            else
                negativos++;
            sumaCalificaciones += data.calificacion;
        });
        const total = respuestasRecientes.size;
        const promedio = total > 0 ? Number((sumaCalificaciones / total).toFixed(1)) : 0;
        // Tendencia: comparar primera y segunda mitad
        const primeraMitad = respuestasRecientes.docs.slice(0, Math.floor(total / 2));
        const segundaMitad = respuestasRecientes.docs.slice(Math.floor(total / 2));
        const promPrimera = primeraMitad.length > 0
            ? primeraMitad.reduce((sum, doc) => sum + doc.data().calificacion, 0) /
                primeraMitad.length
            : 0;
        const promSegunda = segundaMitad.length > 0
            ? segundaMitad.reduce((sum, doc) => sum + doc.data().calificacion, 0) /
                segundaMitad.length
            : 0;
        let tendencia = 'estable';
        if (promSegunda > promPrimera + 0.5)
            tendencia = 'mejorando';
        else if (promSegunda < promPrimera - 0.5)
            tendencia = 'empeorando';
        return {
            promedio,
            positivos,
            neutros,
            negativos,
            tendencia,
        };
    }
    catch (error) {
        console.error('Error obteniendo análisis:', error);
        throw error;
    }
}
/**
 * Función programada para enviar encuestas automáticas
 */
exports.enviarEncuestasAutomaticas = functions.onSchedule('0 20 * * *', // Cada día a las 8 PM
async (context) => {
    try {
        const db = admin.firestore();
        // Obtener entregas de hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const mañana = new Date(hoy);
        mañana.setDate(mañana.getDate() + 1);
        const ventasHoy = await db
            .collection('ventas')
            .where('entregadoEn', '>=', admin.firestore.Timestamp.fromDate(hoy))
            .where('entregadoEn', '<', admin.firestore.Timestamp.fromDate(mañana))
            .get();
        console.log(`Enviando encuestas a ${ventasHoy.size} clientes...`);
        // Enviar encuesta a cada cliente
        for (const doc of ventasHoy.docs) {
            const venta = doc.data();
            const survey = crearEncuestaEntrega(venta.clienteId, doc.id);
            await db.collection('surveys').doc(survey.id).set(survey);
            // Aquí iría el envío por WhatsApp
            console.log(`Encuesta creada para cliente ${venta.clienteId}`);
        }
        console.log('Encuestas enviadas exitosamente');
    }
    catch (error) {
        console.error('Error enviando encuestas automáticas:', error);
    }
});
