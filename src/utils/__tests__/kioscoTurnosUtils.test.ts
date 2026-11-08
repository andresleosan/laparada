import { describe, it, expect, vi } from 'vitest';
import {
  generarNumeroTurno,
  extraerCodigoCortoTurno,
  calcularTotalKiosco,
  formatearModificadores,
  generarMensajeWhatsAppTurno,
  filtrarTurnosLlamador,
  playTurnoLlamadorChime,
  anunciarTurnoVoz,
} from '../kioscoTurnosUtils';
import type { Domicilio, ItemKioscoCustomizado } from '@/types';

describe('kioscoTurnosUtils', () => {
  describe('generarNumeroTurno', () => {
    it('formatea números secuenciales estándar con prefijo por defecto K', () => {
      expect(generarNumeroTurno(1)).toBe('K-001');
      expect(generarNumeroTurno(15)).toBe('K-015');
      expect(generarNumeroTurno(150)).toBe('K-150');
    });

    it('soporta prefijos personalizados y números mayores a 999', () => {
      expect(generarNumeroTurno(5, 'T')).toBe('T-005');
      expect(generarNumeroTurno(1050, 'A')).toBe('A-1050');
    });

    it('maneja valores no positivos de forma segura', () => {
      expect(generarNumeroTurno(0)).toBe('K-001');
      expect(generarNumeroTurno(-10)).toBe('K-010');
    });
  });

  describe('extraerCodigoCortoTurno', () => {
    it('extrae el número corto de turnos formateados', () => {
      expect(extraerCodigoCortoTurno('K-015')).toBe('015');
      expect(extraerCodigoCortoTurno('T-002')).toBe('002');
      expect(extraerCodigoCortoTurno('#A123')).toBe('123');
    });

    it('maneja cadenas sin números o vacías', () => {
      expect(extraerCodigoCortoTurno('')).toBe('001');
      expect(extraerCodigoCortoTurno('ORD')).toBe('ORD');
    });
  });

  describe('calcularTotalKiosco', () => {
    it('calcula la suma correcta de items con cantidades y precios', () => {
      const items: ItemKioscoCustomizado[] = [
        {
          tipo: 'producto',
          referenciaId: 'p1',
          nombre: 'Hamburguesa Especial',
          cantidad: 2,
          precioUnitario: 18000,
          subtotal: 36000,
        },
        {
          tipo: 'combo',
          referenciaId: 'c1',
          nombre: 'Combo Familiar',
          cantidad: 1,
          precioUnitario: 45000,
          subtotal: 45000,
        },
      ];
      expect(calcularTotalKiosco(items)).toBe(81000);
    });

    it('devuelve 0 con lista vacía o valores inválidos', () => {
      expect(calcularTotalKiosco([])).toBe(0);
      expect(calcularTotalKiosco([{ cantidad: -2, precioUnitario: 10000 } as any])).toBe(0);
    });
  });

  describe('formatearModificadores', () => {
    it('formatea modificadores sin notas', () => {
      expect(formatearModificadores(['Sin cebolla', 'Salsa aparte'])).toBe('Sin cebolla, Salsa aparte');
    });

    it('formatea notas sin modificadores', () => {
      expect(formatearModificadores([], 'Bien tostado')).toBe('Nota: "Bien tostado"');
    });

    it('combina modificadores y notas', () => {
      expect(formatearModificadores(['Queso extra'], 'Sin hielo')).toBe('Queso extra · Nota: "Sin hielo"');
    });

    it('devuelve cadena vacía si no hay modificadores ni notas', () => {
      expect(formatearModificadores([], '')).toBe('');
    });
  });

  describe('generarMensajeWhatsAppTurno', () => {
    it('genera el ticket completo para salón con mesa', () => {
      const msg = generarMensajeWhatsAppTurno({
        numeroTurno: 'K-015',
        clienteNombre: 'Andrés León',
        items: [
          { cantidad: 2, nombre: 'Hamburguesa Doble', subtotal: 44000, modificadores: ['Sin cebolla'] },
        ],
        total: 44000,
        negocioNombre: 'La Parada Burger',
        tipoServicio: 'salon',
        mesaNumero: '4',
      });

      expect(msg).toContain('*LA PARADA BURGER*');
      expect(msg).toContain('TICKET DE TURNO: K-015');
      expect(msg).toContain('Cliente:* Andrés León');
      expect(msg).toContain('Mesa 4');
      expect(msg).toContain('Sin cebolla');
      expect(msg).toContain('44.000');
    });

    it('genera el ticket para llevar sin mesa', () => {
      const msg = generarMensajeWhatsAppTurno({
        numeroTurno: 'K-020',
        clienteNombre: 'Valentina',
        items: [
          { cantidad: 1, nombre: 'Perro Especial', subtotal: 14000 },
        ],
        total: 14000,
        negocioNombre: 'La Parada',
        tipoServicio: 'para_llevar',
      });

      expect(msg).toContain('🛍️ Para Llevar');
      expect(msg).toContain('TOTAL A PAGAR EN CAJA');
    });
  });

  describe('filtrarTurnosLlamador', () => {
    const ahora = Date.now();

    it('separa correctamente pedidos en preparación y pedidos listos', () => {
      const domicilios: Domicilio[] = [
        {
          id: 'dom1',
          numeroTurno: 'K-001',
          clienteNombre: 'Carlos',
          estado: 'pendiente',
          origen: 'kiosco',
          creadoEn: { toMillis: () => ahora - 10 * 60 * 1000 } as any,
        } as Domicilio,
        {
          id: 'dom2',
          numeroTurno: 'K-002',
          clienteNombre: 'Diana',
          estado: 'en_preparacion',
          origen: 'kiosco',
          creadoEn: { toMillis: () => ahora - 5 * 60 * 1000 } as any,
        } as Domicilio,
        {
          id: 'dom3',
          numeroTurno: 'K-003',
          clienteNombre: 'Mateo',
          estado: 'en_camino', // Despachado / listo para retirar
          origen: 'kiosco',
          creadoEn: { toMillis: () => ahora - 15 * 60 * 1000 } as any,
        } as Domicilio,
      ];

      const res = filtrarTurnosLlamador(domicilios, ahora);
      expect(res.preparando.length).toBe(2);
      expect(res.preparando[0].numeroTurno).toBe('K-001'); // FIFO: el más antiguo primero
      expect(res.preparando[1].numeroTurno).toBe('K-002');

      expect(res.listos.length).toBe(1);
      expect(res.listos[0].numeroTurno).toBe('K-003');
    });

    it('descarta pedidos entregados hace más de 10 minutos', () => {
      const domicilios: Domicilio[] = [
        {
          id: 'antiguo',
          numeroTurno: 'K-000',
          estado: 'entregado',
          entregadoEn: { toMillis: () => ahora - 25 * 60 * 1000 } as any,
        } as Domicilio,
        {
          id: 'reciente',
          numeroTurno: 'K-010',
          estado: 'entregado',
          entregadoEn: { toMillis: () => ahora - 3 * 60 * 1000 } as any,
        } as Domicilio,
      ];

      const res = filtrarTurnosLlamador(domicilios, ahora);
      expect(res.listos.length).toBe(1);
      expect(res.listos[0].numeroTurno).toBe('K-010');
    });
  });

  describe('playTurnoLlamadorChime', () => {
    it('ejecuta la síntesis de 3 notas cuando AudioContext está disponible', () => {
      const mockOsc = {
        type: '',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      const mockGain = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      const mockCtx = {
        state: 'running',
        currentTime: 0,
        destination: {},
        createOscillator: vi.fn(() => mockOsc),
        createGain: vi.fn(() => mockGain),
        resume: vi.fn().mockResolvedValue(undefined),
      } as unknown as AudioContext;

      const result = playTurnoLlamadorChime(mockCtx);
      expect(result).toBe(true);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
    });
  });

  describe('anunciarTurnoVoz', () => {
    it('emite locución por Web Speech API', () => {
      const mockSpeak = vi.fn();
      const mockCancel = vi.fn();
      const mockSynth = {
        speak: mockSpeak,
        cancel: mockCancel,
        getVoices: vi.fn(() => [{ lang: 'es-CO', name: 'Colombian Spanish' }]),
      } as unknown as SpeechSynthesis;

      class MockUtterance {
        lang = '';
        rate = 1;
        pitch = 1;
        voice = null;
        constructor(public text: string) {}
      }

      const result = anunciarTurnoVoz('K-015', 'Andrés', mockSynth, MockUtterance as any);
      expect(result).toBe(true);
      expect(mockCancel).toHaveBeenCalled();
      expect(mockSpeak).toHaveBeenCalled();
    });
  });
});
