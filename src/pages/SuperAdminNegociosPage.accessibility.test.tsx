import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Negocio } from '@/types/negocio';

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    esSuperAdmin: true,
    negocioActual: { id: 'laparada', nombre: 'La Parada' },
    cambiarNegocioActivo: vi.fn(),
  }),
}));

vi.mock('@/services/negociosService', () => ({
  getTodosNegocios: vi.fn().mockResolvedValue([]),
  aprobarNegocio: vi.fn().mockResolvedValue(undefined),
  cambiarEstadoNegocio: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

import * as SuperAdminModule from './SuperAdminNegociosPage';

type Filtro = 'pendientes' | 'activos' | 'todos';

interface NegociosToolbarProps {
  filtro: Filtro;
  onFiltroChange: (filtro: Filtro) => void;
  busqueda: string;
  onBusquedaChange: (busqueda: string) => void;
  cantidades: Record<Filtro, number>;
}

interface NegocioAccountCardProps {
  negocio: Negocio;
  esActual: boolean;
  procesando: boolean;
  onAprobar: (negocio: Negocio) => void;
  onRechazar: (negocio: Negocio) => void;
  onSuspender: (negocio: Negocio) => void;
  onOperar: (negocio: Negocio) => void;
}

const negocioPendiente = {
  id: 'cafe-norte',
  nombre: 'Café del Norte',
  slug: 'cafe-del-norte',
  propietarioEmail: 'propietaria@cafenorte.test',
  propietarioNombre: 'María Pérez',
  telefono: '300 123 4567',
  direccion: 'Calle 10 # 2-30',
  ciudad: 'Cúcuta',
  estado: 'pendiente',
  plan: 'basico',
  creadoEn: {} as Negocio['creadoEn'],
} satisfies Negocio;

const callbacks = {
  onAprobar: () => undefined,
  onRechazar: () => undefined,
  onSuspender: () => undefined,
  onOperar: () => undefined,
};

describe('SuperAdminNegociosPage accesible', () => {
  it('expone el filtro seleccionado y asocia el buscador con su etiqueta', () => {
    const NegociosToolbar = (
      SuperAdminModule as typeof SuperAdminModule & {
        NegociosToolbar?: ComponentType<NegociosToolbarProps>;
      }
    ).NegociosToolbar;

    expect(NegociosToolbar).toBeTypeOf('function');
    if (!NegociosToolbar) return;

    const html = renderToStaticMarkup(
      <NegociosToolbar
        filtro="pendientes"
        onFiltroChange={() => undefined}
        busqueda="norte"
        onBusquedaChange={() => undefined}
        cantidades={{ pendientes: 2, activos: 4, todos: 7 }}
      />
    );

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Filtrar negocios por estado"');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(2);

    const inputId = html.match(/<label[^>]*for="([^"]+)"[^>]*>Buscar negocios<\/label>/)?.[1];
    expect(inputId).toBeTruthy();
    expect(html).toContain(`id="${inputId}"`);
    expect(html).toContain('aria-label="Limpiar búsqueda"');
  });

  it('nombra el estado, los contactos y las acciones de una solicitud', () => {
    const NegocioAccountCard = (
      SuperAdminModule as typeof SuperAdminModule & {
        NegocioAccountCard?: ComponentType<NegocioAccountCardProps>;
      }
    ).NegocioAccountCard;

    expect(NegocioAccountCard).toBeTypeOf('function');
    if (!NegocioAccountCard) return;

    const html = renderToStaticMarkup(
      <NegocioAccountCard
        negocio={negocioPendiente}
        esActual={false}
        procesando={false}
        {...callbacks}
      />
    );

    const headingId = html.match(/<article[^>]*aria-labelledby="([^"]+)"/)?.[1];
    expect(headingId).toBeTruthy();
    expect(html).toContain(`id="${headingId}"`);
    expect(html).toContain('Pendiente');
    expect(html).toContain('href="mailto:propietaria@cafenorte.test"');
    expect(html).toContain('aria-label="Abrir WhatsApp de Café del Norte en una pestaña nueva"');
    expect(html).toContain('aria-label="Rechazar solicitud de Café del Norte"');
    expect(html).toContain('aria-label="Aprobar Café del Norte"');
    for (const emoji of ['✅', '❌', '⚠️']) {
      expect(html).not.toContain(emoji);
    }
  });

  it('distingue operar y suspender en una cuenta activa', () => {
    const NegocioAccountCard = (
      SuperAdminModule as typeof SuperAdminModule & {
        NegocioAccountCard?: ComponentType<NegocioAccountCardProps>;
      }
    ).NegocioAccountCard;

    expect(NegocioAccountCard).toBeTypeOf('function');
    if (!NegocioAccountCard) return;

    const negocioActivo: Negocio = { ...negocioPendiente, estado: 'activo' };
    const html = renderToStaticMarkup(
      <NegocioAccountCard
        negocio={negocioActivo}
        esActual={false}
        procesando={false}
        {...callbacks}
      />
    );

    expect(html).toContain('aria-label="Operar Café del Norte"');
    expect(html).toContain('aria-label="Suspender acceso de Café del Norte"');
  });

  it('no duplica el prefijo colombiano en enlaces de WhatsApp', () => {
    const NegocioAccountCard = (
      SuperAdminModule as typeof SuperAdminModule & {
        NegocioAccountCard?: ComponentType<NegocioAccountCardProps>;
      }
    ).NegocioAccountCard;

    expect(NegocioAccountCard).toBeTypeOf('function');
    if (!NegocioAccountCard) return;

    const html = renderToStaticMarkup(
      <NegocioAccountCard
        negocio={{ ...negocioPendiente, telefono: '+57 300 123 4567' }}
        esActual={false}
        procesando={false}
        {...callbacks}
      />
    );

    expect(html).toContain('href="https://wa.me/573001234567"');
    expect(html).not.toContain('https://wa.me/5757');
  });

  it('comunica cuando una acción sobre la cuenta está en curso', () => {
    const NegocioAccountCard = (
      SuperAdminModule as typeof SuperAdminModule & {
        NegocioAccountCard?: ComponentType<NegocioAccountCardProps>;
      }
    ).NegocioAccountCard;

    expect(NegocioAccountCard).toBeTypeOf('function');
    if (!NegocioAccountCard) return;

    const html = renderToStaticMarkup(
      <NegocioAccountCard
        negocio={negocioPendiente}
        esActual={false}
        procesando
        {...callbacks}
      />
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain('Procesando acción');
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
