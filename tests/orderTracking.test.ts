// tests/orderTracking.test.ts
import { describe, expect, it } from 'vitest';
import {
  buildOrderTrackingProjection,
  buildTrackingUrl,
  generateTrackingToken,
  isValidTrackingToken,
  mergeTrackingHistory,
  normalizeDeliveryMinutes,
  normalizePublicAppUrl,
  publicFirstName,
} from '../firebase-functions/src/orders/orderTracking';
import {
  calcularEstimacionTiempo,
  getIndiceEtapa,
  buildWhatsAppHelpUrl,
} from '../src/services/orderTrackingService';

describe('Servicio y utilidades de Rastreo de Pedidos (orderTracking)', () => {
  describe('tokens y URLs de rastreo', () => {
    it('genera tokens aleatorios de 32 caracteres hexadecimales', () => {
      const token1 = generateTrackingToken();
      const token2 = generateTrackingToken();

      expect(token1).toHaveLength(32);
      expect(token2).toHaveLength(32);
      expect(token1).not.toBe(token2);
      expect(isValidTrackingToken(token1)).toBe(true);
      expect(isValidTrackingToken(token2)).toBe(true);
    });

    it('valida tokens correctamente', () => {
      expect(isValidTrackingToken('abc1234567890def1234567890def123')).toBe(true);
      expect(isValidTrackingToken('token-invalido-corto')).toBe(false);
      expect(isValidTrackingToken('')).toBe(false);
      expect(isValidTrackingToken(null)).toBe(false);
      expect(isValidTrackingToken(12345)).toBe(false);
    });

    it('normaliza la URL pública base de la aplicación', () => {
      expect(normalizePublicAppUrl('https://laparada.pages.dev/')).toBe('https://laparada.pages.dev');
      expect(normalizePublicAppUrl('https://otrodominio.com')).toBe('https://otrodominio.com');
      expect(normalizePublicAppUrl('invalido-sin-https')).toBe('https://laparada.pages.dev');
      expect(normalizePublicAppUrl(undefined)).toBe('https://laparada.pages.dev');
    });

    it('construye la URL de rastreo segura sin palabras de cobro', () => {
      const token = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d';
      const url = buildTrackingUrl('https://laparada.pages.dev', token);

      expect(url).toBe(`https://laparada.pages.dev/rastreo/${token}`);
      // Verifica que no contenga términos prohibidos por filtros de pagos en línea
      expect(url).not.toMatch(/checkout|payment|pagar|cobro/);
    });

    it('falla si el token no es válido al construir la URL', () => {
      expect(() => buildTrackingUrl('https://laparada.pages.dev', 'token-invalido')).toThrow(
        /token de rastreo/
      );
    });
  });

  describe('sanitización y protección de privacidad (buildOrderTrackingProjection)', () => {
    it('sanitiza la proyección excluyendo datos privados (teléfono, dirección completa, notas privadas)', () => {
      const rawDomicilio = {
        negocioId: 'laparada',
        clienteNombre: 'Carlos Andrés Gómez',
        clienteTelefono: '3001234567',
        direccion: 'Calle 10 # 20-30 Torre 2 Apto 501',
        barrio: 'Prados del Este',
        notas: 'Dejar en portería con el celador Pérez',
        fotoTransferenciaPath: 'transferencias/laparada/privada.jpg',
        items: [
          { nombre: 'Hamburguesa La Parada Especial', cantidad: 2 },
          { nombre: 'Panceroti de Pollo', cantidad: 1 },
        ],
        total: 45000,
        metodoPago: 'efectivo',
        estado: 'en_camino',
        origen: 'web',
        domiciliarioNombre: 'Jhonatan Rodríguez',
        codigoPublico: 'LP-TEST99',
      };

      const rawNegocio = {
        nombre: 'La Parada Gourmet',
        telefono: '3109876543',
        slug: 'la-parada',
        tiempoEntregaMinutos: 35,
      };

      const projection = buildOrderTrackingProjection('dom-123456', rawDomicilio, rawNegocio);

      // Datos públicos permitidos
      expect(projection.negocioId).toBe('laparada');
      expect(projection.codigo).toBe('LP-TEST99');
      expect(projection.estado).toBe('en_camino');
      expect(projection.total).toBe(45000);
      expect(projection.totalItems).toBe(3);
      expect(projection.items).toHaveLength(2);
      expect(projection.barrio).toBe('Prados del Este');
      expect(projection.tiempoEstimadoMin).toBe(35);
      expect(projection.domiciliarioNombre).toBe('Jhonatan'); // Solo primer nombre
      expect(projection.clienteNombre).toBe('Carlos'); // Solo primer nombre

      // Datos privados que NUNCA deben exponerse
      expect((projection as any).clienteTelefono).toBeUndefined();
      expect((projection as any).direccion).toBeUndefined();
      expect((projection as any).notas).toBeUndefined();
      expect((projection as any).fotoTransferenciaPath).toBeUndefined();
    });

    it('extrae el primer nombre del cliente o un fallback amigable', () => {
      expect(publicFirstName('María Camila')).toBe('María');
      expect(publicFirstName('Pedro')).toBe('Pedro');
      expect(publicFirstName('Cliente WhatsApp', 'Comensal')).toBe('Comensal');
      expect(publicFirstName('', 'Amigo')).toBe('Amigo');
    });

    it('normaliza los minutos estimados dentro de límites razonables (10 a 180)', () => {
      expect(normalizeDeliveryMinutes(45)).toBe(45);
      expect(normalizeDeliveryMinutes(2)).toBe(10);
      expect(normalizeDeliveryMinutes(300)).toBe(180);
      expect(normalizeDeliveryMinutes(undefined)).toBe(40);
    });
  });

  describe('historial y estimación de tiempo (orderTrackingService)', () => {
    it('consolida el historial de etapas alcanzadas', () => {
      const history1 = mergeTrackingHistory({}, 'pendiente', 1000);
      expect(history1).toEqual({ pendiente: 1000 });

      const history2 = mergeTrackingHistory(history1, 'en_preparacion', 2000);
      expect(history2).toEqual({ pendiente: 1000, en_preparacion: 2000 });

      // No sobreescribe si ya se había alcanzado
      const history3 = mergeTrackingHistory(history2, 'pendiente', 3000);
      expect(history3.pendiente).toBe(1000);
    });

    it('calcula los minutos restantes y porcentaje correctamente', () => {
      const ahora = 1_000_000_000;
      const hace15Min = ahora - 15 * 60_000;

      const estimacion = calcularEstimacionTiempo(
        { toMillis: () => hace15Min },
        40,
        ahora
      );

      expect(estimacion.minutosTranscurridos).toBe(15);
      expect(estimacion.minutosRestantes).toBe(25);
      expect(estimacion.retrasado).toBe(false);
      expect(estimacion.porcentajeEstimado).toBe(38); // 15/40 = 37.5 -> 38%
    });

    it('marca retrasado si excede el tiempo estimado', () => {
      const ahora = 1_000_000_000;
      const hace50Min = ahora - 50 * 60_000;

      const estimacion = calcularEstimacionTiempo(
        { toMillis: () => hace50Min },
        40,
        ahora
      );

      expect(estimacion.retrasado).toBe(true);
      expect(estimacion.minutosRestantes).toBe(0);
      expect(estimacion.porcentajeEstimado).toBe(95);
    });

    it('obtiene el índice de etapa según el ciclo de entrega', () => {
      expect(getIndiceEtapa('pendiente')).toBe(0);
      expect(getIndiceEtapa('en_preparacion')).toBe(1);
      expect(getIndiceEtapa('en_camino')).toBe(2);
      expect(getIndiceEtapa('entregado')).toBe(3);
    });

    it('construye la URL de soporte por WhatsApp con el código de orden', () => {
      const url = buildWhatsAppHelpUrl('3001234567', 'La Parada', 'LP-ABC12345');
      expect(url).toContain('https://wa.me/573001234567?text=');
      expect(decodeURIComponent(url)).toContain('LP-ABC12345');
    });
  });
});

