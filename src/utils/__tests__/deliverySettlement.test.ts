import { describe, expect, it } from 'vitest';
import { calcularLiquidacionRepartidor } from '../deliverySettlement';
import type { Domicilio } from '@/types';
import { Timestamp } from 'firebase/firestore';

const sampleDeliveries: Domicilio[] = [
  {
    id: 'dom-1',
    negocioId: 'laparada',
    clienteNombre: 'Pedro Pérez',
    clienteTelefono: '3001234567',
    direccion: 'Calle 10 # 4-20',
    barrio: 'Centro',
    items: [{ tipo: 'producto', referenciaId: 'p1', nombre: 'Hamburguesa', cantidad: 1, precioUnitario: 20000, subtotal: 20000 }],
    total: 20000,
    metodoPago: 'efectivo',
    origen: 'pos',
    estado: 'entregado',
    domiciliarioId: 'repartidor-1',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
  {
    id: 'dom-2',
    negocioId: 'laparada',
    clienteNombre: 'María López',
    clienteTelefono: '3009876543',
    direccion: 'Av 3 # 12-50',
    barrio: 'Caobos',
    items: [{ tipo: 'producto', referenciaId: 'p2', nombre: 'Perro', cantidad: 1, precioUnitario: 15000, subtotal: 15000 }],
    total: 15000,
    metodoPago: 'transferencia',
    origen: 'whatsapp',
    estado: 'entregado',
    domiciliarioId: 'repartidor-1',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
  {
    id: 'dom-3',
    negocioId: 'laparada',
    clienteNombre: 'Juan R',
    clienteTelefono: '3005555555',
    direccion: 'Calle 5 # 8-30',
    barrio: 'San Luis',
    items: [{ tipo: 'producto', referenciaId: 'p1', nombre: 'Hamburguesa', cantidad: 1, precioUnitario: 20000, subtotal: 20000 }],
    total: 20000,
    metodoPago: 'efectivo',
    origen: 'web',
    estado: 'en_camino', // Not delivered yet!
    domiciliarioId: 'repartidor-1',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
  {
    id: 'dom-4',
    negocioId: 'laparada',
    clienteNombre: 'Carlos T',
    clienteTelefono: '3006666666',
    direccion: 'Calle 8 # 2-10',
    barrio: 'Guaimaral',
    items: [{ tipo: 'producto', referenciaId: 'p3', nombre: 'Salchipapa', cantidad: 1, precioUnitario: 25000, subtotal: 25000 }],
    total: 25000,
    metodoPago: 'efectivo',
    origen: 'pos',
    estado: 'entregado',
    domiciliarioId: 'repartidor-2', // Other driver!
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
];

describe('deliverySettlement utils', () => {
  it('calcula la liquidación filtrada para un repartidor específico', () => {
    const liquidacion = calcularLiquidacionRepartidor(sampleDeliveries, 'repartidor-1');
    expect(liquidacion.totalEntregas).toBe(2);
    expect(liquidacion.totalEfectivo).toBe(20000);
    expect(liquidacion.totalTransferencia).toBe(15000);
    expect(liquidacion.granTotal).toBe(35000);
  });

  it('calcula la liquidación consolidada para todo el negocio si no se especifica domiciliarioId', () => {
    const liquidacion = calcularLiquidacionRepartidor(sampleDeliveries);
    // dom-1 (20k ef), dom-2 (15k tr), dom-4 (25k ef) -> dom-3 ignorado porque está en_camino
    expect(liquidacion.totalEntregas).toBe(3);
    expect(liquidacion.totalEfectivo).toBe(45000);
    expect(liquidacion.totalTransferencia).toBe(15000);
    expect(liquidacion.granTotal).toBe(60000);
  });

  it('maneja listas vacías o valores nulos de manera segura sin arrojar error', () => {
    const liquidacion = calcularLiquidacionRepartidor([]);
    expect(liquidacion.totalEntregas).toBe(0);
    expect(liquidacion.totalEfectivo).toBe(0);
    expect(liquidacion.totalTransferencia).toBe(0);
    expect(liquidacion.granTotal).toBe(0);
  });
});
