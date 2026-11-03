import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResumenDiarioEmailCard } from '../ResumenDiarioEmailCard';
import { Negocio } from '@/types/negocio';
import { Timestamp } from 'firebase/firestore';

vi.mock('@/services/emailNotificationsService', () => ({
  obtenerResumenDiarioActual: vi.fn().mockResolvedValue({
    negocioId: 'negocio-test',
    nombreNegocio: 'Restaurante El Gourmet',
    datos: {
      totalVentasCOP: 320000,
      cantidadVentas: 18,
      ticketPromedioCOP: 17778,
      cierreCaja: { cerrado: true },
    },
  }),
  enviarResumenDiarioPorCorreo: vi.fn(),
  getNotificacionesCorreoDeNegocio: vi.fn().mockResolvedValue([]),
}));

const mockNegocio: Negocio = {
  id: 'negocio-test',
  nombre: 'Restaurante El Gourmet',
  slug: 'el-gourmet',
  propietarioEmail: 'propietario@gourmet.com',
  propietarioNombre: 'Juan Gourmet',
  telefono: '3001234567',
  estado: 'activo',
  creadoEn: { seconds: 1700000000, nanoseconds: 0 } as unknown as Timestamp,
};

describe('ResumenDiarioEmailCard', () => {
  it('renderiza encabezado, título de Resumen Diario y hora de despacho', () => {
    const html = renderToStaticMarkup(<ResumenDiarioEmailCard negocio={mockNegocio} />);

    expect(html).toContain('Resumen Ejecutivo Diario');
    expect(html).toContain('11:00 PM');
    expect(html).toContain('propietario@gourmet.com');
    expect(html).toContain('Ventas Hoy');
    expect(html).toContain('Pedidos');
    expect(html).toContain('Ticket Promedio');
    expect(html).toContain('Estado Cierre');
  });

  it('incluye botones accesibles para Previsualizar y Enviar Ahora', () => {
    const html = renderToStaticMarkup(<ResumenDiarioEmailCard negocio={mockNegocio} />);

    expect(html).toContain('Previsualizar');
    expect(html).toContain('Enviar Ahora');
    expect(html).toContain('Ver últimos correos enviados');
  });

  it('respeta correo de notificaciones configurado si existe', () => {
    const negocioConEmailAlterno: Negocio = {
      ...mockNegocio,
      emailNotificacionesResumen: 'gerencia@gourmet.com',
    };

    const html = renderToStaticMarkup(<ResumenDiarioEmailCard negocio={negocioConEmailAlterno} />);
    expect(html).toContain('gerencia@gourmet.com');
  });
});
