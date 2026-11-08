import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { NotificacionCard } from '../NotificacionCard';
import type { NotificacionOperativa } from '@/types/notificacion';

const mockNotificacion: NotificacionOperativa = {
  id: 'notif-101',
  negocioId: 'laparada',
  modulo: 'cocina',
  tipo: 'comanda_muy_demorada',
  titulo: 'Comanda Crítica Mesa 4',
  mensaje: 'La comanda supera los 20 minutos en fogón',
  urgencia: 'critica',
  leida: false,
  fecha: '2026-11-08T02:00:00.000Z',
  enlace: '/cocina',
  origen: 'automatico',
  creadaPor: 'KDS Automático',
};

describe('NotificacionCard', () => {
  it('renderiza título, mensaje, badge de urgencia y módulo correctamente', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <NotificacionCard
          notificacion={mockNotificacion}
          onMarcarLeida={vi.fn()}
          onEliminar={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(html).toContain('Comanda Crítica Mesa 4');
    expect(html).toContain('La comanda supera los 20 minutos en fogón');
    expect(html).toContain('Crítica');
    expect(html).toContain('Cocina &amp; KDS');
    expect(html).toContain('Ver en módulo');
    expect(html).toContain('Nueva');
  });

  it('renderiza estado de notificación leída sin el badge Nueva', () => {
    const leidaNotif: NotificacionOperativa = {
      ...mockNotificacion,
      leida: true,
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <NotificacionCard
          notificacion={leidaNotif}
          onMarcarLeida={vi.fn()}
          onEliminar={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(html).toContain('Comanda Crítica Mesa 4');
    expect(html).not.toContain('Nueva');
  });
});
