import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Timestamp } from 'firebase/firestore';
import type { Insumo, LoteInventario } from '@/types';
import {
  calcularResumenSanitarioBodega,
  evaluarLotesSanitarios,
} from '@/utils/lotesInventarioUtils';
import { LotesVencimientoView } from '../LotesVencimientoView';
import { RegistrarLoteModal } from '../RegistrarLoteModal';
import { BajaRapidaLoteModal } from '../BajaRapidaLoteModal';

function makeTs(iso: string): Timestamp {
  const d = new Date(iso);
  return {
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
  } as unknown as Timestamp;
}

const mockInsumos: Insumo[] = [
  {
    id: 'ins-queso',
    nombre: 'Queso Mozzarella',
    stockActual: 15,
    stockMinimo: 5,
    unidad: 'kg',
    costoUnitario: 18000,
    negocioId: 'laparada',
    creadoEn: makeTs('2026-11-01T10:00:00Z'),
    actualizadoEn: makeTs('2026-11-01T10:00:00Z'),
  },
];

const mockLotes: LoteInventario[] = [
  {
    id: 'lote-venc',
    negocioId: 'laparada',
    insumoId: 'ins-queso',
    insumoNombre: 'Queso Mozzarella',
    unidadMedida: 'kg',
    codigoLote: 'LOT-VENC-01',
    cantidadInicial: 5,
    cantidadDisponible: 2,
    cantidadConsumida: 3,
    costoUnitario: 18000,
    costoTotalInicial: 90000,
    proveedor: 'Lácteos del Norte',
    fechaIngreso: makeTs('2026-11-10T10:00:00Z'),
    fechaVencimiento: '2020-01-01',
    estado: 'activo',
    origen: 'compra_entrada',
    ubicacionBodega: 'nevera_refrigeracion',
    creadoEn: makeTs('2026-11-10T10:00:00Z'),
    actualizadoEn: makeTs('2026-11-10T10:00:00Z'),
  },
  {
    id: 'lote-ok',
    negocioId: 'laparada',
    insumoId: 'ins-queso',
    insumoNombre: 'Queso Mozzarella',
    unidadMedida: 'kg',
    codigoLote: 'LOT-PEPS-02',
    cantidadInicial: 10,
    cantidadDisponible: 10,
    cantidadConsumida: 0,
    costoUnitario: 18000,
    costoTotalInicial: 180000,
    proveedor: 'Lácteos del Norte',
    fechaIngreso: makeTs('2026-11-20T10:00:00Z'),
    fechaVencimiento: '2035-12-30',
    estado: 'activo',
    origen: 'compra_entrada',
    ubicacionBodega: 'nevera_refrigeracion',
    creadoEn: makeTs('2026-11-20T10:00:00Z'),
    actualizadoEn: makeTs('2026-11-20T10:00:00Z'),
  },
];

describe('LotesVencimientoView y modales sanitarios', () => {
  it('renderiza semáforo sanitario, KPIs, orden PEPS (#1 PEPS) y acciones rápidas', () => {
    const evaluados = evaluarLotesSanitarios(mockLotes);
    const resumen = calcularResumenSanitarioBodega(mockLotes);

    const html = renderToStaticMarkup(
      <LotesVencimientoView
        lotes={mockLotes}
        lotesFiltrados={evaluados}
        resumenSanitario={resumen}
        insumos={mockInsumos}
        nombreNegocio="La Parada"
        filtros={{ insumoId: 'todos', estadoLote: 'activo', estadoSemaforo: 'todos', busqueda: '' }}
        setFiltros={vi.fn()}
        resetFiltros={vi.fn()}
        onAbrirRegistrarLote={vi.fn()}
        onAbrirBajaLote={vi.fn()}
        onToggleCuarentena={vi.fn()}
        onVerKardexInsumo={vi.fn()}
        onExportarCsv={vi.fn()}
      />
    );

    expect(html).toContain('Alerta Sanitaria Crítica');
    expect(html).toContain('Lotes Vencidos');
    expect(html).toContain('LOT-VENC-01');
    expect(html).toContain('LOT-PEPS-02');
    expect(html).toContain('#1 PEPS');
    expect(html).toContain('Baja a Merma');
    expect(html).toContain('Exportar Trazabilidad CSV');
  });

  it('renderiza estado de error explícito con botón Reintentar', () => {
    const resumen = calcularResumenSanitarioBodega([]);
    const html = renderToStaticMarkup(
      <LotesVencimientoView
        lotes={[]}
        lotesFiltrados={[]}
        resumenSanitario={resumen}
        insumos={mockInsumos}
        error="Error de red en Firestore"
        filtros={{ insumoId: 'todos', estadoLote: 'activo', estadoSemaforo: 'todos', busqueda: '' }}
        setFiltros={vi.fn()}
        resetFiltros={vi.fn()}
        onAbrirRegistrarLote={vi.fn()}
        onAbrirBajaLote={vi.fn()}
        onToggleCuarentena={vi.fn()}
        onVerKardexInsumo={vi.fn()}
        onExportarCsv={vi.fn()}
        onReintentar={vi.fn()}
      />
    );

    expect(html).toContain('No pudimos cargar el control de lotes y caducidad');
    expect(html).toContain('Reintentar');
  });

  it('renderiza RegistrarLoteModal y BajaRapidaLoteModal cuando están abiertos', () => {
    const evaluados = evaluarLotesSanitarios(mockLotes);

    const htmlReg = renderToStaticMarkup(
      <RegistrarLoteModal
        isOpen={true}
        onClose={vi.fn()}
        insumos={mockInsumos}
        onRegistrarLote={vi.fn()}
      />
    );
    expect(htmlReg).toContain('Registrar Lote y Vencimiento (PEPS / FIFO)');
    expect(htmlReg).toContain('Guardar Lote PEPS');

    const htmlBaja = renderToStaticMarkup(
      <BajaRapidaLoteModal
        isOpen={true}
        onClose={vi.fn()}
        lote={evaluados[0]}
        onConfirmarBaja={vi.fn()}
      />
    );
    expect(htmlBaja).toContain('Baja Rápida de Lote a Merma');
    expect(htmlBaja).toContain('LOT-VENC-01');
    expect(htmlBaja).toContain('Confirmar Baja a Merma');
  });
});
