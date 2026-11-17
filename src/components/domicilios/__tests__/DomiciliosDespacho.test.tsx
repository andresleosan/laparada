import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Domicilio } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { getConfiguracionZonasDefault } from '@/utils/despachoDomiciliosUtils';
import { DomicilioCard } from '../DomicilioCard';
import { AsignarRepartidorModal } from '../AsignarRepartidorModal';
import { ConfigurarZonasDomicilioModal } from '../ConfigurarZonasDomicilioModal';

const creadoBase = new Date('2026-11-17T18:00:00Z');

const mockDomicilioBase: Domicilio = {
  id: 'dom-abc123',
  negocioId: 'laparada',
  clienteNombre: 'Juliana Morales',
  clienteTelefono: '3112223344',
  direccion: 'Av 1 # 12-40',
  barrio: 'Caobos',
  zonaDomicilioNombre: 'Cercana (Centro - Caobos)',
  costoEnvio: 4000,
  tiempoEstimadoMin: 25,
  rastreoToken: '0123456789abcdef0123456789abcdef',
  items: [
    {
      tipo: 'producto',
      referenciaId: 'p1',
      nombre: 'Combo La Parada',
      cantidad: 1,
      precioUnitario: 24000,
      subtotal: 24000,
    },
  ],
  total: 28000,
  metodoPago: 'efectivo',
  origen: 'whatsapp',
  estado: 'en_preparacion',
  creadoEn: creadoBase as unknown as Domicilio['creadoEn'],
  actualizadoEn: creadoBase as unknown as Domicilio['actualizadoEn'],
};

describe('DomiciliosDespacho components', () => {
  it('renderiza DomicilioCard con zona, envío, SLA en tiempo, selección y accesos rápidos', () => {
    const html = renderToStaticMarkup(
      <DomicilioCard
        domicilio={mockDomicilioBase}
        negocioNombre="La Parada"
        onEstadoChange={vi.fn()}
        seleccionado
        onToggleSeleccion={vi.fn()}
        onAbrirAsignarRepartidor={vi.fn()}
        ahoraMs={creadoBase.getTime() + 10 * 60000}
      />
    );

    expect(html).toContain('Juliana Morales');
    expect(html).toContain('Barrio: Caobos');
    expect(html).toContain('Cercana (Centro - Caobos)');
    expect(html).toContain(formatCOP(4000));
    expect(html).toContain(formatCOP(28000));
    expect(html).toContain('10 min · A tiempo');
    expect(html).toContain('Asignar repartidor');
    expect(html).toContain('Deseleccionar domicilio de Juliana Morales');
    expect(html).toContain('google.com/maps');
    expect(html).toContain('wa.me/573112223344');
    expect(html).toContain('/rastreo/0123456789abcdef0123456789abcdef');
  });

  it('muestra alerta SLA crítica y nombre de repartidor asignado', () => {
    const html = renderToStaticMarkup(
      <DomicilioCard
        domicilio={{
          ...mockDomicilioBase,
          estado: 'en_camino',
          domiciliarioNombre: 'Mateo Rojas',
        }}
        onEstadoChange={vi.fn()}
        onAbrirAsignarRepartidor={vi.fn()}
        ahoraMs={creadoBase.getTime() + 42 * 60000}
      />
    );

    expect(html).toContain('42 min · ¡Demorado!');
    expect(html).toContain('Mateo Rojas');
    expect(html).toContain('Reasignar');
  });

  it('no renderiza los modales cuando isOpen es false', () => {
    const modalRepartidor = renderToStaticMarkup(
      <AsignarRepartidorModal
        isOpen={false}
        domiciliosObjetivo={[mockDomicilioBase]}
        repartidoresSugeridos={[]}
        negocioNombre="La Parada"
        onConfirmar={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(modalRepartidor).toBe('');

    const modalZonas = renderToStaticMarkup(
      <ConfigurarZonasDomicilioModal
        isOpen={false}
        configuracion={getConfiguracionZonasDefault('laparada')}
        onGuardar={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(modalZonas).toBe('');
  });
});
