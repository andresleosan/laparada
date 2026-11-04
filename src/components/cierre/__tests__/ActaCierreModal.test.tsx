import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { ActaCierreModal } from '../ActaCierreModal';
import type { CierreCaja } from '@/types/cierreCaja';
import { Timestamp } from 'firebase/firestore';

describe('ActaCierreModal', () => {
  const mockCierre: CierreCaja = {
    id: 'cierre-987654',
    fecha: Timestamp.fromDate(new Date('2026-11-03T22:30:00Z')),
    negocioId: 'laparada',
    totalIngresos: 300000,
    totalGastos: 50000,
    utilidadNeta: 250000,
    ventasPos: 220000,
    ventasWhatsapp: 80000,
    cajeroNombre: 'Juan Cajero',
    notas: 'Cuadre perfecto de turno',
    arqueo: {
      denominaciones: {
        b50k: 4,
        b20k: 5,
      },
      totalBilletes: 300000,
      totalMonedas: 0,
      totalFisico: 300000,
      efectivoEsperado: 300000,
      diferencia: 0,
      estadoCuadre: 'cuadrado',
    },
  };

  const mockNegocio = {
    nombre: 'La Parada Centro',
    direccion: 'Calle 10 #5-20',
    telefono: '3001234567',
  };

  it('no renderiza nada cuando isOpen es false o cierre es null', () => {
    const htmlClosed = renderToStaticMarkup(
      <ActaCierreModal
        cierre={mockCierre}
        negocio={mockNegocio}
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(htmlClosed).toBe('');

    const htmlNull = renderToStaticMarkup(
      <ActaCierreModal
        cierre={null}
        negocio={mockNegocio}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(htmlNull).toBe('');
  });

  it('renderiza la cabecera, nombre del negocio y cajero', () => {
    const html = renderToStaticMarkup(
      <ActaCierreModal
        cierre={mockCierre}
        negocio={mockNegocio}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Acta de Cierre y Arqueo');
    expect(html).toContain('LA PARADA CENTRO');
    expect(html).toContain('Juan Cajero');
    expect(html).toContain('Cuadre perfecto de turno');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('id="acta-cierre-impresion"');
  });

  it('muestra el desglose de billetes arqueados y estado de cuadre', () => {
    const html = renderToStaticMarkup(
      <ActaCierreModal
        cierre={mockCierre}
        negocio={mockNegocio}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('4 × $50.000');
    expect(html).toContain('5 × $20.000');
    expect(html).toContain('¡CUADRADO ($0)!');
    expect(html).toContain('Imprimir Acta (Térmica)');
  });
});
