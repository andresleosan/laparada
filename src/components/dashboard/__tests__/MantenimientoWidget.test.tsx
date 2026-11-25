import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { Timestamp } from 'firebase/firestore';
import type {
  EquipoActivoMantenimiento,
  ReporteFallaEquipo,
} from '@/types/mantenimiento';
import {
  calcularResumenMantenimiento,
  evaluarEquiposMantenimiento,
} from '@/utils/mantenimientoUtils';
import { MantenimientoWidget } from '../MantenimientoWidget';

const tsStub = { seconds: 1732400000, nanoseconds: 0 } as Timestamp;

describe('MantenimientoWidget', () => {
  it('renderiza estado crítico con falla KDS y vencimiento de extintor', () => {
    const equipo: EquipoActivoMantenimiento = {
      id: 'ext-1',
      negocioId: 'laparada',
      codigoActivo: 'SEG-001',
      nombre: 'Extintor Tipo K 6L',
      categoria: 'extintor',
      ubicacion: 'Cocina',
      estadoOperativo: 'con_falla',
      frecuenciaPreventivoDias: 365,
      fechaRecargaVenceIso: '2026-11-18',
      proximoMantenimientoIso: '2026-11-18',
      costoAcumuladoCOP: 95000,
      totalIntervenciones: 1,
      activo: true,
      creadoEn: tsStub,
      actualizadoEn: tsStub,
    };

    const falla: ReporteFallaEquipo = {
      id: 'fal-1',
      negocioId: 'laparada',
      equipoId: 'ext-1',
      equipoNombre: 'Extintor Tipo K 6L',
      categoriaEquipo: 'extintor',
      severidad: 'critica',
      detieneOperacion: true,
      descripcion: 'Manómetro en zona roja',
      estado: 'abierta',
      origenReporte: 'cocina_kds',
      reportadoPor: 'Cocinero',
      fechaIso: '2026-11-24',
      creadoEn: tsStub,
      actualizadoEn: tsStub,
    };

    const evaluados = evaluarEquiposMantenimiento([equipo], [falla], '2026-11-24');
    const resumen = calcularResumenMantenimiento(evaluados, [], [falla], '2026-11-24');

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MantenimientoWidget
          resumen={resumen}
          equiposEvaluados={evaluados}
          fallasAbiertas={[falla]}
          loading={false}
          error={null}
          onReintentar={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(html).toContain('Mantenimiento &amp; Extintores');
    expect(html).toContain('Crítico');
    expect(html).toContain('Falla KDS: Extintor Tipo K 6L');
    expect(html).toContain('Abrir Mantenimiento');
    expect(html).toContain('Ver Gastos');
  });

  it('muestra estado de error explícito con botón Reintentar consulta', () => {
    const resumen = calcularResumenMantenimiento([], [], []);
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MantenimientoWidget
          resumen={resumen}
          equiposEvaluados={[]}
          fallasAbiertas={[]}
          loading={false}
          error="Sin permisos de lectura"
          onReintentar={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(html).toContain('No pudimos consultar Mantenimiento Preventivo');
    expect(html).toContain('Reintentar consulta');
  });
});
