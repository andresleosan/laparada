import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  MODALIDADES_COMPENSACION_OFFLINE,
  MOTIVOS_DEVOLUCION_STOREFRONT,
  PILARES_GARANTIA_FRESCURA_LA_PARADA,
  StorefrontGarantiaReposicionModal,
  construirMensajeWhatsAppGarantiaStorefront,
  generarUrlWhatsAppGarantiaStorefront,
} from '../StorefrontGarantiaReposicionModal';

vi.mock('@/components/storefront/StorefrontDialog', () => ({
  StorefrontDialog: ({
    children,
    labelledBy,
    className,
  }: {
    children: ReactNode;
    labelledBy: string;
    className: string;
  }) => (
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={className}>
      {children}
    </div>
  ),
}));

describe('StorefrontGarantiaReposicionModal', () => {
  it('renderiza los 4 pilares de frescura, platos, motivos y modalidades 100% offline', () => {
    const html = renderToStaticMarkup(
      <StorefrontGarantiaReposicionModal
        isOpen={true}
        onClose={vi.fn()}
        negocioNombre="La Parada"
        negocioTelefono="3158889900"
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Garantía de Frescura 100% &amp; Reposición de Producto');
    expect(html).toContain('data-testid="storefront-garantia-pilares"');

    for (const pilar of PILARES_GARANTIA_FRESCURA_LA_PARADA) {
      expect(html).toContain(pilar.titulo);
    }

    for (const motivo of MOTIVOS_DEVOLUCION_STOREFRONT) {
      expect(html).toContain(motivo.label);
    }

    for (const mod of MODALIDADES_COMPENSACION_OFFLINE) {
      expect(html).toContain(mod.label);
    }

    expect(html).toContain('id="storefront-garantia-codigo"');
    expect(html).toContain('id="storefront-garantia-nombre"');
    expect(html).toContain('id="storefront-garantia-telefono"');
    expect(html).toContain('data-testid="btn-confirmar-garantia-storefront"');
    expect(html).toContain('100% offline');
    expect(html).toContain('sin pasarelas en línea');
    expect(html).not.toContain('tarjeta de crédito');
  });

  it('no renderiza contenido cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <StorefrontGarantiaReposicionModal
        isOpen={false}
        onClose={vi.fn()}
        negocioNombre="La Parada"
      />
    );

    expect(html).toBe('');
  });

  it('construye mensaje de WhatsApp y URL https://wa.me/ para solicitud de garantía offline', () => {
    const mensaje = construirMensajeWhatsAppGarantiaStorefront({
      negocioNombre: 'La Parada',
      solicitud: {
        radicado: 'GAR-ABC12',
        platoNombre: 'Combo Arma tu Parada',
        motivo: MOTIVOS_DEVOLUCION_STOREFRONT[0],
        modalidad: MODALIDADES_COMPENSACION_OFFLINE[0],
        codigoPedido: 'LP-8899',
        clienteNombre: 'Carlos Mendoza',
        clienteTelefono: '3158889900',
        notas: 'Llegó frío por demora en tráfico',
      },
    });

    const url = generarUrlWhatsAppGarantiaStorefront('3158889900', mensaje);

    expect(mensaje).toContain('GAR-ABC12');
    expect(mensaje).toContain('LP-8899');
    expect(mensaje).toContain('Carlos Mendoza');
    expect(mensaje).toContain('Combo Arma tu Parada');
    expect(mensaje).toContain('Temperatura o textura al llegar');
    expect(mensaje).toContain('Reposición inmediata del plato');
    expect(url).toMatch(/^https:\/\/wa\.me\/573158889900\?text=/);
  });
});
