import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getNotificacionesSonidoHabilitado,
  setNotificacionesSonidoHabilitado,
  playAlertaCriticaAudio,
  playAlertaAltaAudio,
  playAlertaInformativaAudio,
  reproducirAlertaPorUrgencia,
  filtrarNotificaciones,
  calcularMetricasNotificaciones,
  formatearTiempoRelativoNotificacion,
  getBadgeUrgenciaInfo,
  getModuloInfo,
  sintetizarAlertasOperativasEnVivo,
  generarResumenNotificacionesWhatsApp,
  NOTIFICACIONES_SONIDO_STORAGE_KEY,
} from '../notificacionesUtils';
import type { NotificacionOperativa } from '@/types/notificacion';

const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => { storageMap.set(key, val); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
};

// Polyfill window & localStorage en entorno Node
if (typeof window === 'undefined') {
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: mockLocalStorage,
  };
} else {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

function createMockAudioContext() {
  const dummyNode = {
    connect: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };

  return {
    state: 'running',
    currentTime: 0,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn().mockReturnValue({
      ...dummyNode,
      type: 'sine',
      frequency: dummyNode,
      start: vi.fn(),
      stop: vi.fn(),
    }),
    createGain: vi.fn().mockReturnValue({
      ...dummyNode,
      gain: dummyNode,
    }),
    destination: {},
  } as unknown as AudioContext;
}

const mockNotificaciones: NotificacionOperativa[] = [
  {
    id: 'n1',
    negocioId: 'laparada',
    modulo: 'cocina',
    tipo: 'comanda_muy_demorada',
    titulo: 'Comanda Crítica Mesa 3',
    mensaje: 'La comanda supera los 20 minutos',
    urgencia: 'critica',
    leida: false,
    fecha: '2026-11-08T02:00:00.000Z',
    origen: 'automatico',
  },
  {
    id: 'n2',
    negocioId: 'laparada',
    modulo: 'inventario',
    tipo: 'stock_minimo',
    titulo: 'Stock Bajo: Carne de Hamburguesa',
    mensaje: 'Quedan 5 uds en bodega',
    urgencia: 'alta',
    leida: false,
    fecha: '2026-11-08T02:10:00.000Z',
    origen: 'automatico',
  },
  {
    id: 'n3',
    negocioId: 'laparada',
    modulo: 'pedidos',
    tipo: 'pedido_web_nuevo',
    titulo: 'Nuevo Pedido Web #102',
    mensaje: 'Cliente Juan Perez',
    urgencia: 'media',
    leida: true,
    fecha: '2026-11-08T01:30:00.000Z',
    origen: 'sistema',
  },
  {
    id: 'n4',
    negocioId: 'laparada',
    modulo: 'caja',
    tipo: 'cierre_turno',
    titulo: 'Arqueo de caja registrado',
    mensaje: 'Cuadre exacto en turno mañana',
    urgencia: 'baja',
    leida: true,
    fecha: '2026-11-08T00:00:00.000Z',
    origen: 'manual',
    creadaPor: 'Carlos Cajero',
  },
];

describe('notificacionesUtils', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Preferencia de Sonido en localStorage', () => {
    it('retorna true por defecto si no hay preferencia en localStorage', () => {
      expect(getNotificacionesSonidoHabilitado()).toBe(true);
    });

    it('guarda y recupera preferencia desactivada (off)', () => {
      setNotificacionesSonidoHabilitado(false);
      expect(window.localStorage.getItem(NOTIFICACIONES_SONIDO_STORAGE_KEY)).toBe('off');
      expect(getNotificacionesSonidoHabilitado()).toBe(false);
    });

    it('guarda y recupera preferencia activada (on)', () => {
      setNotificacionesSonidoHabilitado(false);
      setNotificacionesSonidoHabilitado(true);
      expect(window.localStorage.getItem(NOTIFICACIONES_SONIDO_STORAGE_KEY)).toBe('on');
      expect(getNotificacionesSonidoHabilitado()).toBe(true);
    });
  });

  describe('Alertas Web Audio API', () => {
    it('ejecuta alerta crítica con AudioContext simulado', () => {
      const mockCtx = createMockAudioContext();
      const res = playAlertaCriticaAudio(mockCtx);
      expect(res).toBe(true);
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    it('ejecuta alerta alta con AudioContext simulado', () => {
      const mockCtx = createMockAudioContext();
      const res = playAlertaAltaAudio(mockCtx);
      expect(res).toBe(true);
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    it('ejecuta alerta informativa con AudioContext simulado', () => {
      const mockCtx = createMockAudioContext();
      const res = playAlertaInformativaAudio(mockCtx);
      expect(res).toBe(true);
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    it('reproducirAlertaPorUrgencia despacha el sonido según urgencia', () => {
      const mockCtx = createMockAudioContext();
      expect(reproducirAlertaPorUrgencia('critica', mockCtx)).toBe(true);
      expect(reproducirAlertaPorUrgencia('alta', mockCtx)).toBe(true);
      expect(reproducirAlertaPorUrgencia('media', mockCtx)).toBe(true);
      expect(reproducirAlertaPorUrgencia('baja', mockCtx)).toBe(true);
    });

    it('reproducirAlertaPorUrgencia respeta sonido deshabilitado salvo si se ignora la preferencia', () => {
      setNotificacionesSonidoHabilitado(false);
      const mockCtx = createMockAudioContext();
      expect(reproducirAlertaPorUrgencia('alta', mockCtx)).toBe(false);
      expect(reproducirAlertaPorUrgencia('alta', mockCtx, true)).toBe(true);
    });
  });

  describe('filtrarNotificaciones', () => {
    it('filtra por módulo', () => {
      const resultado = filtrarNotificaciones(mockNotificaciones, { modulo: 'cocina' });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].modulo).toBe('cocina');
    });

    it('filtra por urgencia', () => {
      const resultado = filtrarNotificaciones(mockNotificaciones, { urgencia: 'critica' });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].urgencia).toBe('critica');
    });

    it('filtra por estado de lectura (no_leidas)', () => {
      const resultado = filtrarNotificaciones(mockNotificaciones, { estado: 'no_leidas' });
      expect(resultado).toHaveLength(2);
      expect(resultado.every((n) => !n.leida)).toBe(true);
    });

    it('filtra por estado de lectura (leidas)', () => {
      const resultado = filtrarNotificaciones(mockNotificaciones, { estado: 'leidas' });
      expect(resultado).toHaveLength(2);
      expect(resultado.every((n) => n.leida)).toBe(true);
    });

    it('filtra por búsqueda textual en título o mensaje', () => {
      const resultado = filtrarNotificaciones(mockNotificaciones, { busqueda: 'hamburguesa' });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe('n2');
    });

    it('filtra por búsqueda de operador creador', () => {
      const resultado = filtrarNotificaciones(mockNotificaciones, { busqueda: 'Carlos' });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe('n4');
    });
  });

  describe('calcularMetricasNotificaciones', () => {
    it('calcula métricas agregadas correctamente', () => {
      const metricas = calcularMetricasNotificaciones(mockNotificaciones);
      expect(metricas.total).toBe(4);
      expect(metricas.noLeidas).toBe(2);
      expect(metricas.criticas).toBe(1);
      expect(metricas.altas).toBe(1);
      expect(metricas.porModulo.cocina).toBe(1);
      expect(metricas.porModulo.inventario).toBe(1);
      expect(metricas.porModulo.pedidos).toBe(1);
      expect(metricas.porModulo.caja).toBe(1);
      expect(metricas.porModulo.salon).toBe(0);
    });
  });

  describe('formatearTiempoRelativoNotificacion', () => {
    const ahora = new Date('2026-11-08T02:30:00.000Z');

    it('formatea menos de 1 minuto como "Hace un momento"', () => {
      const fecha = new Date('2026-11-08T02:29:40.000Z').toISOString();
      expect(formatearTiempoRelativoNotificacion(fecha, ahora)).toBe('Hace un momento');
    });

    it('formatea minutos transcurridos', () => {
      const fecha = new Date('2026-11-08T02:15:00.000Z').toISOString();
      expect(formatearTiempoRelativoNotificacion(fecha, ahora)).toBe('Hace 15 min');
    });

    it('formatea horas transcurridas', () => {
      const fecha = new Date('2026-11-08T00:30:00.000Z').toISOString();
      expect(formatearTiempoRelativoNotificacion(fecha, ahora)).toBe('Hace 2 h');
    });

    it('formatea ayer', () => {
      const fecha = new Date('2026-11-07T02:30:00.000Z').toISOString();
      expect(formatearTiempoRelativoNotificacion(fecha, ahora)).toBe('Ayer');
    });
  });

  describe('getBadgeUrgenciaInfo & getModuloInfo', () => {
    it('retorna clases semánticas de urgencia', () => {
      expect(getBadgeUrgenciaInfo('critica').label).toBe('Crítica');
      expect(getBadgeUrgenciaInfo('alta').label).toBe('Alta');
      expect(getBadgeUrgenciaInfo('media').label).toBe('Media');
      expect(getBadgeUrgenciaInfo('baja').label).toBe('Informativa');
    });

    it('retorna información de módulo y rutas por defecto', () => {
      expect(getModuloInfo('cocina').defaultRoute).toBe('/cocina');
      expect(getModuloInfo('inventario').defaultRoute).toBe('/inventario');
      expect(getModuloInfo('pedidos').defaultRoute).toBe('/pedidos');
      expect(getModuloInfo('salon').defaultRoute).toBe('/mesas');
    });
  });

  describe('sintetizarAlertasOperativasEnVivo', () => {
    const ahora = new Date('2026-11-08T02:30:00.000Z');

    it('detecta insumos agotados (crítica) e insumos bajo stock mínimo (alta)', () => {
      const alertas = sintetizarAlertasOperativasEnVivo({
        inventario: [
          { id: 'i1', nombre: 'Pan Brioche', stockActual: 0, stockMinimo: 10, unidadMedida: 'uds' },
          { id: 'i2', nombre: 'Queso Cheddar', stockActual: 4, stockMinimo: 8, unidadMedida: 'kg' },
          { id: 'i3', nombre: 'Papas Francesas', stockActual: 20, stockMinimo: 10, unidadMedida: 'kg' },
        ],
        ahora,
      });

      expect(alertas).toHaveLength(2);
      expect(alertas[0].urgencia).toBe('critica');
      expect(alertas[0].tipo).toBe('stock_agotado');
      expect(alertas[1].urgencia).toBe('alta');
      expect(alertas[1].tipo).toBe('stock_minimo');
    });

    it('detecta comandas demoradas (> 15 min alta, > 20 min crítica)', () => {
      const alertas = sintetizarAlertasOperativasEnVivo({
        comandasKds: [
          // 25 min atrás -> crítica
          { id: 'c1', creadoEn: '2026-11-08T02:05:00.000Z', clienteNombre: 'Pedro', estado: 'preparando' },
          // 16 min atrás -> alta
          { id: 'c2', creadoEn: '2026-11-08T02:14:00.000Z', clienteNombre: 'Ana', estado: 'pendiente' },
          // 5 min atrás -> normal, no alerta
          { id: 'c3', creadoEn: '2026-11-08T02:25:00.000Z', clienteNombre: 'Luis', estado: 'pendiente' },
          // Ya entregado -> ignorar
          { id: 'c4', creadoEn: '2026-11-08T01:50:00.000Z', estado: 'entregado' },
        ],
        ahora,
      });

      expect(alertas).toHaveLength(2);
      expect(alertas[0].urgencia).toBe('critica');
      expect(alertas[1].urgencia).toBe('alta');
    });
  });

  describe('generarResumenNotificacionesWhatsApp', () => {
    it('genera texto codificado para WhatsApp con desglose y alertas pendientes', () => {
      const encoded = generarResumenNotificacionesWhatsApp(mockNotificaciones, 'La Parada');
      const decoded = decodeURIComponent(encoded);

      expect(decoded).toContain('REPORTE DE ALERTAS OPERATIVAS — LA PARADA');
      expect(decoded).toContain('Total pendientes: *2*');
      expect(decoded).toContain('Críticas en fuego: *1*');
      expect(decoded).toContain('Comanda Crítica Mesa 3');
      expect(decoded).toContain('Stock Bajo: Carne de Hamburguesa');
    });
  });
});
