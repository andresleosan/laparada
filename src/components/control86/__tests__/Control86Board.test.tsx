import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Timestamp } from 'firebase/firestore';
import { Control86Board } from '../Control86Board';
import { EspecialesDelDiaBanner } from '../EspecialesDelDiaBanner';
import {
  calcularResumenTablero86,
  construirItemsTablero86,
  sanitizarControl86,
  sanitizarEspecialDelDia,
} from '@/utils/control86Utils';
import type { Combo, Producto } from '@/types';

const now = new Date('2026-11-28T17:00:00.000Z'); // Sábado 12:00 PM Colombia

const mockProductos: Producto[] = [
  {
    id: 'p1',
    nombre: 'Tequeño Artesanal',
    descripcion: 'Queso fresco',
    categoria: 'Entradas',
    precio: 12000,
    disponible: false,
    control86: sanitizarControl86({
      agotado86: true,
      motivo86: 'sin_insumos',
      nota86: 'Esperando pedido de queso',
    }),
    negocioId: 'laparada',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
  {
    id: 'p2',
    nombre: 'Costilla Ahumada',
    descripcion: 'Salsa BBQ de la casa',
    categoria: 'Parrilla',
    precio: 34000,
    disponible: true,
    control86: sanitizarControl86({
      contadorActivo: true,
      porcionesDisponibles: 3,
      umbralAlertaPorciones: 5,
    }),
    especialDelDia: sanitizarEspecialDelDia({
      activo: true,
      etiqueta: 'Sugerencia del Chef',
      diasSemana: [],
      mensajeSugerido: 'Cocción lenta 6 horas',
    }),
    negocioId: 'laparada',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
];

const mockCombos: Combo[] = [
  {
    id: 'c1',
    nombre: 'Combo Familiar',
    descripcion: 'Para 4 personas',
    categoria: 'Combos',
    items: [],
    precioEspecial: 65000,
    disponible: true,
    negocioId: 'laparada',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
];

describe('Control86Board y EspecialesDelDiaBanner', () => {
  it('renderiza los KPIs, acciones 1-toque, contadores y especial vigente en el tablero', () => {
    const items = construirItemsTablero86(mockProductos, mockCombos, now);
    const resumen = calcularResumenTablero86(mockProductos, mockCombos, now);

    const html = renderToStaticMarkup(
      <Control86Board
        nombreNegocio="La Parada"
        productos={mockProductos}
        combos={mockCombos}
        items={items}
        resumen={resumen}
        ahora={now}
        puedeConfigurarEspeciales
        onMarcar86={vi.fn()}
        onReactivar86={vi.fn()}
        onAjustarPorciones={vi.fn()}
        onAjustarPorcionesDelta={vi.fn()}
        onGuardarEspecial={vi.fn()}
        onRestablecerTodos={vi.fn()}
      />
    );

    expect(html).toContain('En 86 (Agotados)');
    expect(html).toContain('Últimas porciones');
    expect(html).toContain('Tequeño Artesanal');
    expect(html).toContain('86 · Agotado hoy');
    expect(html).toContain('Esperando pedido de queso');
    expect(html).toContain('Reactivar');
    expect(html).toContain('Costilla Ahumada');
    expect(html).toContain('¡Últimas 3!');
    expect(html).toContain('Sugerencia del Chef');
    expect(html).toContain('Combo Familiar');
    expect(html).toContain('Marcar 86');
    expect(html).toContain('Restablecer todos (1)');
  });

  it('renderiza el banner público de Especiales de Hoy solo para especiales vigentes disponibles', () => {
    const html = renderToStaticMarkup(
      <EspecialesDelDiaBanner
        productos={mockProductos}
        combos={mockCombos}
        ahora={now}
        onSeleccionarItem={vi.fn()}
      />
    );

    expect(html).toContain('Especiales de Hoy en Cocina');
    expect(html).toContain('Costilla Ahumada');
    expect(html).toContain('Sugerencia del Chef');
    expect(html).toContain('Cocción lenta 6 horas');
    expect(html).toContain('3 disp.');
    expect(html).not.toContain('Tequeño Artesanal');
  });
});
