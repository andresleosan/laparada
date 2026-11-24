import { describe, expect, it } from 'vitest';
import type {
  ChecklistTurnoBpm,
  RegistroAceiteBpm,
  RegistroTemperaturaBpm,
} from '@/types/bpm';
import {
  calcularDiasEntreFechasIso,
  calcularMetricasChecklist,
  calcularResumenCumplimientoBpm,
  construirAlertasBpm,
  crearConfiguracionBpmDefault,
  crearItemsDesdePlantilla,
  evaluarConformidadTemperatura,
  evaluarEquiposFrioHoy,
  evaluarEstadoAceite,
  evaluarFreidorasEstado,
  filtrarRegistrosBpm,
  generarCsvCarpetaSanitariaBpm,
  generarResumenBpmWhatsApp,
  PLANTILLA_CHECKLIST_APERTURA_DEFAULT,
  PLANTILLA_CHECKLIST_CIERRE_DEFAULT,
  sugerirFranjaBpm,
  validarTemperaturaFisica,
} from '../bpmUtils';

function makeTemp(
  partial: Partial<RegistroTemperaturaBpm> & {
    id: string;
    equipoId: string;
    temperaturaC: number;
    fechaIso: string;
  }
): RegistroTemperaturaBpm {
  return {
    negocioId: 'laparada',
    equipoNombre: 'Nevera Principal',
    tipoEquipo: 'refrigeracion',
    franja: 'apertura',
    horaTexto: '08:00',
    tempMinOptimaC: 0,
    tempMaxOptimaC: 4,
    estadoConformidad: 'conforme',
    responsableNombre: 'Andrés',
    fecha: new Date(`${partial.fechaIso}T13:00:00Z`),
    creadoEn: new Date(`${partial.fechaIso}T13:00:00Z`),
    ...partial,
  };
}

function makeAceite(
  partial: Partial<RegistroAceiteBpm> & {
    id: string;
    freidoraId: string;
    fechaIso: string;
  }
): RegistroAceiteBpm {
  return {
    negocioId: 'laparada',
    freidoraNombre: 'Freidora #1',
    tipoEvento: 'inspeccion_calidad',
    colorAceite: 'dorado_aceptable',
    espumaExcesiva: false,
    olorRancio: false,
    humoBajoPunto: false,
    estadoAceite: 'optimo',
    horaTexto: '09:00',
    responsableNombre: 'Andrés',
    fecha: new Date(`${partial.fechaIso}T14:00:00Z`),
    creadoEn: new Date(`${partial.fechaIso}T14:00:00Z`),
    ...partial,
  };
}

describe('bpmUtils', () => {
  it('valida rango físico térmico y redondea a 1 decimal', () => {
    expect(validarTemperaturaFisica(-18.46)).toBe(-18.5);
    expect(validarTemperaturaFisica(3.24)).toBe(3.2);
    expect(() => validarTemperaturaFisica(Number.NaN)).toThrow();
    expect(() => validarTemperaturaFisica(-75)).toThrow();
    expect(() => validarTemperaturaFisica(300)).toThrow();
  });

  it('evalúa conformidad térmica INVIMA para refrigeración, congelación y caliente', () => {
    // Refrigeración (0..4 óptima, ±2 alerta)
    expect(evaluarConformidadTemperatura(2.5, 'refrigeracion')).toBe('conforme');
    expect(evaluarConformidadTemperatura(0, 'refrigeracion')).toBe('conforme');
    expect(evaluarConformidadTemperatura(4, 'refrigeracion')).toBe('conforme');
    expect(evaluarConformidadTemperatura(5.5, 'refrigeracion')).toBe('alerta');
    expect(evaluarConformidadTemperatura(-1.5, 'refrigeracion')).toBe('alerta');
    expect(evaluarConformidadTemperatura(7.2, 'refrigeracion')).toBe('critico');

    // Congelación (-25..-18 óptima, ±3 alerta)
    expect(evaluarConformidadTemperatura(-20, 'congelacion')).toBe('conforme');
    expect(evaluarConformidadTemperatura(-16, 'congelacion')).toBe('alerta');
    expect(evaluarConformidadTemperatura(-10, 'congelacion')).toBe('critico');

    // Caliente (60..95 óptima, ±5 alerta)
    expect(evaluarConformidadTemperatura(68, 'caliente')).toBe('conforme');
    expect(evaluarConformidadTemperatura(57, 'caliente')).toBe('alerta');
    expect(evaluarConformidadTemperatura(50, 'caliente')).toBe('critico');

    // Rango custom
    expect(
      evaluarConformidadTemperatura(5.0, 'refrigeracion', { min: 1, max: 5 })
    ).toBe('conforme');
  });

  it('evalúa estado de aceite de freidoras por tipo de evento y señales sensoriales', () => {
    expect(
      evaluarEstadoAceite({
        tipoEvento: 'cambio_completo',
        colorAceite: 'quemado_rechazar',
        olorRancio: true,
      })
    ).toBe('optimo');

    expect(
      evaluarEstadoAceite({
        tipoEvento: 'inspeccion_calidad',
        colorAceite: 'dorado_aceptable',
      })
    ).toBe('optimo');

    expect(
      evaluarEstadoAceite({
        tipoEvento: 'filtrado',
        colorAceite: 'oscuro_vigilar',
      })
    ).toBe('filtrar_pronto');

    expect(
      evaluarEstadoAceite({
        tipoEvento: 'inspeccion_calidad',
        colorAceite: 'dorado_aceptable',
        espumaExcesiva: true,
      })
    ).toBe('filtrar_pronto');

    expect(
      evaluarEstadoAceite({
        tipoEvento: 'inspeccion_calidad',
        colorAceite: 'quemado_rechazar',
      })
    ).toBe('cambiar_inmediato');

    expect(
      evaluarEstadoAceite({
        tipoEvento: 'inspeccion_calidad',
        colorAceite: 'dorado_aceptable',
        olorRancio: true,
      })
    ).toBe('cambiar_inmediato');
  });

  it('calcula métricas de checklist excluyendo N/A y contando hallazgos críticos', () => {
    const items = crearItemsDesdePlantilla(PLANTILLA_CHECKLIST_APERTURA_DEFAULT);
    expect(items).toHaveLength(10);
    expect(items.every((i) => i.estado === 'pendiente')).toBe(true);

    // 8 cumplen, 1 no_cumple crítico, 1 N/A => 8 / 9 = 89%
    items.forEach((item, idx) => {
      if (idx === 0) item.estado = 'no_cumple'; // critico: true
      else if (idx === 9) item.estado = 'na';
      else item.estado = 'cumple';
    });

    const metricas = calcularMetricasChecklist(items, true);
    expect(metricas.itemsCumplidos).toBe(8);
    expect(metricas.itemsNoConformes).toBe(1);
    expect(metricas.itemsNa).toBe(1);
    expect(metricas.itemsPendientes).toBe(0);
    expect(metricas.hallazgosCriticosCount).toBe(1);
    expect(metricas.porcentajeCumplimiento).toBe(89);
    expect(metricas.estado).toBe('con_hallazgos');

    items[0].estado = 'cumple';
    const completo = calcularMetricasChecklist(items, true);
    expect(completo.porcentajeCumplimiento).toBe(100);
    expect(completo.estado).toBe('completado');
  });

  it('evalúa equipos de frío, ciclos de freidoras y cumplimiento global sin penalizar cierre temprano', () => {
    const config = crearConfiguracionBpmDefault('laparada');
    const ahoraManana = new Date('2026-11-24T15:00:00Z'); // 10:00 AM Colombia
    const hoyIso = '2026-11-24';

    const temperaturas: RegistroTemperaturaBpm[] = config.equiposFrio.map((eq, idx) =>
      makeTemp({
        id: `t-${idx}`,
        equipoId: eq.id,
        equipoNombre: eq.nombre,
        tipoEquipo: eq.tipo,
        temperaturaC:
          eq.tipo === 'congelacion' ? -20 : eq.tipo === 'caliente' ? 70 : 2.5,
        fechaIso: hoyIso,
        estadoConformidad: 'conforme',
      })
    );

    const aceite: RegistroAceiteBpm[] = config.freidoras.map((fr, idx) =>
      makeAceite({
        id: `a-${idx}`,
        freidoraId: fr.id,
        freidoraNombre: fr.nombre,
        tipoEvento: 'cambio_completo',
        colorAceite: 'claro_optimo',
        estadoAceite: 'optimo',
        fechaIso: '2026-11-23',
      })
    );

    const itemsApertura = crearItemsDesdePlantilla(PLANTILLA_CHECKLIST_APERTURA_DEFAULT).map(
      (i) => ({ ...i, estado: 'cumple' as const })
    );
    const checklistApertura: ChecklistTurnoBpm = {
      id: 'chk-ap',
      negocioId: 'laparada',
      tipo: 'apertura',
      fechaIso: hoyIso,
      estado: 'completado',
      items: itemsApertura,
      totalItems: itemsApertura.length,
      itemsCumplidos: itemsApertura.length,
      itemsNoConformes: 0,
      itemsNa: 0,
      itemsPendientes: 0,
      hallazgosCriticosCount: 0,
      porcentajeCumplimiento: 100,
      responsableNombre: 'Andrés',
      creadoEn: ahoraManana,
      actualizadoEn: ahoraManana,
    };

    const resumen = calcularResumenCumplimientoBpm({
      config,
      temperaturas,
      aceite,
      checklists: [checklistApertura],
      ahora: ahoraManana,
    });

    expect(resumen.scoreCumplimientoPct).toBe(100);
    expect(resumen.estadoGlobal).toBe('cumple');
    expect(resumen.equiposConformesHoy).toBe(4);
    expect(resumen.freidorasOptimasCount).toBe(2);
    expect(resumen.aperturaCompletada).toBe(true);

    // Si hay desviación crítica térmica sin resolver y freidora vencida > ciclo
    const resumenCritico = calcularResumenCumplimientoBpm({
      config,
      temperaturas: [
        makeTemp({
          id: 't-bad',
          equipoId: config.equiposFrio[0].id,
          temperaturaC: 11.4,
          estadoConformidad: 'critico',
          resuelto: false,
          fechaIso: hoyIso,
        }),
      ],
      aceite: [
        makeAceite({
          id: 'a-old',
          freidoraId: config.freidoras[0].id,
          tipoEvento: 'cambio_completo',
          fechaIso: '2026-11-18',
        }),
      ],
      checklists: [],
      ahora: new Date('2026-11-25T01:30:00Z'), // 8:30 PM Colombia del 24
    });

    expect(resumenCritico.estadoGlobal).toBe('critico');
    expect(resumenCritico.freidorasRequierenCambioCount).toBe(1);
    expect(resumenCritico.desviacionesSinResolverCount).toBe(1);

    const equiposEval = evaluarEquiposFrioHoy(config.equiposFrio, temperaturas, hoyIso);
    expect(equiposEval).toHaveLength(4);
    const freidorasEval = evaluarFreidorasEstado(config.freidoras, aceite, hoyIso);
    expect(freidorasEval[0].diasDesdeUltimoCambio).toBe(1);
  });

  it('filtra por rango y alertas, sintetiza notificaciones, genera CSV seguro y WhatsApp', () => {
    const config = crearConfiguracionBpmDefault('laparada');
    const ahora = new Date('2026-11-24T17:00:00Z'); // 12:00 PM Colombia
    const hoyIso = '2026-11-24';

    const temps: RegistroTemperaturaBpm[] = [
      makeTemp({
        id: 't-ok',
        equipoId: 'eq-nevera-carnes',
        equipoNombre: 'Nevera Carnes',
        temperaturaC: 2.4,
        estadoConformidad: 'conforme',
        fechaIso: hoyIso,
      }),
      makeTemp({
        id: 't-crit',
        equipoId: 'eq-congelador-fritos',
        equipoNombre: 'Congelador Masas',
        tipoEquipo: 'congelacion',
        temperaturaC: -19.5,
        estadoConformidad: 'conforme',
        fechaIso: '2026-11-10',
      }),
      makeTemp({
        id: 't-alerta',
        equipoId: 'eq-nevera-bebidas',
        equipoNombre: 'Nevera Bebidas',
        temperaturaC: 8.5,
        estadoConformidad: 'critico',
        accionCorrectiva: '=cmd|calc',
        resuelto: false,
        fechaIso: hoyIso,
      }),
    ];

    const filtrados = filtrarRegistrosBpm(
      temps,
      { rango: 'hoy', busqueda: 'bebidas', soloAlertas: true },
      (r) => `${r.equipoNombre} ${r.accionCorrectiva || ''}`,
      (r) => r.estadoConformidad !== 'conforme',
      ahora
    );
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].id).toBe('t-alerta');

    const alertas = construirAlertasBpm({
      config,
      temperaturas: temps,
      aceite: [
        makeAceite({
          id: 'a-bad',
          freidoraId: 'fre-1',
          freidoraNombre: 'Freidora #1',
          colorAceite: 'quemado_rechazar',
          estadoAceite: 'cambiar_inmediato',
          fechaIso: hoyIso,
        }),
      ],
      checklists: [],
      ahora,
    });
    expect(alertas.some((a) => a.tipo === 'bpm_temperatura_critica')).toBe(true);
    expect(alertas.some((a) => a.tipo === 'bpm_cambio_aceite_urgente')).toBe(true);
    expect(alertas.some((a) => a.tipo === 'bpm_checklist_apertura_pendiente')).toBe(true);

    const csv = generarCsvCarpetaSanitariaBpm({
      nombreNegocio: 'La Parada',
      temperaturas: temps,
      aceite: [],
      checklists: [
        {
          id: 'chk-c',
          negocioId: 'laparada',
          tipo: 'cierre',
          fechaIso: hoyIso,
          estado: 'completado',
          items: crearItemsDesdePlantilla(PLANTILLA_CHECKLIST_CIERRE_DEFAULT).map((i) => ({
            ...i,
            estado: 'cumple' as const,
          })),
          totalItems: 10,
          itemsCumplidos: 10,
          itemsNoConformes: 0,
          itemsNa: 0,
          itemsPendientes: 0,
          hallazgosCriticosCount: 0,
          porcentajeCumplimiento: 100,
          responsableNombre: 'Andrés',
          creadoEn: ahora,
          actualizadoEn: ahora,
        },
      ],
      ahora,
    });

    expect(csv.startsWith('\uFEFF')).toBe(true);
    // Temperatura negativa preservada, fórmula peligrosa neutralizada
    expect(csv).toContain('"-19.5"');
    expect(csv).toContain('"\'=cmd|calc"');
    expect(csv).toContain('"Checklist Cierre"');

    const resumen = calcularResumenCumplimientoBpm({
      config,
      temperaturas: temps,
      aceite: [],
      checklists: [],
      ahora,
    });
    const waUrl = decodeURIComponent(
      generarResumenBpmWhatsApp({
        nombreNegocio: 'La Parada',
        resumen,
        equiposEvaluados: evaluarEquiposFrioHoy(config.equiposFrio, temps, hoyIso),
        freidorasEvaluadas: evaluarFreidorasEstado(config.freidoras, [], hoyIso),
      })
    );
    expect(waUrl).toContain('BITÁCORA SANITARIA BPM');
    expect(waUrl).toContain('8.5 °C');
  });

  it('sugiere franja horaria en Colombia y calcula días entre fechas ISO', () => {
    expect(calcularDiasEntreFechasIso('2026-11-20', '2026-11-24')).toBe(4);
    // 08:00 AM Colombia (13:00 UTC) -> apertura
    expect(sugerirFranjaBpm(new Date('2026-11-24T13:00:00Z'))).toBe('apertura');
    // 20:00 PM Colombia (01:00 UTC del día siguiente) -> cierre
    expect(sugerirFranjaBpm(new Date('2026-11-25T01:00:00Z'))).toBe('cierre');
  });
});
