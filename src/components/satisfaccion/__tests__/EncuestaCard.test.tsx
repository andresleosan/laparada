import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EncuestaCard } from '../EncuestaCard';
import type { EncuestaSatisfaccion } from '@/types/satisfaccion';

describe('EncuestaCard', () => {
  const mockEncuesta5: EncuestaSatisfaccion = {
    id: 'enc-1',
    negocioId: 'laparada',
    calificacion: 5,
    tipoNps: 'promotor',
    canal: 'mesa',
    mesaNombre: 'Mesa 4',
    meseroNombre: 'Carlos',
    clienteNombre: 'Andres Gomez',
    clienteTelefono: '3001234567',
    dimensiones: {
      comida: 5,
      servicio: 5,
      tiempo: 4,
    },
    tags: ['sabor_increible', 'excelente_servicio'],
    comentario: 'La mejor hamburguesa de Cúcuta',
    esQueja: false,
    redirigidoGoogleReviews: true,
    contactadoPorWhatsApp: false,
    estado: 'resuelta',
    creadoEn: '2026-11-08T19:30:00Z',
  };

  const mockEncuestaQueja: EncuestaSatisfaccion = {
    id: 'enc-queja',
    negocioId: 'laparada',
    calificacion: 1,
    tipoNps: 'detractor',
    canal: 'domicilio',
    clienteNombre: 'Maria Perez',
    clienteTelefono: '3109876543',
    dimensiones: {
      comida: 1,
      empaque: 2,
    },
    tags: ['comida_fria', 'empaque_danado'],
    comentario: 'La comida llegó fría y la salsa derramada',
    esQueja: true,
    redirigidoGoogleReviews: false,
    contactadoPorWhatsApp: false,
    estado: 'nueva',
    creadoEn: '2026-11-08T20:15:00Z',
  };

  it('renderiza correctamente una reseña de 5 estrellas con etiquetas y comentario', () => {
    const html = renderToStaticMarkup(
      <EncuestaCard
        encuesta={mockEncuesta5}
        nombreNegocio="La Parada"
        googleBusinessUrl="https://g.page/r/laparada/review"
        onGestionar={vi.fn()}
        onEliminar={vi.fn()}
      />
    );

    expect(html).toContain('Andres Gomez');
    expect(html).toContain('Mesa 4');
    expect(html).toContain('5.0');
    expect(html).toContain('promotor');
    expect(html).toContain('Sabor increíble');
    expect(html).toContain('Excelente servicio');
    expect(html).toContain('La mejor hamburguesa de Cúcuta');
    expect(html).toContain('Google Maps');
  });

  it('renderiza badge de queja crítica y botón para contactar por WhatsApp', () => {
    const html = renderToStaticMarkup(
      <EncuestaCard
        encuesta={mockEncuestaQueja}
        nombreNegocio="La Parada"
        onGestionar={vi.fn()}
        onEliminar={vi.fn()}
      />
    );

    expect(html).toContain('Queja Crítica');
    expect(html).toContain('Maria Perez');
    expect(html).toContain('Comida fría');
    expect(html).toContain('Empaque derramado');
    expect(html).toContain('Responder Queja');
    expect(html).toContain('https://wa.me/573109876543');
  });
});
