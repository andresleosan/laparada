import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HorariosDisponibilidadCard } from '../HorariosDisponibilidadCard';
import { crearConfigHorariosDefault } from '@/utils/horariosUtils';

vi.mock('@/services/negociosService', () => ({
  actualizarDatosNegocio: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/ui/Toast', () => ({
  createToast: vi.fn(),
}));

describe('HorariosDisponibilidadCard', () => {
  it('renderiza los controles de modo operativo y la grilla de 7 días', () => {
    const config = crearConfigHorariosDefault();
    const html = renderToStaticMarkup(
      <HorariosDisponibilidadCard negocioId="laparada" configInicial={config} />
    );

    expect(html).toContain('Horarios de Atención y Disponibilidad Operativa');
    expect(html).toContain('Automático');
    expect(html).toContain('Abierto Forzado');
    expect(html).toContain('Pausa en Cocina');
    expect(html).toContain('Cerrado Manual');
    expect(html).toContain('Lunes');
    expect(html).toContain('Domingo');
    expect(html).toContain('Guardar Horarios y Disponibilidad');
  });

  it('muestra la insignia de pausa temporal cuando estadoManual es pausa_cocina', () => {
    const config = crearConfigHorariosDefault();
    config.estadoManual = 'pausa_cocina';
    config.motivoCierreOPausa = 'Cocina saturada por evento';

    const html = renderToStaticMarkup(
      <HorariosDisponibilidadCard negocioId="laparada" configInicial={config} />
    );

    expect(html).toContain('Cocina saturada por evento');
    expect(html).toContain('aria-pressed="true"');
  });
});
