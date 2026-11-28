import { afterEach, describe, expect, it, vi } from 'vitest';
import * as admin from 'firebase-admin';
import {
  calculateOrderItems,
  parsePublicOrderInput,
  type CatalogItemData,
} from '../src/orders/publicOrder';
import {
  construirUpdateDecrementoControl86,
  esEspecialVigenteServidor,
  evaluarControl86Servidor,
} from '../src/utils/control86Server';
import {
  cargarCatalogoVerificado,
  executeLaParadaOrderTool,
} from '../src/bot/aiOrderOrchestrator';
import { confirmarOrden } from '../src/bot/orderProcessingService';

function makeOrderInput(cantidad: number = 1) {
  return parsePublicOrderInput({
    negocioId: 'laparada',
    idempotencyKey: 'pedido_control86_12345678',
    items: [{ tipo: 'producto', referenciaId: 'prod-1', cantidad }],
    clienteNombre: 'Laura Gómez',
    clienteTelefono: '3001234567',
    direccion: 'Calle 15 # 4-20',
    barrio: 'Caobos',
    metodoPago: 'efectivo',
  });
}

describe('Control 86 y Especiales del Día en pedidos públicos (servidor)', () => {
  it('rechaza pedidos públicos cuando el producto está marcado en 86', () => {
    const catalog = new Map<string, CatalogItemData>([
      [
        'producto:prod-1',
        {
          nombre: 'Costilla BBQ',
          negocioId: 'laparada',
          disponible: true,
          precio: 28000,
          control86: {
            agotado86: true,
            motivo86: 'sin_insumos',
          },
        },
      ],
    ]);

    expect(() => calculateOrderItems(makeOrderInput(1), catalog)).toThrow(/Control 86/);
  });

  it('valida contador regresivo de porciones y calcula si debe pasar a auto-86', () => {
    const item: CatalogItemData = {
      nombre: 'Lomo al Trapo',
      negocioId: 'laparada',
      disponible: true,
      precio: 36000,
      control86: {
        agotado86: false,
        contadorActivo: true,
        porcionesDisponibles: 2,
        auto86AlLlegarACero: true,
      },
    };

    const catalog = new Map<string, CatalogItemData>([['producto:prod-1', item]]);

    expect(() => calculateOrderItems(makeOrderInput(3), catalog)).toThrow(
      /Solo quedan 2 porciones/
    );

    const ok = calculateOrderItems(makeOrderInput(2), catalog);
    expect(ok.total).toBe(72000);

    const evalExact = evaluarControl86Servidor(item, 2);
    expect(evalExact.permitido).toBe(true);
    expect(evalExact.porcionesRestantes).toBe(0);
    expect(evalExact.debeAuto86).toBe(true);
  });

  it('valida franja horaria de Especial del Día con soloEnHorarioProgramado en zona Bogotá', () => {
    // Sábado 2026-11-28 10:00 AM Bogotá -> 15:00 UTC
    const diezAmBogota = new Date('2026-11-28T15:00:00.000Z').getTime();
    // Sábado 2026-11-28 08:00 PM Bogotá -> 2026-11-29 01:00 UTC
    const ochoPmBogota = new Date('2026-11-29T01:00:00.000Z').getTime();

    const item: CatalogItemData = {
      nombre: 'Parrillada Nocturna',
      negocioId: 'laparada',
      disponible: true,
      precio: 42000,
      especialDelDia: {
        activo: true,
        etiqueta: 'Noche de Parrilla',
        diasSemana: [6],
        horaInicio: '18:00',
        horaFin: '23:30',
        soloEnHorarioProgramado: true,
      },
    };

    const catalog = new Map<string, CatalogItemData>([['producto:prod-1', item]]);

    expect(() => calculateOrderItems(makeOrderInput(1), catalog, diezAmBogota)).toThrow(
      /horario programado/
    );

    const resNocturno = calculateOrderItems(makeOrderInput(1), catalog, ochoPmBogota);
    expect(resNocturno.total).toBe(42000);

    expect(esEspecialVigenteServidor(item.especialDelDia, ochoPmBogota).vigente).toBe(true);
    expect(esEspecialVigenteServidor(item.especialDelDia, diezAmBogota).vigente).toBe(false);
  });
});

describe('Control 86 y Especiales del Día en WhatsApp Bot y helper atómico', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.WHATSAPP_NEGOCIO_ID;
  });

  it('construye actualización atómica de decremento y auto-86 al llegar a cero', () => {
    const sinContador = evaluarControl86Servidor(
      { nombre: 'Arepa', disponible: true },
      1
    );
    expect(construirUpdateDecrementoControl86({}, sinContador, 'TS')).toBeNull();

    const itemParcial: CatalogItemData = {
      nombre: 'Lomo',
      disponible: true,
      control86: {
        agotado86: false,
        contadorActivo: true,
        porcionesDisponibles: 5,
        auto86AlLlegarACero: true,
        actualizadoPor: 'cocinero@laparada.co',
      },
    };
    const evalParcial = evaluarControl86Servidor(itemParcial, 2, 1_764_300_000_000);
    const updParcial = construirUpdateDecrementoControl86(itemParcial, evalParcial, 'TS', 1_764_300_000_000);
    expect(updParcial).toMatchObject({
      actualizadoEn: 'TS',
      control86: {
        contadorActivo: true,
        porcionesDisponibles: 3,
        agotado86: false,
        actualizadoPor: 'cocinero@laparada.co',
      },
    });
    expect(updParcial).not.toHaveProperty('disponible');

    const itemUltimo: CatalogItemData = {
      nombre: 'Lomo',
      disponible: true,
      control86: {
        agotado86: false,
        contadorActivo: true,
        porcionesDisponibles: 2,
        auto86AlLlegarACero: true,
      },
    };
    const evalCero = evaluarControl86Servidor(itemUltimo, 2, 1_764_300_000_000);
    const updCero = construirUpdateDecrementoControl86(itemUltimo, evalCero, 'TS', 1_764_300_000_000);
    expect(updCero).toMatchObject({
      disponible: false,
      actualizadoEn: 'TS',
      control86: {
        contadorActivo: true,
        porcionesDisponibles: 0,
        agotado86: true,
        motivo86: 'produccion_agotada',
      },
    });
  });

  it('cargarCatalogoVerificado excluye 86/cupo 0/especiales fuera de horario y rechaza exceso en modificar_carrito', async () => {
    const productosDocs = [
      {
        id: 'prod-ok',
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Costilla Especial',
          precio: 32000,
          disponible: true,
          control86: {
            agotado86: false,
            contadorActivo: true,
            porcionesDisponibles: 3,
            umbralAlertaPorciones: 5,
          },
          especialDelDia: {
            activo: true,
            etiqueta: 'Sugerencia del Chef',
            diasSemana: [0, 1, 2, 3, 4, 5, 6],
            horaInicio: '00:00',
            horaFin: '23:59',
          },
        }),
      },
      {
        id: 'prod-86',
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Churrasco Agotado',
          precio: 38000,
          disponible: true,
          control86: { agotado86: true, contadorActivo: false },
        }),
      },
      {
        id: 'prod-cero',
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Sopa Limitada',
          precio: 15000,
          disponible: true,
          control86: { agotado86: false, contadorActivo: true, porcionesDisponibles: 0 },
        }),
      },
      {
        id: 'prod-horario',
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Solo Trasnoche Imposible',
          precio: 20000,
          disponible: true,
          especialDelDia: {
            activo: true,
            fechaEspecifica: '2020-01-01',
            soloEnHorarioProgramado: true,
          },
        }),
      },
    ];

    const combosDocs = [
      {
        id: 'combo-86',
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Combo Agotado',
          precioEspecial: 45000,
          disponible: true,
          control86: { agotado86: true, contadorActivo: false },
        }),
      },
    ];

    const mockDb = {
      collection: vi.fn((name: string) => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              docs: name === 'productos' ? productosDocs : combosDocs,
            }),
          })),
        })),
      })),
    } as unknown as admin.firestore.Firestore;

    const catalogo = await cargarCatalogoVerificado(mockDb, 'laparada');
    expect(catalogo).toHaveLength(1);
    expect(catalogo[0]).toMatchObject({
      id: 'prod-ok',
      nombre: 'Costilla Especial',
      porcionesDisponibles: 3,
      esEspecialVigente: true,
      etiquetaEspecial: 'Sugerencia del Chef',
    });

    await expect(
      executeLaParadaOrderTool(
        'modificar_carrito',
        {
          operacion: 'agregar',
          items: [{ productoId: 'prod-ok', catalogoTipo: 'producto', cantidad: 4 }],
        },
        { negocioId: 'laparada', numeroCliente: '573001112233', queueId: 'q-86-1' },
        mockDb
      )
    ).rejects.toThrow(/Solo quedan 3 porciones/);
  });

  it('confirmarOrden valida Control 86 y descuenta porciones atómicamente con auto-86 en 0', async () => {
    process.env.WHATSAPP_NEGOCIO_ID = 'laparada';

    const makeRef = (col: string, id: string) => ({ col, id, path: `${col}/${id}` });
    const refs = {
      pending: makeRef('ordenes_pendientes', 'ord-1'),
      pointer: makeRef('_ordenes_whatsapp_activas', 'ptr-1'),
      domicilio: makeRef('domicilios', 'dom-1'),
      producto: makeRef('productos', 'prod-1'),
    };

    const runScenario = async (prodData: Record<string, unknown>) => {
      const txUpdate = vi.fn();
      const txCreate = vi.fn();
      const txSet = vi.fn();

      const txGet = vi.fn(async (ref: { col: string; id: string }) => {
        if (ref.col === 'ordenes_pendientes') {
          return {
            exists: true,
            id: 'ord-1',
            data: () => ({
              negocioId: 'laparada',
              numeroCliente: '573001112233',
              estado: 'pendiente',
              paso: 'esperando_direccion',
              metodoPago: 'efectivo',
              items: [
                {
                  productoId: 'prod-1',
                  catalogoTipo: 'producto',
                  nombreSnapshot: 'Costilla BBQ',
                  precioSnapshot: 28000,
                  cantidad: 2,
                },
              ],
            }),
          };
        }
        if (ref.col === '_ordenes_whatsapp_activas') {
          return { exists: false, data: () => undefined };
        }
        if (ref.col === 'productos') {
          return { exists: true, id: 'prod-1', data: () => prodData };
        }
        return { exists: false, data: () => undefined };
      });

      const fakeDb = {
        collection: vi.fn((col: string) => ({
          doc: vi.fn((id?: string) => {
            if (col === 'ordenes_pendientes') return refs.pending;
            if (col === '_ordenes_whatsapp_activas') return refs.pointer;
            if (col === 'domicilios') return refs.domicilio;
            if (col === 'productos') return { ...refs.producto, id: id || 'prod-1' };
            return makeRef(col, id || 'doc-1');
          }),
        })),
        runTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({ get: txGet, update: txUpdate, create: txCreate, set: txSet })
        ),
      };

      vi.spyOn(admin, 'firestore').mockReturnValue(
        fakeDb as unknown as admin.firestore.Firestore
      );

      const res = await confirmarOrden(
        'ord-1',
        '573001112233',
        'Calle 10 # 20-30',
        'Caobos',
        'dirección: Calle 10 # 20-30 | Caobos'
      );

      return { res, txUpdate, txCreate };
    };

    // Caso 1: Producto con 1 porción disponible (pide 2) -> rechaza
    const rechazo = await runScenario({
      negocioId: 'laparada',
      nombre: 'Costilla BBQ',
      precio: 28000,
      disponible: true,
      control86: {
        agotado86: false,
        contadorActivo: true,
        porcionesDisponibles: 1,
        auto86AlLlegarACero: true,
      },
    });
    expect(rechazo.res.accion).toBe('catalogo_actualizado');
    expect(rechazo.res.respuesta).toContain('Solo queda 1 porción disponible');
    expect(rechazo.txCreate).not.toHaveBeenCalled();

    vi.restoreAllMocks();

    // Caso 2: Producto con 2 porciones disponibles (pide 2) -> confirma y marca auto-86
    const exito = await runScenario({
      negocioId: 'laparada',
      nombre: 'Costilla BBQ',
      precio: 28000,
      disponible: true,
      control86: {
        agotado86: false,
        contadorActivo: true,
        porcionesDisponibles: 2,
        auto86AlLlegarACero: true,
      },
    });
    expect(exito.res.accion).toBe('orden_confirmada');
    expect(exito.txCreate).toHaveBeenCalledTimes(1);
    expect(exito.txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'productos/prod-1' }),
      expect.objectContaining({
        disponible: false,
        control86: expect.objectContaining({
          contadorActivo: true,
          porcionesDisponibles: 0,
          agotado86: true,
          motivo86: 'produccion_agotada',
        }),
      })
    );
  });
});
