import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useInventario', () => ({
  useInventario: () => ({
    actualizar: async () => undefined,
    crear: async () => '',
    eliminar: async () => undefined,
    error: null,
    historial: async () => [],
    insumos: [
      {
        actualizadoEn: {},
        creadoEn: {},
        id: 'aceite',
        negocioId: 'negocio-a',
        nombre: 'Aceite',
        stockActual: 5,
        stockMinimo: 0,
        unidad: 'litros',
      },
    ],
    insumosConBajoStock: [],
    loading: false,
    refresh: async () => undefined,
    registrarEntrada: async () => '',
    registrarSalida: async () => undefined,
  }),
}));

import { InventarioPage } from './InventarioPage';

describe('semántica del mínimo de inventario', () => {
  it('muestra mínimo cero sin sustituirlo y genera un porcentaje CSS finito', () => {
    const html = renderToStaticMarkup(<InventarioPage />);

    expect(html).toContain('Alerta mínima:</span><span>0 litros');
    expect(html).toContain('style="width:100%"');
  });
});
