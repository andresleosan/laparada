import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { RegistroTemperaturaBpm } from '@/types/bpm';
import {
  calcularResumenCumplimientoBpm,
  crearConfiguracionBpmDefault,
  evaluarEquiposFrioHoy,
  evaluarFreidorasEstado,
} from '@/utils/bpmUtils';
import { BitacoraBpmWidget } from '../BitacoraBpmWidget';

describe('BitacoraBpmWidget', () => {
  it('renderiza estado crítico con desviación térmica y enlace a /bpm', () => {
    const config = crearConfiguracionBpmDefault('laparada');
    const ahora = new Date('2026-11-24T15:00:00Z');
    const hoyIso = '2026-11-24';

    const temps: RegistroTemperaturaBpm[] = [
      {
        id: 't-crit',
        negocioId: 'laparada',
        equipoId: config.equiposFrio[0].id,
        equipoNombre: config.equiposFrio[0].nombre,
        tipoEquipo: 'refrigeracion',
        franja: 'apertura',
        fechaIso: hoyIso,
        horaTexto: '08:00',
        temperaturaC: 9.4,
        tempMinOptimaC: 0,
        tempMaxOptimaC: 4,
        estadoConformidad: 'critico',
        accionCorrectiva: 'Ajuste de puerta',
        resuelto: false,
        responsableNombre: 'Andrés',
        fecha: ahora,
        creadoEn: ahora,
      },
    ];

    const resumen = calcularResumenCumplimientoBpm({
      config,
      temperaturas: temps,
      aceite: [],
      checklists: [],
      ahora,
    });
    const equiposEval = evaluarEquiposFrioHoy(config.equiposFrio, temps, hoyIso);
    const freidorasEval = evaluarFreidorasEstado(config.freidoras, [], hoyIso);

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <BitacoraBpmWidget
          resumen={resumen}
          equiposEvaluados={equiposEval}
          freidorasEvaluadas={freidorasEval}
          loading={false}
          error={null}
          onReintentar={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(html).toContain('Bitácora Sanitaria BPM');
    expect(html).toContain('Crítico');
    expect(html).toContain('9.4 °C');
    expect(html).toContain('Abrir Bitácora BPM');
  });

  it('renderiza estado de error explícito con botón Reintentar consulta', () => {
    const config = crearConfiguracionBpmDefault('laparada');
    const resumen = calcularResumenCumplimientoBpm({
      config,
      temperaturas: [],
      aceite: [],
      checklists: [],
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <BitacoraBpmWidget
          resumen={resumen}
          equiposEvaluados={[]}
          freidorasEvaluadas={[]}
          loading={false}
          error="Sin permisos de lectura"
          onReintentar={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(html).toContain('No pudimos consultar la Bitácora Sanitaria BPM');
    expect(html).toContain('Reintentar consulta');
  });
});
