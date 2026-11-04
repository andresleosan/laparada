import { describe, expect, it, vi } from 'vitest';
import {
  filtrarComandas,
  getCanalComandaBadge,
  getCodigoComanda,
  getKitchenUrgency,
  playKitchenComandaBell,
  timestampToMillis,
} from '../kitchenKds';
import type { Domicilio } from '@/types';

describe('kitchenKds utilities', () => {
  describe('timestampToMillis', () => {
    it('convierte Firestore Timestamps con toMillis', () => {
      const mockTimestamp = { toMillis: () => 1700000000000 };
      expect(timestampToMillis(mockTimestamp)).toBe(1700000000000);
    });

    it('convierte objetos {seconds}', () => {
      expect(timestampToMillis({ seconds: 1700000000 })).toBe(1700000000000);
    });

    it('convierte instancias de Date', () => {
      const fecha = new Date('2026-11-03T20:00:00Z');
      expect(timestampToMillis(fecha)).toBe(fecha.getTime());
    });

    it('retorna defaultMs si el valor es nulo o indefinido', () => {
      expect(timestampToMillis(null, 12345)).toBe(12345);
      expect(timestampToMillis(undefined, 12345)).toBe(12345);
    });
  });

  describe('getKitchenUrgency (semáforo de comanda)', () => {
    const ahora = 1700000000000;

    it('marca óptimo (verde) si lleva menos de 10 minutos', () => {
      // 5 minutos atrás (300.000 ms)
      const creado = ahora - 5 * 60 * 1000;
      const res = getKitchenUrgency(creado, ahora);

      expect(res.nivel).toBe('optimo');
      expect(res.minutos).toBe(5);
      expect(res.segundos).toBe(0);
      expect(res.tiempoFormateado).toBe('05:00');
      expect(res.borderClass).toContain('emerald');
    });

    it('marca atención (ámbar) si lleva entre 10 y 20 minutos', () => {
      // 14 minutos y 30 segundos atrás
      const creado = ahora - (14 * 60 + 30) * 1000;
      const res = getKitchenUrgency(creado, ahora);

      expect(res.nivel).toBe('atencion');
      expect(res.minutos).toBe(14);
      expect(res.segundos).toBe(30);
      expect(res.tiempoFormateado).toBe('14:30');
      expect(res.borderClass).toContain('amber');
    });

    it('marca crítico (rojo) si supera los 20 minutos', () => {
      // 25 minutos atrás
      const creado = ahora - 25 * 60 * 1000;
      const res = getKitchenUrgency(creado, ahora);

      expect(res.nivel).toBe('critico');
      expect(res.minutos).toBe(25);
      expect(res.tiempoFormateado).toBe('25:00');
      expect(res.borderClass).toContain('red');
    });

    it('formatea horas adecuadamente si supera los 60 minutos', () => {
      const creado = ahora - 75 * 60 * 1000;
      const res = getKitchenUrgency(creado, ahora);

      expect(res.nivel).toBe('critico');
      expect(res.tiempoFormateado).toBe('75 min');
    });
  });

  describe('getCanalComandaBadge', () => {
    it('reconoce canal WhatsApp', () => {
      const badge = getCanalComandaBadge('whatsapp');
      expect(badge.label).toBe('WhatsApp');
      expect(badge.iconName).toBe('whatsapp');
      expect(badge.badgeClass).toContain('emerald');
    });

    it('reconoce canal Web', () => {
      const badge = getCanalComandaBadge('web');
      expect(badge.label).toBe('Tienda Web');
      expect(badge.iconName).toBe('web');
      expect(badge.badgeClass).toContain('sky');
    });

    it('reconoce canal Mostrador / POS por defecto', () => {
      const badge = getCanalComandaBadge('pos');
      expect(badge.label).toBe('Mostrador / POS');
      expect(badge.iconName).toBe('pos');
      expect(badge.badgeClass).toContain('amber');
    });
  });

  describe('getCodigoComanda', () => {
    it('prioriza los primeros caracteres del rastreoToken si existe', () => {
      const comanda = {
        id: 'dom_123456789',
        rastreoToken: 'ABCDEF1234567890',
      } as Domicilio;
      expect(getCodigoComanda(comanda)).toBe('#ABCDEF');
    });

    it('usa los últimos 6 dígitos del id si no tiene rastreoToken', () => {
      const comanda = {
        id: 'abcde987654',
      } as Domicilio;
      expect(getCodigoComanda(comanda)).toBe('#987654');
    });
  });

  describe('playKitchenComandaBell', () => {
    it('ejecuta sin errores y devuelve true cuando AudioContext está disponible', () => {
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
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      const mockContext = {
        currentTime: 0,
        state: 'running',
        createOscillator: () => mockOsc,
        createGain: () => mockGain,
        destination: {},
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as AudioContext;

      const resultado = playKitchenComandaBell(mockContext);
      expect(resultado).toBe(true);
      expect(mockOsc.start).toHaveBeenCalled();
    });
  });

  describe('filtrarComandas', () => {
    const comanda1 = {
      id: 'dom_001',
      clienteNombre: 'Carlos Andrés',
      origen: 'whatsapp',
      barrio: 'Caobos',
      direccion: 'Calle 10 # 5-20',
      notas: 'Sin cebolla',
      items: [{ nombre: 'Hamburguesa La Parada', cantidad: 2, precioUnitario: 18000, subtotal: 36000, tipo: 'producto', referenciaId: 'p1' }],
    } as unknown as Domicilio;

    const comanda2 = {
      id: 'dom_002',
      clienteNombre: 'Valentina Pérez',
      origen: 'web',
      barrio: 'Guaimaral',
      direccion: 'Av 0 # 12-30',
      notas: '',
      items: [{ nombre: 'Perro Especial', cantidad: 1, precioUnitario: 14000, subtotal: 14000, tipo: 'producto', referenciaId: 'p2' }],
    } as unknown as Domicilio;

    const comanda3 = {
      id: 'dom_003',
      clienteNombre: 'Mostrador 1',
      origen: 'pos',
      barrio: '',
      direccion: '',
      notas: 'Para llevar en caja',
      items: [{ nombre: 'Tequeños x6', cantidad: 1, precioUnitario: 12000, subtotal: 12000, tipo: 'producto', referenciaId: 'p3' }],
    } as unknown as Domicilio;

    const lista = [comanda1, comanda2, comanda3];

    it('devuelve todas cuando el canal es "todos" y no hay búsqueda', () => {
      expect(filtrarComandas(lista, 'todos', '')).toHaveLength(3);
    });

    it('filtra por canal de origen', () => {
      expect(filtrarComandas(lista, 'whatsapp')).toEqual([comanda1]);
      expect(filtrarComandas(lista, 'web')).toEqual([comanda2]);
      expect(filtrarComandas(lista, 'pos')).toEqual([comanda3]);
    });

    it('filtra por texto buscando en cliente, producto o notas', () => {
      expect(filtrarComandas(lista, 'todos', 'cebolla')).toEqual([comanda1]);
      expect(filtrarComandas(lista, 'todos', 'perro')).toEqual([comanda2]);
      expect(filtrarComandas(lista, 'todos', 'tequeños')).toEqual([comanda3]);
    });
  });
});

