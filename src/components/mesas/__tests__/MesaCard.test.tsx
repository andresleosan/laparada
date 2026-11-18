import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MesaCard } from '../MesaCard';
import type { Mesa } from '@/types/mesa';
import type { ReservaNegocio } from '@/types/reserva';

describe('MesaCard', () => {
  const mesaLibre: Mesa = {
    id: 'm1',
    numero: 1,
    nombre: 'Mesa 1',
    capacidad: 4,
    zona: 'Salón Principal',
    estado: 'libre',
    negocioId: 'test_tenant',
  };

  const mesaOcupada: Mesa = {
    id: 'm2',
    numero: 2,
    nombre: 'Mesa 2',
    capacidad: 6,
    zona: 'Terraza',
    estado: 'ocupada',
    comensales: 4,
    mesero: 'Carlos',
    totalActual: 45000,
    apertura: { seconds: 1700000000, nanoseconds: 0 },
    negocioId: 'test_tenant',
  };

  const mesaPorCobrar: Mesa = {
    id: 'm3',
    numero: 3,
    nombre: 'Mesa 3',
    capacidad: 2,
    zona: 'Barra',
    estado: 'por_cobrar',
    comensales: 2,
    totalActual: 30000,
    negocioId: 'test_tenant',
  };

  it('renderiza mesa libre con botón de Abrir Mesa y capacidad', () => {
    const html = renderToStaticMarkup(
      <MesaCard mesa={mesaLibre} onAbrir={vi.fn()} onVerDetalle={vi.fn()} />
    );

    expect(html).toContain('Mesa 1');
    expect(html).toContain('Salón Principal');
    expect(html).toContain('Libre');
    expect(html).toContain('4 personas');
    expect(html).toContain('Abrir Mesa');
  });

  it('renderiza mesa ocupada con mesero, comensales y total acumulado', () => {
    const html = renderToStaticMarkup(
      <MesaCard mesa={mesaOcupada} onAbrir={vi.fn()} onVerDetalle={vi.fn()} />
    );

    expect(html).toContain('Mesa 2');
    expect(html).toContain('Ocupada');
    expect(html).toContain('4 comensales');
    expect(html).toContain('Carlos');
    expect(html).toContain('Ver Cuenta');
  });

  it('renderiza mesa por cobrar con botón directo de Cobro', () => {
    const html = renderToStaticMarkup(
      <MesaCard
        mesa={mesaPorCobrar}
        onAbrir={vi.fn()}
        onVerDetalle={vi.fn()}
        onCobrarDirecto={vi.fn()}
      />
    );

    expect(html).toContain('Por Cobrar');
    expect(html).toContain('Cobrar');
  });

  it('muestra alerta de reserva próxima y botón Check-In Reserva en mesa libre', () => {
    const reservaProxima: ReservaNegocio = {
      id: 'res-99',
      negocioId: 'test_tenant',
      clienteNombre: 'Sofía Vargas',
      clienteTelefono: '3121112233',
      fechaHoraReserva: '2026-11-17T20:00',
      personas: 4,
      estado: 'confirmada',
      origen: 'whatsapp',
      anticipoMonto: 50000,
      anticipoEstado: 'verificado',
    };

    const html = renderToStaticMarkup(
      <MesaCard
        mesa={mesaLibre}
        reservaProxima={reservaProxima}
        onAbrir={vi.fn()}
        onVerDetalle={vi.fn()}
        onCheckInReserva={vi.fn()}
      />
    );

    expect(html).toContain('Reserva: Sofía Vargas');
    expect(html).toContain('4 pers.');
    expect(html).toContain('Anticipo');
    expect(html).toContain('Check-In Reserva');
  });
});
