import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Venta } from '@/types';
import type { Mesa } from '@/types/mesa';
import type { EmpleadoPersonal } from '@/types/personal';
import type { ConfiguracionMesero, DesempenoMesero } from '@/types/mesero';
import {
  calcularComisionVenta,
  calcularTicketPromedio,
  normalizarNombreMesero,
  calcularDesempenoMeseros,
  calcularResumenSalon,
  generarComprobanteMeseroWhatsApp,
  generarCsvMeseros,
} from '../meserosUtils';

describe('meserosUtils', () => {
  describe('calcularComisionVenta', () => {
    it('retorna 0 si la base de venta es 0 o negativa', () => {
      expect(calcularComisionVenta(0, 5)).toBe(0);
      expect(calcularComisionVenta(-10000, 5)).toBe(0);
    });

    it('retorna 0 si el porcentaje de comisión es 0 o negativo', () => {
      expect(calcularComisionVenta(100000, 0)).toBe(0);
      expect(calcularComisionVenta(100000, -2)).toBe(0);
    });

    it('calcula la comisión redondeada a números enteros en COP', () => {
      expect(calcularComisionVenta(100000, 3)).toBe(3000);
      expect(calcularComisionVenta(55550, 2.5)).toBe(1389);
    });
  });

  describe('calcularTicketPromedio', () => {
    it('retorna 0 si no hay ventas o el total es 0', () => {
      expect(calcularTicketPromedio(0, 0)).toBe(0);
      expect(calcularTicketPromedio(50000, 0)).toBe(0);
      expect(calcularTicketPromedio(0, 5)).toBe(0);
    });

    it('calcula el promedio redondeado', () => {
      expect(calcularTicketPromedio(150000, 3)).toBe(50000);
      expect(calcularTicketPromedio(100000, 3)).toBe(33333);
    });
  });

  describe('normalizarNombreMesero', () => {
    it('limpia espacios, mayúsculas y acentos', () => {
      expect(normalizarNombreMesero('  Carlos Andrés  ')).toBe('carlos andres');
      expect(normalizarNombreMesero('MARÍA JOSÉ')).toBe('maria jose');
      expect(normalizarNombreMesero('')).toBe('');
      expect(normalizarNombreMesero(null)).toBe('');
    });
  });

  describe('calcularDesempenoMeseros', () => {
    const empleadoCarlos: EmpleadoPersonal = {
      id: 'emp_carlos',
      negocioId: 'laparada',
      nombre: 'Carlos Pérez',
      cargo: 'mesero',
      telefono: '3001234567',
      activo: true,
      modalidadPago: 'por_turno',
      tarifaTurno: 40000,
      participaPropinas: true,
      creadoEn: Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    };

    const empleadoAna: EmpleadoPersonal = {
      id: 'emp_ana',
      negocioId: 'laparada',
      nombre: 'Ana Gómez',
      cargo: 'mesero',
      telefono: '3007654321',
      activo: true,
      modalidadPago: 'por_turno',
      tarifaTurno: 40000,
      participaPropinas: true,
      creadoEn: Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    };

    const cfgCarlos: ConfiguracionMesero = {
      id: 'cfg_carlos',
      negocioId: 'laparada',
      empleadoId: 'emp_carlos',
      nombre: 'Carlos Pérez',
      porcentajeComision: 3, // 3%
      porcentajePropina: 80, // 80% directa, 20% pool
      metaVentaTurno: 200000,
      activo: true,
    };

    const cfgAna: ConfiguracionMesero = {
      id: 'cfg_ana',
      negocioId: 'laparada',
      empleadoId: 'emp_ana',
      nombre: 'Ana Gómez',
      porcentajeComision: 5, // 5%
      porcentajePropina: 100, // 100% directa
      metaVentaTurno: 150000,
      activo: true,
    };

    const ventasMuestra: Venta[] = [
      {
        id: 'v1',
        negocioId: 'laparada',
        items: [{ tipo: 'producto', referenciaId: 'p1', nombre: 'Hamburguesa', cantidad: 2, precioUnitario: 25000, subtotal: 50000 }],
        total: 55000,
        subtotal: 50000,
        propina: 5000,
        metodoPago: 'efectivo',
        origen: 'pos',
        fecha: Timestamp.fromDate(new Date('2026-11-07T14:00:00Z')),
        meseroId: 'emp_carlos',
        meseroNombre: 'Carlos Pérez',
      },
      {
        id: 'v2',
        negocioId: 'laparada',
        items: [{ tipo: 'producto', referenciaId: 'p2', nombre: 'Perro Caliente', cantidad: 3, precioUnitario: 20000, subtotal: 60000 }],
        total: 66000,
        subtotal: 60000,
        propina: 6000,
        metodoPago: 'transferencia',
        origen: 'pos',
        fecha: Timestamp.fromDate(new Date('2026-11-07T16:00:00Z')),
        meseroId: 'emp_carlos',
        meseroNombre: 'Carlos Pérez',
      },
      {
        id: 'v3_anulada',
        negocioId: 'laparada',
        items: [{ tipo: 'producto', referenciaId: 'p1', nombre: 'Hamburguesa', cantidad: 1, precioUnitario: 25000, subtotal: 25000 }],
        total: 25000,
        metodoPago: 'efectivo',
        origen: 'pos',
        estado: 'anulada',
        fecha: Timestamp.fromDate(new Date('2026-11-07T17:00:00Z')),
        meseroId: 'emp_carlos',
        meseroNombre: 'Carlos Pérez',
      },
      {
        id: 'v4',
        negocioId: 'laparada',
        items: [{ tipo: 'producto', referenciaId: 'p3', nombre: 'Picada Familiar', cantidad: 1, precioUnitario: 120000, subtotal: 120000 }],
        total: 130000,
        subtotal: 120000,
        propina: 10000,
        metodoPago: 'efectivo',
        origen: 'pos',
        fecha: Timestamp.fromDate(new Date('2026-11-07T18:00:00Z')),
        meseroNombre: 'Ana Gómez', // Coincide por nombre
      },
    ];

    const mesasActivasMuestra: Mesa[] = [
      {
        id: 'm1',
        numero: 1,
        nombre: 'Mesa 1',
        capacidad: 4,
        zona: 'Salón Principal',
        estado: 'ocupada',
        meseroId: 'emp_carlos',
        meseroNombre: 'Carlos Pérez',
        negocioId: 'laparada',
      },
      {
        id: 'm2',
        numero: 2,
        nombre: 'Mesa 2',
        capacidad: 2,
        zona: 'Salón Principal',
        estado: 'por_cobrar',
        meseroNombre: 'Carlos Pérez',
        negocioId: 'laparada',
      },
      {
        id: 'm3',
        numero: 3,
        nombre: 'Mesa 3',
        capacidad: 6,
        zona: 'Terraza',
        estado: 'ocupada',
        meseroNombre: 'Ana Gómez',
        negocioId: 'laparada',
      },
      {
        id: 'm4',
        numero: 4,
        nombre: 'Mesa 4',
        capacidad: 4,
        zona: 'Salón Principal',
        estado: 'libre',
        negocioId: 'laparada',
      },
    ];

    it('calcula métricas correctas, ignora ventas anuladas y asigna ranking', () => {
      const resultado = calcularDesempenoMeseros({
        ventas: ventasMuestra,
        mesasActivas: mesasActivasMuestra,
        empleadosMeseros: [empleadoCarlos, empleadoAna],
        configuraciones: [cfgCarlos, cfgAna],
      });

      expect(resultado.length).toBe(2);

      // Ana vendió 120.000, Carlos vendió 110.000 (50k + 60k; la anulada de 25k se ignora)
      // Ana debe ser ranking #1
      const [primero, segundo] = resultado;

      expect(primero.meseroNombre).toBe('Ana Gómez');
      expect(primero.ranking).toBe(1);
      expect(primero.esEstrella).toBe(true);
      expect(primero.totalVentas).toBe(120000);
      expect(primero.cantidadVentas).toBe(1);
      expect(primero.ticketPromedio).toBe(120000);
      expect(primero.totalPropinas).toBe(10000);
      expect(primero.propinaDirecta).toBe(10000); // 100%
      expect(primero.propinaPool).toBe(0);
      expect(primero.comisionVentas).toBe(6000); // 5% de 120.000
      expect(primero.totalIncentivos).toBe(16000); // 10k propina + 6k comisión
      expect(primero.mesasActivasCount).toBe(1);
      expect(primero.mesasActivasNombres).toEqual(['Mesa 3']);
      expect(primero.porcentajeMeta).toBe(80); // 120.000 / 150.000 = 80%

      // Carlos debe ser ranking #2
      expect(segundo.meseroNombre).toBe('Carlos Pérez');
      expect(segundo.ranking).toBe(2);
      expect(segundo.esEstrella).toBe(false);
      expect(segundo.totalVentas).toBe(110000);
      expect(segundo.cantidadVentas).toBe(2);
      expect(segundo.ticketPromedio).toBe(55000); // 110.000 / 2
      expect(segundo.totalPropinas).toBe(11000); // 5k + 6k
      expect(segundo.propinaDirecta).toBe(8800); // 80% de 11.000
      expect(segundo.propinaPool).toBe(2200); // 20%
      expect(segundo.comisionVentas).toBe(3300); // 3% de 110.000
      expect(segundo.totalIncentivos).toBe(12100); // 8.800 + 3.300
      expect(segundo.mesasActivasCount).toBe(2);
      expect(segundo.mesasActivasNombres).toEqual(['Mesa 1', 'Mesa 2']);
      expect(segundo.porcentajeMeta).toBe(55); // 110.000 / 200.000 = 55%
    });

    it('filtra adecuadamente por rango de fechas', () => {
      // Filtrar sólo ventas a partir de las 15:00Z
      const resultado = calcularDesempenoMeseros({
        ventas: ventasMuestra,
        fechaInicio: new Date('2026-11-07T15:00:00Z'),
      });

      const carlos = resultado.find((r) => r.meseroNombre === 'Carlos Pérez');
      // Sólo la venta v2 de 60.000 califica
      expect(carlos?.totalVentas).toBe(60000);
      expect(carlos?.cantidadVentas).toBe(1);
    });

    it('incluye colaboradores de personal aunque no tengan ventas registradas aún', () => {
      const empleadoNuevo: EmpleadoPersonal = {
        id: 'emp_nuevo',
        negocioId: 'laparada',
        nombre: 'Luis Mesero',
        cargo: 'mesero',
        telefono: '3119999999',
        activo: true,
        modalidadPago: 'por_turno',
        tarifaTurno: 40000,
        participaPropinas: true,
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now(),
      };

      const resultado = calcularDesempenoMeseros({
        ventas: [],
        empleadosMeseros: [empleadoNuevo],
      });

      expect(resultado.length).toBe(1);
      expect(resultado[0].meseroNombre).toBe('Luis Mesero');
      expect(resultado[0].totalVentas).toBe(0);
      expect(resultado[0].cantidadVentas).toBe(0);
      expect(resultado[0].ticketPromedio).toBe(0);
      expect(resultado[0].esEstrella).toBe(false);
    });
  });

  describe('calcularResumenSalon', () => {
    it('consolida correctamente los KPIs del salón', () => {
      const desempenos: DesempenoMesero[] = [
        {
          meseroId: 'm1',
          meseroNombre: 'Ana Gómez',
          activo: true,
          totalVentas: 120000,
          cantidadVentas: 2,
          ticketPromedio: 60000,
          totalPropinas: 10000,
          propinaDirecta: 10000,
          propinaPool: 0,
          porcentajeComision: 5,
          comisionVentas: 6000,
          totalIncentivos: 16000,
          mesasActivasCount: 2,
          mesasActivasNombres: ['Mesa 1', 'Mesa 2'],
          porcentajeMeta: 80,
          ranking: 1,
          esEstrella: true,
        },
        {
          meseroId: 'm2',
          meseroNombre: 'Carlos Pérez',
          activo: true,
          totalVentas: 80000,
          cantidadVentas: 2,
          ticketPromedio: 40000,
          totalPropinas: 6000,
          propinaDirecta: 6000,
          propinaPool: 0,
          porcentajeComision: 0,
          comisionVentas: 0,
          totalIncentivos: 6000,
          mesasActivasCount: 1,
          mesasActivasNombres: ['Mesa 3'],
          porcentajeMeta: 40,
          ranking: 2,
          esEstrella: false,
        },
      ];

      const resumen = calcularResumenSalon(desempenos);

      expect(resumen.totalVentasSalon).toBe(200000);
      expect(resumen.totalPropinasSalon).toBe(16000);
      expect(resumen.totalComisionesSalon).toBe(6000);
      expect(resumen.ticketPromedioSalon).toBe(50000); // 200.000 / 4
      expect(resumen.mesasOcupadasEnSalon).toBe(3);
      expect(resumen.meseroEstrella?.meseroNombre).toBe('Ana Gómez');
    });
  });

  describe('generarComprobanteMeseroWhatsApp', () => {
    it('genera el texto estructurado con emojis y datos de liquidación', () => {
      const desempeno: DesempenoMesero = {
        meseroId: 'm1',
        meseroNombre: 'Carlos Pérez',
        activo: true,
        totalVentas: 150000,
        cantidadVentas: 3,
        ticketPromedio: 50000,
        totalPropinas: 15000,
        propinaDirecta: 12000,
        propinaPool: 3000,
        porcentajeComision: 3,
        comisionVentas: 4500,
        totalIncentivos: 16500,
        mesasActivasCount: 1,
        mesasActivasNombres: ['Mesa 1'],
        metaVentaTurno: 150000,
        porcentajeMeta: 100,
        ranking: 1,
        esEstrella: true,
      };

      const texto = generarComprobanteMeseroWhatsApp(desempeno, 'Hoy (07/11/2026)', 'La Parada');

      expect(texto).toContain('*LA PARADA*');
      expect(texto).toContain('*Carlos Pérez*');
      expect(texto).toContain('MESERO ESTRELLA');
      expect(texto).toContain('Total Ventas Facturadas');
      expect(texto).toContain('Ticket Promedio');
      expect(texto).toContain('Propinas Recaudadas');
      expect(texto).toContain('Comisión por Ventas (3%)');
      expect(texto).toContain('TOTAL INCENTIVOS A RECIBIR');
    });
  });

  describe('generarCsvMeseros', () => {
    it('genera un CSV con UTF-8 BOM y las columnas correspondientes', () => {
      const desempeno: DesempenoMesero = {
        meseroId: 'm1',
        meseroNombre: 'Carlos "El Rápido"',
        documento: '1090123456',
        telefono: '3001234567',
        activo: true,
        totalVentas: 200000,
        cantidadVentas: 4,
        ticketPromedio: 50000,
        totalPropinas: 20000,
        propinaDirecta: 20000,
        propinaPool: 0,
        porcentajeComision: 2,
        comisionVentas: 4000,
        totalIncentivos: 24000,
        mesasActivasCount: 2,
        mesasActivasNombres: ['Mesa 1', 'Mesa 4'],
        metaVentaTurno: 250000,
        porcentajeMeta: 80,
        ranking: 1,
        esEstrella: true,
      };

      const csv = generarCsvMeseros([desempeno], 'Noviembre 2026');

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Ranking,Mesero,Documento');
      expect(csv).toContain('"Carlos ""El Rápido"""');
      expect(csv).toContain('1090123456');
      expect(csv).toContain('200000');
    });
  });
});
