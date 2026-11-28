import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Combo, Producto } from '@/types';
import {
  calcularResumenTablero86,
  construirItemsTablero86,
  evaluarDisponibilidadItem86,
  evaluarEspecialDelDia,
  filtrarItemsTablero86,
  generarResumenTablero86WhatsApp,
  ordenarConEspecialesPrimero,
  sanitizarControl86,
  sanitizarEspecialDelDia,
  validarLimitePorcionesCarrito,
} from '../control86Utils';

function buildProducto(overrides: Partial<Producto> = {}): Producto {
  return {
    id: 'prod-1',
    nombre: 'Tequeño Especial',
    descripcion: 'Queso artesanal',
    categoria: 'Entradas',
    precio: 14000,
    disponible: true,
    negocioId: 'laparada',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
    ...overrides,
  };
}

function buildCombo(overrides: Partial<Combo> = {}): Combo {
  return {
    id: 'combo-1',
    nombre: 'Combo Parrilla',
    descripcion: 'Parrilla + bebida',
    categoria: 'Combos',
    items: [],
    precioEspecial: 32000,
    disponible: true,
    negocioId: 'laparada',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
    ...overrides,
  };
}

describe('control86Utils', () => {
  it('detecta 86 manual, contador regresivo y auto-86 cuando las porciones llegan a 0', () => {
    const en86 = buildProducto({
      control86: sanitizarControl86({
        agotado86: true,
        motivo86: 'sin_insumos',
        nota86: 'Sin queso costeño',
      }),
    });
    const ev86 = evaluarDisponibilidadItem86(en86);
    expect(ev86.estado).toBe('agotado_86');
    expect(ev86.puedePedirsePublico).toBe(false);
    expect(ev86.puedePedirsePos).toBe(false);
    expect(ev86.motivo86Label).toBe('Sin insumos');

    const ultimas = buildProducto({
      control86: sanitizarControl86({
        contadorActivo: true,
        porcionesDisponibles: 3,
        umbralAlertaPorciones: 5,
      }),
    });
    const evUltimas = evaluarDisponibilidadItem86(ultimas);
    expect(evUltimas.estado).toBe('ultimas_porciones');
    expect(evUltimas.badgeTexto).toBe('¡Últimas 3!');
    expect(evUltimas.maxPedible).toBe(3);

    const ceroAuto86 = sanitizarControl86({
      contadorActivo: true,
      porcionesDisponibles: 0,
      auto86AlLlegarACero: true,
    });
    expect(ceroAuto86.agotado86).toBe(true);
    expect(ceroAuto86.motivo86).toBe('produccion_agotada');
  });

  it('evalúa Especial del Día por días, fecha específica y rango horario nocturno en Colombia', () => {
    // 2026-11-28T23:30:00-05:00 es Sábado (día 6) 23:30 en Bogotá
    const sabadoNoche = new Date('2026-11-29T04:30:00.000Z');

    const especialNocturno = sanitizarEspecialDelDia({
      activo: true,
      etiqueta: 'Noche de Parrilla',
      diasSemana: [6],
      horaInicio: '18:00',
      horaFin: '02:00',
      soloEnHorarioProgramado: true,
    });

    const evalActivo = evaluarEspecialDelDia(especialNocturno, sabadoNoche);
    expect(evalActivo.configurado).toBe(true);
    expect(evalActivo.esEspecialVigente).toBe(true);
    expect(evalActivo.etiqueta).toBe('Noche de Parrilla');

    // Mismo sábado a las 10:00 AM Colombia (fuera de 18:00-02:00)
    const sabadoManana = new Date('2026-11-28T15:00:00.000Z');
    const prodSoloHorario = buildProducto({ especialDelDia: especialNocturno });
    const evFuera = evaluarDisponibilidadItem86(prodSoloHorario, sabadoManana);
    expect(evFuera.estado).toBe('fuera_horario_especial');
    expect(evFuera.puedePedirsePublico).toBe(false);

    // Fecha específica exacta
    const especialFecha = sanitizarEspecialDelDia({
      activo: true,
      fechaEspecifica: '2026-11-28',
      diasSemana: [],
    });
    expect(evaluarEspecialDelDia(especialFecha, sabadoManana).esEspecialVigente).toBe(true);
  });

  it('impide superar el tope de porciones disponibles en el carrito', () => {
    const limitado = buildProducto({
      nombre: 'Costilla BBQ',
      control86: sanitizarControl86({
        contadorActivo: true,
        porcionesDisponibles: 2,
      }),
    });

    expect(validarLimitePorcionesCarrito(limitado, 1, 1).permitido).toBe(true);
    const exceso = validarLimitePorcionesCarrito(limitado, 2, 1);
    expect(exceso.permitido).toBe(false);
    expect(exceso.maximoPermitido).toBe(2);
    expect(exceso.motivo).toContain('Solo quedan 2 porciones');
  });

  it('consolida tablero 86, filtra sin acentos, ordena especiales primero y genera resumen WhatsApp', () => {
    const p1 = buildProducto({
      id: 'p1',
      nombre: 'Arepa Rellena',
      control86: sanitizarControl86({ agotado86: true, motivo86: 'alta_demanda' }),
    });
    const p2 = buildProducto({
      id: 'p2',
      nombre: 'Patacón Especial',
      especialDelDia: sanitizarEspecialDelDia({ activo: true, etiqueta: 'Sugerencia del Chef', diasSemana: [] }),
      control86: sanitizarControl86({ contadorActivo: true, porcionesDisponibles: 4 }),
    });
    const c1 = buildCombo({ id: 'c1', nombre: 'Combo Clásico' });

    const resumen = calcularResumenTablero86([p1, p2], [c1]);
    expect(resumen.totalCatalogo).toBe(3);
    expect(resumen.totalEn86).toBe(1);
    expect(resumen.totalUltimasPorciones).toBe(1);
    expect(resumen.totalEspecialesVigentes).toBe(1);

    const items = construirItemsTablero86([p1, p2], [c1]);
    const filtrados = filtrarItemsTablero86(items, {
      busqueda: 'patacon',
      estado: 'especiales_hoy',
      tipo: 'todos',
      estacion: 'todas',
    });
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].id).toBe('p2');

    const ordenados = ordenarConEspecialesPrimero([p1, c1, p2]);
    expect(ordenados.map((x) => x.id)).toEqual(['p2', 'c1', 'p1']);

    const whatsapp = generarResumenTablero86WhatsApp('La Parada', [p1, p2], [c1]);
    expect(whatsapp).toContain('PIZARRA 86 Y ESPECIALES');
    expect(whatsapp).toContain('Arepa Rellena');
    expect(whatsapp).toContain('Patacón Especial');
  });
});
