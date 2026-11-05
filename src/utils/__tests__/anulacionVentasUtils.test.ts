import { describe, it, expect } from 'vitest';
import {
  CATALOGO_MOTIVOS_ANULACION,
  getMotivoAnulacionDef,
  formatearMotivoAnulacion,
  esVentaAnulada,
  filtrarVentasPorEstado,
  calcularMetricasAnulacion,
  validarDatosAnulacion,
} from '../anulacionVentasUtils';
import type { Venta } from '@/types';
import { Timestamp } from 'firebase/firestore';

describe('anulacionVentasUtils', () => {
  it('contiene los motivos gastronómicos requeridos en el catálogo', () => {
    expect(CATALOGO_MOTIVOS_ANULACION.length).toBeGreaterThanOrEqual(5);
    const ids = CATALOGO_MOTIVOS_ANULACION.map((m) => m.id);
    expect(ids).toContain('error_digitacion');
    expect(ids).toContain('cliente_cancelo');
    expect(ids).toContain('plato_devuelto');
    expect(ids).toContain('pedido_duplicado');
    expect(ids).toContain('otro');
  });

  it('obtiene la definición de un motivo por ID', () => {
    const def = getMotivoAnulacionDef('error_digitacion');
    expect(def).toBeDefined();
    expect(def?.label).toContain('Error de digitación');

    expect(getMotivoAnulacionDef('inexistente')).toBeUndefined();
  });

  it('formatea motivos estándar y personalizados correctamente', () => {
    expect(formatearMotivoAnulacion('cliente_cancelo')).toBe('Cliente canceló el pedido');
    expect(formatearMotivoAnulacion('otro', 'Plato con exceso de picante')).toBe('Otro: Plato con exceso de picante');
    expect(formatearMotivoAnulacion('otro', '')).toBe('Otro motivo específico');
    expect(formatearMotivoAnulacion(undefined)).toBe('Anulación no especificada');
  });

  it('detecta ventas anuladas con esVentaAnulada', () => {
    expect(esVentaAnulada({ estado: 'anulada' })).toBe(true);
    expect(esVentaAnulada({ estado: 'completada' })).toBe(false);
    expect(esVentaAnulada({})).toBe(false);
  });

  const mockVentas: Venta[] = [
    {
      id: 'v1',
      negocioId: 'negocio1',
      items: [],
      total: 25000,
      metodoPago: 'efectivo',
      origen: 'pos',
      fecha: Timestamp.now(),
      estado: 'completada',
    },
    {
      id: 'v2',
      negocioId: 'negocio1',
      items: [],
      total: 15000,
      metodoPago: 'efectivo',
      origen: 'pos',
      fecha: Timestamp.now(),
      estado: 'anulada',
    },
    {
      id: 'v3',
      negocioId: 'negocio1',
      items: [],
      total: 30000,
      metodoPago: 'transferencia',
      origen: 'pos',
      fecha: Timestamp.now(),
      // sin campo estado (legado = completada)
    },
  ];

  it('filtra ventas por estado correctamente', () => {
    expect(filtrarVentasPorEstado(mockVentas, 'todas').length).toBe(3);
    const validas = filtrarVentasPorEstado(mockVentas, 'completadas');
    expect(validas.length).toBe(2);
    expect(validas.map((v) => v.id)).toEqual(['v1', 'v3']);

    const anuladas = filtrarVentasPorEstado(mockVentas, 'anuladas');
    expect(anuladas.length).toBe(1);
    expect(anuladas[0].id).toBe('v2');
  });

  it('calcula métricas de anulación con exactitud', () => {
    const metricas = calcularMetricasAnulacion(mockVentas);
    expect(metricas.totalValidas).toBe(55000);
    expect(metricas.cantidadValidas).toBe(2);
    expect(metricas.totalAnulado).toBe(15000);
    expect(metricas.cantidadAnuladas).toBe(1);
    // 1 de 3 operaciones anuladas = 33.3%
    expect(metricas.tasaAnulacion).toBe(33.3);
  });

  it('calcula métricas seguras cuando no hay ventas', () => {
    const metricas = calcularMetricasAnulacion([]);
    expect(metricas.totalValidas).toBe(0);
    expect(metricas.cantidadValidas).toBe(0);
    expect(metricas.totalAnulado).toBe(0);
    expect(metricas.cantidadAnuladas).toBe(0);
    expect(metricas.tasaAnulacion).toBe(0);
  });

  it('valida datos de anulación correctamente', () => {
    expect(validarDatosAnulacion({}).valido).toBe(false);
    expect(validarDatosAnulacion({ motivo: 'error_digitacion' }).valido).toBe(true);
    expect(validarDatosAnulacion({ motivo: 'otro', motivoPersonalizado: '' }).valido).toBe(false);
    expect(validarDatosAnulacion({ motivo: 'otro', motivoPersonalizado: 'Cliente apurado' }).valido).toBe(true);
  });
});

