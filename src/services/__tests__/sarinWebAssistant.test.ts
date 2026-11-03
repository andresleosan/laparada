import { describe, expect, it } from 'vitest';
import {
  generarBienvenidaSarin,
  responderMensajeSarinWeb,
  type ContextoSarinWeb,
} from '../sarinWebAssistant';
import type { Producto, Combo } from '@/types';
import { Timestamp } from 'firebase/firestore';

const mockProductos: Producto[] = [
  {
    id: 'prod-1',
    nombre: 'Burger Doble Queso',
    descripcion: 'Carne artesanal 150g, doble cheddar, tocineta y salsa de la casa.',
    precio: 22000,
    disponible: true,
    destacado: true,
    categoria: 'Hamburguesas',
    negocioId: 'laparada',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
  {
    id: 'prod-2',
    nombre: 'Tequeños Tradicionales x6',
    descripcion: 'Deditos de queso llanero crocantes con salsa tártara.',
    precio: 14000,
    disponible: true,
    categoria: 'Entradas',
    negocioId: 'laparada',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
  {
    id: 'prod-3',
    nombre: 'Jugo Natural de Maracuyá',
    descripcion: 'En agua o en leche.',
    precio: 6000,
    disponible: true,
    categoria: 'Bebidas',
    negocioId: 'laparada',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
];

const mockCombos: Combo[] = [
  {
    id: 'combo-1',
    nombre: 'Combo Pareja',
    descripcion: '2 Burgers Doble Queso + 2 Bebidas',
    precioEspecial: 48000,
    disponible: true,
    destacado: true,
    items: [],
    negocioId: 'laparada',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
];

describe('sarinWebAssistant', () => {
  const baseContexto: ContextoSarinWeb = {
    mensajeCliente: '',
    negocioId: 'laparada',
    negocioNombre: 'La Parada Gourmet',
    productos: mockProductos,
    combos: mockCombos,
    telefonoNegocio: '3001234567',
    ciudadNegocio: 'Medellín',
    direccionNegocio: 'Calle 10 # 40-20',
  };

  it('genera un mensaje de bienvenida personalizado con el nombre del negocio', () => {
    const bienvenida = generarBienvenidaSarin('La Parada Gourmet', mockProductos, mockCombos);
    expect(bienvenida).toContain('Sarin');
    expect(bienvenida).toContain('La Parada Gourmet');
    expect(bienvenida).toContain('Burger Doble Queso');
  });

  it('responde a consultas sobre el menú general listando categorías y productos', () => {
    const resultado = responderMensajeSarinWeb({
      ...baseContexto,
      mensajeCliente: '¿Qué tienen en el menú?',
    });

    expect(resultado.texto).toContain('Burger Doble Queso');
    expect(resultado.texto).toContain('Tequeños Tradicionales');
    expect(resultado.sugerencias.length).toBeGreaterThan(0);
  });

  it('responde sobre precios de un producto específico', () => {
    const resultado = responderMensajeSarinWeb({
      ...baseContexto,
      mensajeCliente: '¿Cuánto vale la burger doble queso?',
    });

    expect(resultado.texto).toContain('Burger Doble Queso');
    expect(resultado.texto).toContain('22.000');
    expect(resultado.itemsDetectados).toBeDefined();
    expect(resultado.itemsDetectados?.[0]?.nombre).toBe('Burger Doble Queso');
  });

  it('responde sobre promociones y combos destacados', () => {
    const resultado = responderMensajeSarinWeb({
      ...baseContexto,
      mensajeCliente: '¿Tienen promociones o combos?',
    });

    expect(resultado.texto).toContain('Combo Pareja');
    expect(resultado.texto).toContain('48.000');
  });

  it('explica los medios de pago directos (efectivo y transferencia)', () => {
    const resultado = responderMensajeSarinWeb({
      ...baseContexto,
      mensajeCliente: '¿Cómo puedo pagar? ¿Aceptan tarjeta?',
    });

    expect(resultado.texto.toLowerCase()).toContain('efectivo');
    expect(resultado.texto.toLowerCase()).toContain('transferencia');
    expect(resultado.texto.toLowerCase()).toContain('cero comisiones');
  });

  it('informa sobre domicilios y ubicación del negocio', () => {
    const resultado = responderMensajeSarinWeb({
      ...baseContexto,
      mensajeCliente: '¿Hacen domicilios y dónde están ubicados?',
    });

    expect(resultado.texto).toContain('Calle 10 # 40-20');
    expect(resultado.texto).toContain('Medellín');
    expect(resultado.texto.toLowerCase()).toContain('domicilio');
  });

  it('ofrece relevo humano cuando el cliente lo pide expresamente', () => {
    const resultado = responderMensajeSarinWeb({
      ...baseContexto,
      mensajeCliente: 'Quiero hablar con un asesor humano por favor',
    });

    expect(resultado.texto.toLowerCase()).toContain('asesor');
    expect(resultado.whatsappLink).toBeDefined();
  });

  it('respeta la cuota de inteligencia en locales aliados del marketplace', () => {
    const resultado = responderMensajeSarinWeb({
      ...baseContexto,
      negocioId: 'local-aliado-1',
      negocioNombre: 'Arepas Don Carlos',
      suscripcionValida: false,
      cuotaRestante: 0,
      mensajeCliente: 'Quiero una arepa con queso',
    });

    expect(resultado.texto).toContain('WhatsApp');
    expect(resultado.texto).toContain('Arepas Don Carlos');
    expect(resultado.whatsappLink).toBeDefined();
  });
});

