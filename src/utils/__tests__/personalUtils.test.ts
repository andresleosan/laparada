import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  calcularHorasTrabajadas,
  calcularTotalDevengadoTurno,
  calcularPreLiquidacionEmpleado,
  distribuirPropinasEquipo,
  calcularPropinasRecaudadasVentas,
  calcularMetricasPersonal,
  generarMensajeWhatsAppLiquidacion,
  generarPersonalNominaCsv,
} from '../personalUtils';
import type {
  EmpleadoPersonal,
  TurnoPersonal,
  ValePersonal,
  LiquidacionNomina,
} from '@/types/personal';
import type { Venta } from '@/types';

const mockNow = Timestamp.fromDate(new Date('2026-11-07T20:00:00Z'));

function makeEmpleado(overrides: Partial<EmpleadoPersonal> = {}): EmpleadoPersonal {
  return {
    id: 'emp-1',
    negocioId: 'laparada',
    nombre: 'Carlos Mendoza',
    documento: '1090123456',
    telefono: '3001112233',
    cargo: 'cocinero',
    modalidadPago: 'semanal',
    tarifaTurno: 65000,
    participaPropinas: true,
    activo: true,
    creadoEn: mockNow,
    actualizadoEn: mockNow,
    ...overrides,
  };
}

function makeTurno(overrides: Partial<TurnoPersonal> = {}): TurnoPersonal {
  return {
    id: 'turno-1',
    negocioId: 'laparada',
    empleadoId: 'emp-1',
    empleadoNombre: 'Carlos Mendoza',
    cargo: 'cocinero',
    fecha: mockNow,
    horaEntrada: '17:00',
    horaSalida: '23:30',
    horasTrabajadas: 6.5,
    tipoTurno: 'nocturno',
    valorTurno: 65000,
    bonoTurno: 5000,
    totalDevengado: 70000,
    estado: 'completado',
    creadoEn: mockNow,
    actualizadoEn: mockNow,
    ...overrides,
  };
}

function makeVale(overrides: Partial<ValePersonal> = {}): ValePersonal {
  return {
    id: 'vale-1',
    negocioId: 'laparada',
    empleadoId: 'emp-1',
    empleadoNombre: 'Carlos Mendoza',
    fecha: mockNow,
    monto: 20000,
    motivo: 'adelanto_sueldo',
    metodoEntrega: 'efectivo',
    estado: 'pendiente_descuento',
    creadoEn: mockNow,
    actualizadoEn: mockNow,
    ...overrides,
  };
}

describe('personalUtils', () => {
  describe('calcularHorasTrabajadas', () => {
    it('calcula horas dentro del mismo día correctamente', () => {
      expect(calcularHorasTrabajadas('08:00', '16:30')).toBe(8.5);
      expect(calcularHorasTrabajadas('17:00', '23:00')).toBe(6);
    });

    it('soporta turnos nocturnos que cruzan la medianoche', () => {
      expect(calcularHorasTrabajadas('18:00', '01:30')).toBe(7.5);
      expect(calcularHorasTrabajadas('20:00', '02:00')).toBe(6);
    });

    it('retorna 0 ante formatos inválidos o entradas vacías', () => {
      expect(calcularHorasTrabajadas('', '22:00')).toBe(0);
      expect(calcularHorasTrabajadas('17:00', '')).toBe(0);
      expect(calcularHorasTrabajadas('25:00', '26:00')).toBe(0);
      expect(calcularHorasTrabajadas('invalido', '22:00')).toBe(0);
    });
  });

  describe('calcularTotalDevengadoTurno', () => {
    it('suma tarifa base y bono evitando valores negativos', () => {
      expect(calcularTotalDevengadoTurno(65000, 10000)).toBe(75000);
      expect(calcularTotalDevengadoTurno(-50000, 10000)).toBe(10000);
      expect(calcularTotalDevengadoTurno(50000, -5000)).toBe(50000);
    });
  });

  describe('calcularPreLiquidacionEmpleado', () => {
    it('consolida turnos completados, propina y descuenta vales pendientes sin caer en negativo', () => {
      const emp = makeEmpleado();
      const turnos: TurnoPersonal[] = [
        makeTurno({ id: 't1', valorTurno: 65000, bonoTurno: 5000, horasTrabajadas: 7, estado: 'completado' }),
        makeTurno({ id: 't2', valorTurno: 65000, bonoTurno: 0, horasTrabajadas: 6.5, estado: 'completado' }),
        makeTurno({ id: 't3', valorTurno: 65000, bonoTurno: 0, estado: 'liquidado' }), // Ya pagado
        makeTurno({ id: 't4', valorTurno: 65000, bonoTurno: 0, estado: 'anulado' }), // Anulado
      ];
      const vales: ValePersonal[] = [
        makeVale({ id: 'v1', monto: 25000, estado: 'pendiente_descuento' }),
        makeVale({ id: 'v2', monto: 15000, estado: 'descontado' }), // Ya descontado
      ];

      const res = calcularPreLiquidacionEmpleado(emp, turnos, vales, 12000);

      expect(res.cantidadTurnos).toBe(2);
      expect(res.horasAcumuladas).toBe(13.5);
      expect(res.subtotalTurnos).toBe(130000);
      expect(res.subtotalBonos).toBe(5000);
      expect(res.totalDevengadoTurnos).toBe(135000);
      expect(res.totalValesPendientes).toBe(25000);
      expect(res.propinaSugerida).toBe(12000);
      // 135.000 + 12.000 - 25.000 = 122.000
      expect(res.netoAPagar).toBe(122000);
    });

    it('protege el netoAPagar con piso 0 si los vales superan lo devengado', () => {
      const emp = makeEmpleado();
      const turnos = [makeTurno({ valorTurno: 50000, bonoTurno: 0 })];
      const vales = [makeVale({ monto: 90000 })];

      const res = calcularPreLiquidacionEmpleado(emp, turnos, vales, 0);
      expect(res.netoAPagar).toBe(0);
    });
  });

  describe('distribuirPropinasEquipo', () => {
    const emp1 = makeEmpleado({ id: 'e1', nombre: 'Cocinero 1', participaPropinas: true, activo: true });
    const emp2 = makeEmpleado({ id: 'e2', nombre: 'Mesero 1', cargo: 'mesero', participaPropinas: true, activo: true });
    const emp3 = makeEmpleado({ id: 'e3', nombre: 'Admin No Propina', cargo: 'administrador', participaPropinas: false, activo: true });
    const empInactivo = makeEmpleado({ id: 'e4', nombre: 'Ex Empleado', participaPropinas: true, activo: false });

    const turnos: TurnoPersonal[] = [
      makeTurno({ id: 't1', empleadoId: 'e1', horasTrabajadas: 8, estado: 'completado' }),
      makeTurno({ id: 't2', empleadoId: 'e1', horasTrabajadas: 8, estado: 'completado' }),
      makeTurno({ id: 't3', empleadoId: 'e1', horasTrabajadas: 8, estado: 'completado' }),
      makeTurno({ id: 't4', empleadoId: 'e2', horasTrabajadas: 6, estado: 'completado' }),
    ];

    it('reparte en partes iguales solo entre empleados activos que participan en propinas', () => {
      const res = distribuirPropinasEquipo(100000, [emp1, emp2, emp3, empInactivo], turnos, 'partes_iguales');
      expect(res).toHaveLength(2);
      expect(res[0].montoPropina).toBe(50000);
      expect(res[1].montoPropina).toBe(50000);
      expect(res[0].porcentajeParticipacion).toBe(50);
    });

    it('reparte proporcionalmente a la cantidad de turnos trabajados', () => {
      // emp1 tiene 3 turnos (75%), emp2 tiene 1 turno (25%)
      const res = distribuirPropinasEquipo(100000, [emp1, emp2], turnos, 'proporcional_turnos');
      expect(res).toHaveLength(2);
      expect(res[0].montoPropina).toBe(75000);
      expect(res[0].porcentajeParticipacion).toBe(75);
      expect(res[1].montoPropina).toBe(25000);
      expect(res[1].porcentajeParticipacion).toBe(25);
    });

    it('retorna arreglo vacío si no hay participantes elegibles', () => {
      expect(distribuirPropinasEquipo(50000, [emp3, empInactivo], turnos)).toEqual([]);
    });
  });

  describe('calcularPropinasRecaudadasVentas', () => {
    it('suma únicamente propinas de ventas válidas y excluye anuladas', () => {
      const ventas: Venta[] = [
        {
          id: 'v1',
          negocioId: 'laparada',
          items: [],
          propina: 8000,
          total: 88000,
          metodoPago: 'efectivo',
          origen: 'pos',
          fecha: mockNow,
          estado: 'completada',
        },
        {
          id: 'v2',
          negocioId: 'laparada',
          items: [],
          propina: 12000,
          total: 132000,
          metodoPago: 'transferencia',
          origen: 'pos',
          fecha: mockNow,
          estado: 'completada',
        },
        {
          id: 'v3',
          negocioId: 'laparada',
          items: [],
          propina: 15000,
          total: 165000,
          metodoPago: 'efectivo',
          origen: 'pos',
          fecha: mockNow,
          estado: 'anulada',
        },
      ];

      expect(calcularPropinasRecaudadasVentas(ventas)).toBe(20000);
    });
  });

  describe('calcularMetricasPersonal', () => {
    it('calcula correctamente los KPIs ejecutivos del módulo', () => {
      const empleados = [
        makeEmpleado({ id: 'e1', activo: true }),
        makeEmpleado({ id: 'e2', activo: true }),
        makeEmpleado({ id: 'e3', activo: false }),
      ];
      const turnos = [
        makeTurno({ id: 't1', estado: 'en_curso', totalDevengado: 50000 }),
        makeTurno({ id: 't2', estado: 'completado', totalDevengado: 70000 }),
        makeTurno({ id: 't3', estado: 'completado', totalDevengado: 65000 }),
      ];
      const vales = [
        makeVale({ id: 'val1', monto: 25000, estado: 'pendiente_descuento' }),
      ];
      const liquidaciones: LiquidacionNomina[] = [
        {
          id: 'liq-1',
          negocioId: 'laparada',
          empleadoId: 'e1',
          empleadoNombre: 'Carlos Mendoza',
          cargo: 'cocinero',
          fechaLiquidacion: Timestamp.fromDate(new Date('2026-11-05T15:00:00Z')),
          periodoDesde: '2026-11-01',
          periodoHasta: '2026-11-05',
          cantidadTurnos: 4,
          turnosIds: [],
          valesIds: [],
          totalTurnosValor: 260000,
          totalBonos: 0,
          totalPropinas: 20000,
          totalValesDescontados: 30000,
          netoPagado: 250000,
          metodoPago: 'efectivo',
          creadoEn: mockNow,
        },
      ];

      const metricas = calcularMetricasPersonal(
        empleados,
        turnos,
        vales,
        liquidaciones,
        35000,
        new Date('2026-11-07T20:00:00Z')
      );

      expect(metricas.empleadosActivos).toBe(2);
      expect(metricas.turnosEnCurso).toBe(1);
      expect(metricas.turnosPendientesLiquidar).toBe(2);
      expect(metricas.totalDevengadoPendiente).toBe(135000);
      expect(metricas.totalValesPendientes).toBe(25000);
      expect(metricas.netoPendientePorPagar).toBe(110000);
      expect(metricas.totalPagadoNominaMes).toBe(250000);
      expect(metricas.propinasRecaudadasPeriodo).toBe(35000);
    });
  });

  describe('generarMensajeWhatsAppLiquidacion y generarPersonalNominaCsv', () => {
    it('genera mensaje de WhatsApp con formato COP oficial y datos de liquidación', () => {
      const liq: LiquidacionNomina = {
        id: 'liq-1',
        negocioId: 'laparada',
        empleadoId: 'e1',
        empleadoNombre: 'Carlos Mendoza',
        cargo: 'cocinero',
        fechaLiquidacion: mockNow,
        periodoDesde: '2026-11-01',
        periodoHasta: '2026-11-07',
        cantidadTurnos: 5,
        turnosIds: ['t1', 't2'],
        valesIds: ['v1'],
        totalTurnosValor: 325000,
        totalBonos: 15000,
        totalPropinas: 20000,
        totalValesDescontados: 40000,
        netoPagado: 320000,
        metodoPago: 'transferencia',
        referenciaPago: 'NEQUI-9988',
        creadoEn: mockNow,
      };

      const msg = generarMensajeWhatsAppLiquidacion(liq, 'La Parada');
      expect(msg).toContain('Carlos Mendoza');
      expect(msg).toContain('Cocinero Principal');
      expect(msg).toContain('NEQUI-9988');
      expect(msg).toContain('320.000');
    });

    it('genera CSV con UTF-8 BOM y columnas separadas por punto y coma', () => {
      const emp = makeEmpleado();
      const turnos = [makeTurno()];
      const vales = [makeVale()];
      const csv = generarPersonalNominaCsv([emp], turnos, vales, []);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Colaborador;Documento;Teléfono;Cargo');
      expect(csv).toContain('"Carlos Mendoza"');
      expect(csv).toContain('70000;20000;50000');
    });
  });
});
