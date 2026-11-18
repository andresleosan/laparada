import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import type { CotizacionComercial } from '@/types';
import { CotizacionCard } from '../CotizacionCard';

const mockCotizacion: CotizacionComercial = {
  id: 'cot-abc',
  negocioId: 'laparada',
  codigo: 'COT-2026-005',
  clienteNombre: 'Andrea Ramírez',
  empresa: 'Tech Cúcuta S.A.S.',
  nitEmpresa: '900.888.777-1',
  clienteTelefono: '3112223344',
  tipoEvento: 'corporativo',
  modalidadEntrega: 'domicilio_evento',
  fechaEvento: '2026-11-28',
  horaEvento: '13:00',
  fechaVencimiento: '2026-12-05',
  invitados: 40,
  direccionEvento: 'Calle 11 # 0-45',
  barrioEvento: 'Centro',
  items: [
    {
      id: 'it-1',
      tipo: 'producto',
      referenciaId: 'p1',
      nombre: 'Tequeños x6',
      cantidad: 40,
      precioUnitario: 14000,
      subtotal: 560000,
    },
  ],
  subtotal: 560000,
  descuento: 30000,
  costoLogistica: 20000,
  totalCotizado: 550000,
  costoEstimadoInsumos: 210000,
  utilidadEstimada: 340000,
  margenEstimadoPct: 61.8,
  anticipoMonto: 275000,
  anticipoMetodo: 'transferencia',
  anticipoEstado: 'verificado',
  anticipoReferencia: 'Nequi #55100',
  saldoPendiente: 275000,
  estado: 'aprobada',
};

describe('CotizacionCard', () => {
  it('renderiza código, empresa, invitados, anticipo offline, margen interno y CTA de conversión 1 clic', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/cotizaciones">
        <CotizacionCard
          cotizacion={mockCotizacion}
          onVerPropuesta={vi.fn()}
          onEnviarWhatsApp={vi.fn()}
          onRegistrarAnticipo={vi.fn()}
          onEditar={vi.fn()}
          onConvertir={vi.fn()}
          puedeEliminar={true}
          onEliminar={vi.fn()}
        />
      </StaticRouter>
    );

    expect(html).toContain('COT-2026-005');
    expect(html).toContain('Tech Cúcuta S.A.S.');
    expect(html).toContain('Andrea Ramírez');
    expect(html).toContain('40 invitados');
    expect(html).toContain('Margen 61.8%');
    expect(html).toContain('Nequi #55100');
    expect(html).toContain('Verificado');
    expect(html).toContain('Convertir a Venta + Comanda KDS (1 Clic)');
    expect(html).toContain('Propuesta');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('Anticipo');
  });

  it('oculta los botones de edición y conversión cuando la cotización ya está convertida', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/cotizaciones">
        <CotizacionCard
          cotizacion={{
            ...mockCotizacion,
            estado: 'convertida',
            ventaId: 'cotizacion_cot-abc',
            comandaId: 'kds_cot_cot-abc',
            saldoPendiente: 0,
          }}
          onVerPropuesta={vi.fn()}
          onEnviarWhatsApp={vi.fn()}
          onRegistrarAnticipo={vi.fn()}
          onEditar={vi.fn()}
          onConvertir={vi.fn()}
        />
      </StaticRouter>
    );

    expect(html).toContain('Convertida a Venta');
    expect(html).toContain('Comanda KDS enviada');
    expect(html).not.toContain('Convertir a Venta + Comanda KDS (1 Clic)');
  });
});
