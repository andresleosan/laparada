import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { Timestamp } from 'firebase/firestore';
import type { LoteInventario } from '@/types';
import {
  calcularResumenSanitarioBodega,
  evaluarLotesSanitarios,
} from '@/utils/lotesInventarioUtils';
import { SemaforoSanitarioWidget } from '../SemaforoSanitarioWidget';

function makeTs(iso: string): Timestamp {
  const d = new Date(iso);
  return {
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
  } as unknown as Timestamp;
}

describe('SemaforoSanitarioWidget', () => {
  it('renderiza estado crítico con lotes en riesgo y valor en COP', () => {
    const lotes: LoteInventario[] = [
      {
        id: 'l-1',
        negocioId: 'laparada',
        insumoId: 'ins-1',
        insumoNombre: 'Carne Artesanal',
        unidadMedida: 'unidades',
        codigoLote: 'LOT-CARNE-1',
        cantidadInicial: 10,
        cantidadDisponible: 5,
        cantidadConsumida: 5,
        costoUnitario: 4000,
        costoTotalInicial: 40000,
        proveedor: 'Carnes Cúcuta',
        fechaIngreso: makeTs('2026-11-10T10:00:00Z'),
        fechaVencimiento: '2020-01-01',
        estado: 'activo',
        origen: 'compra_entrada',
        creadoEn: makeTs('2026-11-10T10:00:00Z'),
        actualizadoEn: makeTs('2026-11-10T10:00:00Z'),
      },
    ];
    const resumen = calcularResumenSanitarioBodega(lotes);
    const evaluados = evaluarLotesSanitarios(lotes);

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SemaforoSanitarioWidget
          resumen={resumen}
          lotesEvaluados={evaluados}
          loading={false}
          error={null}
          onReintentar={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(html).toContain('Semáforo Sanitario PEPS');
    expect(html).toContain('1 vencido(s)');
    expect(html).toContain('LOT-CARNE-1');
    expect(html).toContain('Gestionar Lotes PEPS');
  });

  it('renderiza estado saludable y error con botón Reintentar', () => {
    const resumenVacio = calcularResumenSanitarioBodega([]);

    const htmlOk = renderToStaticMarkup(
      <MemoryRouter>
        <SemaforoSanitarioWidget
          resumen={resumenVacio}
          lotesEvaluados={[]}
          loading={false}
          error={null}
          onReintentar={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(htmlOk).toContain('Saludable');

    const htmlErr = renderToStaticMarkup(
      <MemoryRouter>
        <SemaforoSanitarioWidget
          resumen={resumenVacio}
          lotesEvaluados={[]}
          loading={false}
          error="Sin conexión"
          onReintentar={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(htmlErr).toContain('Reintentar consulta');
  });
});
