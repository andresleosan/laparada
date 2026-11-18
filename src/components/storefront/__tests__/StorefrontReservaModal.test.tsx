import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Mesa } from '@/types/mesa';
import type { ReservaNegocio } from '@/types/reserva';
import { mesasDefaultIniciales } from '@/utils/mesasUtils';
import {
  construirMensajeConfirmacionReservaWhatsApp,
  evaluarDisponibilidadMesasParaReserva,
  generarUrlWhatsAppReserva,
} from '@/utils/reservasUtils';
import { StorefrontReservaModal } from '../StorefrontReservaModal';

vi.mock('@/components/storefront/StorefrontDialog', () => ({
  StorefrontDialog: ({
    children,
    labelledBy,
    className,
  }: {
    children: ReactNode;
    labelledBy: string;
    className: string;
  }) => (
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={className}>
      {children}
    </div>
  ),
}));

describe('StorefrontReservaModal', () => {
  const mesasPrueba: Mesa[] = mesasDefaultIniciales('laparada').map((m, idx) => ({
    ...m,
    id: `mesa-laparada-${m.numero || idx + 1}`,
  }));

  it('renderiza el modal accesible con mapa de mesas, ocasiones especiales y anticipo offline', () => {
    const html = renderToStaticMarkup(
      <StorefrontReservaModal
        isOpen={true}
        onClose={vi.fn()}
        negocioId="laparada"
        negocioNombre="La Parada"
        negocioTelefono="3105559988"
        mesasIniciales={mesasPrueba}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Reservar Mesa en La Parada');
    expect(html).toContain('data-testid="storefront-mapa-mesas"');
    expect(html).toContain('Mesa 1');
    expect(html).toContain('Mesa 4');
    expect(html).toContain('Terraza');
    expect(html).toContain('2 pers.');
    expect(html).toContain('6 pers.');
    expect(html).toContain('🎂 Cumpleaños');
    expect(html).toContain('Sin anticipo');
    expect(html).toContain('50.000');
    expect(html).toContain('Confirmar Solicitud de Reserva');
    expect(html).toContain('sin pasarelas en línea');
    expect(html).not.toContain('tarjeta de crédito');
  });

  it('recomienda Mesa 4 en Terraza y deshabilita mesas de menor capacidad cuando hay 6 comensales', () => {
    const eval2 = evaluarDisponibilidadMesasParaReserva({
      mesas: mesasPrueba,
      reservas: [],
      fechaHoraReserva: '2026-11-20T19:30',
      personas: 2,
    });
    const recomendada2 = eval2.find((item) => item.recomendada);
    expect(recomendada2).toBeDefined();
    expect(recomendada2?.capacidadSuficiente).toBe(true);
    expect(eval2.every((item) => item.capacidadSuficiente)).toBe(true);

    const eval6 = evaluarDisponibilidadMesasParaReserva({
      mesas: mesasPrueba,
      reservas: [],
      fechaHoraReserva: '2026-11-20T19:30',
      personas: 6,
    });
    const recomendada6 = eval6.find((item) => item.recomendada);
    expect(recomendada6?.mesa.numero).toBe(4);
    expect(recomendada6?.mesa.nombre).toBe('Mesa 4');
    expect(recomendada6?.mesa.zona).toBe('Terraza');
    expect(recomendada6?.capacidadSuficiente).toBe(true);

    const mesasInsuficientes = eval6.filter((item) => !item.capacidadSuficiente);
    expect(mesasInsuficientes.map((item) => item.mesa.numero).sort()).toEqual([1, 2, 3, 5, 6]);
  });

  it('genera el resumen de confirmación por WhatsApp con ocasión Cumpleaños y anticipo offline', () => {
    const reservaConfirmada: ReservaNegocio = {
      id: 'RES-WEB',
      negocioId: 'laparada',
      clienteNombre: 'Mariana Duarte',
      clienteTelefono: '3105551234',
      fechaHoraReserva: '2026-11-20T19:30',
      personas: 6,
      mesaId: 'mesa-laparada-4',
      mesaNumero: 4,
      mesaNombre: 'Mesa 4',
      zonaPreferida: 'Terraza',
      ocasionEspecial: 'cumpleanos',
      anticipoMonto: 50000,
      anticipoMetodo: 'transferencia',
      anticipoEstado: 'pendiente',
      anticipoReferencia: 'NEQUI-998877',
      estado: 'pendiente',
      origen: 'web',
    };

    const mensaje = construirMensajeConfirmacionReservaWhatsApp({
      reserva: reservaConfirmada,
      negocioNombre: 'La Parada',
    });
    const url = generarUrlWhatsAppReserva('3105559988', mensaje);

    expect(mensaje).toContain('Mariana Duarte');
    expect(mensaje).toContain('Mesa 4 (Terraza)');
    expect(mensaje).toContain('6 personas');
    expect(mensaje).toContain('Cumpleaños');
    expect(mensaje).toContain('50.000');
    expect(mensaje).toContain('Transferencia');
    expect(url).toMatch(/^https:\/\/wa\.me\/573105559988\?text=/);
  });
});
