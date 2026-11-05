import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Timestamp } from 'firebase/firestore';
import { FacturaCompraCard } from '../FacturaCompraCard';
import type { FacturaCompra, Proveedor } from '@/types/proveedor';

describe('FacturaCompraCard', () => {
  const mockProveedor: Proveedor = {
    id: 'prov-1',
    negocioId: 'laparada',
    nombre: 'Panadería La Floresta',
    telefono: '3109876543',
    categoria: 'panaderia',
    diasCreditoHabitual: 7,
    activo: true,
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  };

  const mockFactura: FacturaCompra = {
    id: 'fac-1',
    negocioId: 'laparada',
    proveedorId: 'prov-1',
    proveedorNombre: 'Panadería La Floresta',
    numeroFactura: 'REM-804',
    fechaEmision: Timestamp.now(),
    fechaVencimiento: Timestamp.now(),
    condicionPago: 'credito',
    estado: 'pendiente',
    items: [
      {
        descripcion: 'Pan Brioche Hamburguesa',
        cantidad: 100,
        unidad: 'unidad',
        costoUnitario: 1200,
        subtotal: 120000,
      },
    ],
    subtotal: 120000,
    total: 120000,
    montoPagado: 0,
    saldoPendiente: 120000,
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  };

  it('renderiza número de remisión, proveedor, saldo y botón abonar', () => {
    const html = renderToStaticMarkup(
      <FacturaCompraCard
        factura={mockFactura}
        proveedor={mockProveedor}
        onAbonar={vi.fn()}
        onVerDetalle={vi.fn()}
        onAnular={vi.fn()}
      />
    );

    expect(html).toContain('REM-804');
    expect(html).toContain('Panadería La Floresta');
    expect(html).toContain('Crédito');
    expect(html).toContain('Abonar / Pagar');
    expect(html).toContain('Detalle');
    expect(html).toContain('Pan Brioche Hamburguesa');
  });

  it('muestra estado pagada sin botón de abonar si el saldo es cero', () => {
    const facturaPagada = {
      ...mockFactura,
      estado: 'pagada' as const,
      montoPagado: 120000,
      saldoPendiente: 0,
    };

    const html = renderToStaticMarkup(
      <FacturaCompraCard
        factura={facturaPagada}
        proveedor={mockProveedor}
        onAbonar={vi.fn()}
        onVerDetalle={vi.fn()}
        onAnular={vi.fn()}
      />
    );

    expect(html).toContain('Pagada');
    expect(html).not.toContain('Abonar / Pagar');
  });
});
