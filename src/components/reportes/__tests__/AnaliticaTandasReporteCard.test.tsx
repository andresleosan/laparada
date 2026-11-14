import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { AnaliticaTandasReporteCard } from '../AnaliticaTandasReporteCard';
import { calcularAnaliticaTandas } from '@/utils/tandaUtils';
import type { TandaVitrina } from '@/types/tanda';

describe('AnaliticaTandasReporteCard', () => {
  const dummyTime = Timestamp.fromDate(new Date('2026-11-10T18:00:00Z'));

  it('muestra estado vacío cuando no hay tandas cerradas en el período', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AnaliticaTandasReporteCard
          analitica={calcularAnaliticaTandas([])}
          tandas={[]}
          etiquetaPeriodo="Últimos 30 días"
          onExportarCsv={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(html).toContain('Desempeño de Tandas de Vitrina');
    expect(html).toContain('Sin tandas de vitrina cerradas en este período');
  });

  it('renderiza métricas de vitrina, top productos y control de mermas', () => {
    const tanda: TandaVitrina = {
      id: 't-rep-1',
      negocioId: 'laparada',
      estado: 'cerrada',
      fecha: dummyTime,
      fechaCierre: dummyTime,
      items: [
        {
          productoId: 'prod-1',
          nombre: 'Tequeño Especial',
          precioUnitario: 3000,
          cantidadInicial: 50,
          adiciones: [],
          mermas: [{ id: 'm-1', cantidad: 2, hora: dummyTime }],
          sobrantes: 3,
        },
      ],
      transferencias: [],
      creadoEn: dummyTime,
      actualizadoEn: dummyTime,
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AnaliticaTandasReporteCard
          analitica={calcularAnaliticaTandas([tanda])}
          tandas={[tanda]}
          etiquetaPeriodo="Últimos 30 días"
          onExportarCsv={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(html).toContain('Tandas Cerradas');
    expect(html).toContain('Venta de Vitrina');
    expect(html).toContain('Rotación Vitrina');
    expect(html).toContain('Merma Vitrina');
    expect(html).toContain('Tequeño Especial');
    expect(html).toContain('Control de Mermas en Vitrina');
    expect(html).toContain('Exportar Tandas (.csv)');
  });
});
