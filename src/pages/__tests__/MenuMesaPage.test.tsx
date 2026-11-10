import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MenuMesaPage } from '../MenuMesaPage';

vi.mock('@/services/negociosService', () => ({
  getNegocioPorSlug: vi.fn().mockResolvedValue({
    id: 'laparada',
    nombre: 'La Parada Gourmet',
    slug: 'laparada',
    estado: 'activo',
  }),
}));

vi.mock('@/services/productosService', () => ({
  getProductos: vi.fn().mockResolvedValue([
    { id: 'p1', nombre: 'Burger Clásica', precio: 22000, categoria: 'Hamburguesas', disponible: true },
  ]),
  getCombos: vi.fn().mockResolvedValue([
    { id: 'c1', nombre: 'Combo Amigos', precio: 45000, disponible: true },
  ]),
}));

vi.mock('@/services/mesasService', () => ({
  getMesaPorNumero: vi.fn().mockResolvedValue({
    id: 'm1',
    numero: 1,
    nombre: 'Mesa 1',
    capacidad: 4,
    zona: 'Salón',
    estado: 'libre',
    negocioId: 'laparada',
  }),
  onMesaChange: vi.fn().mockReturnValue(() => {}),
  onCuentaMesaChange: vi.fn().mockReturnValue(() => {}),
}));

describe('MenuMesaPage', () => {
  it('renderiza la estructura inicial de la página del menú en mesa', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/mesa/laparada/1']}>
        <Routes>
          <Route path="/mesa/:slug/:numeroMesa" element={<MenuMesaPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('Cargando menú de tu mesa...');
  });
});
