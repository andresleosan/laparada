import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { Timestamp } from 'firebase/firestore';
import type { ReclamoPqrs } from '@/types/reclamo';
import { calcularResumenReclamos, evaluarReclamos } from '@/utils/reclamosUtils';
import { ReclamosWidget } from '../ReclamosWidget';

const tsBase = new Date('2026-11-24T17:00:00Z');

describe('ReclamosWidget', () => {
  it('renderiza estado crítico con reclamos activos, SLA vencido y enlaces operativos', () => {
    const reclamo: ReclamoPqrs = {
      id: 'rec-1',
      negocioId: 'laparada',
      codigoRadicado: 'PQR-20261124-001',
      tipo: 'garantia_pedido',
      canal: 'domicilio',
      causaRaiz: 'pedido_incompleto',
      prioridad: 'critica',
      estado: 'abierto',
      slaObjetivoMin: 30,
      clienteNombre: 'Juliana Morales',
      montoPedidoCOP: 34000,
      descripcion: 'Faltó una orden de tequeños en el domicilio.',
      fechaIso: '2026-11-24',
      creadoEn: tsBase as unknown as Timestamp,
      actualizadoEn: tsBase as unknown as Timestamp,
      registradoPor: 'Cajero',
    };

    const evaluados = evaluarReclamos([reclamo], tsBase.getTime() + 45 * 60000);
    const resumen = calcularResumenReclamos(evaluados, 50, '2026-11-24');

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ReclamosWidget
          resumen={resumen}
          reclamosActivos={evaluados}
          loading={false}
          error={null}
          onReintentar={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(html).toContain('Reclamos, PQRS &amp; Garantías');
    expect(html).toContain('Crítico');
    expect(html).toContain('PQR-20261124-001');
    expect(html).toContain('Juliana Morales');
    expect(html).toContain('Gestionar PQRS');
    expect(html).toContain('Ir a Domicilios');
  });

  it('muestra estado de error explícito con botón Reintentar consulta', () => {
    const resumen = calcularResumenReclamos([], 0, '2026-11-24');
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ReclamosWidget
          resumen={resumen}
          reclamosActivos={[]}
          loading={false}
          error="Error de permisos en Firestore"
          onReintentar={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(html).toContain('No pudimos consultar Reclamos &amp; PQRS');
    expect(html).toContain('Reintentar consulta');
  });
});
