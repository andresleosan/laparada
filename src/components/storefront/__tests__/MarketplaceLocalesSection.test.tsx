import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { MarketplaceLocalesSection } from '../MarketplaceLocalesSection';
import { Negocio } from '@/types/negocio';
import { Timestamp } from 'firebase/firestore';

describe('MarketplaceLocalesSection', () => {
  const mockLocales: Negocio[] = [
    {
      id: 'laparada',
      nombre: 'La Parada',
      slug: 'la-parada',
      propietarioEmail: 'andres@example.com',
      propietarioNombre: 'Andrés',
      telefono: '3001234567',
      ciudad: 'Cúcuta',
      direccion: 'Calle Principal',
      estado: 'activo',
      creadoEn: Timestamp.now(),
    },
    {
      id: 'local-el-punto',
      nombre: 'El Punto Burger',
      slug: 'el-punto-burger',
      propietarioEmail: 'elpunt@example.com',
      propietarioNombre: 'Laura',
      telefono: '3119876543',
      ciudad: 'Los Patios',
      direccion: 'Carrera 10 # 5-20',
      estado: 'activo',
      creadoEn: Timestamp.now(),
    },
  ];

  it('renderiza el encabezado del directorio gastronómico y los locales activos', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MarketplaceLocalesSection locales={mockLocales} />
      </MemoryRouter>
    );

    expect(html).toContain('Directorio Gastronómico');
    expect(html).toContain('Locales y Puestos Aliados');
    expect(html).toContain('La Parada');
    expect(html).toContain('El Punto Burger');
    expect(html).toContain('Cúcuta');
    expect(html).toContain('Los Patios');
    expect(html).toContain('Ver Menú');
  });

  it('muestra estado vacío amigable si no hay locales activos', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MarketplaceLocalesSection locales={[]} />
      </MemoryRouter>
    );

    expect(html).toContain('No encontramos locales con ese criterio');
  });
});

