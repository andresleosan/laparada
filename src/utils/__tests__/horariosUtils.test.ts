import { describe, it, expect } from 'vitest';
import {
  crearConfigHorariosDefault,
  evaluarDisponibilidadNegocio,
  formatearHora12h,
  formatearResumenHorariosWhatsApp,
  sanitizarConfigHorarios,
  validarHorarioDia,
} from '../horariosUtils';

// Helper: crea epoch ms para una fecha/hora en Colombia (UTC-5)
function bogotaMs(year: number, month: number, day: number, hour: number, minute: number): number {
  return Date.UTC(year, month - 1, day, hour + 5, minute, 0, 0);
}

describe('horariosUtils', () => {
  it('retorna disponible cuando no hay configuración de horarios (retrocompatibilidad)', () => {
    const res = evaluarDisponibilidadNegocio(undefined, bogotaMs(2026, 11, 19, 10, 0));
    expect(res.disponible).toBe(true);
    expect(res.estado).toBe('abierto');
    expect(res.fuente).toBe('sin_restriccion');
  });

  it('evalúa correctamente horario diurno/nocturno dentro y fuera de franja en America/Bogota', () => {
    const config = crearConfigHorariosDefault(); // L-D 16:00 a 23:30

    // Jueves 19 nov 2026 a las 15:59 -> cerrado, abre hoy a las 4:00 p. m.
    const antes = evaluarDisponibilidadNegocio(config, bogotaMs(2026, 11, 19, 15, 59));
    expect(antes.disponible).toBe(false);
    expect(antes.estado).toBe('cerrado');
    expect(antes.proximaAperturaTexto).toBe('Hoy a las 4:00 p. m.');

    // Jueves 19 nov 2026 a las 18:30 -> abierto
    const dentro = evaluarDisponibilidadNegocio(config, bogotaMs(2026, 11, 19, 18, 30));
    expect(dentro.disponible).toBe(true);
    expect(dentro.estado).toBe('abierto');
    expect(dentro.fuente).toBe('horario');

    // Jueves 19 nov 2026 a las 23:35 -> cerrado, abre mañana viernes
    const despues = evaluarDisponibilidadNegocio(config, bogotaMs(2026, 11, 19, 23, 35));
    expect(despues.disponible).toBe(false);
    expect(despues.estado).toBe('cerrado');
    expect(despues.proximaAperturaTexto).toContain('Mañana (Viernes)');
  });

  it('soporta turnos nocturnos que cruzan la medianoche (trasnoche)', () => {
    const config = crearConfigHorariosDefault();
    config.dias.viernes = { activo: true, apertura: '17:00', cierre: '02:00' };
    config.dias.sabado = { activo: false, apertura: '17:00', cierre: '23:00' };

    // Sábado 21 nov 2026 a la 01:15 AM -> sigue dentro del turno del viernes!
    const madrugada = evaluarDisponibilidadNegocio(config, bogotaMs(2026, 11, 21, 1, 15));
    expect(madrugada.disponible).toBe(true);
    expect(madrugada.estado).toBe('abierto');

    // Sábado 21 nov 2026 a las 02:05 AM -> ya cerró el turno del viernes y sábado está inactivo
    const cerradoMadrugada = evaluarDisponibilidadNegocio(config, bogotaMs(2026, 11, 21, 2, 5));
    expect(cerradoMadrugada.disponible).toBe(false);
    expect(cerradoMadrugada.estado).toBe('cerrado');
  });

  it('respeta los modos manuales abierto_forzado, cerrado_manual y pausa_cocina con expiración', () => {
    const config = crearConfigHorariosDefault();
    const ahora = bogotaMs(2026, 11, 19, 10, 0); // 10 AM (fuera de horario)

    config.estadoManual = 'abierto_forzado';
    expect(evaluarDisponibilidadNegocio(config, ahora)).toMatchObject({
      disponible: true,
      estado: 'abierto',
      fuente: 'abierto_forzado',
    });

    config.estadoManual = 'cerrado_manual';
    config.motivoCierreOPausa = 'Cerrado por inventario general';
    const cerrado = evaluarDisponibilidadNegocio(config, bogotaMs(2026, 11, 19, 19, 0));
    expect(cerrado.disponible).toBe(false);
    expect(cerrado.estado).toBe('cerrado');
    expect(cerrado.motivo).toBe('Cerrado por inventario general');

    // Pausa de cocina activa por 20 minutos durante horario de atención
    const enHorario = bogotaMs(2026, 11, 19, 19, 0);
    config.estadoManual = 'pausa_cocina';
    config.motivoCierreOPausa = '';
    config.pausaHastaMs = enHorario + 20 * 60_000;
    const enPausa = evaluarDisponibilidadNegocio(config, enHorario);
    expect(enPausa.disponible).toBe(false);
    expect(enPausa.estado).toBe('pausa_cocina');
    expect(enPausa.minutosRestantesPausa).toBe(20);

    // Una vez expirada la pausa, vuelve a evaluar el horario normal (abierto a las 19:25)
    const despuesPausa = evaluarDisponibilidadNegocio(config, enHorario + 25 * 60_000);
    expect(despuesPausa.disponible).toBe(true);
    expect(despuesPausa.estado).toBe('abierto');
  });

  it('valida horarios y formatea correctamente para WhatsApp y 12h', () => {
    expect(validarHorarioDia('16:00', '23:30')).toBeNull();
    expect(validarHorarioDia('16:00', '16:00')).toBeTruthy();
    expect(validarHorarioDia('25:00', '23:30')).toBeTruthy();
    expect(formatearHora12h('16:00')).toBe('4:00 p. m.');
    expect(formatearHora12h('00:30')).toBe('12:30 a. m.');

    const config = crearConfigHorariosDefault();
    config.dias.domingo.activo = false;
    const resumen = formatearResumenHorariosWhatsApp(config);
    expect(resumen).toContain('Lunes: 4:00 p. m. – 11:30 p. m.');
    expect(resumen).toContain('Domingo: Cerrado');
    expect(sanitizarConfigHorarios(null)).toBeNull();
  });
});
