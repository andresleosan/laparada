import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TarjetaSellosDigital } from '../TarjetaSellosDigital';
import type { Cliente } from '@/types';

const clienteMock: Cliente = {
  id: 'c-fidelizado-1',
  negocioId: 'laparada',
  nombre: 'Carolina Herrera',
  telefono: '3123456789',
  direcciones: ['Av 0 #10-20'],
  barrio: 'La Playa',
  totalPedidos: 5,
  totalConsumido: 125000,
  primerPedidoEn: new Date('2026-01-01'),
  ultimoPedidoEn: new Date('2026-11-01'),
  origenRegistro: 'pos',
  creadoEn: new Date('2026-01-01'),
  actualizadoEn: new Date('2026-11-01'),
  sellosActuales: 4,
  metaSellos: 6,
  recompensasDisponibles: 1,
  recompensasRedimidas: 2,
};

describe('TarjetaSellosDigital', () => {
  it('renderiza la tarjeta completa con nivel VIP, sellos acumulados y banner de recompensa', () => {
    const html = renderToStaticMarkup(
      <TarjetaSellosDigital
        cliente={clienteMock}
        onCanjearRecompensa={vi.fn()}
        onAjustarSellos={vi.fn()}
      />
    );

    expect(html).toContain('Tarjeta Digital de Sellos');
    expect(html).toContain('Club de Fidelización');
    expect(html).toContain('VIP Plata');
    expect(html).toContain('4');
    expect(html).toContain('6');
    expect(html).toContain('¡1 Recompensa(s) Disponible(s)!');
    expect(html).toContain('Canjear Recompensa');
    expect(html).toContain('+1 Sello');
    expect(html).toContain('-1 Sello');
  });

  it('renderiza en modo compacto para POS con indicador de progreso', () => {
    const html = renderToStaticMarkup(
      <TarjetaSellosDigital
        cliente={clienteMock}
        compacto={true}
        onCanjearRecompensa={vi.fn()}
      />
    );

    expect(html).toContain('Tarjeta de Sellos');
    expect(html).toContain('4 / 6 sellos');
    expect(html).toContain('¡1 recompensa(s) para canjear!');
    expect(html).toContain('Canjear');
  });
});
