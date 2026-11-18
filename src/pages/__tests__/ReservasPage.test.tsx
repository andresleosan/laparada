import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import type { Mesa } from '@/types/mesa';
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
    mesaId: 'm1',
    mesaNumero: 1,
    mesaNombre: 'Mesa 1',
    anticipoMonto: 50000,
    anticipoMetodo: 'transferencia',
    anticipoEstado: 'verificado',
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

const mockMesas: Mesa[] = [
  {
    id: 'm1',
    numero: 1,
    nombre: 'Mesa 1',
    capacidad: 4,
    zona: 'Salón Principal',
    estado: 'libre',
    negocioId: 'laparada',
  },
];

let mockUseReservasReturn = {
  reservas: mockReservas,
  mesas: mockMesas,
  negocioNombre: 'La Parada Grill',
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
    conMesaAsignada: 1,
    totalAnticiposVerificadosCOP: 50000,
    totalAnticiposPendientesCOP: 0,
    proximas2Horas: 1,
  },
  crear: vi.fn(),
  cambiarEstado: vi.fn(),
  asignarMesa: vi.fn(),
  actualizarAnticipo: vi.fn(),
  registrarRecordatorio: vi.fn(),
  hacerCheckInEnMesa: vi.fn(),
  eliminar: vi.fn(),
  recargar: vi.fn(),
};

vi.mock('@/hooks/useReservas', () => ({
  useReservas: () => mockUseReservasReturn,
}));

vi.mock('@/services/firebase', () => ({ auth: null, db: {} }));

import { ReservasPage } from '../ReservasPage';

describe('ReservasPage', () => {
  it('renderiza la vista principal con KPIs de anticipos, conmutador de mapa y reservas', () => {
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
    expect(html).toContain('Anticipos Verificados');
    expect(html).toContain('Libro de Reservas');
    expect(html).toContain('Mapa de Mesas (1)');
    expect(html).toContain('Exportar CSV');
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
        conMesaAsignada: 0,
        totalAnticiposVerificadosCOP: 0,
        totalAnticiposPendientesCOP: 0,
        proximas2Horas: 0,
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
