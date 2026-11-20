import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Timestamp } from 'firebase/firestore';
import type { Domicilio } from '@/types';
import { KdsFilters } from '../KdsFilters';
import { ComandaCard } from '../ComandaCard';
import { EstacionTiempoSelector } from '@/components/productos/EstacionTiempoSelector';

describe('Estaciones de Cocina en KDS y Productos', () => {
  it('renderiza los filtros de estación con conteos en KdsFilters', () => {
    const html = renderToStaticMarkup(
      <KdsFilters
        canalFiltro="todos"
        onCanalChange={vi.fn()}
        estacionFiltro="fritura"
        onEstacionChange={vi.fn()}
        conteoPorEstacion={{
          fritura: 3,
          plancha: 2,
          bebidas_barra: 1,
          armado: 0,
          general: 0,
        }}
        busqueda=""
        onBusquedaChange={vi.fn()}
        layoutView="kanban"
        onLayoutViewChange={vi.fn()}
      />
    );

    expect(html).toContain('Todas las estaciones');
    expect(html).toContain('Fritura');
    expect(html).toContain('Plancha');
    expect(html).toContain('Barra');
    expect(html).toContain('>3<');
    expect(html).toContain('>2<');
  });

  it('muestra estación por ítem y tiempo objetivo dinámico en ComandaCard', () => {
    const nowMs = Date.now();
    const comanda: Domicilio = {
      id: 'cmd-test-1',
      clienteNombre: 'Carlos Ruiz',
      clienteTelefono: '3001112233',
      direccion: 'Av 0 #12-34',
      barrio: 'Caobos',
      items: [
        {
          tipo: 'producto',
          referenciaId: 'p1',
          nombre: 'Hamburguesa La Parada',
          cantidad: 2,
          precioUnitario: 20000,
          subtotal: 40000,
          estacionCocina: 'plancha',
          tiempoPreparacionMin: 12,
        },
        {
          tipo: 'producto',
          referenciaId: 'b1',
          nombre: 'Limonada Natural',
          cantidad: 2,
          precioUnitario: 6000,
          subtotal: 12000,
          estacionCocina: 'bebidas_barra',
          tiempoPreparacionMin: 3,
        },
      ],
      total: 52000,
      metodoPago: 'efectivo',
      origen: 'pos',
      estado: 'pendiente',
      tiempoObjetivoMin: 12,
      creadoEn: Timestamp.fromMillis(nowMs - 4 * 60000),
      actualizadoEn: Timestamp.fromMillis(nowMs - 4 * 60000),
      negocioId: 'laparada',
    };

    const html = renderToStaticMarkup(
      <ComandaCard
        comanda={comanda}
        ahoraMs={nowMs}
        itemsPreparados={{}}
        onToggleItem={vi.fn()}
        onAvanzar={vi.fn()}
        estacionFiltro="plancha"
      />
    );

    expect(html).toContain('Obj 12m · Quedan 8m');
    expect(html).toContain('Plancha');
    expect(html).toContain('Barra');
    expect(html).toContain('12m');
    expect(html).toContain('3m');
  });

  it('renderiza EstacionTiempoSelector con todas las estaciones y chips de tiempo', () => {
    const html = renderToStaticMarkup(
      <EstacionTiempoSelector
        estacionCocina="plancha"
        onEstacionChange={vi.fn()}
        tiempoPreparacionStr="12"
        onTiempoChange={vi.fn()}
      />
    );

    expect(html).toContain('Estación de Cocina (KDS) y Tiempo Objetivo');
    expect(html).toContain('Fritura');
    expect(html).toContain('Plancha');
    expect(html).toContain('Barra');
    expect(html).toContain('12m');
  });
});
