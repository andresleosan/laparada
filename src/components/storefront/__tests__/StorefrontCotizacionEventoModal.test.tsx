import type { ReactNode } from 'react';
import { Timestamp } from 'firebase/firestore';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  PAQUETES_EVENTO_SUGERIDOS,
  StorefrontCotizacionEventoModal,
  construirMensajeWhatsAppSolicitudEvento,
  type SolicitudCotizacionEventoConfirmada,
} from '../StorefrontCotizacionEventoModal';
import type { Combo, Producto } from '@/types';
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

const NOW_TS = Timestamp.fromDate(new Date('2026-11-18T12:00:00Z'));

const PRODUCTOS_MOCK: Producto[] = [
  {
    id: 'prod-1',
    negocioId: 'laparada',
    nombre: 'Tequeños Artesanales x6',
    precio: 14000,
    categoria: 'fritos',
    disponible: true,
    descripcion: 'Crujientes con queso costeño',
    creadoEn: NOW_TS,
    actualizadoEn: NOW_TS,
  },
];

const COMBOS_MOCK: Combo[] = [
  {
    id: 'combo-1',
    negocioId: 'laparada',
    nombre: 'Combo La Parada',
    precioEspecial: 20000,
    items: [],
    disponible: true,
    descripcion: 'Combo estrella',
    creadoEn: NOW_TS,
    actualizadoEn: NOW_TS,
  },
];

describe('StorefrontCotizacionEventoModal', () => {
  it('renderiza tipos de evento, paquetes sugeridos, servicios públicos y resumen 100% offline sin costos internos', () => {
    const html = renderToStaticMarkup(
      <StorefrontCotizacionEventoModal
        isOpen={true}
        onClose={vi.fn()}
        negocioNombre="La Parada"
        negocioTelefono="3150001122"
        productos={PRODUCTOS_MOCK}
        combos={COMBOS_MOCK}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Cotización de Eventos &amp; Catering');
    expect(html).toContain('data-testid="storefront-cotizacion-paquetes"');
    expect(html).toContain('data-testid="storefront-cotizacion-resumen-vivo"');

    for (const paquete of PAQUETES_EVENTO_SUGERIDOS) {
      expect(html).toContain(paquete.nombre.replace(/&/g, '&amp;'));
    }

    // Por defecto: 30 invitados * $22.000 = $660.000 y anticipo 50% offline = $330.000
    expect(html).toContain('660.000');
    expect(html).toContain('330.000');
    expect(html).toContain('100% offline');

    // Nunca expone costos internos de servicios extra ($18.000, $11.000, $60.000, $45.000)
    expect(html).not.toContain('18.000');
    expect(html).not.toContain('costoEstimado');

    // Campos obligatorios accesibles
    expect(html).toContain('id="storefront-cotizacion-nombre"');
    expect(html).toContain('id="storefront-cotizacion-empresa"');
    expect(html).toContain('id="storefront-cotizacion-telefono"');
    expect(html).toContain('id="storefront-cotizacion-direccion"');
    expect(html).toContain('data-testid="btn-confirmar-cotizacion-storefront"');
  });

  it('no renderiza contenido cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <StorefrontCotizacionEventoModal
        isOpen={false}
        onClose={vi.fn()}
        negocioNombre="La Parada"
      />
    );

    expect(html).toBe('');
  });

  it('construye mensaje formal de WhatsApp y URL https://wa.me/ con el detalle del evento y anticipo offline', () => {
    const solicitud: SolicitudCotizacionEventoConfirmada = {
      radicado: 'EVT-9042',
      tipoEvento: 'corporativo',
      modalidadEntrega: 'domicilio_evento',
      invitados: 50,
      fechaEvento: '2026-12-01',
      horaEvento: '12:30',
      clienteNombre: 'Laura Gómez',
      empresa: 'Constructora Norte SAS',
      clienteTelefono: '3158889900',
      direccionEvento: 'Av. Libertadores #12-30, Caobos',
      notasEvento: 'Requerimos factura con NIT',
      items: [
        {
          id: 'paquete-combo_corporativo_parada',
          nombre: 'Combo Ejecutivo La Parada',
          precioUnitario: 22000,
          cantidad: 50,
        },
        {
          id: 'extra-empaque',
          nombre: 'Empaque térmico y menaje desechable',
          precioUnitario: 35000,
          cantidad: 1,
          esServicioExtra: true,
        },
      ],
      totalEstimadoCOP: 1135000,
      estimadoPorInvitadoCOP: 22700,
      anticipoSugeridoCOP: 567500,
      saldoEstimadoCOP: 567500,
      metodoAnticipoPreferido: 'transferencia',
    };

    const mensaje = construirMensajeWhatsAppSolicitudEvento(solicitud, 'La Parada');
    const url = generarUrlWhatsAppReserva('3150001122', mensaje);

    expect(mensaje).toContain('EVT-9042');
    expect(mensaje).toContain('Laura Gómez');
    expect(mensaje).toContain('Constructora Norte SAS');
    expect(mensaje).toContain('50 personas');
    expect(mensaje).toContain('Av. Libertadores #12-30, Caobos');
    expect(mensaje).toContain('1.135.000');
    expect(mensaje).toContain('567.500');
    expect(mensaje).toContain('Transferencia');
    expect(url).toMatch(/^https:\/\/wa\.me\/573150001122\?text=/);
  });
});
