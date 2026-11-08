import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CampanaWhatsAppModal } from '../CampanaWhatsAppModal';
import type { Cliente } from '@/types';

const clienteMock: Cliente = {
  id: 'c-campana-1',
  negocioId: 'laparada',
  nombre: 'Esteban Morales',
  telefono: '3007654321',
  direcciones: ['Calle 15 # 4-20'],
  barrio: 'Popular',
  totalPedidos: 6,
  totalConsumido: 140000,
  primerPedidoEn: new Date('2026-01-01'),
  ultimoPedidoEn: new Date('2026-10-01'), // > 30 días, inactivo
  origenRegistro: 'pos',
  creadoEn: new Date('2026-01-01'),
  actualizadoEn: new Date('2026-10-01'),
  sellosActuales: 3,
  metaSellos: 6,
  recompensasDisponibles: 1,
  recompensasRedimidas: 1,
};

describe('CampanaWhatsAppModal', () => {
  it('no renderiza nada cuando isOpen es false o cliente es null', () => {
    const html = renderToStaticMarkup(
      <CampanaWhatsAppModal
        cliente={clienteMock}
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza el modal accesible con selector de plantillas y vista previa de WhatsApp', () => {
    const html = renderToStaticMarkup(
      <CampanaWhatsAppModal
        cliente={clienteMock}
        isOpen={true}
        onClose={vi.fn()}
        nombreNegocio="La Parada"
      />
    );

    expect(html).toContain('Campaña WhatsApp Directa');
    expect(html).toContain('Esteban Morales');
    expect(html).toContain('300 765 4321');
    expect(html).toContain('¡Te extrañamos!');
    expect(html).toContain('¡Recompensa Lista!');
    expect(html).toContain('Avance de Sellos');
    expect(html).toContain('Agradecimiento VIP');
    expect(html).toContain('Abrir WhatsApp');
    expect(html).toContain('Copiar Texto');
  });
});
