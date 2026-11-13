import { describe, expect, it } from 'vitest';
import type { Mesa } from '@/types/mesa';
import type { TurnoEspera } from '@/types/espera';
import {
  calcularMinutosEnEspera,
  construirMensajeMesaLista,
  estimarTiempoEsperaMinutos,
  filtrarMesasCompatibles,
  generarCodigoTurnoEspera,
  normalizarTelefonoEspera,
} from '../esperaUtils';

const baseMesas: Mesa[] = [
  {
    id: 'm1',
    numero: 1,
    nombre: 'Mesa 1',
    capacidad: 2,
    zona: 'Salón Principal',
    estado: 'libre',
    negocioId: 'laparada',
  },
  {
    id: 'm2',
    numero: 2,
    nombre: 'Mesa 2',
    capacidad: 4,
    zona: 'Terraza',
    estado: 'libre',
    negocioId: 'laparada',
  },
  {
    id: 'm3',
    numero: 3,
    nombre: 'Mesa 3',
    capacidad: 6,
    zona: 'Salón Principal',
    estado: 'ocupada',
    apertura: { seconds: 1700000000, nanoseconds: 0 },
    negocioId: 'laparada',
  },
  {
    id: 'm4',
    numero: 4,
    nombre: 'Mesa 4',
    capacidad: 4,
    zona: 'Salón Principal',
    estado: 'por_cobrar',
    negocioId: 'laparada',
  },
];

describe('esperaUtils', () => {
  it('genera códigos de turno correlativos con padding de 2 dígitos', () => {
    expect(generarCodigoTurnoEspera(1)).toBe('E-01');
    expect(generarCodigoTurnoEspera(9)).toBe('E-09');
    expect(generarCodigoTurnoEspera(15)).toBe('E-15');
    expect(generarCodigoTurnoEspera(0)).toBe('E-01');
  });

  it('normaliza teléfonos colombianos correctamente', () => {
    expect(normalizarTelefonoEspera('300 123 4567')).toBe('573001234567');
    expect(normalizarTelefonoEspera('+57 315-999-8877')).toBe('573159998877');
    expect(normalizarTelefonoEspera('')).toBe('');
  });

  it('filtra mesas libres compatibles priorizando zona preferida y menor desperdicio de capacidad', () => {
    const compatibles = filtrarMesasCompatibles(baseMesas, 2, 'Terraza');
    expect(compatibles.map((m) => m.id)).toEqual(['m2', 'm1']);

    const sinPreferencia = filtrarMesasCompatibles(baseMesas, 2, 'Cualquiera');
    expect(sinPreferencia.map((m) => m.id)).toEqual(['m1', 'm2']);

    const paraSeis = filtrarMesasCompatibles(baseMesas, 6, 'Cualquiera');
    expect(paraSeis).toEqual([]);
  });

  it('estima 0 minutos cuando hay mesa libre compatible y sin cola delante', () => {
    const tiempo = estimarTiempoEsperaMinutos({
      mesas: baseMesas,
      turnosActivos: [],
      personas: 2,
      zonaPreferida: 'Salón Principal',
    });
    expect(tiempo).toBe(0);
  });

  it('estima menor espera cuando hay mesa por_cobrar frente a mesa recién ocupada', () => {
    const mesasOcupadas: Mesa[] = [
      { ...baseMesas[2], estado: 'ocupada', apertura: { seconds: 1000, nanoseconds: 0 } },
      { ...baseMesas[3], estado: 'por_cobrar' },
    ];
    const tiempo = estimarTiempoEsperaMinutos({
      mesas: mesasOcupadas,
      turnosActivos: [],
      personas: 4,
      zonaPreferida: 'Salón Principal',
      ahoraMs: 1000 * 1000 + 5 * 60000,
    });
    expect(tiempo).toBe(10);
  });

  it('incrementa la estimación cuando hay grupos activos delante en la cola', () => {
    const mesasOcupadas: Mesa[] = [
      { ...baseMesas[3], estado: 'por_cobrar' },
    ];
    const turnosActivos: TurnoEspera[] = [
      {
        id: 't1',
        negocioId: 'laparada',
        codigoTurno: 'E-01',
        clienteNombre: 'Ana',
        personas: 4,
        estado: 'esperando',
        tiempoEstimadoMin: 10,
        creadoEn: { seconds: 1700000000, nanoseconds: 0 },
      },
    ];
    const tiempo = estimarTiempoEsperaMinutos({
      mesas: mesasOcupadas,
      turnosActivos,
      personas: 4,
      zonaPreferida: 'Salón Principal',
    });
    expect(tiempo).toBeGreaterThanOrEqual(35);
  });

  it('calcula minutos reales en espera y construye mensaje de WhatsApp', () => {
    const ahora = 1700000000 * 1000 + 18 * 60000;
    expect(calcularMinutosEnEspera({ seconds: 1700000000 }, ahora)).toBe(18);

    const msg = construirMensajeMesaLista({
      negocioNombre: 'La Parada',
      clienteNombre: 'Carlos',
      codigoTurno: 'E-04',
      mesaNombre: 'Mesa 2',
    });
    expect(msg).toContain('Carlos');
    expect(msg).toContain('La Parada');
    expect(msg).toContain('Mesa 2');
    expect(msg).toContain('E-04');
  });
});
