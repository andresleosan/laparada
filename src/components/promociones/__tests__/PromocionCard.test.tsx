import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PromocionCard } from '../PromocionCard';
import type { Promocion } from '@/types/promocion';
import { formatCOP } from '@/utils/formatCOP';

describe('PromocionCard', () => {
  const promoHappyHour: Promocion = {
    id: 'promo-1',
    negocioId: 'laparada',
    nombre: 'Happy Hour Hamburguesas',
    descripcion: '20% OFF en todas las hamburguesas artesanales',
    tipo: 'happy_hour',
    canales: ['todos'],
    activo: true,
    diasSemana: [1, 2, 3, 4, 5],
    horaInicio: '17:00',
    horaFin: '20:00',
    tipoDescuento: 'porcentaje',
    valorDescuento: 20,
    categoriaIds: ['cat-1'],
    creadoEn: '2026-11-01',
  };

  const promoCupon: Promocion = {
    id: 'promo-cupon',
    negocioId: 'laparada',
    nombre: 'Bono $15.000 Descuento',
    descripcion: 'Aplica en pedidos superiores a $50.000 COP',
    tipo: 'cupon_descuento',
    canales: ['todos'],
    activo: true,
    diasSemana: [],
    tipoDescuento: 'monto_fijo',
    valorDescuento: 15000,
    montoMinimoSubtotal: 50000,
    codigoCupon: 'PARADA15',
    limiteUsos: 100,
    usosActuales: 25,
    creadoEn: '2026-11-01',
  };

  it('renderiza título, descripción, tipo y beneficio de la promoción', () => {
    const html = renderToStaticMarkup(
      <PromocionCard
        promocion={promoHappyHour}
        negocioNombre="La Parada"
        negocioSlug="laparada"
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
        onToggleActivo={vi.fn()}
        onVerQr={vi.fn()}
      />
    );

    expect(html).toContain('Happy Hour Hamburguesas');
    expect(html).toContain('20% OFF en todas las hamburguesas artesanales');
    expect(html).toContain('Happy Hour');
    expect(html).toContain('20% OFF');
  });

  it('muestra badge "En Vivo Ahora" cuando coincide con el horario y día', () => {
    // Miércoles a las 18:00
    const relojEnVivo = new Date(2026, 10, 4, 18, 0, 0);

    const html = renderToStaticMarkup(
      <PromocionCard
        promocion={promoHappyHour}
        negocioNombre="La Parada"
        negocioSlug="laparada"
        reloj={relojEnVivo}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
        onToggleActivo={vi.fn()}
        onVerQr={vi.fn()}
      />
    );

    expect(html).toContain('En Vivo Ahora');
  });

  it('renderiza código de cupón, botón de copiar y barra de progreso de usos', () => {
    const html = renderToStaticMarkup(
      <PromocionCard
        promocion={promoCupon}
        negocioNombre="La Parada"
        negocioSlug="laparada"
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
        onToggleActivo={vi.fn()}
        onVerQr={vi.fn()}
      />
    );

    expect(html).toContain('PARADA15');
    expect(html).toContain(formatCOP(15000));
    expect(html).toContain('25 / 100');
    expect(html).toContain('Mínimo:');
    expect(html).toContain(formatCOP(50000));
  });
});
