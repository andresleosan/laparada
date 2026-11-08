import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TurnosSalonPage } from '../TurnosSalonPage';
import type { Domicilio } from '@/types';

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: {
      id: 'laparada',
      nombre: 'La Parada Salón',
      slug: 'laparada',
      logoUrl: '',
    },
  }),
}));

const mockDomicilios: Domicilio[] = [
  {
    id: 'd1',
    numeroTurno: 'K-010',
    clienteNombre: 'Mateo Rojas',
    clienteTelefono: '3001234567',
    estado: 'pendiente',
    origen: 'kiosco',
    total: 28000,
    metodoPago: 'efectivo',
    direccion: 'Salón',
    barrio: 'Kiosco',
    items: [],
    creadoEn: { seconds: 1700000000, nanoseconds: 0 } as any,
    actualizadoEn: { seconds: 1700000000, nanoseconds: 0 } as any,
    negocioId: 'laparada',
  },
  {
    id: 'd2',
    numeroTurno: 'K-009',
    clienteNombre: 'Juliana Peña',
    clienteTelefono: '3009876543',
    estado: 'en_camino', // Despachado de cocina / Listo para reclamar
    origen: 'kiosco',
    total: 35000,
    metodoPago: 'efectivo',
    direccion: 'Salón',
    barrio: 'Kiosco',
    items: [],
    creadoEn: { seconds: 1700000000, nanoseconds: 0 } as any,
    actualizadoEn: { seconds: 1700000000, nanoseconds: 0 } as any,
    negocioId: 'laparada',
  },
];

vi.mock('@/services/domiciliosService', () => ({
  onDomiciliosActivosChange: vi.fn((_negocioId, cb) => {
    cb(mockDomicilios);
    return vi.fn();
  }),
}));

describe('TurnosSalonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la cabecera de la pantalla de salón con columnas de Preparando y Listos', () => {
    const html = renderToStaticMarkup(<TurnosSalonPage initialDomicilios={mockDomicilios} />);

    expect(html).toContain('Llamador de Salón en Vivo');
    expect(html).toContain('La Parada Salón');

    // Columnas
    expect(html).toContain('En Preparación');
    expect(html).toContain('¡Listo para Entregar!');

    // Turno en preparación
    expect(html).toContain('K-010');
    expect(html).toContain('Mateo Rojas');

    // Turno listo
    expect(html).toContain('K-009');
    expect(html).toContain('Juliana Peña');
  });
});
