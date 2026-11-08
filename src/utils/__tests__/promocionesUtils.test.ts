import { describe, expect, it } from 'vitest';
import type { Promocion } from '@/types/promocion';
import type { ItemVenta } from '@/types';
import {
  calcularKpisPromociones,
  estaPromocionVigente,
  evaluarPromocionesParaCarrito,
  exportarPromocionesCsv,
  formatearDiasSemana,
  formatearHorarioPromocion,
  generarMensajeWhatsAppPromocion,
  validarCodigoCupon,
} from '../promocionesUtils';

describe('promocionesUtils', () => {
  const promoBase: Promocion = {
    id: 'promo-1',
    negocioId: 'laparada',
    nombre: 'Happy Hour Hamburguesas',
    descripcion: '20% en hamburguesas de 5pm a 8pm',
    tipo: 'happy_hour',
    canales: ['todos'],
    activo: true,
    diasSemana: [1, 2, 3, 4, 5], // Lun - Vie
    horaInicio: '17:00',
    horaFin: '20:00',
    tipoDescuento: 'porcentaje',
    valorDescuento: 20,
    categoriaIds: ['cat-hamburguesas'],
    creadoEn: '2026-11-01T00:00:00Z',
  };

  describe('formatearDiasSemana y formatearHorarioPromocion', () => {
    it('formatea días comunes y casos especiales', () => {
      expect(formatearDiasSemana([])).toBe('Todos los días');
      expect(formatearDiasSemana([0, 1, 2, 3, 4, 5, 6])).toBe('Todos los días');
      expect(formatearDiasSemana([1, 2, 3, 4, 5])).toBe('Lunes a Viernes');
      expect(formatearDiasSemana([0, 6])).toBe('Fines de semana');
      expect(formatearDiasSemana([4, 5, 6])).toBe('Jueves a Sábado');
    });

    it('formatea horario en 12 horas con AM/PM', () => {
      expect(formatearHorarioPromocion('17:00', '20:00')).toBe('5:00 PM – 8:00 PM');
      expect(formatearHorarioPromocion('12:00', '15:30')).toBe('12:00 PM – 3:30 PM');
      expect(formatearHorarioPromocion(undefined, undefined)).toBe('Todo el día');
      expect(formatearHorarioPromocion('18:00', undefined)).toBe('Desde las 6:00 PM');
      expect(formatearHorarioPromocion(undefined, '22:00')).toBe('Hasta las 10:00 PM');
    });
  });

  describe('estaPromocionVigente', () => {
    it('rechaza promociones inactivas', () => {
      expect(estaPromocionVigente({ ...promoBase, activo: false })).toBe(false);
    });

    it('valida día de la semana', () => {
      // 2026-11-04 es Miércoles (día 3) -> Dentro de [1, 2, 3, 4, 5]
      const miercoles18h = new Date(2026, 10, 4, 18, 0, 0);
      expect(estaPromocionVigente(promoBase, miercoles18h)).toBe(true);

      // 2026-11-08 es Domingo (día 0) -> Fuera de [1, 2, 3, 4, 5]
      const domingo18h = new Date(2026, 10, 8, 18, 0, 0);
      expect(estaPromocionVigente(promoBase, domingo18h)).toBe(false);
    });

    it('valida franja horaria dentro del mismo día', () => {
      const miercoles16h = new Date(2026, 10, 4, 16, 59, 0); // Antes de las 17:00
      expect(estaPromocionVigente(promoBase, miercoles16h)).toBe(false);

      const miercoles19h = new Date(2026, 10, 4, 19, 30, 0); // En el rango 17-20
      expect(estaPromocionVigente(promoBase, miercoles19h)).toBe(true);

      const miercoles21h = new Date(2026, 10, 4, 20, 1, 0); // Después de las 20:00
      expect(estaPromocionVigente(promoBase, miercoles21h)).toBe(false);
    });

    it('maneja correctamente franjas horarias que cruzan la medianoche (21:00 a 02:00)', () => {
      const promoNocturna: Promocion = {
        ...promoBase,
        horaInicio: '21:00',
        horaFin: '02:00',
        diasSemana: [0, 1, 2, 3, 4, 5, 6],
      };

      const noche23h = new Date(2026, 10, 4, 23, 15, 0);
      expect(estaPromocionVigente(promoNocturna, noche23h)).toBe(true);

      const madrugada1h = new Date(2026, 10, 4, 1, 30, 0);
      expect(estaPromocionVigente(promoNocturna, madrugada1h)).toBe(true);

      const tarde15h = new Date(2026, 10, 4, 15, 0, 0);
      expect(estaPromocionVigente(promoNocturna, tarde15h)).toBe(false);
    });

    it('valida límites de fecha calendario', () => {
      const promoFechas: Promocion = {
        ...promoBase,
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-10',
        diasSemana: [],
        horaInicio: undefined,
        horaFin: undefined,
      };

      const dentro = new Date(2026, 10, 5);
      expect(estaPromocionVigente(promoFechas, dentro)).toBe(true);

      const antes = new Date(2026, 9, 31);
      expect(estaPromocionVigente(promoFechas, antes)).toBe(false);

      const despues = new Date(2026, 10, 11);
      expect(estaPromocionVigente(promoFechas, despues)).toBe(false);
    });

    it('valida límite de usos de cupón', () => {
      const cuponConLimite: Promocion = {
        ...promoBase,
        diasSemana: [],
        horaInicio: undefined,
        horaFin: undefined,
        tipo: 'cupon_descuento',
        codigoCupon: 'PARADA50',
        limiteUsos: 5,
        usosActuales: 5,
      };

      expect(estaPromocionVigente(cuponConLimite)).toBe(false);

      expect(estaPromocionVigente({ ...cuponConLimite, usosActuales: 4 })).toBe(true);
    });
  });

  describe('evaluarPromocionesParaCarrito', () => {
    const itemsMock: ItemVenta[] = [
      {
        tipo: 'producto',
        referenciaId: 'prod-burger',
        nombre: 'Hamburguesa Doble',
        precioUnitario: 25000,
        cantidad: 2,
        subtotal: 50000,
      },
      {
        tipo: 'producto',
        referenciaId: 'prod-papas',
        nombre: 'Papas Rústicas',
        precioUnitario: 10000,
        cantidad: 1,
        subtotal: 10000,
      },
    ];

    const categoriaMapMock = {
      'prod-burger': 'cat-hamburguesas',
      'prod-papas': 'cat-entradas',
    };

    it('evalúa correctamente descuento porcentual de Happy Hour en categoría', () => {
      // Miércoles 18h
      const ahora = new Date(2026, 10, 4, 18, 0, 0);

      const resultados = evaluarPromocionesParaCarrito({
        promociones: [promoBase],
        items: itemsMock,
        ahora,
        categoriaPorProductoMap: categoriaMapMock,
      });

      expect(resultados).toHaveLength(1);
      expect(resultados[0].esAplicable).toBe(true);
      // 20% de 50.000 COP (las burgers) = 10.000 COP
      expect(resultados[0].montoDescuentoCOP).toBe(10000);
    });

    it('evalúa correctamente promoción 2x1', () => {
      const promo2x1: Promocion = {
        id: 'promo-2x1',
        negocioId: 'laparada',
        nombre: '2x1 en Hamburguesas',
        tipo: 'dos_por_uno',
        tipoDescuento: 'dos_por_uno',
        valorDescuento: 100,
        canales: ['todos'],
        activo: true,
        diasSemana: [],
        categoriaIds: ['cat-hamburguesas'],
        creadoEn: '2026-11-01',
      };

      const resultados = evaluarPromocionesParaCarrito({
        promociones: [promo2x1],
        items: itemsMock, // 2 burgers a 25.000 c/u = 1 gratis
        categoriaPorProductoMap: categoriaMapMock,
      });

      expect(resultados[0].esAplicable).toBe(true);
      expect(resultados[0].montoDescuentoCOP).toBe(25000); // 1 burger gratis
    });

    it('respeta compra mínima (montoMinimoSubtotal)', () => {
      const promoCompraMinima: Promocion = {
        ...promoBase,
        montoMinimoSubtotal: 80000,
      };

      const ahora = new Date(2026, 10, 4, 18, 0, 0);
      const resultados = evaluarPromocionesParaCarrito({
        promociones: [promoCompraMinima],
        items: itemsMock, // Subtotal 60.000 < 80.000
        ahora,
        categoriaPorProductoMap: categoriaMapMock,
      });

      expect(resultados[0].esAplicable).toBe(false);
      expect(resultados[0].montoDescuentoCOP).toBe(0);
      expect(resultados[0].mensaje).toContain('Requiere una compra mínima');
    });

    it('respeta tope máximo de descuento (topeDescuentoMaximoCOP)', () => {
      const promoConTope: Promocion = {
        ...promoBase,
        valorDescuento: 50, // 50% de 50.000 = 25.000
        topeDescuentoMaximoCOP: 8000, // Tope 8.000
      };

      const ahora = new Date(2026, 10, 4, 18, 0, 0);
      const resultados = evaluarPromocionesParaCarrito({
        promociones: [promoConTope],
        items: itemsMock,
        ahora,
        categoriaPorProductoMap: categoriaMapMock,
      });

      expect(resultados[0].esAplicable).toBe(true);
      expect(resultados[0].montoDescuentoCOP).toBe(8000);
    });

    it('filtra por canal permitido (ej: pos vs storefront)', () => {
      const promoSoloStorefront: Promocion = {
        ...promoBase,
        canales: ['storefront'],
      };

      const ahora = new Date(2026, 10, 4, 18, 0, 0);
      const resPos = evaluarPromocionesParaCarrito({
        promociones: [promoSoloStorefront],
        items: itemsMock,
        canal: 'pos',
        ahora,
        categoriaPorProductoMap: categoriaMapMock,
      });

      expect(resPos).toHaveLength(0);

      const resWeb = evaluarPromocionesParaCarrito({
        promociones: [promoSoloStorefront],
        items: itemsMock,
        canal: 'storefront',
        ahora,
        categoriaPorProductoMap: categoriaMapMock,
      });

      expect(resWeb).toHaveLength(1);
    });
  });

  describe('validarCodigoCupon', () => {
    const cuponMock: Promocion = {
      id: 'cup-1',
      negocioId: 'laparada',
      nombre: 'Bono Bienvenida $10.000',
      tipo: 'cupon_descuento',
      codigoCupon: 'BIENVENIDO10',
      tipoDescuento: 'monto_fijo',
      valorDescuento: 10000,
      montoMinimoSubtotal: 30000,
      canales: ['todos'],
      activo: true,
      diasSemana: [],
      creadoEn: '2026-11-01',
    };

    it('valida exitosamente un cupón que cumple todas las condiciones', () => {
      const res = validarCodigoCupon([cuponMock], 'bienvenido10', 45000);
      expect(res.valido).toBe(true);
      expect(res.descuentoCOP).toBe(10000);
      expect(res.promocion?.id).toBe('cup-1');
    });

    it('falla si el cupón no existe', () => {
      const res = validarCodigoCupon([cuponMock], 'INEXISTENTE', 45000);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('no existe');
    });

    it('falla si el subtotal no alcanza el mínimo', () => {
      const res = validarCodigoCupon([cuponMock], 'BIENVENIDO10', 25000);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('Compra mínima requerida');
    });

    it('falla si el cupón está inactivo', () => {
      const cuponInactivo = { ...cuponMock, activo: false };
      const res = validarCodigoCupon([cuponInactivo], 'BIENVENIDO10', 45000);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('inactivo');
    });
  });

  describe('calcularKpisPromociones', () => {
    it('calcula métricas de promociones activas, happy hours y cupones', () => {
      const ahora = new Date(2026, 10, 4, 18, 0, 0); // Miércoles 18h

      const promos: Promocion[] = [
        promoBase, // Activo, happy hour en vivo a las 18h
        {
          id: 'promo-2',
          negocioId: 'laparada',
          nombre: 'Cupon Test',
          tipo: 'cupon_descuento',
          codigoCupon: 'TEST',
          tipoDescuento: 'monto_fijo',
          valorDescuento: 5000,
          canales: ['todos'],
          activo: true,
          diasSemana: [],
          usosActuales: 12,
          creadoEn: '2026-11-01',
        },
        {
          id: 'promo-3',
          negocioId: 'laparada',
          nombre: 'Promo Inactiva',
          tipo: 'descuento_general',
          tipoDescuento: 'porcentaje',
          valorDescuento: 10,
          canales: ['todos'],
          activo: false,
          diasSemana: [],
          creadoEn: '2026-11-01',
        },
      ];

      const kpis = calcularKpisPromociones(promos, ahora);
      expect(kpis.totalPromociones).toBe(3);
      expect(kpis.activas).toBe(2);
      expect(kpis.happyHoursEnVivo).toBe(1);
      expect(kpis.cuponesActivos).toBe(1);
      expect(kpis.totalCanjesCupones).toBe(12);
    });
  });

  describe('generarMensajeWhatsAppPromocion y exportarPromocionesCsv', () => {
    it('genera un mensaje enriquecido para WhatsApp', () => {
      const mensaje = generarMensajeWhatsAppPromocion(promoBase, 'La Parada Gastrobar', 'https://laparada.pages.dev');
      expect(mensaje).toContain('PROMOCIÓN EXCLUSIVA');
      expect(mensaje).toContain('La Parada Gastrobar'.toUpperCase());
      expect(mensaje).toContain('5:00 PM – 8:00 PM');
      expect(mensaje).toContain('https://laparada.pages.dev');
    });

    it('exporta CSV con BOM UTF-8 y encabezados correctos', () => {
      const csv = exportarPromocionesCsv([promoBase]);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Happy Hour Hamburguesas');
      expect(csv).toContain('20%');
      expect(csv).toContain('Lunes a Viernes');
    });
  });
});
