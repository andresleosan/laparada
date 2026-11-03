import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReservaCard, formatFechaHora } from '../ReservaCard';
import type { ReservaNegocio } from '@/types/reserva';

describe('ReservaCard', () => {
  const mockReservaPendiente: ReservaNegocio = {
    id: 'res-1',
    negocioId: 'laparada',
    clienteNombre: 'Mariana Duarte',
    clienteTelefono: '3109876543',
    fechaHoraReserva: '2026-11-03T20:00:00.000Z',
    personas: 4,
    notas: 'Mesa exterior para cumpleaños',
    estado: 'pendiente',
    origen: 'whatsapp',
  };

  const mockReservaConfirmada: ReservaNegocio = {
    id: 'res-2',
    negocioId: 'laparada',
    clienteNombre: 'Andrés Salamanca',
    clienteTelefono: '3151234567',
    fechaHoraReserva: '2026-11-03T21:30:00.000Z',
    personas: 2,
    estado: 'confirmada',
    origen: 'pos',
  };

  it('formatea fechas legibles con hora y fecha corta', () => {
    const formatted = formatFechaHora('2026-11-03T20:00:00.000Z');
    expect(formatted.hora).toBeTruthy();
    expect(formatted.fecha).toBeTruthy();

    const fallback = formatFechaHora('');
    expect(fallback.hora).toBe('--:--');
  });

  it('renderiza reserva pendiente con badge amarillo y botón de Confirmar', () => {
    const html = renderToStaticMarkup(
      <ReservaCard
        reserva={mockReservaPendiente}
        onCambiarEstado={vi.fn()}
      />
    );

    expect(html).toContain('Mariana Duarte');
    expect(html).toContain('3109876543');
    expect(html).toContain('4 personas');
    expect(html).toContain('Pendiente');
    expect(html).toContain('Confirmar');
    expect(html).toContain('Cancelar');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('Mesa exterior para cumpleaños');
  });

  it('renderiza reserva confirmada con botón de Llegó / Completar y origen POS', () => {
    const html = renderToStaticMarkup(
      <ReservaCard
        reserva={mockReservaConfirmada}
        onCambiarEstado={vi.fn()}
      />
    );

    expect(html).toContain('Andrés Salamanca');
    expect(html).toContain('2 personas');
    expect(html).toContain('Confirmada');
    expect(html).toContain('Llegó / Completar');
    expect(html).toContain('Punto Físico');
  });
});

