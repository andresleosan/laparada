import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Insumo, MovimientoKardex } from '@/types';
import { ProduccionCocinaView } from '../ProduccionCocinaView';
import { SubRecetaFormModal } from '../SubRecetaFormModal';
import { ProducirLoteModal } from '../ProducirLoteModal';

vi.mock('@/components/storefront/StorefrontDialog', () => ({
  StorefrontDialog: ({
    children,
    className,
    labelledBy,
  }: {
    children: ReactNode;
    className: string;
    labelledBy: string;
  }) => (
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={className}>
      {children}
    </div>
  ),
}));

describe('ProduccionCocinaView & Modales de Sub-Recetas', () => {
  const fakeTimestamp = (dateStr: string) =>
    ({
      toDate: () => new Date(dateStr),
      seconds: Math.floor(new Date(dateStr).getTime() / 1000),
      nanoseconds: 0,
    }) as unknown as Timestamp;

  const mockInsumos: Insumo[] = [
    {
      id: 'ins-aceite',
      nombre: 'Aceite vegetal',
      stockActual: 10,
      stockMinimo: 2,
      unidad: 'litros',
      costoUnitario: 9000,
      negocioId: 'laparada',
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
    {
      id: 'ins-ajo',
      nombre: 'Ajo pelado',
      stockActual: 2,
      stockMinimo: 0.5,
      unidad: 'kg',
      costoUnitario: 18000,
      negocioId: 'laparada',
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
    {
      id: 'sub-ajo',
      nombre: 'Salsa de Ajo de la Casa',
      stockActual: 3,
      stockMinimo: 2,
      unidad: 'litros',
      costoUnitario: 8100,
      esSubReceta: true,
      categoriaSubReceta: 'salsas_casa',
      rendimientoLote: 5,
      tiempoPreparacionMin: 25,
      vidaUtilHoras: 72,
      recetaInsumos: [
        {
          insumoId: 'ins-aceite',
          nombreSnapshot: 'Aceite vegetal',
          cantidad: 3.5,
          unidadSnapshot: 'litros',
        },
        {
          insumoId: 'ins-ajo',
          nombreSnapshot: 'Ajo pelado',
          cantidad: 0.5,
          unidadSnapshot: 'kg',
        },
      ],
      negocioId: 'laparada',
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
  ];

  const mockMovimientos: MovimientoKardex[] = [
    {
      id: 'mov-prod-1',
      negocioId: 'laparada',
      insumoId: 'sub-ajo',
      insumoNombre: 'Salsa de Ajo de la Casa',
      cantidad: 5,
      costo: 40500,
      costoUnitario: 8100,
      proveedor: 'Producción Lote #A1B2C3',
      fecha: fakeTimestamp('2026-11-18T12:00:00Z'),
      tipoMovimiento: 'entrada_produccion',
      stockPrevio: 0,
      stockResultante: 5,
      responsable: 'Chef Andrés',
      unidadMedida: 'litros',
      loteProduccionId: 'lote-a1b2c3',
      subRecetaId: 'sub-ajo',
      subRecetaNombre: 'Salsa de Ajo de la Casa',
      multiplicadorLotes: 1,
    },
    {
      id: 'mov-cons-1',
      negocioId: 'laparada',
      insumoId: 'ins-aceite',
      insumoNombre: 'Aceite vegetal',
      cantidad: -3.5,
      costo: 31500,
      costoUnitario: 9000,
      proveedor: 'Consumo Lote: Salsa de Ajo de la Casa',
      fecha: fakeTimestamp('2026-11-18T12:00:00Z'),
      tipoMovimiento: 'salida_produccion',
      stockPrevio: 13.5,
      stockResultante: 10,
      responsable: 'Chef Andrés',
      unidadMedida: 'litros',
      loteProduccionId: 'lote-a1b2c3',
      subRecetaId: 'sub-ajo',
      subRecetaNombre: 'Salsa de Ajo de la Casa',
    },
  ];

  it('ProduccionCocinaView renderiza KPIs, tarjeta de sub-receta, lotes posibles e historial', () => {
    const html = renderToStaticMarkup(
      <ProduccionCocinaView
        insumos={mockInsumos}
        movimientosKardex={mockMovimientos}
        onAbrirNuevaSubReceta={vi.fn()}
        onEditarSubReceta={vi.fn()}
        onAbrirProducirLote={vi.fn()}
        onVerKardexSubReceta={vi.fn()}
      />
    );

    expect(html).toContain('Preparaciones Base');
    expect(html).toContain('Listas para Producir');
    expect(html).toContain('Lotes Producidos');
    expect(html).toContain('Stock Preparados');
    expect(html).toContain('Salsa de Ajo de la Casa');
    expect(html).toContain('Salsas de la Casa');
    expect(html).toContain('Lotes posibles hoy:');
    expect(html).toContain('2.85x');
    expect(html).toContain('Producir Lote');
    expect(html).toContain('Historial de Lotes Producidos (1)');
    expect(html).toContain('-3.5 litros Aceite vegetal');
    expect(html).toContain('Chef Andrés');
  });

  it('ProduccionCocinaView muestra estado vacío amigable cuando no hay sub-recetas', () => {
    const html = renderToStaticMarkup(
      <ProduccionCocinaView
        insumos={mockInsumos.filter((i) => !i.esSubReceta)}
        movimientosKardex={[]}
        onAbrirNuevaSubReceta={vi.fn()}
        onEditarSubReceta={vi.fn()}
        onAbrirProducirLote={vi.fn()}
        onVerKardexSubReceta={vi.fn()}
      />
    );

    expect(html).toContain('Aún no tienes preparaciones base configuradas');
    expect(html).toContain('Crear Primera Sub-Receta');
  });

  it('SubRecetaFormModal renderiza plantillas de La Parada y formulario de insumos primarios', () => {
    const html = renderToStaticMarkup(
      <SubRecetaFormModal
        isOpen={true}
        onClose={vi.fn()}
        insumosPrimarios={mockInsumos.filter((i) => !i.esSubReceta)}
        movimientosKardex={mockMovimientos}
        onGuardar={vi.fn()}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Nueva Sub-Receta / Preparación Base');
    expect(html).toContain('Plantillas rápidas de cocina La Parada');
    expect(html).toContain('Salsa de Ajo de la Casa');
    expect(html).toContain('Carne Desmechada Marinada');
    expect(html).toContain('Aceite vegetal (10 litros)');
    expect(html).toContain('Guardar Sub-Receta');
  });

  it('ProducirLoteModal renderiza escala de tanda, simulación de consumo de primarios y proyección', () => {
    const subAjo = mockInsumos[2];
    const html = renderToStaticMarkup(
      <ProducirLoteModal
        isOpen={true}
        onClose={vi.fn()}
        subReceta={subAjo}
        insumos={mockInsumos}
        movimientosKardex={mockMovimientos}
        onConfirmarProduccion={vi.fn()}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Producir Lote: Salsa de Ajo de la Casa');
    expect(html).toContain('0.5x');
    expect(html).toContain('1x');
    expect(html).toContain('2x');
    expect(html).toContain('3x');
    expect(html).toContain('Aceite vegetal');
    expect(html).toContain('-3.5 litros');
    expect(html).toContain('Ajo pelado');
    expect(html).toContain('-0.5 kg');
    expect(html).toContain('40.500');
    expect(html).toContain('8.100');
    expect(html).toContain('Confirmar Producción (+5 litros)');
  });
});
