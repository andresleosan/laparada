import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2/scheduler';
import axios from 'axios';

/**
 * Tipos de encuesta
 */
export type SurveyType = 'nps' | 'satisfaccion' | 'producto' | 'entrega' | 'general';

/**
 * Respuesta de encuesta
 */
export interface SurveyResponse {
  id: string;
  clienteId: string;
  ventaId?: string;
  tipo: SurveyType;
  calificacion: number; // 1-10 o 1-5
  comentario?: string;
  categorizacion?: 'positivo' | 'neutral' | 'negativo';
  creadoEn: Date;
}

/**
 * Encuesta enviada
 */
export interface Survey {
  id: string;
  clienteId: string;
  ventaId?: string;
  tipo: SurveyType;
  enlace?: string;
  codigo?: string;
  respondido: boolean;
  respondidoEn?: Date;
  enviador?: 'whatsapp' | 'email' | 'sms';
  enviadoEn: Date;
  expiradoEn: Date;
}

/**
 * Crea una encuesta NPS (Net Promoter Score)
 */
export function crearEncuestaNPS(
  clienteId: string,
  ventaId?: string
): Survey {
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
export function crearEncuestaEntrega(
  clienteId: string,
  ventaId: string
): Survey {
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
export async function enviarEncuestaWhatsApp(
  survey: Survey,
  numeroCliente: string,
  nombreCliente?: string
): Promise<void> {
  try {
    const mensajes: { [key in SurveyType]: string } = {
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
  } catch (error) {
    console.error('Error enviando encuesta WhatsApp:', error);
    throw error;
  }
}

/**
 * Registra respuesta de encuesta
 */
export async function registrarRespuestaEncuesta(
  surveyId: string,
  calificacion: number,
  comentario?: string
): Promise<SurveyResponse> {
  try {
    const db = admin.firestore();

    // Obtener encuesta
    const surveyDoc = await db.collection('surveys').doc(surveyId).get();
    if (!surveyDoc.exists) {
      throw new Error('Encuesta no encontrada');
    }

    const survey = surveyDoc.data() as Survey;

    // Categorizar respuesta
    let categorizacion: 'positivo' | 'neutral' | 'negativo' = 'neutral';
    if (survey.tipo === 'nps') {
      if (calificacion >= 9) categorizacion = 'positivo'; // Promotores
      else if (calificacion <= 6) categorizacion = 'negativo'; // Detractores
    } else {
      if (calificacion >= 4) categorizacion = 'positivo';
      else if (calificacion <= 2) categorizacion = 'negativo';
    }

    // Crear respuesta
    const respuesta: SurveyResponse = {
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
  } catch (error) {
    console.error('Error registrando respuesta:', error);
    throw error;
  }
}

/**
 * Calcula NPS (Net Promoter Score)
 */
export async function calcularNPS(dias: number = 30): Promise<{
  nps: number;
  promotores: number;
  pasivos: number;
  detractores: number;
  total: number;
}> {
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
      const data = doc.data() as SurveyResponse;
      if (data.calificacion >= 9) promotores++;
      else if (data.calificacion >= 7) pasivos++;
      else detractores++;
    });

    const total = respuestas.size;
    const nps = total > 0 ? Math.round(((promotores - detractores) / total) * 100) : 0;

    return { nps, promotores, pasivos, detractores, total };
  } catch (error) {
    console.error('Error calculando NPS:', error);
    throw error;
  }
}

/**
 * Obtiene análisis de satisfacción
 */
export async function obtenerAnalisisSatisfaccion(dias: number = 30): Promise<{
  promedio: number;
  positivos: number;
  neutros: number;
  negativos: number;
  tendencia: 'mejorando' | 'estable' | 'empeorando';
}> {
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
      const data = doc.data() as SurveyResponse;
      if (data.categorizacion === 'positivo') positivos++;
      else if (data.categorizacion === 'neutral') neutros++;
      else negativos++;
      sumaCalificaciones += data.calificacion;
    });

    const total = respuestasRecientes.size;
    const promedio = total > 0 ? Number((sumaCalificaciones / total).toFixed(1)) : 0;

    // Tendencia: comparar primera y segunda mitad
    const primeraMitad = respuestasRecientes.docs.slice(0, Math.floor(total / 2));
    const segundaMitad = respuestasRecientes.docs.slice(Math.floor(total / 2));

    const promPrimera =
      primeraMitad.length > 0
        ? primeraMitad.reduce((sum, doc) => sum + (doc.data() as SurveyResponse).calificacion, 0) /
          primeraMitad.length
        : 0;

    const promSegunda =
      segundaMitad.length > 0
        ? segundaMitad.reduce((sum, doc) => sum + (doc.data() as SurveyResponse).calificacion, 0) /
          segundaMitad.length
        : 0;

    let tendencia: 'mejorando' | 'estable' | 'empeorando' = 'estable';
    if (promSegunda > promPrimera + 0.5) tendencia = 'mejorando';
    else if (promSegunda < promPrimera - 0.5) tendencia = 'empeorando';

    return {
      promedio,
      positivos,
      neutros,
      negativos,
      tendencia,
    };
  } catch (error) {
    console.error('Error obteniendo análisis:', error);
    throw error;
  }
}

/**
 * Función programada para enviar encuestas automáticas
 */
export const enviarEncuestasAutomaticas = functions.onSchedule(
  '0 20 * * *', // Cada día a las 8 PM
  async (context: any) => {
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
        const venta = doc.data() as any;
        const survey = crearEncuestaEntrega(venta.clienteId, doc.id);

        await db.collection('surveys').doc(survey.id).set(survey);

        // Aquí iría el envío por WhatsApp
        console.log(`Encuesta creada para cliente ${venta.clienteId}`);
      }

      console.log('Encuestas enviadas exitosamente');
    } catch (error) {
      console.error('Error enviando encuestas automáticas:', error);
    }
  }
);
