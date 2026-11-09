import { describe, it, expect, vi } from 'vitest';
import {
  evaluarTipoNps,
  esEncuestaQueja,
  calcularKpisSatisfaccion,
  filtrarEncuestas,
  generarUrlEncuestaPublica,
  generarMensajeWhatsAppRespuestaQueja,
  generarMensajeWhatsAppAgradecimiento,
  generarEncuestasCsv,
  descargarEncuestasCsv,
  getConfiguracionSatisfaccionDefault,
  TAGS_SATISFACCION_PREDEFINIDOS,
  getTagMeta,
} from '../satisfaccionUtils';
import type { EncuestaSatisfaccion } from '@/types/satisfaccion';

describe('satisfaccionUtils', () => {
  describe('evaluarTipoNps', () => {
    it('clasifica 5 y 4 como promotor', () => {
      expect(evaluarTipoNps(5)).toBe('promotor');
      expect(evaluarTipoNps(4)).toBe('promotor');
    });

    it('clasifica 3 como pasivo', () => {
      expect(evaluarTipoNps(3)).toBe('pasivo');
    });

    it('clasifica 2 y 1 como detractor', () => {
      expect(evaluarTipoNps(2)).toBe('detractor');
      expect(evaluarTipoNps(1)).toBe('detractor');
    });
  });

  describe('esEncuestaQueja', () => {
    it('marca como queja cualquier calificacion <= 2', () => {
      expect(esEncuestaQueja(1)).toBe(true);
      expect(esEncuestaQueja(2)).toBe(true);
    });

    it('marca como queja 3 estrellas si contiene etiquetas constructivas de problema', () => {
      expect(esEncuestaQueja(3, ['comida_fria'])).toBe(true);
      expect(esEncuestaQueja(3, ['sabor_increible'])).toBe(false);
    });

    it('no marca como queja calificaciones de 4 o 5', () => {
      expect(esEncuestaQueja(4, ['demora_excesiva'])).toBe(false);
      expect(esEncuestaQueja(5)).toBe(false);
    });
  });

  describe('tags predefinidos', () => {
    it('contiene etiquetas positivas y constructivas', () => {
      expect(TAGS_SATISFACCION_PREDEFINIDOS.length).toBeGreaterThan(6);
      const positivo = getTagMeta('sabor_increible');
      expect(positivo?.tipo).toBe('positivo');
      const constructivo = getTagMeta('comida_fria');
      expect(constructivo?.tipo).toBe('constructivo');
    });
  });

  describe('calcularKpisSatisfaccion', () => {
    it('devuelve ceros cuando la lista de encuestas esta vacia', () => {
      const kpis = calcularKpisSatisfaccion([]);
      expect(kpis.totalEncuestas).toBe(0);
      expect(kpis.calificacionPromedio).toBe(0);
      expect(kpis.indiceNps).toBe(0);
    });

    it('calcula correctamente el promedio, NPS y desgloses', () => {
      const mockEncuestas: EncuestaSatisfaccion[] = [
        {
          id: 'enc-1',
          negocioId: 'laparada',
          calificacion: 5,
          tipoNps: 'promotor',
          canal: 'mesa',
          tags: ['sabor_increible', 'excelente_servicio'],
          dimensiones: { comida: 5, servicio: 5, tiempo: 4 },
          esQueja: false,
          redirigidoGoogleReviews: true,
          contactadoPorWhatsApp: false,
          estado: 'resuelta',
          creadoEn: '2026-11-08T18:00:00Z',
        },
        {
          id: 'enc-2',
          negocioId: 'laparada',
          calificacion: 5,
          tipoNps: 'promotor',
          canal: 'domicilio',
          tags: ['sabor_increible', 'buen_empaque'],
          dimensiones: { comida: 5, empaque: 5 },
          esQueja: false,
          redirigidoGoogleReviews: false,
          contactadoPorWhatsApp: false,
          estado: 'nueva',
          creadoEn: '2026-11-08T19:00:00Z',
        },
        {
          id: 'enc-3',
          negocioId: 'laparada',
          calificacion: 3,
          tipoNps: 'pasivo',
          canal: 'mostrador_pos',
          tags: ['demora_excesiva'],
          dimensiones: { comida: 4, tiempo: 2 },
          esQueja: true,
          redirigidoGoogleReviews: false,
          contactadoPorWhatsApp: false,
          estado: 'en_seguimiento',
          creadoEn: '2026-11-08T19:30:00Z',
        },
        {
          id: 'enc-4',
          negocioId: 'laparada',
          calificacion: 1,
          tipoNps: 'detractor',
          canal: 'domicilio',
          tags: ['comida_fria', 'empaque_danado'],
          dimensiones: { comida: 1, empaque: 1 },
          esQueja: true,
          redirigidoGoogleReviews: false,
          contactadoPorWhatsApp: true,
          estado: 'resuelta',
          creadoEn: '2026-11-08T20:00:00Z',
        },
      ];

      const kpis = calcularKpisSatisfaccion(mockEncuestas);

      expect(kpis.totalEncuestas).toBe(4);
      // Promedio: (5 + 5 + 3 + 1) / 4 = 3.5
      expect(kpis.calificacionPromedio).toBe(3.5);
      expect(kpis.promotoresCount).toBe(2);
      expect(kpis.pasivosCount).toBe(1);
      expect(kpis.detractoresCount).toBe(1);
      // NPS: (2/4 = 50%) - (1/4 = 25%) = +25
      expect(kpis.indiceNps).toBe(25);
      expect(kpis.tasaCincoEstrellas).toBe(50);
      expect(kpis.quejasPendientes).toBe(1); // enc-3 en seguimiento
      expect(kpis.quejasResueltas).toBe(1); // enc-4 resuelta

      // Dimensiones
      expect(kpis.promedioComida).toBe(Number(((5 + 5 + 4 + 1) / 4).toFixed(1)));
      expect(kpis.topTagsPositivos[0].tag).toBe('sabor_increible');
      expect(kpis.topTagsPositivos[0].count).toBe(2);
      expect(kpis.topTagsConstructivos.length).toBeGreaterThan(0);
    });
  });

  describe('filtrarEncuestas', () => {
    const lista: EncuestaSatisfaccion[] = [
      {
        id: '1',
        negocioId: 'laparada',
        calificacion: 5,
        tipoNps: 'promotor',
        canal: 'mesa',
        mesaNombre: 'Mesa 4',
        clienteNombre: 'Carlos Gomez',
        clienteTelefono: '3001234567',
        tags: ['sabor_increible'],
        comentario: 'La mejor hamburguesa',
        esQueja: false,
        redirigidoGoogleReviews: true,
        contactadoPorWhatsApp: false,
        estado: 'nueva',
        creadoEn: '2026-11-08T12:00:00Z',
      },
      {
        id: '2',
        negocioId: 'laparada',
        calificacion: 2,
        tipoNps: 'detractor',
        canal: 'domicilio',
        clienteNombre: 'Maria Perez',
        clienteTelefono: '3109876543',
        tags: ['comida_fria'],
        comentario: 'Llego muy demorado y frio',
        esQueja: true,
        redirigidoGoogleReviews: false,
        contactadoPorWhatsApp: false,
        estado: 'en_seguimiento',
        creadoEn: '2026-11-08T14:00:00Z',
      },
    ];

    it('filtra por canal', () => {
      const resMesa = filtrarEncuestas(lista, { canal: 'mesa' });
      expect(resMesa.length).toBe(1);
      expect(resMesa[0].canal).toBe('mesa');

      const resDomi = filtrarEncuestas(lista, { canal: 'domicilio' });
      expect(resDomi.length).toBe(1);
      expect(resDomi[0].canal).toBe('domicilio');
    });

    it('filtra por calificacion', () => {
      const cinco = filtrarEncuestas(lista, { calificacion: '5' });
      expect(cinco.length).toBe(1);

      const quejas = filtrarEncuestas(lista, { calificacion: '1-2' });
      expect(quejas.length).toBe(1);
    });

    it('filtra solo quejas', () => {
      const res = filtrarEncuestas(lista, { soloQuejas: true });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('2');
    });

    it('filtra por busqueda textual', () => {
      const res = filtrarEncuestas(lista, { busqueda: 'Carlos' });
      expect(res.length).toBe(1);

      const resTel = filtrarEncuestas(lista, { busqueda: '310987' });
      expect(resTel.length).toBe(1);

      const resComentario = filtrarEncuestas(lista, { busqueda: 'hamburguesa' });
      expect(resComentario.length).toBe(1);
    });

    it('filtra por estado', () => {
      const res = filtrarEncuestas(lista, { estado: 'en_seguimiento' });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('2');
    });
  });

  describe('generarUrlEncuestaPublica', () => {
    it('construye la URL con parametros codificados', () => {
      const url = generarUrlEncuestaPublica({
        baseUrl: 'https://laparada.co',
        negocioId: 'laparada',
        canal: 'mesa',
        mesaNombre: 'Mesa 3',
        clienteNombre: 'Andres',
        clienteTelefono: '3001234567',
        ventaId: 'v123',
      });

      expect(url).toContain('https://laparada.co/calificar');
      expect(url).toContain('negocio=laparada');
      expect(url).toContain('canal=mesa');
      expect(url).toContain('mesa=Mesa+3');
      expect(url).toContain('cliente=Andres');
      expect(url).toContain('venta=v123');
    });
  });

  describe('mensajes estructurados para WhatsApp', () => {
    const encuestaMock: EncuestaSatisfaccion = {
      id: 'e1',
      negocioId: 'laparada',
      calificacion: 1,
      tipoNps: 'detractor',
      canal: 'domicilio',
      clienteNombre: 'Julian',
      clienteTelefono: '3009998877',
      tags: ['comida_fria'],
      comentario: 'La comida tardo 1 hora',
      esQueja: true,
      redirigidoGoogleReviews: false,
      contactadoPorWhatsApp: false,
      estado: 'nueva',
      creadoEn: '2026-11-08T18:00:00Z',
    };

    it('genera mensaje de respuesta a queja con empatia y detalles', () => {
      const txt = generarMensajeWhatsAppRespuestaQueja({
        encuesta: encuestaMock,
        nombreNegocio: 'La Parada Burger',
      });

      expect(txt).toContain('Julian');
      expect(txt).toContain('La Parada Burger');
      expect(txt).toContain('Comida fría');
      expect(txt).toContain('La comida tardo 1 hora');
      expect(txt).toContain('⭐');
    });

    it('genera mensaje de agradecimiento y enlace a Google Reviews', () => {
      const encuesta5: EncuestaSatisfaccion = {
        ...encuestaMock,
        calificacion: 5,
        tipoNps: 'promotor',
        esQueja: false,
      };

      const txt = generarMensajeWhatsAppAgradecimiento({
        encuesta: encuesta5,
        nombreNegocio: 'La Parada Burger',
        googleBusinessUrl: 'https://g.page/r/laparada/review',
      });

      expect(txt).toContain('⭐⭐⭐⭐⭐');
      expect(txt).toContain('https://g.page/r/laparada/review');
    });
  });

  describe('CSV y configuracion por defecto', () => {
    it('genera CSV con UTF-8 BOM y datos sanitizados', () => {
      const mock: EncuestaSatisfaccion[] = [
        {
          id: 'id-csv-1',
          negocioId: 'laparada',
          calificacion: 5,
          tipoNps: 'promotor',
          canal: 'mesa',
          clienteNombre: 'Mario, "El Rapido"',
          tags: ['sabor_increible'],
          esQueja: false,
          redirigidoGoogleReviews: true,
          contactadoPorWhatsApp: false,
          estado: 'resuelta',
          creadoEn: '2026-11-08T20:00:00Z',
        },
      ];

      const csv = generarEncuestasCsv(mock);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('ID Encuesta,Fecha,Hora');
      expect(csv).toContain('""El Rapido""');
    });

    it('descargarEncuestasCsv ejecuta click en el enlace si document existe', () => {
      const clickMock = vi.fn();
      const mockElement = {
        setAttribute: vi.fn(),
        click: clickMock,
      };
      const originalDoc = (globalThis as unknown as { document?: unknown }).document;
      const originalUrl = (globalThis as unknown as { URL?: unknown }).URL;

      (globalThis as unknown as { document: unknown }).document = {
        createElement: vi.fn(() => mockElement),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      };
      (globalThis as unknown as { URL: unknown }).URL = {
        createObjectURL: vi.fn(() => 'blob:mock'),
        revokeObjectURL: vi.fn(),
      };

      descargarEncuestasCsv([]);

      expect(clickMock).toHaveBeenCalled();

      (globalThis as unknown as { document: unknown }).document = originalDoc;
      (globalThis as unknown as { URL: unknown }).URL = originalUrl;
    });

    it('genera configuracion por defecto valida', () => {
      const conf = getConfiguracionSatisfaccionDefault('mi-negocio');
      expect(conf.negocioId).toBe('mi-negocio');
      expect(conf.habilitarRedireccionGoogle).toBe(true);
      expect(conf.mensajeAgradecimiento5Estrellas).toBeTruthy();
    });
  });
});
