import { describe, expect, it } from 'vitest';
import {
  calcularKpisClientes,
  calcularTicketPromedioCliente,
  esClienteFrecuente,
  formatearTelefonoVisual,
  normalizarTelefono,
  obtenerEnlaceWhatsAppCliente,
} from '../clienteUtils';
import type { Cliente } from '@/types/cliente';

describe('clienteUtils', () => {
  it('normaliza números telefónicos limpiando caracteres especiales y prefijo 57', () => {
    expect(normalizarTelefono('+57 300 123-4567')).toBe('3001234567');
    expect(normalizarTelefono('573109876543')).toBe('3109876543');
    expect(normalizarTelefono('(320) 555 4321')).toBe('3205554321');
    expect(normalizarTelefono('')).toBe('');
  });

  it('formatea visualmente números de 10 dígitos', () => {
    expect(formatearTelefonoVisual('3001234567')).toBe('300 123 4567');
    expect(formatearTelefonoVisual('+573001234567')).toBe('300 123 4567');
    expect(formatearTelefonoVisual('12345')).toBe('12345');
  });

  it('identifica correctamente clientes frecuentes con al menos 3 pedidos', () => {
    expect(esClienteFrecuente({ totalPedidos: 1 })).toBe(false);
    expect(esClienteFrecuente({ totalPedidos: 2 })).toBe(false);
    expect(esClienteFrecuente({ totalPedidos: 3 })).toBe(true);
    expect(esClienteFrecuente({ totalPedidos: 10 })).toBe(true);
  });

  it('genera enlace de WhatsApp válido con y sin mensaje precargado', () => {
    expect(obtenerEnlaceWhatsAppCliente('3001234567')).toBe('https://wa.me/573001234567');
    expect(
      obtenerEnlaceWhatsAppCliente('3001234567', '¡Hola! Te escribimos de La Parada')
    ).toBe('https://wa.me/573001234567?text=%C2%A1Hola!%20Te%20escribimos%20de%20La%20Parada');
    expect(obtenerEnlaceWhatsAppCliente('')).toBe('#');
  });

  it('calcula el ticket promedio y los KPIs globales del directorio', () => {
    expect(calcularTicketPromedioCliente({ totalConsumido: 90000, totalPedidos: 3 })).toBe(30000);
    expect(calcularTicketPromedioCliente({ totalConsumido: 0, totalPedidos: 0 })).toBe(0);

    const clientesMock: Cliente[] = [
      {
        id: 'c1',
        negocioId: 'laparada',
        nombre: 'Carlos',
        telefono: '3001111111',
        direcciones: ['Calle 1'],
        totalPedidos: 4,
        totalConsumido: 100000,
        primerPedidoEn: new Date(),
        ultimoPedidoEn: new Date(),
        origenRegistro: 'pos',
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
      {
        id: 'c2',
        negocioId: 'laparada',
        nombre: 'María',
        telefono: '3002222222',
        direcciones: [],
        totalPedidos: 1,
        totalConsumido: 20000,
        primerPedidoEn: new Date(),
        ultimoPedidoEn: new Date(),
        origenRegistro: 'web',
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
    ];

    const kpis = calcularKpisClientes(clientesMock);
    expect(kpis.totalClientes).toBe(2);
    expect(kpis.clientesFrecuentes).toBe(1);
    expect(kpis.totalConsumidoGlobal).toBe(120000);
    expect(kpis.ticketPromedioGlobal).toBe(24000); // 120000 / 5 pedidos
  });
});
