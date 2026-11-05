import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as proveedoresService from '@/services/proveedoresService';

vi.mock('@/services/firebase', () => ({
  db: {},
}));

describe('useProveedores & proveedoresService integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('ejecuta crearProveedor con aislamiento tenant y campos requeridos', async () => {
    const spy = vi
      .spyOn(proveedoresService, 'crearProveedor')
      .mockResolvedValue('prov-nuevo');

    const result = await proveedoresService.crearProveedor({
      negocioId: 'laparada',
      nombre: 'Distribuidora Avícola del Oriente',
      telefono: '3151234567',
      categoria: 'carnes',
      diasCreditoHabitual: 15,
      activo: true,
      contacto: 'Sra. Martha',
      nit: '900.555.444-1',
    });

    expect(result).toBe('prov-nuevo');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        negocioId: 'laparada',
        nombre: 'Distribuidora Avícola del Oriente',
        categoria: 'carnes',
        diasCreditoHabitual: 15,
      })
    );
  });

  it('ejecuta registrarPagoFactura atómicamente con los parámetros correctos', async () => {
    const spy = vi
      .spyOn(proveedoresService, 'registrarPagoFactura')
      .mockResolvedValue('pago-id-99');

    const result = await proveedoresService.registrarPagoFactura('laparada', 'fac-100', {
      monto: 50000,
      metodoPago: 'efectivo',
      referenciaComprobante: 'REC-555',
      registradoPor: 'Admin',
      crearGastoCaja: true,
    });

    expect(result).toBe('pago-id-99');
    expect(spy).toHaveBeenCalledWith('laparada', 'fac-100', {
      monto: 50000,
      metodoPago: 'efectivo',
      referenciaComprobante: 'REC-555',
      registradoPor: 'Admin',
      crearGastoCaja: true,
    });
  });

  it('ejecuta anularFacturaCompra registrando el motivo', async () => {
    const spy = vi
      .spyOn(proveedoresService, 'anularFacturaCompra')
      .mockResolvedValue(undefined);

    await proveedoresService.anularFacturaCompra('laparada', 'fac-100', 'Mercancía en mal estado');

    expect(spy).toHaveBeenCalledWith('laparada', 'fac-100', 'Mercancía en mal estado');
  });
});
