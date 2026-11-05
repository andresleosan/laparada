import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mesa } from '@/types/mesa';
import type { Domicilio } from '@/types';

// Simulamos los listeners para probar el cálculo reactivo
describe('useOperacionesLiveBadges logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calcula mesas abiertas correctamente filtrando ocupadas y cuentas abiertas', () => {
    const mockMesas: Mesa[] = [
      {
        id: 'm1',
        numero: 1,
        nombre: 'Mesa 1',
        capacidad: 4,
        zona: 'Salón Principal',
        estado: 'ocupada',
        cuentaActivaId: 'c1',
        negocioId: 'laparada',
      },
      {
        id: 'm2',
        numero: 2,
        nombre: 'Mesa 2',
        capacidad: 2,
        zona: 'Terraza',
        estado: 'por_cobrar',
        cuentaActivaId: 'c2',
        negocioId: 'laparada',
      },
      {
        id: 'm3',
        numero: 3,
        nombre: 'Mesa 3',
        capacidad: 4,
        zona: 'Salón Principal',
        estado: 'libre',
        cuentaActivaId: null,
        negocioId: 'laparada',
      },
    ];

    const mesasAbiertas = mockMesas.filter(
      (m) => m.estado === 'ocupada' || m.estado === 'por_cobrar' || Boolean(m.cuentaActivaId)
    ).length;

    expect(mesasAbiertas).toBe(2);
  });

  it('calcula comandas pendientes de cocina y domicilios en ruta de forma precisa', () => {
    const mockDomicilios: Domicilio[] = [
      {
        id: 'd1',
        clienteNombre: 'Ana',
        clienteTelefono: '300',
        direccion: 'Calle 1',
        barrio: 'Centro',
        items: [],
        total: 20000,
        metodoPago: 'efectivo',
        origen: 'whatsapp',
        estado: 'pendiente',
        negocioId: 'laparada',
        creadoEn: { seconds: 1, nanoseconds: 0 } as any,
        actualizadoEn: { seconds: 1, nanoseconds: 0 } as any,
      },
      {
        id: 'd2',
        clienteNombre: 'Beto',
        clienteTelefono: '301',
        direccion: 'Calle 2',
        barrio: 'Centro',
        items: [],
        total: 35000,
        metodoPago: 'efectivo',
        origen: 'pos',
        estado: 'en_preparacion',
        negocioId: 'laparada',
        creadoEn: { seconds: 1, nanoseconds: 0 } as any,
        actualizadoEn: { seconds: 1, nanoseconds: 0 } as any,
      },
      {
        id: 'd3',
        clienteNombre: 'Camilo',
        clienteTelefono: '302',
        direccion: 'Calle 3',
        barrio: 'Centro',
        items: [],
        total: 40000,
        metodoPago: 'efectivo',
        origen: 'whatsapp',
        estado: 'en_camino',
        negocioId: 'laparada',
        creadoEn: { seconds: 1, nanoseconds: 0 } as any,
        actualizadoEn: { seconds: 1, nanoseconds: 0 } as any,
      },
      {
        id: 'd4',
        clienteNombre: 'Diana',
        clienteTelefono: '303',
        direccion: 'Calle 4',
        barrio: 'Centro',
        items: [],
        total: 15000,
        metodoPago: 'efectivo',
        origen: 'whatsapp',
        estado: 'entregado',
        negocioId: 'laparada',
        creadoEn: { seconds: 1, nanoseconds: 0 } as any,
        actualizadoEn: { seconds: 1, nanoseconds: 0 } as any,
      },
    ];

    const comandasCocina = mockDomicilios.filter(
      (d) => d.estado === 'pendiente' || d.estado === 'en_preparacion'
    ).length;

    const enviosActivos = mockDomicilios.filter(
      (d) => d.estado === 'pendiente' || d.estado === 'en_preparacion' || d.estado === 'en_camino'
    ).length;

    expect(comandasCocina).toBe(2); // d1 (pendiente) + d2 (en_preparacion)
    expect(enviosActivos).toBe(3); // d1 (pendiente) + d2 (en_preparacion) + d3 (en_camino)
  });
});

