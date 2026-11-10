import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { MesaHeader } from '../MesaHeader';
import { LlamarMeseroModal } from '../LlamarMeseroModal';
import { PrecuentaMesaModal } from '../PrecuentaMesaModal';
import { AutopedidoDrawer } from '../AutopedidoDrawer';
import { MesaCuentaEnVivoSheet } from '../MesaCuentaEnVivoSheet';
import type { Mesa, CuentaMesa, ItemVenta } from '@/types';

describe('Componentes del Menú en Mesa (MesaHeader, Modales y Drawer)', () => {
  const mesaMock: Mesa = {
    id: 'm_1',
    numero: 1,
    nombre: 'Mesa 1',
    capacidad: 4,
    zona: 'Salón Principal',
    estado: 'ocupada',
    cuentaActivaId: 'cta_100',
    totalActual: 45000,
    meseroNombre: 'Carlos Mesero',
    negocioId: 'laparada',
  };

  const cuentaMock: CuentaMesa = {
    id: 'cta_100',
    mesaId: 'm_1',
    mesaNumero: 1,
    mesaNombre: 'Mesa 1',
    negocioId: 'laparada',
    estado: 'abierta',
    comensales: 2,
    meseroNombre: 'Carlos Mesero',
    rondas: [
      {
        id: 'r_1',
        numero: 1,
        enviadoEn: { seconds: 1700000000, nanoseconds: 0 },
        items: [{ tipo: 'producto', referenciaId: 'p1', nombre: 'Burger Clásica', precioUnitario: 22000, cantidad: 2, subtotal: 44000 }],
        total: 44000,
        enviadoCocina: true,
      },
    ],
    items: [{ tipo: 'producto', referenciaId: 'p1', nombre: 'Burger Clásica', precioUnitario: 22000, cantidad: 2, subtotal: 44000 }],
    total: 44000,
    apertura: { seconds: 1700000000, nanoseconds: 0 },
  };

  describe('MesaHeader', () => {
    it('renderiza el nombre del restaurante, mesa, mesero y botones de acción', () => {
      const html = renderToStaticMarkup(
        <MesaHeader
          negocioNombre="La Parada Gourmet"
          mesa={mesaMock}
          cuenta={cuentaMock}
          onAbrirLlamarMesero={vi.fn()}
          onAbrirPrecuenta={vi.fn()}
          onAbrirCuentaEnVivo={vi.fn()}
        />
      );

      expect(html).toContain('La Parada Gourmet');
      expect(html).toContain('Mesa 1');
      expect(html).toContain('Carlos Mesero');
      expect(html).toContain('Llamar Mesero');
      expect(html).toContain('Pedir Cuenta');
    });
  });

  describe('LlamarMeseroModal', () => {
    it('renderiza los motivos de asistencia cuando está abierto', () => {
      const html = renderToStaticMarkup(
        <LlamarMeseroModal
          isOpen={true}
          mesaNumero={1}
          mesaNombre="Mesa 1"
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      expect(html).toContain('Llamar al Mesero');
      expect(html).toContain('Servilletas / Cubiertos');
      expect(html).toContain('Atención / Consulta');
      expect(html).toContain('Enviar Llamado al Mesero');
    });

    it('no renderiza nada cuando isOpen es false', () => {
      const html = renderToStaticMarkup(
        <LlamarMeseroModal
          isOpen={false}
          mesaNumero={1}
          mesaNombre="Mesa 1"
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );
      expect(html).toBe('');
    });
  });

  describe('PrecuentaMesaModal', () => {
    it('renderiza el desglose financiero, selector de método de pago y acciones', () => {
      const html = renderToStaticMarkup(
        <PrecuentaMesaModal
          isOpen={true}
          mesaNumero={1}
          mesaNombre="Mesa 1"
          cuenta={cuentaMock}
          negocioNombre="La Parada"
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      expect(html).toContain('Pre-Cuenta de Salón');
      expect(html).toContain('Burger Clásica');
      expect(html).toContain('Propina voluntaria sugerida (10%)');
      expect(html).toContain('Efectivo');
      expect(html).toContain('Transferencia / Nequi');
      expect(html).toContain('Solicitar la Cuenta al Mesero');
      expect(html).toContain('Compartir desglose por WhatsApp');
    });
  });

  describe('AutopedidoDrawer', () => {
    const itemsMock: ItemVenta[] = [
      { tipo: 'producto', referenciaId: 'p2', nombre: 'Papas Rústicas', precioUnitario: 12000, cantidad: 1, subtotal: 12000 },
    ];

    it('renderiza la lista de platos listos para enviar a cocina', () => {
      const html = renderToStaticMarkup(
        <AutopedidoDrawer
          isOpen={true}
          mesaNumero={1}
          mesaNombre="Mesa 1"
          items={itemsMock}
          onClose={vi.fn()}
          onIncrementItem={vi.fn()}
          onDecrementItem={vi.fn()}
          onRemoveItem={vi.fn()}
          onUpdateItemNotas={vi.fn()}
          onEnviarPedido={vi.fn()}
        />
      );

      expect(html).toContain('Mi Autopedido en Mesa');
      expect(html).toContain('Papas Rústicas');
      expect(html).toContain('Confirmar y Enviar Pedido a Cocina');
    });
  });

  describe('MesaCuentaEnVivoSheet', () => {
    it('renderiza el historial de rondas y total acumulado', () => {
      const html = renderToStaticMarkup(
        <MesaCuentaEnVivoSheet
          isOpen={true}
          mesaNumero={1}
          mesaNombre="Mesa 1"
          cuenta={cuentaMock}
          onClose={vi.fn()}
          onPedirCuenta={vi.fn()}
        />
      );

      expect(html).toContain('Cuenta en Vivo');
      expect(html).toContain('Ronda 1');
      expect(html).toContain('Total Acumulado:');
      expect(html).toContain('Pedir Pre-Cuenta y Pagar');
    });
  });
});
