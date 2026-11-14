import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { HistorialTandasSection } from '../HistorialTandasSection';
import { ModalDetalleTandaCerrada } from '../ModalDetalleTandaCerrada';
import { calcularAnaliticaTandas } from '@/utils/tandaUtils';
import type { TandaVitrina } from '@/types/tanda';

describe('HistorialTandasSection y ModalDetalleTandaCerrada', () => {
  const dummyTime = Timestamp.fromDate(new Date('2026-11-10T18:00:00Z'));

  const tandaCerrada: TandaVitrina = {
    id: 'tanda-cerrada-1',
    negocioId: 'laparada',
    estado: 'cerrada',
    fecha: dummyTime,
    fechaCierre: dummyTime,
    responsable: 'Carlos',
    notasCierre: 'Cierre sin novedad',
    items: [
      {
        productoId: 'prod-1',
        nombre: 'Panceroti Ranchero',
        precioUnitario: 4000,
        cantidadInicial: 30,
        adiciones: [{ id: 'ad-1', cantidad: 10, hora: dummyTime }],
        mermas: [{ id: 'm-1', cantidad: 1, hora: dummyTime, motivo: 'Quemado' }],
        sobrantes: 3,
      },
      {
        productoId: 'prod-2',
        nombre: 'Empanada Carne',
        precioUnitario: 2500,
        cantidadInicial: 20,
        adiciones: [],
        mermas: [],
        sobrantes: 0,
      },
    ],
    transferencias: [
      { id: 'tr-1', monto: 40000, metodo: 'nequi', referencia: 'NQ-101', hora: dummyTime },
    ],
    creadoEn: dummyTime,
    actualizadoEn: dummyTime,
  };

  it('muestra estado vacío cuando no hay tandas cerradas', () => {
    const html = renderToStaticMarkup(
      <HistorialTandasSection
        tandas={[]}
        analitica={calcularAnaliticaTandas([])}
        nombreNegocio="La Parada"
        onExportarCsv={vi.fn()}
      />
    );

    expect(html).toContain('Aún no hay tandas cerradas en el historial');
  });

  it('renderiza KPIs, ranking de rentabilidad por producto e historial de tandas cerradas', () => {
    const html = renderToStaticMarkup(
      <HistorialTandasSection
        tandas={[tandaCerrada]}
        analitica={calcularAnaliticaTandas([tandaCerrada])}
        nombreNegocio="La Parada"
        onExportarCsv={vi.fn()}
      />
    );

    expect(html).toContain('Analítica de Vitrina');
    expect(html).toContain('Venta Acumulada Vitrina');
    expect(html).toContain('Tasa de Rotación Global');
    expect(html).toContain('Tasa de Merma');
    expect(html).toContain('Rentabilidad y Rotación por Producto de Vitrina');
    expect(html).toContain('Panceroti Ranchero');
    expect(html).toContain('Empanada Carne');
    expect(html).toContain('Historial de Tandas Cerradas (1)');
    expect(html).toContain('Carlos');
    expect(html).toContain('Ver Acta');
    expect(html).toContain('Exportar CSV');
  });

  it('renderiza ModalDetalleTandaCerrada solo cuando está abierto', () => {
    const cerradoHtml = renderToStaticMarkup(
      <ModalDetalleTandaCerrada
        isOpen={false}
        onClose={vi.fn()}
        tanda={tandaCerrada}
        nombreNegocio="La Parada"
      />
    );
    expect(cerradoHtml).toBe('');

    const abiertoHtml = renderToStaticMarkup(
      <ModalDetalleTandaCerrada
        isOpen={true}
        onClose={vi.fn()}
        tanda={tandaCerrada}
        nombreNegocio="La Parada"
      />
    );
    expect(abiertoHtml).toContain('Acta de Cierre de Tanda');
    expect(abiertoHtml).toContain('Panceroti Ranchero');
    expect(abiertoHtml).toContain('NQ-101');
    expect(abiertoHtml).toContain('Cierre sin novedad');
    expect(abiertoHtml).toContain('Enviar por WhatsApp');
  });
});
