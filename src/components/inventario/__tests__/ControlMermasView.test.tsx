import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Combo, EntradaInventario, Insumo, Producto } from '@/types';
import { ControlMermasView } from '../ControlMermasView';
import { RegistrarMermaOperativaModal } from '../RegistrarMermaOperativaModal';
import { AlertaUmbralMermasCard } from '@/components/reportes/AlertaUmbralMermasCard';

describe('ControlMermasView, RegistrarMermaOperativaModal & AlertaUmbralMermasCard', () => {
  const fakeTimestamp = (dateStr: string) =>
    ({
      toDate: () => new Date(dateStr),
      seconds: Math.floor(new Date(dateStr).getTime() / 1000),
      nanoseconds: 0,
    }) as unknown as Timestamp;

  const mockInsumos: Insumo[] = [
    {
      id: 'ins-carne',
      negocioId: 'laparada',
      nombre: 'Carne Artesanal',
      stockActual: 20,
      stockMinimo: 5,
      unidad: 'unidades',
      costoUnitario: 5000,
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
    {
      id: 'ins-pan',
      negocioId: 'laparada',
      nombre: 'Pan Brioche',
      stockActual: 30,
      stockMinimo: 10,
      unidad: 'unidades',
      costoUnitario: 1200,
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
  ];

  const mockProductos: Producto[] = [
    {
      id: 'prod-hamb',
      negocioId: 'laparada',
      nombre: 'Hamburguesa La Parada',
      descripcion: 'Clásica',
      precio: 18000,
      disponible: true,
      receta: [
        { insumoId: 'ins-pan', nombreSnapshot: 'Pan Brioche', cantidad: 1, unidadSnapshot: 'unidades' },
        { insumoId: 'ins-carne', nombreSnapshot: 'Carne Artesanal', cantidad: 1, unidadSnapshot: 'unidades' },
      ],
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
  ];

  const mockCombos: Combo[] = [];

  const mockMovimientos: EntradaInventario[] = [
    {
      id: 'mov-merma-1',
      negocioId: 'laparada',
      insumoId: 'ins-carne',
      insumoNombre: 'Carne Artesanal',
      cantidad: -4,
      costo: 20000,
      costoUnitario: 5000,
      proveedor: 'Merma Cocina',
      motivo: 'desperdicio_cocina',
      origenMerma: 'cocina_kds',
      estacionCocina: 'parrilla_plancha',
      productoMermaNombre: 'Hamburguesa La Parada',
      notas: 'Cocción pasada',
      responsable: 'Chef Carlos',
      unidadMedida: 'unidades',
      fecha: fakeTimestamp('2026-11-18T14:00:00Z'),
      tipoMovimiento: 'merma',
    },
    {
      id: 'mov-merma-2',
      negocioId: 'laparada',
      insumoId: 'ins-pan',
      insumoNombre: 'Pan Brioche',
      cantidad: -15,
      costo: 18000,
      costoUnitario: 1200,
      proveedor: 'Merma Bodega',
      motivo: 'devolucion_cliente',
      origenMerma: 'devolucion_cliente',
      estacionCocina: 'entrega_domicilio',
      responsable: 'Cajero Turno',
      unidadMedida: 'unidades',
      fecha: fakeTimestamp('2026-11-18T15:00:00Z'),
      tipoMovimiento: 'merma',
    },
  ];

  it('renderiza ControlMermasView con KPIs, ranking, filtro por origen y listado forense', () => {
    const html = renderToStaticMarkup(
      <ControlMermasView
        insumos={mockInsumos}
        movimientosKardex={mockMovimientos}
        nombreNegocio="La Parada"
        ventasNetasReferencia={1000000}
        onAbrirRegistroMerma={vi.fn()}
      />
    );

    expect(html).toContain('Control de Mermas Operativas, Cocina y Devoluciones');
    expect(html).toContain('Umbral Crítico Superado');
    expect(html).toContain('Desperdicios de Cocina');
    expect(html).toContain('Devoluciones de Cliente');
    expect(html).toContain('Top Insumos con Mayor Pérdida Monetaria');
    expect(html).toContain('Carne Artesanal');
    expect(html).toContain('Hamburguesa La Parada');
    expect(html).toContain('Exportar Forense CSV');
  });

  it('renderiza RegistrarMermaOperativaModal en modo producto_terminado con explosión de escandallo', () => {
    const html = renderToStaticMarkup(
      <RegistrarMermaOperativaModal
        isOpen={true}
        onClose={vi.fn()}
        insumos={mockInsumos}
        productos={mockProductos}
        combos={mockCombos}
        movimientosKardex={mockMovimientos}
        modoInicial="producto_terminado"
        origenInicial="devolucion_cliente"
        comandaContexto={{ id: 'dom-1', codigo: '#K-014' }}
        onRegistrarMerma={vi.fn()}
      />
    );

    expect(html).toContain('Control de Mermas, Desperdicios y Devoluciones');
    expect(html).toContain('Plato / Combo (Explosión de Receta)');
    expect(html).toContain('Explosión de Receta y Costo P&amp;L');
    expect(html).toContain('Pan Brioche');
    expect(html).toContain('Carne Artesanal');
    expect(html).toContain('Devolución de Cliente');
  });

  it('renderiza AlertaUmbralMermasCard en Reportes con alerta de umbral superado y enlaces forenses', () => {
    const html = renderToStaticMarkup(
      <AlertaUmbralMermasCard
        movimientosKardex={mockMovimientos}
        insumos={mockInsumos}
        ventasNetas={1000000}
        cmvInsumos={300000}
        nombreNegocio="La Parada"
        etiquetaPeriodo="Últimos 30 días"
      />
    );

    expect(html).toContain('Control de Umbral de Mermas, Desperdicios de Cocina y Devoluciones en P&amp;L');
    expect(html).toContain('Umbral Crítico Superado');
    expect(html).toContain('3.8% / 3% meta');
    expect(html).toContain('Gestionar en Bodega');
    expect(html).toContain('Ver Bitácora Forense');
    expect(html).toContain('Exportar Mermas (.csv)');
  });
});
