import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NegocioQRCard } from '../NegocioQRCard';
import { Negocio } from '@/types/negocio';
import { Timestamp } from 'firebase/firestore';

describe('NegocioQRCard', () => {
  const mockNegocio: Negocio = {
    id: 'local-test',
    nombre: 'Parrilla Central',
    slug: 'parrilla-central',
    propietarioEmail: 'propietario@example.com',
    propietarioNombre: 'Carlos Gómez',
    telefono: '3123456789',
    ciudad: 'Cúcuta',
    direccion: 'Avenida 5 # 10-20',
    estado: 'activo',
    creadoEn: Timestamp.now(),
  };

  it('renderiza el título, nombre y enlace público del negocio', () => {
    const html = renderToStaticMarkup(<NegocioQRCard negocio={mockNegocio} />);

    expect(html).toContain('Enlace de tu Tienda &amp; Código QR');
    expect(html).toContain('/tienda/parrilla-central');
    expect(html).toContain('Copiar Enlace');
    expect(html).toContain('Ver Tienda');
    expect(html).toContain('Descargar Afiche (PNG)');
  });

  it('ofrece la insignia de tienda activa y sugerencia para mesas', () => {
    const html = renderToStaticMarkup(<NegocioQRCard negocio={mockNegocio} />);

    expect(html).toContain('Tienda en Línea Activa');
    expect(html).toContain('Afiche Imprimible para Mesas y Mostrador');
  });
});

