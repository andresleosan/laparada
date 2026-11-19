import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  StorefrontBonoRegaloModal,
  formatearMensajeSolicitudBonoStorefront,
  type SolicitudBonoStorefrontConfirmada,
} from '../StorefrontBonoRegaloModal';
import { generarUrlWhatsAppBono } from '@/utils/bonosUtils';

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

describe('StorefrontBonoRegaloModal', () => {
  it('renderiza modalidades, valores sugeridos, vigencias, opciones 100% offline y previsualización sin pasarelas online', () => {
    const html = renderToStaticMarkup(
      <StorefrontBonoRegaloModal
        isOpen={true}
        onClose={vi.fn()}
        negocioNombre="La Parada"
        negocioTelefono="3104445566"
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Bonos de Regalo &amp; Tarjetas Prepago');
    expect(html).toContain('Bono de Regalo');
    expect(html).toContain('Tarjeta Prepago');
    expect(html).toContain('Vale de Consumo');
    expect(html).toContain('20.000');
    expect(html).toContain('50.000');
    expect(html).toContain('100.000');
    expect(html).toContain('200.000');
    expect(html).toContain('90 días');
    expect(html).toContain('180 días');
    expect(html).toContain('100% Offline');
    expect(html).toContain('Transferencia / Nequi / Daviplata');
    expect(html).toContain('Efectivo en mostrador');
    expect(html).toContain('data-testid="storefront-bono-resumen-vivo"');
    expect(html).toContain('id="storefront-bono-destinatario"');
    expect(html).toContain('id="storefront-bono-comprador"');
    expect(html).toContain('id="storefront-bono-comprador-tel"');
    expect(html).toContain('id="storefront-bono-mensaje"');
    expect(html).toContain('data-testid="btn-confirmar-bono-storefront"');
    expect(html).toContain('Sin pasarelas de pago en línea ni comisiones adicionales.');
  });

  it('no renderiza contenido cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <StorefrontBonoRegaloModal
        isOpen={false}
        onClose={vi.fn()}
        negocioNombre="La Parada"
        negocioTelefono="3104445566"
      />
    );

    expect(html).toBe('');
  });

  it('construye mensaje formal 100% offline y enlace de WhatsApp con modalidad, valor, vigencia y dedicatoria', () => {
    const solicitud: SolicitudBonoStorefrontConfirmada = {
      radicado: 'BON-SOL-7741',
      tipo: 'bono_regalo',
      montoCOP: 100000,
      vigenciaDias: 180,
      recargable: true,
      metodoPagoPreferido: 'transferencia',
      ocasion: 'cumpleanos',
      compradorNombre: 'Laura Méndez',
      compradorTelefono: '3147778899',
      destinatarioNombre: 'Camila Rojas',
      destinatarioTelefono: '3124445566',
      mensajeRegalo: '¡Feliz cumpleaños! Disfruta tus favoritos en La Parada.',
    };

    const mensaje = formatearMensajeSolicitudBonoStorefront(solicitud, 'La Parada');
    expect(mensaje).toContain('BON-SOL-7741');
    expect(mensaje).toContain('Bono de Regalo');
    expect(mensaje).toContain('100.000');
    expect(mensaje).toContain('180 días');
    expect(mensaje).toContain('Cumpleaños');
    expect(mensaje).toContain('Camila Rojas');
    expect(mensaje).toContain('Laura Méndez');
    expect(mensaje).toContain('¡Feliz cumpleaños! Disfruta tus favoritos en La Parada.');
    expect(mensaje).toContain('Transferencia bancaria / Nequi / Daviplata (offline)');
    expect(mensaje).toContain('pago offline en caja o por transferencia');

    const url = generarUrlWhatsAppBono('3104445566', mensaje);
    expect(url).toMatch(/^https:\/\/wa\.me\/573104445566\?text=/);
    expect(decodeURIComponent(url)).toContain('Camila Rojas');
    expect(decodeURIComponent(url)).toContain('BON-SOL-7741');
  });
});
