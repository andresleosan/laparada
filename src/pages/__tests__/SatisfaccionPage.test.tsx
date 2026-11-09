import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: {
      id: 'laparada',
      nombre: 'La Parada Hamburguesería',
      slug: 'laparada',
    },
  }),
}));

vi.mock('@/hooks/useSatisfaccion', () => ({
  useSatisfaccion: () => ({
    encuestas: [
      {
        id: 'enc-test-1',
        negocioId: 'laparada',
        calificacion: 5,
        tipoNps: 'promotor',
        canal: 'mesa',
        mesaNombre: 'Mesa 2',
        clienteNombre: 'Sofia Lopez',
        clienteTelefono: '3151112233',
        tags: ['sabor_increible'],
        comentario: 'Excelente servicio y sabor',
        esQueja: false,
        redirigidoGoogleReviews: true,
        contactadoPorWhatsApp: false,
        estado: 'resuelta',
        creadoEn: '2026-11-08T18:00:00Z',
      },
    ],
    encuestasFiltradas: [
      {
        id: 'enc-test-1',
        negocioId: 'laparada',
        calificacion: 5,
        tipoNps: 'promotor',
        canal: 'mesa',
        mesaNombre: 'Mesa 2',
        clienteNombre: 'Sofia Lopez',
        clienteTelefono: '3151112233',
        tags: ['sabor_increible'],
        comentario: 'Excelente servicio y sabor',
        esQueja: false,
        redirigidoGoogleReviews: true,
        contactadoPorWhatsApp: false,
        estado: 'resuelta',
        creadoEn: '2026-11-08T18:00:00Z',
      },
    ],
    configuracion: {
      negocioId: 'laparada',
      googleBusinessUrl: 'https://g.page/r/laparada/review',
      telefonoAtencionQuejas: '3001234567',
      habilitarRedireccionGoogle: true,
      mensajeAgradecimiento5Estrellas: '¡Muchísimas gracias por tu apoyo!',
      mensajeDisculpaQueja: 'Lamentamos el inconveniente.',
    },
    kpis: {
      calificacionPromedio: 5.0,
      totalEncuestas: 1,
      promotoresCount: 1,
      pasivosCount: 0,
      detractoresCount: 0,
      indiceNps: 100,
      quejasPendientes: 0,
      quejasResueltas: 0,
      tasaCincoEstrellas: 100,
      promedioComida: 5.0,
      promedioServicio: 5.0,
      promedioTiempo: 5.0,
      promedioEmpaque: 0,
      topTagsPositivos: [{ tag: 'sabor_increible', label: 'Sabor increíble', count: 1 }],
      topTagsConstructivos: [],
    },
    loading: false,
    filtros: {
      canal: 'todos',
      calificacion: 'todas',
      soloQuejas: false,
      estado: 'todos',
      busqueda: '',
    },
    setFiltros: vi.fn(),
    actualizarFiltro: vi.fn(),
    limpiarFiltros: vi.fn(),
    cambiarEstado: vi.fn(),
    eliminarEncuestaAction: vi.fn(),
    guardarConfiguracionAction: vi.fn(),
    exportarCsv: vi.fn(),
  }),
}));

import { SatisfaccionPage } from '../SatisfaccionPage';

describe('SatisfaccionPage', () => {
  it('renderiza título, KPIs de NPS, tarjeta de reseña y botones de acción', () => {
    const html = renderToStaticMarkup(<SatisfaccionPage />);

    expect(html).toContain('Satisfacción del Cliente &amp; Reseñas');
    expect(html).toContain('NPS &amp; Google Reviews');
    expect(html).toContain('Sofia Lopez');
    expect(html).toContain('5.0');
    expect(html).toContain('Excelente servicio y sabor');
    expect(html).toContain('Exportar CSV');
    expect(html).toContain('Configurar Google &amp; Alertas');
  });
});
