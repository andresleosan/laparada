import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import * as personalService from '@/services/personalService';

vi.mock('@/services/firebase', () => ({
  db: {},
}));

describe('usePersonal & personalService integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('ejecuta crearEmpleadoPersonal con aislamiento por negocioId', async () => {
    const spy = vi
      .spyOn(personalService, 'crearEmpleadoPersonal')
      .mockResolvedValue('emp-nuevo-1');

    const result = await personalService.crearEmpleadoPersonal({
      negocioId: 'laparada',
      nombre: 'Laura Gómez',
      telefono: '3109998877',
      cargo: 'cajero',
      modalidadPago: 'semanal',
      tarifaTurno: 55000,
      participaPropinas: true,
      activo: true,
    });

    expect(result).toBe('emp-nuevo-1');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        negocioId: 'laparada',
        nombre: 'Laura Gómez',
        cargo: 'cajero',
        tarifaTurno: 55000,
      })
    );
  });

  it('ejecuta registrarTurnoPersonal y registrarValePersonal con parámetros tipados', async () => {
    const spyTurno = vi
      .spyOn(personalService, 'registrarTurnoPersonal')
      .mockResolvedValue('turno-101');
    const spyVale = vi
      .spyOn(personalService, 'registrarValePersonal')
      .mockResolvedValue('vale-202');

    const now = Timestamp.now();

    const turnoId = await personalService.registrarTurnoPersonal('laparada', {
      empleadoId: 'emp-1',
      empleadoNombre: 'Laura Gómez',
      cargo: 'cajero',
      fecha: now,
      horaEntrada: '16:00',
      horaSalida: '23:00',
      tipoTurno: 'nocturno',
      valorTurno: 55000,
      bonoTurno: 5000,
    });

    const valeId = await personalService.registrarValePersonal('laparada', {
      empleadoId: 'emp-1',
      empleadoNombre: 'Laura Gómez',
      fecha: now,
      monto: 20000,
      motivo: 'adelanto_sueldo',
      metodoEntrega: 'efectivo',
      crearGastoCaja: true,
    });

    expect(turnoId).toBe('turno-101');
    expect(valeId).toBe('vale-202');
    expect(spyTurno).toHaveBeenCalled();
    expect(spyVale).toHaveBeenCalled();
  });

  it('ejecuta registrarLiquidacionNomina marcando turnos y vales del periodo', async () => {
    const mockLiq = {
      id: 'liq-900',
      negocioId: 'laparada',
      empleadoId: 'emp-1',
      empleadoNombre: 'Laura Gómez',
      cargo: 'cajero' as const,
      fechaLiquidacion: Timestamp.now(),
      periodoDesde: '2026-11-01',
      periodoHasta: '2026-11-07',
      cantidadTurnos: 2,
      turnosIds: ['t-1', 't-2'],
      valesIds: ['v-1'],
      totalTurnosValor: 110000,
      totalBonos: 5000,
      totalPropinas: 15000,
      totalValesDescontados: 20000,
      netoPagado: 110000,
      metodoPago: 'efectivo' as const,
      creadoEn: Timestamp.now(),
    };

    const spyLiq = vi
      .spyOn(personalService, 'registrarLiquidacionNomina')
      .mockResolvedValue(mockLiq);

    const res = await personalService.registrarLiquidacionNomina('laparada', {
      empleadoId: 'emp-1',
      empleadoNombre: 'Laura Gómez',
      cargo: 'cajero',
      periodoDesde: '2026-11-01',
      periodoHasta: '2026-11-07',
      turnosIds: ['t-1', 't-2'],
      valesIds: ['v-1'],
      totalTurnosValor: 110000,
      totalBonos: 5000,
      totalPropinas: 15000,
      totalValesDescontados: 20000,
      netoPagado: 110000,
      metodoPago: 'efectivo',
      registrarGastoSalarios: true,
    });

    expect(res.id).toBe('liq-900');
    expect(res.netoPagado).toBe(110000);
    expect(spyLiq).toHaveBeenCalled();
  });
});
