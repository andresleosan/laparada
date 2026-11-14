import { renderToStaticMarkup } from 'react-dom/server';
import { Timestamp } from 'firebase/firestore';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Insumo, ItemIngenieriaMenu, MovimientoKardex } from '@/types';
import { CostosInsumosTab } from '../CostosInsumosTab';
import { MatrizBCGChart } from '../MatrizBCGChart';
import { SimuladorPreciosModal } from '../SimuladorPreciosModal';

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
    <div role="dialog" aria-labelledby={labelledBy} className={className}>
      {children}
    </div>
  ),
}));

const now = Timestamp.now();

const sampleItems: ItemIngenieriaMenu[] = [
  {
    id: 'prod-1',
    tipo: 'producto',
    nombre: 'Tequeño Clásico',
    categoria: 'Entradas',
    disponible: true,
    destacado: false,
    precioVenta: 12000,
    costoUnitarioCOP: 3600,
    origenCosteo: 'receta',
    tieneCosteo: true,
    costeoIncompleto: false,
    insumosSinCosto: [],
    desgloseIngredientes: [
      {
        insumoId: 'ins-1',
        nombre: 'Queso Costeño',
        cantidad: 0.12,
        unidad: 'kg',
        costoUnitarioInsumo: 30000,
        fuenteCosto: 'kardex',
        subtotalCostoCOP: 3600,
        participacionCostoPct: 100,
        tieneCosto: true,
      },
    ],
    margenContribucionUnitario: 8400,
    foodCostPct: 30,
    margenBrutoPct: 70,
    unidadesVendidas: 80,
    menuMixPct: 50,
    ingresosRealesCOP: 960000,
    costoTotalPeriodoCOP: 288000,
    contribucionTotalCOP: 672000,
    cuadrante: 'estrella',
    popularidadAlta: true,
    rentabilidadAlta: true,
    precioSugeridoObjetivoCOP: 12000,
    diferenciaPrecioSugeridoCOP: 0,
    recomendacionAccion: 'Proteger receta estándar.',
  },
  {
    id: 'prod-2',
    tipo: 'producto',
    nombre: 'Empanada Mixta',
    categoria: 'Entradas',
    disponible: true,
    destacado: false,
    precioVenta: 7000,
    costoUnitarioCOP: 3500,
    origenCosteo: 'referencia_manual',
    tieneCosteo: true,
    costeoIncompleto: true,
    insumosSinCosto: ['Aceite Vegetal'],
    desgloseIngredientes: [
      {
        insumoId: 'ins-2',
        nombre: 'Aceite Vegetal',
        cantidad: 0.05,
        unidad: 'litro',
        costoUnitarioInsumo: 0,
        fuenteCosto: 'sin_costo',
        subtotalCostoCOP: 0,
        participacionCostoPct: 0,
        tieneCosto: false,
      },
    ],
    margenContribucionUnitario: 3500,
    foodCostPct: 50,
    margenBrutoPct: 50,
    unidadesVendidas: 20,
    menuMixPct: 12.5,
    ingresosRealesCOP: 140000,
    costoTotalPeriodoCOP: 70000,
    contribucionTotalCOP: 70000,
    cuadrante: 'perro',
    popularidadAlta: false,
    rentabilidadAlta: false,
    precioSugeridoObjetivoCOP: 12000,
    diferenciaPrecioSugeridoCOP: 5000,
    recomendacionAccion: 'Revisar costo y evaluar subida.',
  },
];

const sampleInsumos: Insumo[] = [
  {
    id: 'ins-1',
    nombre: 'Queso Costeño',
    stockActual: 15,
    stockMinimo: 5,
    unidad: 'kg',
    costoUnitario: 28000,
    negocioId: 'laparada',
    creadoEn: now,
    actualizadoEn: now,
  },
  {
    id: 'ins-2',
    nombre: 'Aceite Vegetal',
    stockActual: 8,
    stockMinimo: 2,
    unidad: 'litro',
    costoUnitario: 0,
    negocioId: 'laparada',
    creadoEn: now,
    actualizadoEn: now,
  },
];

const sampleKardex: MovimientoKardex[] = [
  {
    id: 'kar-1',
    insumoId: 'ins-1',
    insumoNombre: 'Queso Costeño',
    tipoMovimiento: 'entrada',
    cantidad: 10,
    costo: 300000,
    costoUnitario: 30000,
    stockPrevio: 5,
    stockResultante: 15,
    proveedor: 'Lácteos Norte',
    fecha: now,
    negocioId: 'laparada',
  },
];

describe('Componentes de Ingeniería de Menú', () => {
  it('MatrizBCGChart renderiza burbujas, ejes y umbrales para ítems costeados', () => {
    const html = renderToStaticMarkup(
      <MatrizBCGChart
        items={sampleItems}
        umbralPopularidadUnidades={40}
        umbralMargenContribucionCOP={6000}
        onSelectItem={vi.fn()}
      />
    );

    expect(html).toContain('Matriz BCG Gastronómica (Popularidad vs Margen)');
    expect(html).toContain('Tequeño Clásico');
    expect(html).toContain('Empanada Mixta');
  });

  it('CostosInsumosTab destaca ingredientes de recetas sin costo y distingue origen Kardex', () => {
    const html = renderToStaticMarkup(
      <CostosInsumosTab
        insumos={sampleInsumos}
        movimientosKardex={sampleKardex}
        items={sampleItems}
        onGuardarCostoInsumo={vi.fn()}
      />
    );

    expect(html).toContain('1 insumo usado en recetas con costo $0');
    expect(html).toContain('Aceite Vegetal');
    expect(html).toContain('Sin costo ($0)');
    expect(html).toContain('Kardex');
    expect(html).toContain('Queso Costeño');
  });

  it('SimuladorPreciosModal renderiza escenarios Before/After y desglose de ingredientes', () => {
    const html = renderToStaticMarkup(
      <SimuladorPreciosModal
        isOpen
        onClose={vi.fn()}
        item={sampleItems[0]}
        foodCostObjetivoInicial={30}
        redondeo="500"
        tasaImpuestoPct={0}
        umbralPopularidadUnidades={40}
        umbralMargenContribucionCOP={6000}
        onAplicarPrecio={vi.fn()}
        onGuardarCostoReferencia={vi.fn()}
        onGuardarCostoInsumo={vi.fn()}
      />
    );

    expect(html).toContain('Simulador de Precios &amp; Escandallo: Tequeño Clásico');
    expect(html).toContain('Queso Costeño');
    expect(html).toContain('Food Cost Proyectado');
    expect(html).toContain('Aplicar Precio $ 12.000 al Menú');
  });
});
