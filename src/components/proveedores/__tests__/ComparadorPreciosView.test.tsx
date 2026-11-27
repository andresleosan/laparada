import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type {
  ComparativaInsumoProveedores,
  FiltrosComparadorPrecios,
  ResumenInflacionBodega,
} from '@/types';
import { ComparadorPreciosView } from '../ComparadorPreciosView';

const ts = Timestamp.fromDate(new Date('2026-11-25T12:00:00-05:00'));

const mockComparativa: ComparativaInsumoProveedores = {
  insumoId: 'ins-carne',
  insumoNombre: 'Carne Molida Especial',
  unidad: 'kg',
  stockActual: 18,
  costoCatalogoActualCOP: 28000,
  ultimoCostoCOP: 28000,
  costoAnteriorCOP: 24000,
  primerCostoPeriodoCOP: 22000,
  costoPromedioPeriodoCOP: 24667,
  variacionUltimoSaltoPct: 16.7,
  inflacionAcumuladaPct: 27.3,
  severidad: 'alza_critica',
  tieneAlertaAlzaCritica: true,
  ultimaFechaIso: '2026-11-25',
  ultimoProveedorNombre: 'Carnes Santander',
  totalRegistros: 3,
  ofertasProveedores: [
    {
      proveedorKey: 'frigorifico norte',
      proveedorId: 'prov-2',
      proveedorNombre: 'Frigorífico Norte',
      ultimoCostoCOP: 24500,
      costoPromedioCOP: 24500,
      costoMinimoCOP: 24500,
      costoMaximoCOP: 24500,
      cantidadRegistros: 1,
      ultimaFechaIso: '2026-11-18',
      ultimoOrigen: 'cotizacion_manual',
      esMejorPrecio: true,
      esMasCaro: false,
      diferenciaVsMejorCOP: 0,
      diferenciaVsMejorPct: 0,
    },
    {
      proveedorKey: 'carnes santander',
      proveedorId: 'prov-1',
      proveedorNombre: 'Carnes Santander',
      ultimoCostoCOP: 28000,
      costoPromedioCOP: 25000,
      costoMinimoCOP: 22000,
      costoMaximoCOP: 28000,
      cantidadRegistros: 2,
      ultimaFechaIso: '2026-11-25',
      ultimoOrigen: 'orden_compra',
      esMejorPrecio: false,
      esMasCaro: true,
      diferenciaVsMejorCOP: 3500,
      diferenciaVsMejorPct: 14.3,
    },
  ],
  cantidadProveedores: 2,
  esComparableMultiProveedor: true,
  mejorProveedor: {
    proveedorKey: 'frigorifico norte',
    proveedorId: 'prov-2',
    proveedorNombre: 'Frigorífico Norte',
    ultimoCostoCOP: 24500,
    costoPromedioCOP: 24500,
    costoMinimoCOP: 24500,
    costoMaximoCOP: 24500,
    cantidadRegistros: 1,
    ultimaFechaIso: '2026-11-18',
    ultimoOrigen: 'cotizacion_manual',
    esMejorPrecio: true,
    esMasCaro: false,
    diferenciaVsMejorCOP: 0,
    diferenciaVsMejorPct: 0,
  },
  proveedorMasCaro: null,
  ahorroPotencialUnitarioCOP: 3500,
  ahorroPotencialPct: 12.5,
  serieHistorica: [
    {
      registroId: 'r1',
      fechaIso: '2026-10-10',
      fechaLabel: '10 oct',
      proveedorNombre: 'Carnes Santander',
      costoUnitarioCOP: 22000,
      variacionPct: 0,
      origen: 'entrada_kardex',
    },
    {
      registroId: 'r2',
      fechaIso: '2026-11-25',
      fechaLabel: '25 nov',
      proveedorNombre: 'Carnes Santander',
      costoUnitarioCOP: 28000,
      variacionPct: 16.7,
      origen: 'orden_compra',
    },
  ],
  recetasAfectadas: [
    {
      itemId: 'prod-1',
      itemTipo: 'producto',
      itemNombre: 'Hamburguesa Doble',
      categoria: 'Hamburguesas',
      precioVentaCOP: 22000,
      cantidadInsumoEnReceta: 0.2,
      unidad: 'kg',
      costoRecetaAnteriorCOP: 4800,
      costoRecetaNuevoCOP: 5600,
      impactoCostoUnitarioCOP: 800,
      foodCostAnteriorPct: 21.8,
      foodCostNuevoPct: 25.5,
      deltaFoodCostPts: 3.7,
      margenAnteriorCOP: 17200,
      margenNuevoCOP: 16400,
    },
  ],
  maxDeltaFoodCostPts: 3.7,
  registros: [
    {
      id: 'r2',
      negocioId: 'laparada',
      insumoId: 'ins-carne',
      insumoNombre: 'Carne Molida Especial',
      unidad: 'kg',
      proveedorId: 'prov-1',
      proveedorNombre: 'Carnes Santander',
      costoUnitarioCOP: 28000,
      origen: 'orden_compra',
      fechaIso: '2026-11-25',
      fecha: ts,
      registradoPor: 'Admin',
      creadoEn: ts,
    },
  ],
};

const mockResumen: ResumenInflacionBodega = {
  periodo: 'todo',
  totalInsumosMonitoreados: 1,
  totalRegistrosPrecios: 3,
  insumosComparablesMultiProveedor: 1,
  indiceInflacionPromedioPct: 27.3,
  indiceInflacionUltimoSaltoPct: 16.7,
  alertasAlzaCriticaCount: 1,
  insumosConBajaCount: 0,
  recetasImpactadasCount: 1,
  ahorroPotencialUnitarioTotalCOP: 3500,
  estadoGlobal: 'alerta_inflacion',
  topAlzas: [mockComparativa],
  topOportunidadesAhorro: [mockComparativa],
  evolucionMensualIndice: [
    {
      mesKey: '2026-10',
      mesLabel: 'Oct 26',
      indiceBase100: 100,
      variacionVsBasePct: 0,
      registrosCount: 1,
      insumosMedidosCount: 1,
    },
    {
      mesKey: '2026-11',
      mesLabel: 'Nov 26',
      indiceBase100: 119.3,
      variacionVsBasePct: 19.3,
      registrosCount: 2,
      insumosMedidosCount: 1,
    },
  ],
};

const filtrosDefault: FiltrosComparadorPrecios = {
  busqueda: '',
  periodo: 'todo',
  soloAlzasCriticas: false,
  soloMultiProveedor: false,
  orden: 'alza_desc',
};

describe('ComparadorPreciosView', () => {
  it('renderiza KPIs de inflación, recomendación de mejor proveedor e impacto en escandallos', () => {
    const html = renderToStaticMarkup(
      <ComparadorPreciosView
        comparativasFiltradas={[mockComparativa]}
        resumenInflacion={mockResumen}
        filtros={filtrosDefault}
        setFiltros={vi.fn()}
        resetFiltros={vi.fn()}
        nombreNegocio="La Parada"
        onAbrirCotizacion={vi.fn()}
        onVerDetalleHistorico={vi.fn()}
        onPedirMejorProveedor={vi.fn()}
        onExportarCsv={vi.fn()}
      />
    );

    expect(html).toContain('Comparador de Proveedores &amp; Índice de Inflación de Bodega');
    expect(html).toContain('+27.3%');
    expect(html).toContain('Carne Molida Especial');
    expect(html).toContain('Mejor Proveedor Recomendado');
    expect(html).toContain('Frigorífico Norte');
    expect(html).toContain('Hamburguesa Doble');
    expect(html).toContain('+3.7 pp Food Cost');
    expect(html).toContain('Pedir al Mejor');
  });

  it('renderiza estado vacío guiado cuando no hay registros de precios', () => {
    const html = renderToStaticMarkup(
      <ComparadorPreciosView
        comparativasFiltradas={[]}
        resumenInflacion={{
          ...mockResumen,
          totalInsumosMonitoreados: 0,
          alertasAlzaCriticaCount: 0,
          evolucionMensualIndice: [],
        }}
        filtros={filtrosDefault}
        setFiltros={vi.fn()}
        resetFiltros={vi.fn()}
        onAbrirCotizacion={vi.fn()}
        onVerDetalleHistorico={vi.fn()}
        onPedirMejorProveedor={vi.fn()}
        onExportarCsv={vi.fn()}
      />
    );

    expect(html).toContain('Aún no hay histórico de precios registrado');
    expect(html).toContain('Registrar Primera Cotización');
  });
});
