import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CocinaPage } from '../CocinaPage';
import type { Domicilio } from '@/types';

const mockComandas: Domicilio[] = [
  {
    id: 'dom_101',
    clienteNombre: 'Andrés Sánchez',
    clienteTelefono: '3001234567',
    origen: 'whatsapp',
    barrio: 'Caobos',
    direccion: 'Calle 10 # 5-20',
    estado: 'pendiente',
    items: [{ nombre: 'Hamburguesa La Parada', cantidad: 2, precioUnitario: 18000, subtotal: 36000, tipo: 'producto', referenciaId: 'p1' }],
    total: 36000,
    metodoPago: 'efectivo',
    creadoEn: { seconds: 1700000000, nanoseconds: 0 } as any,
    actualizadoEn: { seconds: 1700000000, nanoseconds: 0 } as any,
    negocioId: 'laparada',
  },
  {
    id: 'dom_102',
    clienteNombre: 'Valentina Gómez',
    clienteTelefono: '3009876543',
    origen: 'web',
    barrio: 'Guaimaral',
    direccion: 'Av 0 # 15-40',
    estado: 'en_preparacion',
    items: [{ nombre: 'Perro Especial', cantidad: 1, precioUnitario: 14000, subtotal: 14000, tipo: 'producto', referenciaId: 'p2' }],
    total: 14000,
    metodoPago: 'transferencia',
    creadoEn: { seconds: 1700000000, nanoseconds: 0 } as any,
    actualizadoEn: { seconds: 1700000000, nanoseconds: 0 } as any,
    negocioId: 'laparada',
  },
  {
    id: 'dom_103',
    clienteNombre: 'Mostrador Mesa 3',
    clienteTelefono: '3105556677',
    origen: 'pos',
    barrio: '',
    direccion: '',
    estado: 'en_camino',
    items: [{ nombre: 'Tequeños x6', cantidad: 1, precioUnitario: 12000, subtotal: 12000, tipo: 'producto', referenciaId: 'p3' }],
    total: 12000,
    metodoPago: 'efectivo',
    creadoEn: { seconds: 1700000000, nanoseconds: 0 } as any,
    actualizadoEn: { seconds: 1700000000, nanoseconds: 0 } as any,
    negocioId: 'laparada',
  },
];

let mockKdsReturn = {
  activos: mockComandas,
  pendientes: [mockComandas[0]],
  enPreparacion: [mockComandas[1]],
  listas: [mockComandas[2]],
  loading: false,
  error: null as string | null,
  ahora: (1700000000 + 300) * 1000,
  canalFiltro: 'todos' as const,
  setCanalFiltro: vi.fn(),
  busqueda: '',
  setBusqueda: vi.fn(),
  sonidoHabilitado: true,
  toggleSonido: vi.fn(),
  probarSonido: vi.fn(),
  itemsPreparados: {},
  toggleItemPreparado: vi.fn(),
  avanzarEstadoComanda: vi.fn(),
  devolverACocina: vi.fn(),
  marcarEntregada: vi.fn(),
  totalPendientes: 1,
  totalEnPreparacion: 1,
  totalListos: 1,
  tiempoMasAntiguoMin: 5,
  actionLoadingId: null as string | null,
};

vi.mock('@/hooks/useCocinaKDS', () => ({
  useCocinaKDS: () => mockKdsReturn,
}));

describe('CocinaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la cabecera KDS, los filtros de canal y las 3 columnas Kanban', () => {
    const html = renderToStaticMarkup(<CocinaPage />);

    expect(html).toContain('Cocina / Pantalla KDS');
    expect(html).toContain('Comandas en tiempo real');
    expect(html).toContain('Pendientes (1)');
    expect(html).toContain('En Cocina (1)');
    expect(html).toContain('Listas para Entrega (1)');
    expect(html).toContain('Andrés Sánchez');
    expect(html).toContain('Valentina Gómez');
    expect(html).toContain('Mostrador Mesa 3');
    expect(html).toContain('Hamburguesa La Parada');
    expect(html).toContain('Perro Especial');
    expect(html).toContain('Tequeños x6');
    expect(html).toContain('A Cocina / Iniciar');
    expect(html).toContain('¡Comanda Lista!');
    expect(html).toContain('Entregar / Despachado');
  });

  it('muestra el estado vacío de Cocina al día cuando no hay comandas activas', () => {
    const backup = mockKdsReturn;
    mockKdsReturn = {
      ...backup,
      activos: [],
      pendientes: [],
      enPreparacion: [],
      listas: [],
      totalPendientes: 0,
      totalEnPreparacion: 0,
      totalListos: 0,
      tiempoMasAntiguoMin: 0,
    };

    const html = renderToStaticMarkup(<CocinaPage />);
    expect(html).toContain('¡Cocina al día!');
    expect(html).toContain('No hay comandas pendientes en este momento');

    mockKdsReturn = backup;
  });
});
