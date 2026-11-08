import { describe, it, expect } from 'vitest';
import {
  evaluarNivelFidelizacion,
  calcularDiasDesdeUltimaCompra,
  evaluarEstadoRiesgoCliente,
  calcularProgresoTarjetaSellos,
  generarMensajeCampanaWhatsApp,
  calcularKpisFidelizacion,
  exportarCampanaClientesCsv,
  META_SELLOS_DEFECTO,
} from '../fidelizacionUtils';
import type { Cliente } from '@/types';

function crearClienteDummy(parciales: Partial<Cliente> = {}): Cliente {
  return {
    id: 'cli-test-1',
    negocioId: 'negocio-1',
    nombre: 'Carlos Gómez',
    telefono: '3001234567',
    direcciones: ['Calle 10 # 5-20'],
    totalPedidos: 2,
    totalConsumido: 45000,
    primerPedidoEn: new Date(2026, 9, 1),
    ultimoPedidoEn: new Date(2026, 9, 20),
    origenRegistro: 'pos',
    creadoEn: new Date(2026, 9, 1),
    actualizadoEn: new Date(2026, 9, 20),
    sellosActuales: 2,
    metaSellos: 6,
    recompensasDisponibles: 0,
    recompensasRedimidas: 0,
    ...parciales,
  };
}

describe('fidelizacionUtils', () => {
  describe('evaluarNivelFidelizacion', () => {
    it('asigna Bronce a clientes con 0 a 2 pedidos', () => {
      const res0 = evaluarNivelFidelizacion({ totalPedidos: 0, totalConsumido: 0 });
      expect(res0.nivel).toBe('bronce');
      expect(res0.label).toBe('Bronce');

      const res2 = evaluarNivelFidelizacion({ totalPedidos: 2, totalConsumido: 30000 });
      expect(res2.nivel).toBe('bronce');
    });

    it('asigna Plata a clientes con 3 a 6 pedidos', () => {
      const res3 = evaluarNivelFidelizacion({ totalPedidos: 3, totalConsumido: 60000 });
      expect(res3.nivel).toBe('plata');
      expect(res3.label).toBe('VIP Plata');

      const res6 = evaluarNivelFidelizacion({ totalPedidos: 6, totalConsumido: 120000 });
      expect(res6.nivel).toBe('plata');
    });

    it('asigna Oro a clientes con 7 a 14 pedidos', () => {
      const res7 = evaluarNivelFidelizacion({ totalPedidos: 7, totalConsumido: 180000 });
      expect(res7.nivel).toBe('oro');
      expect(res7.label).toBe('VIP Oro');

      const res14 = evaluarNivelFidelizacion({ totalPedidos: 14, totalConsumido: 350000 });
      expect(res14.nivel).toBe('oro');
    });

    it('asigna Diamante a clientes con 15 o más pedidos', () => {
      const res15 = evaluarNivelFidelizacion({ totalPedidos: 15, totalConsumido: 400000 });
      expect(res15.nivel).toBe('diamante');
      expect(res15.label).toBe('VIP Diamante');

      const res30 = evaluarNivelFidelizacion({ totalPedidos: 30, totalConsumido: 900000 });
      expect(res30.nivel).toBe('diamante');
    });
  });

  describe('calcularDiasDesdeUltimaCompra y evaluarEstadoRiesgoCliente', () => {
    const fechaRef = new Date(2026, 10, 15); // 15 de Noviembre 2026

    it('calcula 0 días si compró el mismo día', () => {
      const cliente = crearClienteDummy({ ultimoPedidoEn: new Date(2026, 10, 15) });
      const dias = calcularDiasDesdeUltimaCompra(cliente, fechaRef);
      expect(dias).toBe(0);
    });

    it('calcula días correctamente', () => {
      const cliente = crearClienteDummy({ ultimoPedidoEn: new Date(2026, 10, 5) }); // 10 días antes
      const dias = calcularDiasDesdeUltimaCompra(cliente, fechaRef);
      expect(dias).toBe(10);
    });

    it('clasifica como nuevo a clientes con 1 pedido en ≤ 14 días', () => {
      const cliente = crearClienteDummy({
        totalPedidos: 1,
        ultimoPedidoEn: new Date(2026, 10, 10), // 5 días antes
      });
      const res = evaluarEstadoRiesgoCliente(cliente, fechaRef);
      expect(res.estado).toBe('nuevo');
      expect(res.label).toBe('Nuevo');
    });

    it('clasifica como activo si la última compra fue hace ≤ 14 días con > 1 pedido', () => {
      const cliente = crearClienteDummy({
        totalPedidos: 3,
        ultimoPedidoEn: new Date(2026, 10, 10), // 5 días antes
      });
      const res = evaluarEstadoRiesgoCliente(cliente, fechaRef);
      expect(res.estado).toBe('activo');
      expect(res.label).toBe('Activo');
      expect(res.diasInactivo).toBe(5);
    });

    it('clasifica como en_riesgo si la última compra fue hace 15 a 30 días', () => {
      const cliente = crearClienteDummy({
        totalPedidos: 4,
        ultimoPedidoEn: new Date(2026, 9, 25), // 21 días antes
      });
      const res = evaluarEstadoRiesgoCliente(cliente, fechaRef);
      expect(res.estado).toBe('en_riesgo');
      expect(res.label).toBe('En Riesgo');
      expect(res.diasInactivo).toBe(21);
    });

    it('clasifica como inactivo si la última compra fue hace más de 30 días', () => {
      const cliente = crearClienteDummy({
        totalPedidos: 4,
        ultimoPedidoEn: new Date(2026, 9, 1), // 45 días antes
      });
      const res = evaluarEstadoRiesgoCliente(cliente, fechaRef);
      expect(res.estado).toBe('inactivo');
      expect(res.label).toBe('Inactivo');
      expect(res.diasInactivo).toBe(45);
    });
  });

  describe('calcularProgresoTarjetaSellos', () => {
    it('calcula progreso básico de sellos', () => {
      const prog = calcularProgresoTarjetaSellos(3, 6, 0, 0);
      expect(prog.sellosActuales).toBe(3);
      expect(prog.metaSellos).toBe(6);
      expect(prog.faltantesParaRecompensa).toBe(3);
      expect(prog.porcentajeProgreso).toBe(50);
      expect(prog.tarjetaCompletada).toBe(false);
    });

    it('indica tarjeta completada si tiene recompensas disponibles', () => {
      const prog = calcularProgresoTarjetaSellos(0, 6, 1, 2);
      expect(prog.sellosActuales).toBe(0);
      expect(prog.metaSellos).toBe(6);
      expect(prog.recompensasDisponibles).toBe(1);
      expect(prog.recompensasRedimidas).toBe(2);
      expect(prog.tarjetaCompletada).toBe(true);
    });

    it('utiliza META_SELLOS_DEFECTO ante valores nulos o inválidos', () => {
      const prog = calcularProgresoTarjetaSellos(undefined, undefined, undefined, undefined);
      expect(prog.metaSellos).toBe(META_SELLOS_DEFECTO);
      expect(prog.sellosActuales).toBe(0);
      expect(prog.faltantesParaRecompensa).toBe(6);
      expect(prog.porcentajeProgreso).toBe(0);
    });
  });

  describe('generarMensajeCampanaWhatsApp', () => {
    const cliente = crearClienteDummy({
      nombre: 'Lucía Méndez',
      sellosActuales: 4,
      metaSellos: 6,
      totalPedidos: 5,
      loDeSiempre: {
        items: [
          {
            tipo: 'producto',
            referenciaId: 'p1',
            nombre: 'Hamburguesa Especial',
            cantidad: 2,
            precioUnitario: 18000,
            subtotal: 36000,
          },
        ],
        total: 36000,
        actualizadoEn: new Date(),
      },
    });

    it('genera mensaje de reactivación por riesgo con beneficio opcional', () => {
      const msg = generarMensajeCampanaWhatsApp(
        'reactivacion_riesgo',
        cliente,
        'La Parada Gourmet',
        { beneficio: '10% de descuento en tu cuenta' }
      );
      expect(msg).toContain('Lucía Méndez');
      expect(msg).toContain('La Parada Gourmet');
      expect(msg).toContain('te extrañamos mucho');
      expect(msg).toContain('10% de descuento en tu cuenta');
    });

    it('genera mensaje de recompensa lista', () => {
      const msg = generarMensajeCampanaWhatsApp('recompensa_lista', cliente, 'La Parada');
      expect(msg).toContain('¡Felicidades Lucía Méndez!');
      expect(msg).toContain('1 Recompensa de Cortesía');
      expect(msg).toContain('La Parada');
    });

    it('genera mensaje de progreso de sellos', () => {
      const msg = generarMensajeCampanaWhatsApp('sellos_progreso', cliente, 'La Parada');
      expect(msg).toContain('4/6 sellos');
      expect(msg).toContain('2 sello(s)');
    });

    it('genera mensaje de agradecimiento VIP con su nivel', () => {
      const msg = generarMensajeCampanaWhatsApp('agradecimiento_vip', cliente, 'La Parada');
      expect(msg).toContain('VIP Plata');
      expect(msg).toContain('lealtad');
    });

    it('genera mensaje recordando su plato favorito', () => {
      const msg = generarMensajeCampanaWhatsApp('recordar_lo_de_siempre', cliente, 'La Parada');
      expect(msg).toContain('Hamburguesa Especial');
      expect(msg).toContain('¿Con antojo de lo de siempre');
    });
  });

  describe('calcularKpisFidelizacion', () => {
    const fechaRef = new Date(2026, 10, 15);
    const clientes: Cliente[] = [
      crearClienteDummy({
        id: '1',
        totalPedidos: 1,
        ultimoPedidoEn: new Date(2026, 10, 14), // Nuevo
        recompensasDisponibles: 0,
      }),
      crearClienteDummy({
        id: '2',
        totalPedidos: 4,
        ultimoPedidoEn: new Date(2026, 10, 10), // Activo, VIP Plata
        recompensasDisponibles: 1,
        recompensasRedimidas: 1,
      }),
      crearClienteDummy({
        id: '3',
        totalPedidos: 8,
        ultimoPedidoEn: new Date(2026, 9, 25), // En riesgo, VIP Oro
        recompensasDisponibles: 0,
      }),
      crearClienteDummy({
        id: '4',
        totalPedidos: 16,
        ultimoPedidoEn: new Date(2026, 8, 1), // Inactivo, VIP Diamante
        recompensasDisponibles: 2,
        recompensasRedimidas: 3,
      }),
    ];

    it('consolida los KPIs de clientes correctamente', () => {
      const kpis = calcularKpisFidelizacion(clientes, fechaRef);
      expect(kpis.totalClientes).toBe(4);
      expect(kpis.clientesNuevos).toBe(1);
      expect(kpis.clientesActivos).toBe(1);
      expect(kpis.clientesEnRiesgo).toBe(1);
      expect(kpis.clientesInactivos).toBe(1);
      expect(kpis.clientesVip).toBe(3); // Plata, Oro, Diamante
      expect(kpis.recompensasDisponiblesTotal).toBe(3);
      expect(kpis.recompensasRedimidasTotal).toBe(4);
      expect(kpis.tasaRetencion).toBe(25); // 1 activo de 4 = 25%
    });
  });

  describe('exportarCampanaClientesCsv', () => {
    const clientes: Cliente[] = [
      crearClienteDummy({
        nombre: 'Mario Silva',
        telefono: '3109876543',
        totalPedidos: 4,
        sellosActuales: 3,
        metaSellos: 6,
        recompensasDisponibles: 1,
      }),
    ];

    it('genera archivo CSV con encabezados y codificación UTF-8 BOM', () => {
      const csv = exportarCampanaClientesCsv(clientes, 'vip');
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Nombre;Teléfono;Nivel VIP;Estado Retención');
      expect(csv).toContain('"Mario Silva"');
      expect(csv).toContain('"3109876543"');
      expect(csv).toContain('3/6');
    });
  });
});
