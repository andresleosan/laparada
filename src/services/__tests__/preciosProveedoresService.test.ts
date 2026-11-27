import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn((_db, name) => ({ id: name })),
  deleteDoc: vi.fn(),
  doc: vi.fn((...parts: unknown[]) => ({ path: parts.slice(1).join('/'), id: 'doc-1' })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn((n: number) => ({ n })),
  onSnapshot: vi.fn(),
  orderBy: vi.fn((f: string, d: string) => ({ f, d })),
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  where: vi.fn((f: string, o: string, v: unknown) => ({ f, o, v })),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date('2026-11-25T10:00:00-05:00') })),
    fromDate: vi.fn((d: Date) => ({ toDate: () => d })),
  },
}));

const alertasMocks = vi.hoisted(() => ({
  crearAlertaSilenciosa: vi.fn(),
}));

const auditoriaMocks = vi.hoisted(() => ({
  registrarEventoAuditoriaSilencioso: vi.fn(),
}));

vi.mock('firebase/firestore', () => firestoreMocks);
vi.mock('@/services/firebase', () => ({ db: {} }));
vi.mock('@/services/notificacionesService', () => alertasMocks);
vi.mock('@/services/auditoriaService', () => auditoriaMocks);

import {
  eliminarRegistroPrecioInsumo,
  getHistorialPreciosInsumos,
  registrarPrecioInsumo,
  registrarPrecioInsumoSilencioso,
} from '../preciosProveedoresService';

describe('preciosProveedoresService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta el historial acotado al negocioId preservando id canónico', async () => {
    firestoreMocks.getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'reg-canonico',
          data: () => ({
            id: 'id-falso',
            negocioId: 'laparada',
            insumoId: 'ins-1',
            insumoNombre: 'Carne Molida',
            unidad: 'kg',
            proveedorNombre: 'Carnes Norte',
            costoUnitarioCOP: 28000,
            origen: 'orden_compra',
            fechaIso: '2026-11-25',
            registradoPor: 'Admin',
          }),
        },
      ],
    });

    const lista = await getHistorialPreciosInsumos('laparada');
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe('reg-canonico');
    expect(firestoreMocks.where).toHaveBeenCalledWith('negocioId', '==', 'laparada');
  });

  it('registra precio con alza > 10% y dispara alerta operativa + bitácora forense', async () => {
    // getUltimoPrecioInsumo devuelve precio previo de 20000
    firestoreMocks.getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'prev-1',
          data: () => ({
            negocioId: 'laparada',
            insumoId: 'ins-1',
            costoUnitarioCOP: 20000,
          }),
        },
      ],
    });
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'reg-nuevo' });

    const res = await registrarPrecioInsumo({
      negocioId: 'laparada',
      insumoId: 'ins-1',
      insumoNombre: 'Queso Mozzarella',
      unidad: 'kg',
      proveedorId: 'prov-1',
      proveedorNombre: 'Lácteos Santander',
      costoUnitarioCOP: 24000, // +20%
      origen: 'orden_compra',
      referenciaId: 'oc-1',
      referenciaCodigo: 'OC-0001',
      fechaIso: '2026-11-25',
      registradoPor: 'Andrés Admin',
    });

    expect(res).toEqual({
      id: 'reg-nuevo',
      variacionPct: 20,
      esAlzaCritica: true,
    });

    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        negocioId: 'laparada',
        insumoId: 'ins-1',
        costoUnitarioCOP: 24000,
        costoAnteriorCOP: 20000,
        variacionPct: 20,
        esAlzaCritica: true,
        origen: 'orden_compra',
      })
    );
    expect(alertasMocks.crearAlertaSilenciosa).toHaveBeenCalledWith(
      'laparada',
      expect.objectContaining({
        modulo: 'inventario',
        tipo: 'alza_precio_insumo',
        urgencia: 'critica',
      })
    );
    expect(auditoriaMocks.registrarEventoAuditoriaSilencioso).toHaveBeenCalledWith(
      expect.objectContaining({
        negocioId: 'laparada',
        categoria: 'ajuste_inventario',
        montoImpacto: 4000,
      })
    );
  });

  it('no dispara alerta cuando el alza es <= 10% o hay baja de precio', async () => {
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'reg-estable' });

    const res = await registrarPrecioInsumo({
      negocioId: 'laparada',
      insumoId: 'ins-1',
      insumoNombre: 'Queso Mozzarella',
      unidad: 'kg',
      proveedorNombre: 'Lácteos Santander',
      costoUnitarioCOP: 21500,
      costoAnteriorCOP: 20000, // +7.5%
      origen: 'cotizacion_manual',
      fechaIso: '2026-11-25',
    });

    expect(res.esAlzaCritica).toBe(false);
    expect(res.variacionPct).toBe(7.5);
    expect(alertasMocks.crearAlertaSilenciosa).not.toHaveBeenCalled();
    expect(auditoriaMocks.registrarEventoAuditoriaSilencioso).not.toHaveBeenCalled();
  });

  it('rechaza eliminar registros pertenecientes a otro tenant', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ negocioId: 'otro-tenant' }),
    });

    await expect(
      eliminarRegistroPrecioInsumo('laparada', 'reg-ajeno')
    ).rejects.toThrow('no pertenece al negocio activo');
    expect(firestoreMocks.deleteDoc).not.toHaveBeenCalled();
  });

  it('registrarPrecioInsumoSilencioso absorbe errores sin lanzar excepción', async () => {
    firestoreMocks.addDoc.mockRejectedValueOnce(new Error('Fallo temporal'));
    expect(() =>
      registrarPrecioInsumoSilencioso({
        negocioId: 'laparada',
        insumoId: 'ins-1',
        insumoNombre: 'Aceite',
        unidad: 'litros',
        proveedorNombre: 'Distribuidora',
        costoUnitarioCOP: 12000,
        costoAnteriorCOP: 12000,
        origen: 'entrada_kardex',
      })
    ).not.toThrow();
  });
});
