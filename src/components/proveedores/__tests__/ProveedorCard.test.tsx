import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Timestamp } from 'firebase/firestore';
import { ProveedorCard } from '../ProveedorCard';
import type { Proveedor } from '@/types/proveedor';

describe('ProveedorCard', () => {
  const mockProveedor: Proveedor = {
    id: 'prov-1',
    negocioId: 'laparada',
    nombre: 'Distribuidora Quesos La Cabaña',
    contacto: 'Juan Pérez',
    telefono: '3151234567',
    nit: '900.888.999-1',
    categoria: 'lacteos',
    diasCreditoHabitual: 15,
    activo: true,
    direccion: 'Calle 10 # 5-20',
    ciudad: 'Cúcuta',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  };

  it('renderiza el nombre, contacto, categoría, saldo pendiente y enlaces de contacto', () => {
    const html = renderToStaticMarkup(
      <ProveedorCard
        proveedor={mockProveedor}
        resumen={{
          totalComprado: 500000,
          saldoPendiente: 120000,
          facturasPendientes: 1,
        }}
        onEditar={vi.fn()}
        onNuevaFactura={vi.fn()}
        onEliminar={vi.fn()}
      />
    );

    expect(html).toContain('Distribuidora Quesos La Cabaña');
    expect(html).toContain('Juan Pérez');
    expect(html).toContain('Lácteos &amp; Quesos');
    expect(html).toContain('15 días');
    expect(html).toContain('tel:3151234567');
    expect(html).toContain('wa.me/573151234567');
    expect(html).toContain('+ Factura');
  });
});

