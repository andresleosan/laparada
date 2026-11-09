import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/satisfaccionService', () => ({
  getConfiguracionSatisfaccion: vi.fn().mockResolvedValue({
    negocioId: 'laparada',
    googleBusinessUrl: 'https://g.page/r/laparada/review',
    telefonoAtencionQuejas: '3001234567',
    habilitarRedireccionGoogle: true,
  }),
  guardarEncuestaSatisfaccion: vi.fn().mockResolvedValue('new-enc-123'),
}));

import { EncuestaSatisfaccionPage } from '../EncuestaSatisfaccionPage';

describe('EncuestaSatisfaccionPage', () => {
  it('renderiza el formulario de calificación móvil con 5 estrellas, tags y comentarios', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/calificar?negocio=laparada&mesa=Mesa+5&cliente=Camilo']}>
        <EncuestaSatisfaccionPage />
      </MemoryRouter>
    );

    expect(html).toContain('LA PARADA');
    expect(html).toContain('Mesa: Mesa 5');
    expect(html).toContain('¿Cómo calificarías tu experiencia?');
    expect(html).toContain('¡Increíble! Me encantó');
    expect(html).toContain('Sabor increíble');
    expect(html).toContain('Enviar Calificación');
  });
});
