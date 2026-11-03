// firebase-functions/src/notifications/emailNotificationService.ts
import * as admin from 'firebase-admin';
import axios from 'axios';

export const OFFICIAL_SENDER = 'La Parada SaaS · ALS Dev Studio <alsdevstudio@alsdevstudio.com>';
export const OFFICIAL_REPLY_TO = 'alsdevstudio@alsdevstudio.com';

export type TipoNotificacionCorreo =
  | 'resumen_diario'
  | 'activacion_plan'
  | 'renovacion_plan'
  | 'alerta_vencimiento'
  | 'alerta_cuota_ia';

export interface SendEmailOptions {
  negocioId: string;
  tipo: TipoNotificacionCorreo;
  destinatario: string;
  asunto: string;
  html: string;
  resendApiKey?: string;
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  id?: string;
  estado: 'enviado' | 'simulado' | 'fallido';
  error?: string;
}

/**
 * Formateador de moneda en pesos colombianos para plantillas HTML de correo
 */
export function formatCOP(valor: number): string {
  if (!Number.isFinite(valor)) return '$ 0';
  const entero = Math.round(valor);
  const formateado = Math.abs(entero)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${entero < 0 ? '-$ ' : '$ '}${formateado}`;
}

/**
 * Envía un correo transaccional utilizando la API HTTPS de Resend y registra
 * la traza de auditoría en la colección Firestore `notificaciones_correo` aislada por tenant.
 */
export async function enviarCorreoTransaccional(
  options: SendEmailOptions,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<SendEmailResult> {
  const { negocioId, tipo, destinatario, asunto, html, resendApiKey, metadata } = options;

  let resultado: SendEmailResult = {
    estado: 'simulado',
  };

  const apiKeyValida = typeof resendApiKey === 'string' && resendApiKey.trim().length > 0;

  if (apiKeyValida) {
    try {
      const response = await axios.post<{ id: string }>(
        'https://api.resend.com/emails',
        {
          from: OFFICIAL_SENDER,
          to: [destinatario.trim()],
          reply_to: OFFICIAL_REPLY_TO,
          subject: asunto,
          html,
        },
        {
          headers: {
            Authorization: `Bearer ${resendApiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      resultado = {
        id: response.data?.id,
        estado: 'enviado',
      };
    } catch (err: unknown) {
      const errorMsg =
        axios.isAxiosError(err) && err.response?.data
          ? JSON.stringify(err.response.data)
          : err instanceof Error
            ? err.message
            : 'Error desconocido al enviar por Resend';

      console.error(`[emailNotificationService] Error enviando correo a ${destinatario}:`, errorMsg);
      resultado = {
        estado: 'fallido',
        error: errorMsg,
      };
    }
  } else {
    console.info(`[emailNotificationService] [SIMULADO] Correo a ${destinatario} ("${asunto}") sin API key.`);
    resultado = {
      estado: 'simulado',
    };
  }

  // Registrar auditoría en Firestore bajo el tenant
  try {
    await db.collection('notificaciones_correo').add({
      negocioId,
      tipo,
      destinatario: destinatario.trim().toLowerCase(),
      asunto,
      estado: resultado.estado,
      resendId: resultado.id || null,
      error: resultado.error || null,
      metadata: metadata || null,
      enviadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (dbErr) {
    console.error('[emailNotificationService] Error guardando auditoría de correo:', dbErr);
  }

  return resultado;
}

// =========================================================================
// PLANTILLAS HTML CON IDENTIDAD OSCURA/DORADA (#0A0A0A / #C9A84C)
// =========================================================================

export interface ResumenDiarioPlantillaData {
  nombreNegocio: string;
  slug: string;
  fechaTexto: string;
  totalVentasCOP: number;
  cantidadVentas: number;
  ticketPromedioCOP: number;
  ventasPosCOP: number;
  ventasWhatsappWebCOP: number;
  ventasEfectivoCOP: number;
  ventasTransferenciaCOP: number;
  topProductos: Array<{
    nombre: string;
    cantidad: number;
    subtotal: number;
  }>;
  domiciliosEntregados: number;
  reservasAgendadas: number;
  respuestasIAUsadasHoy: number;
  cierreCaja: {
    cerrado: boolean;
    utilidadNetaCOP?: number;
    totalIngresosCOP?: number;
    totalGastosCOP?: number;
    notas?: string;
  };
}

export function renderPlantillaResumenDiario(data: ResumenDiarioPlantillaData): string {
  const topRows =
    data.topProductos.length > 0
      ? data.topProductos
          .map(
            (p, idx) => `
        <tr style="border-bottom: 1px solid #262626;">
          <td style="padding: 10px 8px; color: #E5E5E5; font-size: 13px;">
            <strong style="color: #C9A84C; margin-right: 6px;">#${idx + 1}</strong> ${p.nombre}
          </td>
          <td style="padding: 10px 8px; text-align: center; color: #A3A3A3; font-size: 13px;">
            ${p.cantidad} ud.
          </td>
          <td style="padding: 10px 8px; text-align: right; color: #C9A84C; font-weight: bold; font-size: 13px;">
            ${formatCOP(p.subtotal)}
          </td>
        </tr>
      `
          )
          .join('')
      : `
        <tr>
          <td colspan="3" style="padding: 16px; text-align: center; color: #737373; font-size: 13px;">
            No se registraron ventas de ítems específicos hoy.
          </td>
        </tr>
      `;

  const cajaSection = data.cierreCaja.cerrado
    ? `
      <div style="background-color: #171717; border: 1px solid #22c55e44; border-radius: 12px; padding: 16px; margin-top: 16px;">
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <span style="display: inline-block; width: 10px; height: 10px; background-color: #22c55e; border-radius: 50%; margin-right: 8px;"></span>
          <strong style="color: #22c55e; font-size: 14px;">Cierre de Caja Completado</strong>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #D4D4D4;">
          <tr>
            <td style="padding: 4px 0;">Ingresos Totales:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #E5E5E5;">${formatCOP(data.cierreCaja.totalIngresosCOP || 0)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;">Gastos del Turno:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #ef4444;">-${formatCOP(data.cierreCaja.totalGastosCOP || 0)}</td>
          </tr>
          <tr style="border-top: 1px solid #262626;">
            <td style="padding: 8px 0 4px 0; font-weight: bold; color: #FFFFFF;">Utilidad Neta:</td>
            <td style="padding: 8px 0 4px 0; text-align: right; font-weight: bold; color: #22c55e; font-size: 15px;">
              ${formatCOP(data.cierreCaja.utilidadNetaCOP || 0)}
            </td>
          </tr>
        </table>
        ${
          data.cierreCaja.notas
            ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #A3A3A3; font-style: italic;">"${data.cierreCaja.notas}"</p>`
            : ''
        }
      </div>
    `
    : `
      <div style="background-color: #1a1505; border: 1px solid #eab30866; border-radius: 12px; padding: 16px; margin-top: 16px;">
        <div style="margin-bottom: 6px;">
          <strong style="color: #eab308; font-size: 14px;">⚠️ Turno aún sin Cierre de Caja en POS/Dashboard</strong>
        </div>
        <p style="margin: 0; font-size: 12px; color: #d4d4d4; line-height: 1.4;">
          Recuerda ingresar al panel y confirmar el arqueo de caja del turno para archivar el balance contable final.
        </p>
      </div>
    `;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resumen Ejecutivo Diario · ${data.nombreNegocio}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E5E5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #0A0A0A; border: 1px solid #242424; border-radius: 16px; overflow: hidden; margin-top: 20px; margin-bottom: 30px;">
    
    <!-- Encabezado con Membrete Dorado -->
    <div style="background: linear-gradient(135deg, #141414 0%, #0A0A0A 100%); padding: 24px 28px; border-bottom: 1px solid #C9A84C33;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #C9A84C; font-weight: bold; margin-bottom: 4px;">
        La Parada SaaS · Copiloto Gastronómico
      </div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF;">
        Resumen Ejecutivo de Ventas
      </h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #A3A3A3;">
        ${data.nombreNegocio} · Jornada del ${data.fechaTexto}
      </p>
    </div>

    <!-- Contenido Principal -->
    <div style="padding: 24px 28px;">
      
      <!-- Gran Métrica de Ventas -->
      <div style="background-color: #121212; border: 1px solid #262626; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 20px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #A3A3A3; font-weight: 600;">
          Venta Total del Día
        </span>
        <div style="font-size: 32px; font-weight: 900; color: #C9A84C; margin: 8px 0;">
          ${formatCOP(data.totalVentasCOP)}
        </div>
        <div style="display: inline-block; font-size: 12px; color: #D4D4D4; background-color: #1F1F1F; padding: 4px 12px; border-radius: 20px;">
          <strong>${data.cantidadVentas}</strong> pedidos · Ticket Promedio: <strong>${formatCOP(data.ticketPromedioCOP)}</strong>
        </div>
      </div>

      <!-- Desglose por Canal y Método -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div style="background-color: #121212; border: 1px solid #262626; border-radius: 12px; padding: 14px;">
          <div style="font-size: 11px; color: #A3A3A3; text-transform: uppercase; font-weight: bold; margin-bottom: 8px;">
            Canales de Venta
          </div>
          <div style="font-size: 13px; margin-bottom: 4px;">
            POS Mostrador: <strong style="color: #E5E5E5;">${formatCOP(data.ventasPosCOP)}</strong>
          </div>
          <div style="font-size: 13px;">
            WhatsApp / Tienda: <strong style="color: #C9A84C;">${formatCOP(data.ventasWhatsappWebCOP)}</strong>
          </div>
        </div>
        <div style="background-color: #121212; border: 1px solid #262626; border-radius: 12px; padding: 14px;">
          <div style="font-size: 11px; color: #A3A3A3; text-transform: uppercase; font-weight: bold; margin-bottom: 8px;">
            Métodos de Cobro
          </div>
          <div style="font-size: 13px; margin-bottom: 4px;">
            Efectivo: <strong style="color: #E5E5E5;">${formatCOP(data.ventasEfectivoCOP)}</strong>
          </div>
          <div style="font-size: 13px;">
            Transferencia: <strong style="color: #38bdf8;">${formatCOP(data.ventasTransferenciaCOP)}</strong>
          </div>
        </div>
      </div>

      <!-- Top 3 Productos del Día -->
      <div style="background-color: #121212; border: 1px solid #262626; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #C9A84C; font-weight: bold; margin-bottom: 12px;">
          Top Productos Más Vendidos
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          ${topRows}
        </table>
      </div>

      <!-- Métricas Operativas y Sarin IA -->
      <div style="background-color: #121212; border: 1px solid #262626; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #10b981; font-weight: bold; margin-bottom: 12px;">
          Productividad Operativa
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid #262626; padding-bottom: 8px; margin-bottom: 8px;">
          <span>🚴 Domicilios entregados con éxito:</span>
          <strong style="color: #FFFFFF;">${data.domiciliosEntregados}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid #262626; padding-bottom: 8px; margin-bottom: 8px;">
          <span>📅 Reservas agendadas:</span>
          <strong style="color: #FFFFFF;">${data.reservasAgendadas}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <span>🤖 Respuestas automáticas de Sarin IA:</span>
          <strong style="color: #C9A84C;">${data.respuestasIAUsadasHoy}</strong>
        </div>
      </div>

      <!-- Estado de Cierre de Caja -->
      ${cajaSection}

    </div>

    <!-- Pie de Correo -->
    <div style="background-color: #070707; border-top: 1px solid #242424; padding: 18px 28px; text-align: center; font-size: 11px; color: #737373;">
      <p style="margin: 0 0 6px 0;">
        Este informe fue generado automáticamente por <strong>La Parada SaaS</strong> para el equipo administrativo de ${data.nombreNegocio}.
      </p>
      <p style="margin: 0;">
        ALS Dev Studio · Soporte: <a href="mailto:alsdevstudio@alsdevstudio.com" style="color: #C9A84C; text-decoration: none;">alsdevstudio@alsdevstudio.com</a>
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

export interface SuscripcionEmailData {
  nombreNegocio: string;
  slug: string;
  propietarioNombre: string;
  tipoAccion: 'activacion' | 'renovacion';
  planNombre: string;
  diasVigencia: number;
  cuotaRespuestasIA: number;
  fechaVencimientoTexto: string;
}

export function renderPlantillaSuscripcion(data: SuscripcionEmailData): string {
  const esActivacion = data.tipoAccion === 'activacion';
  const titulo = esActivacion ? '¡Bienvenido a La Parada SaaS!' : 'Suscripción Renovada con Éxito';
  const subtitulo = esActivacion
    ? `Tu establecimiento ${data.nombreNegocio} ha sido activado oficialmente.`
    : `La suscripción de ${data.nombreNegocio} ha sido extendida.`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${titulo}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E5E5;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #0A0A0A; border: 1px solid #242424; border-radius: 16px; overflow: hidden;">
    
    <div style="background: linear-gradient(135deg, #141414 0%, #0A0A0A 100%); padding: 24px 28px; border-bottom: 1px solid #C9A84C33;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #C9A84C; font-weight: bold; margin-bottom: 4px;">
        La Parada SaaS · Plataforma Gastronómica
      </div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF;">
        ${titulo}
      </h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #A3A3A3;">
        ${subtitulo}
      </p>
    </div>

    <div style="padding: 24px 28px;">
      <p style="margin-top: 0; font-size: 14px; line-height: 1.5; color: #D4D4D4;">
        Hola, <strong>${data.propietarioNombre}</strong>. Te confirmamos los detalles de tu plan comercial activo para <strong>${data.nombreNegocio}</strong>:
      </p>

      <div style="background-color: #121212; border: 1px solid #262626; border-radius: 14px; padding: 18px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #262626;">
            <td style="padding: 8px 0; color: #A3A3A3;">Plan suscrito:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #C9A84C;">${data.planNombre}</td>
          </tr>
          <tr style="border-bottom: 1px solid #262626;">
            <td style="padding: 8px 0; color: #A3A3A3;">Días otorgados:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #FFFFFF;">+${data.diasVigencia} días</td>
          </tr>
          <tr style="border-bottom: 1px solid #262626;">
            <td style="padding: 8px 0; color: #A3A3A3;">Nueva fecha de vencimiento:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #10b981;">${data.fechaVencimientoTexto}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #A3A3A3;">Cuota de Sarin IA (WhatsApp):</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #C9A84C;">${data.cuotaRespuestasIA.toLocaleString('es-CO')} respuestas</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #171717; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #D4D4D4;">
        <p style="margin: 0 0 8px 0;"><strong>Tu menú público ya está al aire:</strong></p>
        <p style="margin: 0; color: #C9A84C; font-family: monospace;">/tienda/${data.slug}</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #A3A3A3;">
          Desde el panel administrativo puedes descargar el afiche con código QR en alta resolución listo para imprimir y colocar en tus mesas y mostrador.
        </p>
      </div>

      <p style="font-size: 12px; color: #A3A3A3; margin-bottom: 0;">
        Recuerda que todos los días a las 11:00 PM recibirás a este correo tu <strong>Resumen Ejecutivo Diario</strong> con las ventas, pedidos y balance de caja de tu jornada.
      </p>
    </div>

    <div style="background-color: #070707; border-top: 1px solid #242424; padding: 16px 28px; text-align: center; font-size: 11px; color: #737373;">
      La Parada SaaS · ALS Dev Studio · <a href="mailto:alsdevstudio@alsdevstudio.com" style="color: #C9A84C; text-decoration: none;">alsdevstudio@alsdevstudio.com</a>
    </div>

  </div>
</body>
</html>
  `.trim();
}

export interface AlertaEmailData {
  nombreNegocio: string;
  propietarioNombre: string;
  tipoAlerta: 'vencimiento_proximo' | 'cuota_ia_agotandose';
  diasRestantes?: number;
  porcentajeUsoIA?: number;
  respuestasUsadas?: number;
  cuotaTotal?: number;
  whatsappRenovacionUrl?: string;
}

export function renderPlantillaAlerta(data: AlertaEmailData): string {
  const esVencimiento = data.tipoAlerta === 'vencimiento_proximo';
  const titulo = esVencimiento
    ? '⚠️ Tu suscripción está por vencer en menos de 48 horas'
    : '⚡ Has alcanzado más del 85% de tu cuota de Sarin IA';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${titulo}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E5E5;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #0A0A0A; border: 1px solid #242424; border-radius: 16px; overflow: hidden;">
    
    <div style="background: linear-gradient(135deg, #1f1408 0%, #0A0A0A 100%); padding: 24px 28px; border-bottom: 1px solid #eab30844;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #eab308; font-weight: bold; margin-bottom: 4px;">
        Aviso Preventivo de Plataforma
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF;">
        ${titulo}
      </h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #A3A3A3;">
        ${data.nombreNegocio}
      </p>
    </div>

    <div style="padding: 24px 28px;">
      <p style="margin-top: 0; font-size: 14px; line-height: 1.5; color: #D4D4D4;">
        Estimado/a <strong>${data.propietarioNombre}</strong>:
      </p>

      ${
        esVencimiento
          ? `<p style="font-size: 13px; color: #D4D4D4;">
              Te informamos que el acceso de tu local <strong>${data.nombreNegocio}</strong> vencerá próximamente (${data.diasRestantes ?? 1} día(s) restante(s)). Para evitar interrupciones en la atención de WhatsApp y acceso al POS, puedes renovar tu plan en cualquier momento.
            </p>`
          : `<p style="font-size: 13px; color: #D4D4D4;">
              Has utilizado <strong>${data.respuestasUsadas} de ${data.cuotaTotal}</strong> respuestas de Sarin IA (${data.porcentajeUsoIA}% consumido). Cuando se agote la cuota, el bot de WhatsApp pausará sus respuestas automáticas hasta la renovación.
            </p>`
      }

      <div style="text-align: center; margin: 26px 0;">
        <a href="https://wa.me/573001234567?text=Hola%20deseo%20renovar%20mi%20plan%20para%20${encodeURIComponent(data.nombreNegocio)}"
           style="background-color: #22c55e; color: #050505; font-weight: bold; padding: 12px 24px; border-radius: 10px; text-decoration: none; display: inline-block; font-size: 14px;">
          💬 Renovar Plan por WhatsApp
        </a>
      </div>

      <p style="font-size: 12px; color: #737373; margin-bottom: 0;">
        Si ya realizaste tu pago o acordaste una extensión con soporte, por favor omite este mensaje.
      </p>
    </div>

    <div style="background-color: #070707; border-top: 1px solid #242424; padding: 16px 28px; text-align: center; font-size: 11px; color: #737373;">
      La Parada SaaS · ALS Dev Studio · <a href="mailto:alsdevstudio@alsdevstudio.com" style="color: #C9A84C; text-decoration: none;">alsdevstudio@alsdevstudio.com</a>
    </div>

  </div>
</body>
</html>
  `.trim();
}

