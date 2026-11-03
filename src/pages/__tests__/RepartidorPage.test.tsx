import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RepartidorPage } from '../RepartidorPage';

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada' },
    usuarioNegocio: { uid: 'rep-1', nombre: 'Juan Repartidor', rol: 'domiciliario' },
    esSuperAdmin: false,
  }),
}));

vi.mock('@/services/domiciliosService', () => ({
  onDomiciliosActivosChange: () => () => {},
  getDomiciliosEntregados: vi.fn().mockResolvedValue([]),
  onNuevoDomicilio: () => () => {},
  tomarDomicilioParaEntrega: vi.fn(),
  finalizarDomicilio: vi.fn(),
}));

vi.mock('@/services/ventasService', () => ({
  uploadFotoTransferencia: vi.fn(),
}));

describe('RepartidorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el título del portal, la identidad del repartidor y las secciones operativas', () => {
    const html = renderToStaticMarkup(<RepartidorPage />);

    expect(html).toContain('Portal de Repartidor');
    expect(html).toContain('Conectado como Juan Repartidor');
    expect(html).toContain('En Curso');
    expect(html).toContain('Entregadas Hoy');
    expect(html).toContain('Liquidación de jornada del repartidor');
  });
});
