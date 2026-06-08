import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

interface PrecioProducto {
  productId: string;
  nombreProducto: string;
  precioBase: number;
  precioActual: number;
  multiplicador: number;
  razon: string;
  valido: boolean;
}

interface EstrategiaPrecios {
  hora: number;
  demanda: 'baja' | 'media' | 'alta';
  multiplicador: number;
  descripcion: string;
  esperado: {
    ingresos: number;
    volumenes: number;
  };
}

/**
 * Servicio de Precios Dinámicos
 * - Ajuste de precios según demanda/hora
 * - Descuentos por volumen
 * - Surge pricing
 * - Dashboard de precios en tiempo real
 */
export class DynamicPricingService {
  private db = admin.firestore();

  /**
   * Calcular precio dinámico para un producto
   */
  async calcularPrecioProducto(
    productId: string,
    precioBase: number
  ): Promise<PrecioProducto> {
    const ahora = new Date();
    const hora = ahora.getHours();

    // Obtener demanda actual
    const demandaActual = await this.obtenerDemandaActual();

    // Calcular multiplicador basado en varios factores
    const multiplicador = this.calcularMultiplicador(
      hora,
      demandaActual,
      precioBase
    );

    const precioActual = Math.round(precioBase * multiplicador * 100) / 100;

    // Determinar razón del cambio
    let razon = 'Precio base';
    if (multiplicador > 1.1) {
      razon = `Demanda ${demandaActual} - Surge pricing activado`;
    } else if (multiplicador < 0.9) {
      razon = `Demanda ${demandaActual} - Promoción aplicada`;
    }

    return {
      productId,
      nombreProducto: await this.obtenerNombreProducto(productId),
      precioBase,
      precioActual,
      multiplicador,
      razon,
      valido: true,
    };
  }

  /**
   * Aplicar precios dinámicos a todos los productos
   */
  async aplicarPreciosDinamicos(): Promise<PrecioProducto[]> {
    const productosSnapshot = await this.db.collection('productos').get();

    const preciosDinamicos: PrecioProducto[] = [];

    for (const doc of productosSnapshot.docs) {
      const data = doc.data();
      const precioDinamico = await this.calcularPrecioProducto(
        doc.id,
        data.precio
      );
      preciosDinamicos.push(precioDinamico);
    }

    // Guardar precios en caché
    await this.guardarPreciosCaché(preciosDinamicos);

    return preciosDinamicos;
  }

  /**
   * Calcular multiplicador de precio
   */
  private calcularMultiplicador(
    hora: number,
    demanda: 'baja' | 'media' | 'alta',
    precioBase: number
  ): number {
    let multiplicador = 1.0;

    // Factor por hora
    if ((hora >= 11 && hora <= 13) || (hora >= 18 && hora <= 21)) {
      // Horas pico
      multiplicador *= 1.15;
    } else if (hora >= 22 || hora < 8) {
      // Horas bajas
      multiplicador *= 0.85;
    }

    // Factor por demanda
    switch (demanda) {
      case 'alta':
        multiplicador *= 1.25; // +25% surge pricing
        break;
      case 'media':
        multiplicador *= 1.0;
        break;
      case 'baja':
        multiplicador *= 0.8; // -20% descuento
        break;
    }

    // Ajuste para productos caros (evitar sobreprecio)
    if (precioBase > 100000) {
      multiplicador = Math.min(multiplicador, 1.05);
    }

    // Asegurar que no baje demasiado
    return Math.max(multiplicador, 0.75);
  }

  /**
   * Obtener demanda actual
   */
  private async obtenerDemandaActual(): Promise<'baja' | 'media' | 'alta'> {
    const hace1Hora = new Date(Date.now() - 60 * 60 * 1000);

    const ventasRecientes = await this.db
      .collection('ventas')
      .where('createdAt', '>=', Timestamp.fromDate(hace1Hora))
      .count()
      .get();

    const countVentas = ventasRecientes.data().count;

    if (countVentas > 20) return 'alta';
    if (countVentas > 10) return 'media';
    return 'baja';
  }

  /**
   * Calcular descuento por volumen
   */
  async calcularDescuentoVolumen(
    cantidadProductos: number,
    montoTotal: number
  ): Promise<{
    descuentoPorcentaje: number;
    montoDescuento: number;
    montoFinal: number;
  }> {
    let descuentoPorcentaje = 0;

    if (cantidadProductos >= 10) {
      descuentoPorcentaje = 15; // -15% por 10+ items
    } else if (cantidadProductos >= 5) {
      descuentoPorcentaje = 10; // -10% por 5+ items
    } else if (cantidadProductos >= 3) {
      descuentoPorcentaje = 5; // -5% por 3+ items
    }

    const montoDescuento = Math.round((montoTotal * descuentoPorcentaje) / 100);
    const montoFinal = montoTotal - montoDescuento;

    return {
      descuentoPorcentaje,
      montoDescuento,
      montoFinal,
    };
  }

  /**
   * Aplicar cupón de descuento
   */
  async aplicarCupon(
    codigoCupon: string,
    montoTotal: number
  ): Promise<{
    valido: boolean;
    descuentoPorcentaje?: number;
    montoDescuento?: number;
    montoFinal?: number;
    razon?: string;
  }> {
    const cuponSnapshot = await this.db
      .collection('coupons')
      .where('codigo', '==', codigoCupon.toUpperCase())
      .get();

    if (cuponSnapshot.empty) {
      return {
        valido: false,
        razon: 'Cupón no válido',
      };
    }

    const cupon = cuponSnapshot.docs[0].data();

    // Validar que no haya expirado
    if (cupon.fechaExpiracion && cupon.fechaExpiracion.toDate() < new Date()) {
      return {
        valido: false,
        razon: 'Cupón expirado',
      };
    }

    // Validar límite de uso
    if (cupon.usosMaximos && cupon.usosActuales >= cupon.usosMaximos) {
      return {
        valido: false,
        razon: 'Cupón sin usos disponibles',
      };
    }

    const descuentoPorcentaje = cupon.descuentoPorcentaje || 0;
    const montoDescuento = Math.round((montoTotal * descuentoPorcentaje) / 100);
    const montoFinal = montoTotal - montoDescuento;

    // Registrar uso del cupón
    await cuponSnapshot.docs[0].ref.update({
      usosActuales: (cupon.usosActuales || 0) + 1,
    });

    return {
      valido: true,
      descuentoPorcentaje,
      montoDescuento,
      montoFinal,
    };
  }

  /**
   * Obtener estrategia de precios por hora
   */
  async obtenerEstrategiaPrecios(): Promise<EstrategiaPrecios[]> {
    const estrategias: EstrategiaPrecios[] = [];

    for (let hora = 0; hora < 24; hora++) {
      let demanda: 'baja' | 'media' | 'alta' = 'media';
      let multiplicador = 1.0;

      if ((hora >= 11 && hora <= 13) || (hora >= 18 && hora <= 21)) {
        demanda = 'alta';
        multiplicador = 1.25;
      } else if (hora >= 22 || hora < 8) {
        demanda = 'baja';
        multiplicador = 0.85;
      }

      const ingresoEsperado = Math.round(10 * 30000 * multiplicador); // 10 órdenes x $30k
      const volumenesEsperado = Math.round(10 * multiplicador);

      estrategias.push({
        hora,
        demanda,
        multiplicador,
        descripcion: `${demanda.toUpperCase()} - Multiplicador ${multiplicador}x`,
        esperado: {
          ingresos: ingresoEsperado,
          volumenes: volumenesEsperado,
        },
      });
    }

    return estrategias;
  }

  /**
   * Guardar precios en caché con TTL de 1 hora
   */
  private async guardarPreciosCaché(precios: PrecioProducto[]): Promise<void> {
    const preciosMap: { [key: string]: PrecioProducto } = {};
    precios.forEach(p => {
      preciosMap[p.productId] = p;
    });

    await this.db.collection('cache').doc('precios_dinamicos').set({
      precios: preciosMap,
      actualizadoEn: Timestamp.now(),
      valido: true,
    });
  }

  /**
   * Obtener precios del caché
   */
  async obtenerPreciosCaché(): Promise<{ [key: string]: PrecioProducto } | null> {
    const cacheDoc = await this.db.collection('cache').doc('precios_dinamicos').get();

    if (!cacheDoc.exists) {
      return null;
    }

    const data = cacheDoc.data();
    const hace1Hora = Date.now() - 60 * 60 * 1000;

    if (data!.actualizadoEn.toMillis() < hace1Hora) {
      return null; // Caché expirado
    }

    return data!.precios;
  }

  /**
   * Obtener estadísticas de impacto de precios dinámicos
   */
  async obtenerImpactoPrecios(dias: number = 30): Promise<{
    ingresoAdicional: number;
    volumenVentas: number;
    porcentajeIncremento: number;
  }> {
    const ventasSnapshot = await this.db
      .collection('ventas')
      .where(
        'createdAt',
        '>=',
        Timestamp.fromDate(new Date(Date.now() - dias * 24 * 60 * 60 * 1000))
      )
      .get();

    let totalIngresos = 0;
    let ingresoConPricingDinamico = 0;

    ventasSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const monto = data.monto || 0;
      totalIngresos += monto;

      // Estimar ingreso sin pricing dinámico (aplicar multiplicador inverso)
      if (data.precioMultiplicador && data.precioMultiplicador > 1.0) {
        ingresoConPricingDinamico += monto;
      }
    });

    const ingresoAdicional = ingresoConPricingDinamico - totalIngresos * 0.5;
    const porcentajeIncremento = totalIngresos > 0 ? (ingresoAdicional / (totalIngresos * 0.5)) * 100 : 0;

    return {
      ingresoAdicional: Math.round(ingresoAdicional),
      volumenVentas: ventasSnapshot.size,
      porcentajeIncremento: Math.round(porcentajeIncremento * 100) / 100,
    };
  }

  /**
   * Obtener nombre del producto
   */
  private async obtenerNombreProducto(productId: string): Promise<string> {
    const doc = await this.db.collection('productos').doc(productId).get();
    return doc.exists ? doc.data()!.nombre || 'Producto' : 'Producto';
  }
}

export const dynamicPricingService = new DynamicPricingService();
