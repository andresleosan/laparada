import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  StorefrontCuentaCorrienteModal,
  formatearMensajeSolicitudCuentaCorriente,
  type SolicitudCuentaCorrienteConfirmada,
} from '../StorefrontCuentaCorrienteModal';
import { generarUrlWhatsAppReserva } from '@/utils/reservasUtils';

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

describe('StorefrontCuentaCorrienteModal', () => {
  it('renderiza modalidades de cuenta, cupos sugeridos, plazos de corte y resumen 100% offline', () => {
    const html = renderToStaticMarkup(
      <StorefrontCuentaCorrienteModal
        isOpen={true}
        onClose={vi.fn()}
        negocioNombre="La Parada"
        negocioTelefono="3104445566"
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Cuenta Corriente &amp; Convenio Corporativo');
    expect(html).toContain('Convenio Corporativo / Empresa');
    expect(html).toContain('Cliente Frecuente / Personal');
    expect(html).toContain('100% Offline');
    expect(html).toContain('0% Intereses');
    expect(html).toContain('350.000');
    expect(html).toContain('500.000');
    expect(html).toContain('15 días · Quincenal');
    expect(html).toContain('Transferencia / Nequi / Daviplata');
    expect(html).toContain('Efectivo en mostrador');
    expect(html).toContain('data-testid="storefront-cuenta-corriente-resumen-vivo"');
    expect(html).toContain('id="storefront-cartera-nombre"');
    expect(html).toContain('id="storefront-cartera-telefono"');
    expect(html).toContain('id="storefront-cartera-empresa"');
    expect(html).toContain('id="storefront-cartera-nit"');
    expect(html).toContain('data-testid="btn-confirmar-cuenta-corriente-storefront"');
  });

  it('no renderiza contenido cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <StorefrontCuentaCorrienteModal
        isOpen={false}
        onClose={vi.fn()}
        negocioNombre="La Parada"
        negocioTelefono="3104445566"
      />
    );

    expect(html).toBe('');
  });

  it('construye mensaje formal 100% offline y enlace de WhatsApp con empresa, NIT, cupo y plazo', () => {
    const solicitud: SolicitudCuentaCorrienteConfirmada = {
      radicado: 'CTA-4821',
      tipoCuenta: 'corporativo',
      cupoSolicitadoCOP: 500000,
      plazoDias: 15,
      metodoAbonoPreferido: 'transferencia',
      clienteNombre: 'Andrés Gómez',
      clienteTelefono: '3158889900',
      empresa: 'Clínica Norte SAS',
      nit: '901.234.567-8',
      notas: 'Autorizados: María y Carlos',
    };

    const mensaje = formatearMensajeSolicitudCuentaCorriente(solicitud, 'La Parada');
    expect(mensaje).toContain('CTA-4821');
    expect(mensaje).toContain('Convenio Corporativo / Empresa');
    expect(mensaje).toContain('500.000');
    expect(mensaje).toContain('15 días');
    expect(mensaje).toContain('Clínica Norte SAS');
    expect(mensaje).toContain('901.234.567-8');
    expect(mensaje).toContain('Transferencia bancaria / Nequi / Daviplata (offline)');

    const url = generarUrlWhatsAppReserva('3104445566', mensaje);
    expect(url).toMatch(/^https:\/\/wa\.me\/573104445566\?text=/);
    expect(decodeURIComponent(url)).toContain('Clínica Norte SAS');
  });
});
