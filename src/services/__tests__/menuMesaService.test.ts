import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enviarLlamadoMesero,
  solicitarPrecuentaDesdeMesa,
  enviarAutopedidoMesa,
} from '@/services/menuMesaService';
import * as notificacionesService from '@/services/notificacionesService';
import * as mesasService from '@/services/mesasService';

vi.mock('@/services/notificacionesService', () => ({
  crearNotificacion: vi.fn().mockResolvedValue('notif_123'),
}));

vi.mock('@/services/mesasService', () => ({
  actualizarLlamadoMesa: vi.fn().mockResolvedValue(undefined),
  solicitarPrecierreMesa: vi.fn().mockResolvedValue(undefined),
  abrirCuentaMesa: vi.fn().mockResolvedValue('cuenta_creada_999'),
  agregarRondaACuenta: vi.fn().mockResolvedValue({
    id: 'ronda_1_test',
    numero: 1,
    enviadoEn: { seconds: 1700000000, nanoseconds: 0 },
    items: [{ tipo: 'producto', referenciaId: 'p1', nombre: 'Burger', precioUnitario: 20000, cantidad: 1, subtotal: 20000 }],
    total: 20000,
    enviadoCocina: true,
  }),
}));

describe('menuMesaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enviarLlamadoMesero', () => {
    it('crea notificación operativa y actualiza llamado en mesa', async () => {
      const res = await enviarLlamadoMesero({
        negocioId: 'laparada',
        mesaId: 'm_4',
        mesaNumero: 4,
        mesaNombre: 'Mesa 4',
        motivo: 'servilletas',
        notas: 'Traer salsas también',
        clienteNombre: 'Andrés',
      });

      expect(res).toBe('notif_123');
      expect(notificacionesService.crearNotificacion).toHaveBeenCalledWith(
        'laparada',
        expect.objectContaining({
          modulo: 'salon',
          tipo: 'llamado_mesero',
          titulo: 'Mesa 4 · Llamado de Mesero',
          urgencia: 'alta',
          metadata: expect.objectContaining({
            mesaId: 'm_4',
            motivo: 'servilletas',
            clienteNombre: 'Andrés',
          }),
        })
      );
      expect(mesasService.actualizarLlamadoMesa).toHaveBeenCalledWith(
        'laparada',
        'm_4',
        expect.objectContaining({
          tipo: 'llamado',
          motivo: 'Servilletas / Cubiertos',
        })
      );
    });
  });

  describe('solicitarPrecuentaDesdeMesa', () => {
    it('solicita pre-cierre, emite notificación y actualiza mesa', async () => {
      await solicitarPrecuentaDesdeMesa({
        negocioId: 'laparada',
        mesaId: 'm_2',
        mesaNumero: 2,
        mesaNombre: 'Mesa 2',
        cuentaId: 'cta_555',
        metodoPagoPreferido: 'efectivo',
        necesitaFactura: true,
        datosFactura: { nit: '901234567-1', razonSocial: 'Empresa SAS' },
        notas: 'Tengo cambio de $100.000',
      });

      expect(mesasService.solicitarPrecierreMesa).toHaveBeenCalledWith('laparada', 'm_2', 'cta_555');
      expect(notificacionesService.crearNotificacion).toHaveBeenCalledWith(
        'laparada',
        expect.objectContaining({
          modulo: 'salon',
          tipo: 'solicitud_precuenta',
          titulo: 'Mesa 2 · Solicitud de Pre-Cuenta',
        })
      );
      expect(mesasService.actualizarLlamadoMesa).toHaveBeenCalledWith(
        'laparada',
        'm_2',
        expect.objectContaining({
          tipo: 'cuenta',
        })
      );
    });
  });

  describe('enviarAutopedidoMesa', () => {
    it('abre cuenta si no existe, agrega ronda a cocina y notifica', async () => {
      const items = [{ tipo: 'producto' as const, referenciaId: 'p1', nombre: 'Burger', precioUnitario: 20000, cantidad: 1, subtotal: 20000 }];

      const ronda = await enviarAutopedidoMesa({
        negocioId: 'laparada',
        mesaId: 'm_1',
        mesaNumero: 1,
        mesaNombre: 'Mesa 1',
        items,
        clienteNombre: 'Comensal Móvil',
        notas: 'Bien tostado el pan',
      });

      expect(ronda.id).toBe('ronda_1_test');
      expect(mesasService.abrirCuentaMesa).toHaveBeenCalledWith(
        'laparada',
        expect.objectContaining({
          mesaId: 'm_1',
          clienteNombre: 'Comensal Móvil',
        })
      );
      expect(mesasService.agregarRondaACuenta).toHaveBeenCalledWith(
        'laparada',
        'cuenta_creada_999',
        expect.objectContaining({
          items,
          enviarAKDS: true,
        })
      );
      expect(notificacionesService.crearNotificacion).toHaveBeenCalledWith(
        'laparada',
        expect.objectContaining({
          modulo: 'salon',
          tipo: 'autopedido_mesa',
          titulo: 'Mesa 1 · Nuevo Autopedido Digital',
        })
      );
    });

    it('reutiliza cuenta existente si ya está abierta', async () => {
      const items = [{ tipo: 'producto' as const, referenciaId: 'p1', nombre: 'Burger', precioUnitario: 20000, cantidad: 2, subtotal: 40000 }];

      await enviarAutopedidoMesa({
        negocioId: 'laparada',
        mesaId: 'm_1',
        mesaNumero: 1,
        mesaNombre: 'Mesa 1',
        cuentaId: 'cta_ya_abierta_123',
        items,
      });

      expect(mesasService.abrirCuentaMesa).not.toHaveBeenCalled();
      expect(mesasService.agregarRondaACuenta).toHaveBeenCalledWith(
        'laparada',
        'cta_ya_abierta_123',
        expect.objectContaining({
          items,
          enviarAKDS: true,
        })
      );
    });

    it('lanza error si los ítems son inválidos', async () => {
      await expect(
        enviarAutopedidoMesa({
          negocioId: 'laparada',
          mesaId: 'm_1',
          mesaNumero: 1,
          mesaNombre: 'Mesa 1',
          items: [],
        })
      ).rejects.toThrow('Debes seleccionar al menos un producto');
    });
  });
});
