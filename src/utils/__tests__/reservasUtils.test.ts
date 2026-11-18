import { describe, expect, it } from 'vitest';
import type { Mesa } from '@/types/mesa';
import type { ReservaNegocio } from '@/types/reserva';
import {
  calcularMetricasLibroReservas,
  construirMensajeConfirmacionReservaWhatsApp,
  construirMensajeRecordatorioReservaWhatsApp,
  detectarConflictoHorarioMesa,
  evaluarDisponibilidadMesasParaReserva,
  formatearOcasionReserva,
  generarReservasCsv,
  generarUrlWhatsAppReserva,
  normalizarTelefonoReservaWhatsApp,
  obtenerReservaProximaDeMesa,
  parsearFechaHoraReservaMs,
} from '../reservasUtils';

const mesasEjemplo: Mesa[] = [
  {
    id: 'm1',
    numero: 1,
    nombre: 'Mesa 1',
    capacidad: 2,
    zona: 'Salón Principal',
    estado: 'libre',
    negocioId: 'laparada',
  },
  {
    id: 'm2',
    numero: 2,
    nombre: 'Mesa 2',
    capacidad: 4,
    zona: 'Salón Principal',
    estado: 'libre',
    negocioId: 'laparada',
  },
  {
    id: 'm3',
    numero: 3,
    nombre: 'Mesa 3',
    capacidad: 6,
    zona: 'Terraza',
    estado: 'ocupada',
    negocioId: 'laparada',
  },
];

const reservasEjemplo: ReservaNegocio[] = [
  {
    id: 'r1',
    negocioId: 'laparada',
    clienteNombre: 'Laura Méndez',
    clienteTelefono: '3101112233',
    fechaHoraReserva: '2026-11-17T19:00',
    personas: 4,
    estado: 'confirmada',
    origen: 'whatsapp',
    mesaId: 'm2',
    mesaNumero: 2,
    mesaNombre: 'Mesa 2',
    zonaPreferida: 'Salón Principal',
    anticipoMonto: 50000,
    anticipoMetodo: 'transferencia',
    anticipoEstado: 'verificado',
    anticipoReferencia: 'NEQUI-8841',
    ocasionEspecial: 'cumpleanos',
  },
  {
    id: 'r2',
    negocioId: 'laparada',
    clienteNombre: 'Mateo Silva',
    clienteTelefono: '3159998877',
    fechaHoraReserva: '2026-11-17T20:30',
    personas: 6,
    estado: 'pendiente',
    origen: 'pos',
    mesaId: 'm3',
    mesaNumero: 3,
    mesaNombre: 'Mesa 3',
    zonaPreferida: 'Terraza',
    anticipoMonto: 30000,
    anticipoMetodo: 'transferencia',
    anticipoEstado: 'pendiente',
  },
  {
    id: 'r3',
    negocioId: 'laparada',
    clienteNombre: 'Reserva Cancelada',
    clienteTelefono: '3000000000',
    fechaHoraReserva: '2026-11-17T19:30',
    personas: 2,
    estado: 'cancelada',
    origen: 'web',
    mesaId: 'm1',
    mesaNumero: 1,
    mesaNombre: 'Mesa 1',
    anticipoMonto: 40000,
    anticipoEstado: 'verificado',
  },
];

describe('reservasUtils', () => {
  it('parsea fechas locales e ISO de manera segura', () => {
    expect(parsearFechaHoraReservaMs('2026-11-17T19:00')).toBeTypeOf('number');
    expect(parsearFechaHoraReservaMs('2026-11-17 19:00')).toBeTypeOf('number');
    expect(parsearFechaHoraReservaMs('')).toBeNull();
    expect(parsearFechaHoraReservaMs('fecha-invalida')).toBeNull();
  });

  it('detecta conflictos de horario en una mesa dentro de la ventana de 120 minutos', () => {
    const conflicto = detectarConflictoHorarioMesa({
      mesaId: 'm2',
      mesaNumero: 2,
      fechaHoraReserva: '2026-11-17T20:00',
      reservas: reservasEjemplo,
    });
    expect(conflicto.hayConflicto).toBe(true);
    expect(conflicto.reservaConflicto?.id).toBe('r1');
    expect(conflicto.diferenciaMinutos).toBe(60);
    expect(conflicto.mensaje).toContain('Laura Méndez');

    const sinConflictoMismaMesa = detectarConflictoHorarioMesa({
      mesaId: 'm2',
      mesaNumero: 2,
      fechaHoraReserva: '2026-11-17T21:30',
      reservas: reservasEjemplo,
    });
    expect(sinConflictoMismaMesa.hayConflicto).toBe(false);

    const ignorandoCancelada = detectarConflictoHorarioMesa({
      mesaId: 'm1',
      mesaNumero: 1,
      fechaHoraReserva: '2026-11-17T19:30',
      reservas: reservasEjemplo,
    });
    expect(ignorandoCancelada.hayConflicto).toBe(false);
  });

  it('evalúa disponibilidad de mesas y recomienda la mesa óptima disponible', () => {
    const evalMesas = evaluarDisponibilidadMesasParaReserva({
      mesas: mesasEjemplo,
      reservas: reservasEjemplo,
      fechaHoraReserva: '2026-11-17T19:30',
      personas: 4,
    });

    const m1 = evalMesas.find((e) => e.mesa.id === 'm1');
    const m2 = evalMesas.find((e) => e.mesa.id === 'm2');
    const m3 = evalMesas.find((e) => e.mesa.id === 'm3');

    expect(m2?.disponibleEnHorario).toBe(false);
    expect(m3?.disponibleEnHorario).toBe(false);
    expect(m1?.disponibleEnHorario).toBe(true);
    expect(m1?.capacidadSuficiente).toBe(false);

    // A las 21:30 Mesa 2 vuelve a quedar disponible y debe ser la recomendada para 4 personas
    const evalDespues = evaluarDisponibilidadMesasParaReserva({
      mesas: mesasEjemplo,
      reservas: reservasEjemplo,
      fechaHoraReserva: '2026-11-17T21:30',
      personas: 4,
      zonaPreferida: 'Salón Principal',
    });
    const recomendada = evalDespues.find((e) => e.recomendada);
    expect(recomendada?.mesa.id).toBe('m2');
  });

  it('encuentra la reserva próxima asignada a una mesa dentro de la ventana de atención', () => {
    const ahoraMs = parsearFechaHoraReservaMs('2026-11-17T18:15')!;
    const proxima = obtenerReservaProximaDeMesa({
      mesa: mesasEjemplo[1],
      reservas: reservasEjemplo,
      ahoraMs,
    });
    expect(proxima?.id).toBe('r1');

    const muyTempranoMs = parsearFechaHoraReservaMs('2026-11-17T10:00')!;
    expect(
      obtenerReservaProximaDeMesa({
        mesa: mesasEjemplo[1],
        reservas: reservasEjemplo,
        ahoraMs: muyTempranoMs,
      })
    ).toBeNull();
  });

  it('calcula métricas del libro de reservas incluyendo anticipos offline y próximas 2 horas', () => {
    const ahoraMs = parsearFechaHoraReservaMs('2026-11-17T18:45')!;
    const metricas = calcularMetricasLibroReservas(reservasEjemplo, ahoraMs);

    expect(metricas.total).toBe(3);
    expect(metricas.hoy).toBe(3);
    expect(metricas.confirmadas).toBe(1);
    expect(metricas.pendientes).toBe(1);
    expect(metricas.canceladas).toBe(1);
    expect(metricas.personasHoy).toBe(10);
    expect(metricas.conMesaAsignada).toBe(2);
    expect(metricas.totalAnticiposVerificadosCOP).toBe(50000);
    expect(metricas.totalAnticiposPendientesCOP).toBe(30000);
    expect(metricas.proximas2Horas).toBe(2);
  });

  it('genera mensajes y URLs de WhatsApp con mesa, ocasión y anticipo offline', () => {
    expect(normalizarTelefonoReservaWhatsApp('3101112233')).toBe('573101112233');

    const msgConfirmacion = construirMensajeConfirmacionReservaWhatsApp({
      reserva: reservasEjemplo[0],
      negocioNombre: 'La Parada Grill',
    });
    expect(msgConfirmacion).toContain('CONFIRMADA');
    expect(msgConfirmacion).toContain('Mesa 2');
    expect(msgConfirmacion).toContain('Cumpleaños');
    expect(msgConfirmacion).toContain('Anticipo verificado');
    expect(msgConfirmacion).toContain('50.000');

    const msgRecordatorio = construirMensajeRecordatorioReservaWhatsApp({
      reserva: reservasEjemplo[1],
      negocioNombre: 'La Parada Grill',
    });
    expect(msgRecordatorio).toContain('Te recordamos tu reserva');
    expect(msgRecordatorio).toContain('Anticipo pendiente');

    const url = generarUrlWhatsAppReserva('3101112233', msgConfirmacion);
    expect(url.startsWith('https://wa.me/573101112233?text=')).toBe(true);

    expect(formatearOcasionReserva('cumpleanos')?.label).toBe('Cumpleaños');
    expect(formatearOcasionReserva('ninguna')).toBeNull();
  });

  it('exporta reservas a CSV con BOM UTF-8 y protección contra inyección de fórmulas', () => {
    const csv = generarReservasCsv([
      {
        ...reservasEjemplo[0],
        notas: '=HYPERLINK("http://malicioso","Click")',
      },
    ]);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Anticipo COP');
    expect(csv).toContain('"' + "'=HYPERLINK");
    expect(csv).toContain('NEQUI-8841');
  });
});
