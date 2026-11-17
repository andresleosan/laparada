import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Timestamp } from 'firebase/firestore';
import type { Gasto, Venta } from '@/types';
import {
  construirPlantillaRapidaPresupuesto,
  evaluarCentroMetasPresupuesto,
  getConfiguracionMetasDefault,
} from '@/utils/metasPresupuestoUtils';
import { CentroMetasPresupuestoCard } from '../CentroMetasPresupuestoCard';
import { MetasBreakEvenWidget } from '@/components/dashboard/MetasBreakEvenWidget';
import { ConfigurarMetasPresupuestoModal } from '../ConfigurarMetasPresupuestoModal';

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
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={className}>
      {children}
    </div>
  ),
}));

function fakeTimestamp(date: Date): Timestamp {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => date,
  } as unknown as Timestamp;
}

describe('UI del Centro de Metas, Presupuesto y Punto de Equilibrio', () => {
  const ahora = new Date(2026, 10, 16, 15, 0, 0);
  const plantilla = construirPlantillaRapidaPresupuesto('restaurante_medio');
  const config = {
    ...getConfiguracionMetasDefault('laparada', '2026-11'),
    ...plantilla,
    configuradoManualmente: true,
  };

  const ventas: Venta[] = [
    {
      id: 'v1',
      negocioId: 'laparada',
      items: [
        {
          tipo: 'producto',
          referenciaId: 'p1',
          nombre: 'Tequeño Mix',
          cantidad: 4,
          precioUnitario: 20000,
          subtotal: 80000,
        },
      ],
      subtotal: 80000,
      total: 80000,
      metodoPago: 'efectivo',
      origen: 'pos',
      fecha: fakeTimestamp(ahora),
    },
  ];

  const gastos: Gasto[] = [
    {
      id: 'g1',
      negocioId: 'laparada',
      concepto: 'Recarga de gas',
      categoria: 'gas',
      monto: 620000, // excede los 550.000 de la plantilla
      fecha: fakeTimestamp(ahora),
    },
  ];

  const resumen = evaluarCentroMetasPresupuesto({
    negocioId: 'laparada',
    mesKey: '2026-11',
    configuracion: config,
    ventasMes: ventas,
    gastosMes: gastos,
    movimientosKardexMes: [],
    productos: [],
    combos: [],
    insumos: [],
    ahora,
  });

  it('renderiza CentroMetasPresupuestoCard con Break-Even, alertas de sobregiro y barras por categoría', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <CentroMetasPresupuestoCard
          resumen={resumen}
          loading={false}
          error={null}
          puedeEditar={true}
          tieneMesAnteriorParaCopiar={false}
          guardando={false}
          urlWhatsApp="https://wa.me/?text=test"
          onCambiarMes={vi.fn()}
          onAbrirConfiguracion={vi.fn()}
          onCopiarMesAnterior={vi.fn(async () => undefined)}
          onExportarCsv={vi.fn()}
          onNotificarBandeja={vi.fn(async () => 1)}
          onReintentar={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(html).toContain('Metas Comerciales, Presupuesto');
    expect(html).toContain('Punto de Equilibrio (Break-Even)');
    expect(html).toContain('Alerta de Sobregiro');
    expect(html).toContain('Gas y Combustible excedió el presupuesto');
    expect(html).toContain('Noviembre 2026');
  });

  it('renderiza MetasBreakEvenWidget en Dashboard con estado de error explícito y con datos reales', () => {
    const htmlDatos = renderToStaticMarkup(
      <MemoryRouter>
        <MetasBreakEvenWidget
          resumen={resumen}
          loading={false}
          error={null}
          puedeEditar={true}
          onAbrirConfiguracion={vi.fn()}
          onReintentar={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(htmlDatos).toContain('Meta de Hoy');
    expect(htmlDatos).toContain('Meta del Mes');
    expect(htmlDatos).toContain('Punto de Equilibrio');
    expect(htmlDatos).toContain('Alertas de Desviación');

    const htmlError = renderToStaticMarkup(
      <MemoryRouter>
        <MetasBreakEvenWidget
          resumen={resumen}
          loading={false}
          error="Sin conexión"
          puedeEditar={true}
          onAbrirConfiguracion={vi.fn()}
          onReintentar={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(htmlError).toContain('No pudimos cargar las metas del mes');
    expect(htmlError).toContain('Reintentar consulta');
  });

  it('renderiza ConfigurarMetasPresupuestoModal accesible con vista previa de Break-Even', () => {
    const htmlModal = renderToStaticMarkup(
      <ConfigurarMetasPresupuestoModal
        isOpen={true}
        onClose={vi.fn()}
        etiquetaMes="Noviembre 2026"
        configuracionActual={config}
        tieneMesAnteriorParaCopiar={true}
        guardando={false}
        onGuardar={vi.fn(async () => undefined)}
        onCopiarMesAnterior={vi.fn(async () => undefined)}
      />
    );

    expect(htmlModal).toContain('role="dialog"');
    expect(htmlModal).toContain('aria-modal="true"');
    expect(htmlModal).toContain('Simulación en Vivo de Tu Punto de Equilibrio');
    expect(htmlModal).toContain('Copiar mes anterior');
    expect(htmlModal).toContain('Guardar Metas y Presupuesto');
  });
});
