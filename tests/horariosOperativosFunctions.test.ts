import { describe, it, expect } from 'vitest';
import {
  evaluarDisponibilidadNegocio,
  formatearResumenHorariosWhatsApp,
} from '../firebase-functions/src/utils/horariosOperativos';

function bogotaMs(year: number, month: number, day: number, hour: number, minute: number): number {
  return Date.UTC(year, month - 1, day, hour + 5, minute, 0, 0);
}

describe('horariosOperativos (Cloud Functions)', () => {
  it('bloquea pedidos cuando el negocio está cerrado manualmente o en pausa de cocina', () => {
    const ahora = bogotaMs(2026, 11, 19, 19, 0);
    const baseDias = {
      lunes: { activo: true, apertura: '16:00', cierre: '23:30' },
      martes: { activo: true, apertura: '16:00', cierre: '23:30' },
      miercoles: { activo: true, apertura: '16:00', cierre: '23:30' },
      jueves: { activo: true, apertura: '16:00', cierre: '23:30' },
      viernes: { activo: true, apertura: '16:00', cierre: '23:30' },
      sabado: { activo: true, apertura: '16:00', cierre: '23:30' },
      domingo: { activo: true, apertura: '16:00', cierre: '23:30' },
    };

    const cerrado = evaluarDisponibilidadNegocio(
      {
        dias: baseDias,
        estadoManual: 'cerrado_manual',
        motivoCierreOPausa: 'Cerrado por mantenimiento',
      },
      ahora
    );
    expect(cerrado.disponible).toBe(false);
    expect(cerrado.motivo).toBe('Cerrado por mantenimiento');

    const pausa = evaluarDisponibilidadNegocio(
      {
        dias: baseDias,
        estadoManual: 'pausa_cocina',
        pausaHastaMs: ahora + 15 * 60_000,
      },
      ahora
    );
    expect(pausa.disponible).toBe(false);
    expect(pausa.estado).toBe('pausa_cocina');
    expect(pausa.minutosRestantesPausa).toBe(15);

    const resumen = formatearResumenHorariosWhatsApp({
      dias: baseDias,
      estadoManual: 'automatico',
    });
    expect(resumen).toContain('Jueves: 4:00 p. m. – 11:30 p. m.');
  });
});
