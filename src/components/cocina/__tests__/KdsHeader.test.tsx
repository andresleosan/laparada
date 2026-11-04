import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KdsHeader } from '../KdsHeader';
import { KdsFilters } from '../KdsFilters';

describe('KdsHeader & KdsFilters', () => {
  describe('KdsHeader', () => {
    it('muestra el título, KPIs de comandas y estado de sonido', () => {
      const html = renderToStaticMarkup(
        <KdsHeader
          totalPendientes={4}
          totalEnPreparacion={2}
          totalListos={3}
          tiempoMasAntiguoMin={18}
          sonidoHabilitado={true}
          onToggleSonido={vi.fn()}
          onProbarSonido={vi.fn()}
        />
      );

      expect(html).toContain('Cocina / Pantalla KDS');
      expect(html).toContain('Pendientes:');
      expect(html).toContain('4');
      expect(html).toContain('En Fuego:');
      expect(html).toContain('2');
      expect(html).toContain('Listas:');
      expect(html).toContain('3');
      expect(html).toContain('Demora máx:');
      expect(html).toContain('18m');
      expect(html).toContain('Sonido ON');
      expect(html).toContain('Probar Timbre');
      expect(html).toContain('Pantalla Completa');
    });

    it('indica cuando el sonido está silenciado', () => {
      const html = renderToStaticMarkup(
        <KdsHeader
          totalPendientes={0}
          totalEnPreparacion={0}
          totalListos={0}
          tiempoMasAntiguoMin={0}
          sonidoHabilitado={false}
          onToggleSonido={vi.fn()}
          onProbarSonido={vi.fn()}
        />
      );

      expect(html).toContain('Silenciado');
      expect(html).not.toContain('Demora máx:');
    });
  });

  describe('KdsFilters', () => {
    it('renderiza botones de canales con aria-pressed adecuado', () => {
      const html = renderToStaticMarkup(
        <KdsFilters
          canalFiltro="whatsapp"
          onCanalChange={vi.fn()}
          busqueda="hamburguesa"
          onBusquedaChange={vi.fn()}
          layoutView="kanban"
          onLayoutViewChange={vi.fn()}
        />
      );

      expect(html).toContain('Todos');
      expect(html).toContain('WhatsApp');
      expect(html).toContain('Tienda Web');
      expect(html).toContain('Mostrador / POS');
      expect(html).toContain('value="hamburguesa"');
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain('aria-label="Vista en 3 columnas Kanban"');
    });
  });
});
