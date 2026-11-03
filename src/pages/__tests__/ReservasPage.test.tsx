import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import type { ReservaNegocio } from '@/types/reserva';

const mockReservas: ReservaNegocio[] = [
  {
    id: 'res-101',
    negocioId: 'laparada',
    clienteNombre: 'Camila Rivas',
    clienteTelefono: '3112223344',
    fechaHoraReserva: '2026-11-03T20:00:00.000Z',
    personas: 3,
    estado: 'confirmada',
    origen: 'whatsapp',
  },
  {
    id: 'res-102',
    negocioId: 'laparada',
    clienteNombre: 'Julián Castro',
    clienteTelefono: '3205556677',
    fechaHoraReserva: '2026-11-03T21:00:00.000Z',
    personas: 6,
    estado: 'pendiente',
    origen: 'pos',
  },
];

let mockUseReservasReturn = {
  reservas: mockReservas,
  loading: false,
  error: null as string | null,
  metricas: {
    total: 2,
    hoy: 2,
    pendientes: 1,
    confirmadas: 1,
    completadas: 0,
    canceladas: 0,
    personasHoy: 9,
  },
  crear: vi.fn(),
  cambiarEstado: vi.fn(),
  eliminar: vi.fn(),
  recargar: vi.fn(),
};

vi.mock('@/hooks/useReservas', () => ({
  useReservas: () => mockUseReservasReturn,
}));

vi.mock('@/services/firebase', () => ({ auth: null, db: {} }));

import { ReservasPage } from '../ReservasPage';

describe('ReservasPage', () => {
  it('renderiza la vista principal con KPIs, filtros y botón de nueva reserva', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/reservas">
        <ReservasPage />
      </StaticRouter>
    );

    expect(html).toContain('Agenda y Reservas');
    expect(html).toContain('Reservas Hoy');
    expect(html).toContain('Pendientes');
    expect(html).toContain('Confirmadas');
    expect(html).toContain('Personas Hoy');
    expect(html).toContain('Nueva Reserva');
    expect(html).toContain('Camila Rivas');
    expect(html).toContain('Julián Castro');
    expect(html).toContain('Todas las Fechas');
    expect(html).toContain('Solo Hoy');
    expect(html).toContain('Próximos Días');
  });

  it('muestra estado vacío amigable cuando no hay reservas registradas', () => {
    mockUseReservasReturn = {
      ...mockUseReservasReturn,
      reservas: [],
      metricas: {
        total: 0,
        hoy: 0,
        pendientes: 0,
        confirmadas: 0,
        completadas: 0,
        canceladas: 0,
        personasHoy: 0,
      },
    };

    const html = renderToStaticMarkup(
      <StaticRouter location="/reservas">
        <ReservasPage />
      </StaticRouter>
    );

    expect(html).toContain('Aún no hay reservas registradas');
    expect(html).toContain('+ Crear primera reserva');
  });
});
