import { describe, it, expect } from 'vitest';
import {
  formatCOP,
  renderPlantillaResumenDiario,
  renderPlantillaSuscripcion,
  renderPlantillaAlerta,
  OFFICIAL_SENDER,
  OFFICIAL_REPLY_TO,
  ResumenDiarioPlantillaData,
  SuscripcionEmailData,
  AlertaEmailData,
} from '../firebase-functions/src/notifications/emailNotificationService';
import { getColombiaDayRange } from '../firebase-functions/src/notifications/dailySummaryAggregator';

describe('emailNotificationService - Plantillas y Contrato Oficial Resend', () => {
  it('cumple con el remitente y reply-to oficial verificado de ALS Dev Studio', () => {
    expect(OFFICIAL_SENDER).toBe('La Parada SaaS · ALS Dev Studio <alsdevstudio@alsdevstudio.com>');
    expect(OFFICIAL_REPLY_TO).toBe('alsdevstudio@alsdevstudio.com');
  });

  it('formatea montos en pesos colombianos correctamente sin decimales', () => {
    expect(formatCOP(0)).toBe('$ 0');
    expect(formatCOP(5000)).toBe('$ 5.000');
    expect(formatCOP(125000)).toBe('$ 125.000');
    expect(formatCOP(-15000)).toBe('-$ 15.000');
    expect(formatCOP(NaN)).toBe('$ 0');
  });

  it('calcula el rango del día en hora Colombia (UTC-5)', () => {
    const range = getColombiaDayRange('2026-11-03T15:00:00Z');
    expect(range.fechaISO).toBe('2026-11-03');
    expect(range.start.toISOString()).toBe('2026-11-03T05:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-11-04T04:59:59.999Z');
    expect(range.fechaTexto).toContain('de noviembre de 2026');
  });

  it('renderiza la plantilla de Resumen Diario con métricas y estado de caja', () => {
    const data: ResumenDiarioPlantillaData = {
      nombreNegocio: 'Puesto El Gordo',
      slug: 'puesto-el-gordo',
      fechaTexto: 'Martes, 3 de noviembre de 2026',
      totalVentasCOP: 185000,
      cantidadVentas: 12,
      ticketPromedioCOP: 15417,
      ventasPosCOP: 120000,
      ventasWhatsappWebCOP: 65000,
      ventasEfectivoCOP: 100000,
      ventasTransferenciaCOP: 85000,
      topProductos: [
        { nombre: 'Hamburguesa Especial', cantidad: 8, subtotal: 96000 },
        { nombre: 'Perro Caliente Suizo', cantidad: 5, subtotal: 50000 },
      ],
      domiciliosEntregados: 4,
      reservasAgendadas: 2,
      respuestasIAUsadasHoy: 45,
      cierreCaja: {
        cerrado: true,
        utilidadNetaCOP: 145000,
        totalIngresosCOP: 185000,
        totalGastosCOP: 40000,
        notas: 'Turno sin novedades, cierre cuadrado',
      },
    };

    const html = renderPlantillaResumenDiario(data);
    expect(html).toContain('Puesto El Gordo');
    expect(html).toContain('$ 185.000');
    expect(html).toContain('Hamburguesa Especial');
    expect(html).toContain('Perro Caliente Suizo');
    expect(html).toContain('Cierre de Caja Completado');
    expect(html).toContain('Turno sin novedades, cierre cuadrado');
    expect(html).toContain('#C9A84C');
    expect(html).toContain('alsdevstudio@alsdevstudio.com');
  });

  it('renderiza aviso de turno pendiente si no se ha realizado el cierre de caja', () => {
    const data: ResumenDiarioPlantillaData = {
      nombreNegocio: 'La Esquina',
      slug: 'la-esquina',
      fechaTexto: 'Lunes, 2 de noviembre de 2026',
      totalVentasCOP: 45000,
      cantidadVentas: 3,
      ticketPromedioCOP: 15000,
      ventasPosCOP: 45000,
      ventasWhatsappWebCOP: 0,
      ventasEfectivoCOP: 45000,
      ventasTransferenciaCOP: 0,
      topProductos: [],
      domiciliosEntregados: 0,
      reservasAgendadas: 0,
      respuestasIAUsadasHoy: 10,
      cierreCaja: {
        cerrado: false,
      },
    };

    const html = renderPlantillaResumenDiario(data);
    expect(html).toContain('Turno aún sin Cierre de Caja en POS/Dashboard');
  });

  it('renderiza la plantilla de activación y renovación de suscripción SaaS', () => {
    const data: SuscripcionEmailData = {
      nombreNegocio: 'Sabor Criollo',
      slug: 'sabor-criollo',
      propietarioNombre: 'María Pérez',
      tipoAccion: 'activacion',
      planNombre: 'Quincenal (15 días)',
      diasVigencia: 15,
      cuotaRespuestasIA: 1500,
      fechaVencimientoTexto: 'miércoles, 18 de noviembre de 2026',
    };

    const html = renderPlantillaSuscripcion(data);
    expect(html).toContain('¡Bienvenido a La Parada SaaS!');
    expect(html).toContain('María Pérez');
    expect(html).toContain('Quincenal (15 días)');
    expect(html).toContain('+15 días');
    expect(html).toContain('1.500 respuestas');
    expect(html).toContain('/tienda/sabor-criollo');
  });

  it('renderiza la plantilla de alerta preventiva por vencimiento próximo', () => {
    const data: AlertaEmailData = {
      nombreNegocio: 'Parrilla Norte',
      propietarioNombre: 'Carlos Ruiz',
      tipoAlerta: 'vencimiento_proximo',
      diasRestantes: 2,
    };

    const html = renderPlantillaAlerta(data);
    expect(html).toContain('suscripción está por vencer en menos de 48 horas');
    expect(html).toContain('Carlos Ruiz');
    expect(html).toContain('Parrilla Norte');
    expect(html).toContain('wa.me');
  });

  it('renderiza la plantilla de alerta por consumo alto de cuota de Sarin IA', () => {
    const data: AlertaEmailData = {
      nombreNegocio: 'Arepas Paisas',
      propietarioNombre: 'Diana Gómez',
      tipoAlerta: 'cuota_ia_agotandose',
      porcentajeUsoIA: 88,
      respuestasUsadas: 264,
      cuotaTotal: 300,
    };

    const html = renderPlantillaAlerta(data);
    expect(html).toContain('Has alcanzado más del 85% de tu cuota de Sarin IA');
    expect(html).toContain('264 de 300');
    expect(html).toContain('88% consumido');
  });
});

