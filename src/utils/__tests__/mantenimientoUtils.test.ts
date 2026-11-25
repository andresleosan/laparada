import { describe, expect, it } from 'vitest';
import type { Timestamp } from 'firebase/firestore';
import type {
  EquipoActivoMantenimiento,
  OrdenMantenimiento,
  ReporteFallaEquipo,
} from '@/types/mantenimiento';
import {
  calcularProximaFechaMantenimiento,
  calcularResumenMantenimiento,
  construirAlertasMantenimiento,
  EQUIPOS_MANTENIMIENTO_PLANTILLA_DEFAULT,
  evaluarEquiposMantenimiento,
  evaluarSemaforoMantenimiento,
  filtrarEquiposMantenimiento,
  generarCodigoActivo,
  generarCsvMantenimiento,
  generarResumenMantenimientoWhatsApp,
  obtenerFechaVencimientoCriticaEquipo,
  sanitizarCostoMantenimiento,
  sanitizarFrecuenciaDias,
} from '../mantenimientoUtils';

const tsStub = { seconds: 1732400000, nanoseconds: 0 } as Timestamp;

function buildEquipo(
  overrides: Partial<EquipoActivoMantenimiento> = {}
): EquipoActivoMantenimiento {
  return {
    id: 'eq-1',
    negocioId: 'laparada',
    codigoActivo: 'COC-001',
    nombre: 'Freidora Industrial #1',
    categoria: 'coccion',
    ubicacion: 'Cocina',
    estadoOperativo: 'operativo',
    frecuenciaPreventivoDias: 90,
    proximoMantenimientoIso: '2026-12-20',
    costoAcumuladoCOP: 180000,
    totalIntervenciones: 2,
    activo: true,
    creadoEn: tsStub,
    actualizadoEn: tsStub,
    ...overrides,
  };
}

describe('mantenimientoUtils', () => {
  it('sanitiza costos, frecuencias y genera códigos de activo consistentes', () => {
    expect(sanitizarCostoMantenimiento(-500)).toBe(0);
    expect(sanitizarCostoMantenimiento(Number.NaN)).toBe(0);
    expect(sanitizarCostoMantenimiento(125400.6)).toBe(125401);

    expect(sanitizarFrecuenciaDias(0)).toBe(90);
    expect(sanitizarFrecuenciaDias(5000)).toBe(3650);
    expect(sanitizarFrecuenciaDias(30)).toBe(30);

    expect(generarCodigoActivo('extintor', 0)).toBe('SEG-001');
    expect(generarCodigoActivo('red_gas', 4)).toBe('GAS-005');
    expect(EQUIPOS_MANTENIMIENTO_PLANTILLA_DEFAULT).toHaveLength(6);
  });

  it('prioriza la fecha crítica más próxima entre preventivo, recarga y prueba hidrostática', () => {
    const extintor = buildEquipo({
      id: 'ext-1',
      codigoActivo: 'SEG-001',
      nombre: 'Extintor Tipo K 6L',
      categoria: 'extintor',
      proximoMantenimientoIso: '2027-03-01',
      fechaRecargaVenceIso: '2026-11-28',
      fechaPruebaHidrostaticaIso: '2028-05-01',
    });

    const critica = obtenerFechaVencimientoCriticaEquipo(extintor);
    expect(critica).toEqual({
      fechaIso: '2026-11-28',
      motivo: 'Recarga anual de extintor',
    });

    const redGas = buildEquipo({
      id: 'gas-1',
      categoria: 'red_gas',
      proximoMantenimientoIso: '2027-01-15',
      certificadoGasVenceIso: '2026-11-20',
    });
    expect(obtenerFechaVencimientoCriticaEquipo(redGas)).toEqual({
      fechaIso: '2026-11-20',
      motivo: 'Certificado / revisión red de gas',
    });
  });

  it('evalúa semáforos, ordena urgentes primero y calcula resumen mensual y global', () => {
    expect(evaluarSemaforoMantenimiento(null)).toBe('sin_programar');
    expect(evaluarSemaforoMantenimiento(-2)).toBe('vencido');
    expect(evaluarSemaforoMantenimiento(5)).toBe('proximo_7d');
    expect(evaluarSemaforoMantenimiento(20)).toBe('proximo_30d');
    expect(evaluarSemaforoMantenimiento(45)).toBe('al_dia');

    const equipos: EquipoActivoMantenimiento[] = [
      buildEquipo({
        id: 'eq-ok',
        nombre: 'Nevera Vertical',
        categoria: 'refrigeracion',
        proximoMantenimientoIso: '2027-02-01',
      }),
      buildEquipo({
        id: 'eq-vencido',
        codigoActivo: 'SEG-001',
        nombre: 'Extintor Tipo K',
        categoria: 'extintor',
        fechaRecargaVenceIso: '2026-11-20',
        proximoMantenimientoIso: '2026-11-20',
      }),
      buildEquipo({
        id: 'eq-falla',
        codigoActivo: 'COC-002',
        nombre: 'Plancha Principal',
        estadoOperativo: 'fuera_servicio',
        proximoMantenimientoIso: '2026-11-30',
      }),
    ];

    const fallas: ReporteFallaEquipo[] = [
      {
        id: 'fal-1',
        negocioId: 'laparada',
        equipoId: 'eq-falla',
        equipoNombre: 'Plancha Principal',
        categoriaEquipo: 'coccion',
        estacionCocina: 'plancha',
        severidad: 'critica',
        detieneOperacion: true,
        descripcion: 'Fuga en válvula de gas de quemador izquierdo',
        estado: 'abierta',
        origenReporte: 'cocina_kds',
        reportadoPor: 'Cocinero Turno',
        fechaIso: '2026-11-24',
        creadoEn: tsStub,
        actualizadoEn: tsStub,
      },
    ];

    const evaluados = evaluarEquiposMantenimiento(equipos, fallas, '2026-11-24');
    expect(evaluados.map((e) => e.equipo.id)).toEqual([
      'eq-falla',
      'eq-vencido',
      'eq-ok',
    ]);
    expect(evaluados[0].fallasAbiertasCount).toBe(1);
    expect(evaluados[1].semaforo).toBe('vencido');

    const ordenes: OrdenMantenimiento[] = [
      {
        id: 'ord-1',
        negocioId: 'laparada',
        equipoId: 'eq-ok',
        equipoNombre: 'Nevera Vertical',
        categoriaEquipo: 'refrigeracion',
        tipo: 'preventivo',
        descripcionTrabajo: 'Limpieza condensador',
        fechaIso: '2026-11-10',
        fecha: tsStub,
        tecnicoNombre: 'Frío Express',
        costoCOP: 120000,
        conciliadoConGasto: true,
        gastoId: 'gasto-1',
        estadoEquipoResultante: 'operativo',
        responsableNombre: 'Admin',
        creadoEn: tsStub,
      },
      {
        id: 'ord-2',
        negocioId: 'laparada',
        equipoId: 'eq-ok',
        equipoNombre: 'Nevera Vertical',
        categoriaEquipo: 'refrigeracion',
        tipo: 'correctivo',
        descripcionTrabajo: 'Cambio empaque',
        fechaIso: '2026-10-05',
        fecha: tsStub,
        tecnicoNombre: 'Frío Express',
        costoCOP: 80000,
        conciliadoConGasto: false,
        estadoEquipoResultante: 'operativo',
        responsableNombre: 'Admin',
        creadoEn: tsStub,
      },
    ];

    const resumen = calcularResumenMantenimiento(
      evaluados,
      ordenes,
      fallas,
      '2026-11-24'
    );
    expect(resumen.totalActivos).toBe(3);
    expect(resumen.vencidosCount).toBe(1);
    expect(resumen.extintoresYGasAlertaCount).toBe(1);
    expect(resumen.fallasAbiertasCount).toBe(1);
    expect(resumen.fallasCriticasCount).toBe(1);
    expect(resumen.gastoMantenimientoMesCOP).toBe(120000);
    expect(resumen.gastoMantenimientoTotalCOP).toBe(200000);
    expect(resumen.ordenesConciliadasCount).toBe(1);
    expect(resumen.estadoGlobal).toBe('critico');

    const filtradosSeguridad = filtrarEquiposMantenimiento(evaluados, {
      busqueda: '',
      categoria: 'todas',
      semaforo: 'todos',
      estadoOperativo: 'todos',
      soloSeguridad: true,
    });
    expect(filtradosSeguridad).toHaveLength(1);
    expect(filtradosSeguridad[0].equipo.id).toBe('eq-vencido');

    const alertas = construirAlertasMantenimiento(evaluados, fallas);
    expect(alertas.length).toBeGreaterThanOrEqual(2);
    expect(alertas.some((a) => a.tipo === 'falla_equipo_kds')).toBe(true);
    expect(alertas.some((a) => a.tipo === 'mantenimiento_vencido')).toBe(true);
  });

  it('genera CSV seguro contra inyección de fórmulas y resumen WhatsApp codificado', () => {
    const equipoPeligroso = buildEquipo({
      nombre: '=CMD("calc") Freidora',
      ubicacion: 'Cocina',
      notas: '+1234',
    });
    const evaluados = evaluarEquiposMantenimiento([equipoPeligroso], [], '2026-11-24');
    const resumen = calcularResumenMantenimiento(evaluados, [], [], '2026-11-24');

    const csv = generarCsvMantenimiento(evaluados, [], [], 'La Parada');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain("'=CMD");
    expect(csv).toContain("'+1234");

    const wa = decodeURIComponent(
      generarResumenMantenimientoWhatsApp('La Parada', resumen, evaluados, [])
    );
    expect(wa).toContain('MANTENIMIENTO PREVENTIVO & SEGURIDAD');
    expect(wa).toContain('LA PARADA');

    expect(calcularProximaFechaMantenimiento('2026-11-24', 90)).toBe('2027-02-22');
  });
});
