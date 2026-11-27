import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type {
  Combo,
  FacturaCompra,
  Insumo,
  MovimientoKardex,
  Producto,
  Proveedor,
  RegistroPrecioInsumo,
} from '@/types';
import {
  calcularImpactoRecetasPorAlzaInsumo,
  calcularResumenInflacionBodega,
  calcularVariacionPrecioPct,
  construirComparativasInsumos,
  evaluarSeveridadAlza,
  filtrarYOrdenarComparativas,
  generarCsvComparadorPrecios,
  unificarRegistrosPrecios,
} from '../preciosProveedoresUtils';

function ts(iso: string) {
  return Timestamp.fromDate(new Date(`${iso}T14:00:00-05:00`));
}

const insumosMock: Insumo[] = [
  {
    id: 'ins-carne',
    nombre: 'Carne Molida',
    stockActual: 20,
    stockMinimo: 10,
    unidad: 'kg',
    costoUnitario: 28000,
    negocioId: 'laparada',
    creadoEn: ts('2026-10-01'),
    actualizadoEn: ts('2026-11-24'),
  },
  {
    id: 'ins-queso',
    nombre: 'Queso Mozzarella',
    stockActual: 15,
    stockMinimo: 8,
    unidad: 'kg',
    costoUnitario: 24000,
    negocioId: 'laparada',
    creadoEn: ts('2026-10-01'),
    actualizadoEn: ts('2026-11-24'),
  },
];

const proveedoresMock: Proveedor[] = [
  {
    id: 'prov-1',
    negocioId: 'laparada',
    nombre: 'Carnes Santander',
    telefono: '3101112233',
    categoria: 'carnes',
    diasCreditoHabitual: 15,
    activo: true,
    creadoEn: ts('2026-10-01'),
    actualizadoEn: ts('2026-10-01'),
  },
  {
    id: 'prov-2',
    negocioId: 'laparada',
    nombre: 'Frigorífico Norte',
    telefono: '3112223344',
    categoria: 'carnes',
    diasCreditoHabitual: 7,
    activo: true,
    creadoEn: ts('2026-10-01'),
    actualizadoEn: ts('2026-10-01'),
  },
];

const productosMock: Producto[] = [
  {
    id: 'prod-burger',
    nombre: 'Hamburguesa Doble Carne',
    descripcion: 'Clásica',
    categoria: 'Hamburguesas',
    precio: 22000,
    disponible: true,
    receta: [
      { insumoId: 'ins-carne', cantidad: 0.2, nombreSnapshot: 'Carne Molida', unidadSnapshot: 'kg' },
      { insumoId: 'ins-queso', cantidad: 0.05, nombreSnapshot: 'Queso Mozzarella', unidadSnapshot: 'kg' },
    ],
    negocioId: 'laparada',
    creadoEn: ts('2026-10-01'),
    actualizadoEn: ts('2026-11-01'),
  },
];

const combosMock: Combo[] = [
  {
    id: 'combo-duo',
    nombre: 'Combo Dúo Burgers',
    descripcion: 'Dos hamburguesas',
    categoria: 'Combos',
    items: [{ productoId: 'prod-burger', cantidad: 2, nombreSnapshot: 'Hamburguesa Doble Carne' }],
    precioEspecial: 40000,
    disponible: true,
    negocioId: 'laparada',
    creadoEn: ts('2026-10-01'),
    actualizadoEn: ts('2026-11-01'),
  },
];

describe('preciosProveedoresUtils', () => {
  it('calcula variación porcentual y detecta severidad de alza crítica > 10%', () => {
    expect(calcularVariacionPrecioPct(20000, 23000)).toBe(15);
    expect(calcularVariacionPrecioPct(20000, 22000)).toBe(10);
    expect(calcularVariacionPrecioPct(20000, 18000)).toBe(-10);

    expect(evaluarSeveridadAlza(15)).toBe('alza_critica');
    expect(evaluarSeveridadAlza(10)).toBe('alza_moderada');
    expect(evaluarSeveridadAlza(0)).toBe('estable');
    expect(evaluarSeveridadAlza(-5)).toBe('baja');
  });

  it('unifica historial, facturas y Kardex evitando doble conteo', () => {
    const historial: RegistroPrecioInsumo[] = [
      {
        id: 'hist-1',
        negocioId: 'laparada',
        insumoId: 'ins-carne',
        insumoNombre: 'Carne Molida',
        unidad: 'kg',
        proveedorId: 'prov-1',
        proveedorNombre: 'Carnes Santander',
        costoUnitarioCOP: 28000,
        origen: 'factura_compra',
        referenciaId: 'fac-1',
        fechaIso: '2026-11-20',
        fecha: ts('2026-11-20'),
        registradoPor: 'Admin',
        creadoEn: ts('2026-11-20'),
      },
    ];

    const facturas: FacturaCompra[] = [
      {
        id: 'fac-1',
        negocioId: 'laparada',
        proveedorId: 'prov-1',
        proveedorNombre: 'Carnes Santander',
        numeroFactura: 'FAC-100',
        fechaEmision: ts('2026-11-20'),
        fechaVencimiento: ts('2026-12-05'),
        condicionPago: 'credito',
        estado: 'pendiente',
        items: [
          { insumoId: 'ins-carne', descripcion: 'Carne Molida', cantidad: 10, unidad: 'kg', costoUnitario: 28000, subtotal: 280000 },
        ],
        subtotal: 280000,
        total: 280000,
        montoPagado: 0,
        saldoPendiente: 280000,
        creadoEn: ts('2026-11-20'),
        actualizadoEn: ts('2026-11-20'),
      },
      {
        id: 'fac-anulada',
        negocioId: 'laparada',
        proveedorId: 'prov-2',
        proveedorNombre: 'Frigorífico Norte',
        numeroFactura: 'FAC-999',
        fechaEmision: ts('2026-11-21'),
        fechaVencimiento: ts('2026-11-21'),
        condicionPago: 'contado',
        estado: 'anulada',
        items: [
          { insumoId: 'ins-carne', descripcion: 'Carne Molida', cantidad: 5, unidad: 'kg', costoUnitario: 50000, subtotal: 250000 },
        ],
        subtotal: 250000,
        total: 250000,
        montoPagado: 0,
        saldoPendiente: 0,
        creadoEn: ts('2026-11-21'),
        actualizadoEn: ts('2026-11-21'),
      },
    ];

    const kardex: MovimientoKardex[] = [
      {
        id: 'mov-1',
        negocioId: 'laparada',
        insumoId: 'ins-carne',
        insumoNombre: 'Carne Molida',
        cantidad: 15,
        costo: 360000,
        costoUnitario: 24000,
        proveedor: 'Frigorífico Norte',
        fecha: ts('2026-11-05'),
        tipoMovimiento: 'entrada',
      },
    ];

    const unificados = unificarRegistrosPrecios({
      registrosHistorial: historial,
      facturas,
      movimientosKardex: kardex,
      proveedores: proveedoresMock,
      insumos: insumosMock,
    });

    expect(unificados).toHaveLength(2);
    expect(unificados[0].costoUnitarioCOP).toBe(28000);
    expect(unificados[1].costoUnitarioCOP).toBe(24000);
  });

  it('calcula impacto en Food Cost de productos y combos por alza de insumo', () => {
    const impactos = calcularImpactoRecetasPorAlzaInsumo({
      insumoId: 'ins-carne',
      costoAnteriorCOP: 22000,
      costoNuevoCOP: 28000,
      productos: productosMock,
      combos: combosMock,
      insumos: insumosMock,
    });

    expect(impactos).toHaveLength(2);
    const burger = impactos.find((i) => i.itemId === 'prod-burger');
    const combo = impactos.find((i) => i.itemId === 'combo-duo');

    expect(burger).toBeDefined();
    // 0.2 kg * (+6000) = +1200 COP sobre 22000 = +5.4 o +5.5 pp
    expect(burger!.impactoCostoUnitarioCOP).toBe(1200);
    expect(burger!.deltaFoodCostPts).toBeGreaterThan(5);
    expect(burger!.margenNuevoCOP).toBe(burger!.margenAnteriorCOP - 1200);

    expect(combo).toBeDefined();
    expect(combo!.impactoCostoUnitarioCOP).toBe(2400);
  });

  it('construye comparativas, recomienda mejor proveedor, calcula índice Base 100 y genera CSV seguro', () => {
    const registros: RegistroPrecioInsumo[] = [
      {
        id: 'r1',
        negocioId: 'laparada',
        insumoId: 'ins-carne',
        insumoNombre: 'Carne Molida',
        unidad: 'kg',
        proveedorId: 'prov-1',
        proveedorNombre: 'Carnes Santander',
        costoUnitarioCOP: 22000,
        origen: 'entrada_kardex',
        fechaIso: '2026-10-15',
        fecha: ts('2026-10-15'),
        registradoPor: 'Admin',
        creadoEn: ts('2026-10-15'),
      },
      {
        id: 'r2',
        negocioId: 'laparada',
        insumoId: 'ins-carne',
        insumoNombre: 'Carne Molida',
        unidad: 'kg',
        proveedorId: 'prov-2',
        proveedorNombre: 'Frigorífico Norte',
        costoUnitarioCOP: 24500,
        origen: 'cotizacion_manual',
        fechaIso: '2026-11-10',
        fecha: ts('2026-11-10'),
        registradoPor: 'Admin',
        creadoEn: ts('2026-11-10'),
      },
      {
        id: 'r3',
        negocioId: 'laparada',
        insumoId: 'ins-carne',
        insumoNombre: 'Carne Molida',
        unidad: 'kg',
        proveedorId: 'prov-1',
        proveedorNombre: 'Carnes Santander',
        costoUnitarioCOP: 28000,
        origen: 'orden_compra',
        fechaIso: '2026-11-22',
        fecha: ts('2026-11-22'),
        registradoPor: 'Admin',
        creadoEn: ts('2026-11-22'),
      },
    ];

    const comparativas = construirComparativasInsumos({
      registros,
      insumos: insumosMock,
      proveedores: proveedoresMock,
      productos: productosMock,
      combos: combosMock,
      periodo: 'todo',
      hoyIso: '2026-11-25',
    });

    expect(comparativas).toHaveLength(1);
    const carne = comparativas[0];
    expect(carne.tieneAlertaAlzaCritica).toBe(true);
    expect(carne.variacionUltimoSaltoPct).toBe(14.3);
    expect(carne.inflacionAcumuladaPct).toBe(27.3);
    expect(carne.esComparableMultiProveedor).toBe(true);
    expect(carne.mejorProveedor?.proveedorNombre).toBe('Frigorífico Norte');
    expect(carne.mejorProveedor?.ultimoCostoCOP).toBe(24500);
    expect(carne.ahorroPotencialUnitarioCOP).toBe(3500);

    const resumen = calcularResumenInflacionBodega(comparativas, registros, 'todo');
    expect(resumen.alertasAlzaCriticaCount).toBe(1);
    expect(resumen.estadoGlobal).toBe('alerta_inflacion');
    expect(resumen.ahorroPotencialUnitarioTotalCOP).toBe(3500);
    expect(resumen.recetasImpactadasCount).toBe(2);
    expect(resumen.evolucionMensualIndice.map((m) => m.mesKey)).toEqual(['2026-10', '2026-11']);
    expect(resumen.evolucionMensualIndice[0].indiceBase100).toBe(100);
    expect(resumen.evolucionMensualIndice[1].indiceBase100).toBeGreaterThan(110);

    const filtradas = filtrarYOrdenarComparativas(comparativas, {
      busqueda: 'frigorifico',
      periodo: 'todo',
      soloAlzasCriticas: true,
      soloMultiProveedor: true,
      orden: 'ahorro_desc',
    });
    expect(filtradas).toHaveLength(1);

    const csv = generarCsvComparadorPrecios(comparativas, resumen, 'La Parada');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Carne Molida');
    expect(csv).toContain('Frigorífico Norte');
    expect(csv).toContain('SI (>10%)');
  });
});
