import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LiquidacionResumenCard } from '../LiquidacionResumenCard';
import { formatCOP } from '@/utils/formatCOP';

describe('LiquidacionResumenCard', () => {
  const liquidacion = {
    totalEntregas: 5,
    totalEfectivo: 85000,
    totalTransferencia: 42000,
    granTotal: 127000,
    entregas: [],
  };

  it('muestra las métricas clave de la liquidación de la jornada', () => {
    const html = renderToStaticMarkup(
      <LiquidacionResumenCard liquidacion={liquidacion} repartidorNombre="Carlos Moto" />
    );

    expect(html).toContain('Turno: Carlos Moto');
    expect(html).toContain('5');
    expect(html).toContain(formatCOP(85000));
    expect(html).toContain(formatCOP(42000));
    expect(html).toContain('Efectivo en Mano');
    expect(html).toContain('Transferencias');
  });

  it('posee el aria-label descriptivo y botón accesible de desglose', () => {
    const html = renderToStaticMarkup(<LiquidacionResumenCard liquidacion={liquidacion} />);

    expect(html).toContain('aria-label="Liquidación de jornada del repartidor"');
    expect(html).toContain('aria-label="Ver desglose de liquidación"');
    expect(html).toContain('aria-expanded="false"');
  });
});
