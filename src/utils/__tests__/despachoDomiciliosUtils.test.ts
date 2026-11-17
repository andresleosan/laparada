import { describe, expect, it } from 'vitest';
import type { Domicilio } from '@/types';
import {
  calcularKpisDespachoDomicilios,
  calcularSlaDomicilio,
  construirUrlWhatsAppClienteDespacho,
  construirUrlWhatsAppHojaRutaRepartidor,
  esPedidoDomicilioReal,
  filtrarDomiciliosDespacho,
  generarDomiciliosCsv,
  generarTokenRastreoCliente,
  getConfiguracionZonasDefault,
  listarBarriosDisponibles,
  resolverTarifaPorBarrio,
} from '../despachoDomiciliosUtils';

function buildDomicilioMock(overrides: Partial<Domicilio> = {}): Domicilio {
  return {
    id: 'dom-001',
    negocioId: 'laparada',
    clienteNombre: 'Carlos Mendoza',
    clienteTelefono: '3115551234',
    direccion: 'Calle 10 # 4-25',
    barrio: 'Caobos',
    items: [
      {
        tipo: 'producto',
        referenciaId: 'p1',
        nombre: 'Tequeños x6',
        cantidad: 2,
        precioUnitario: 12000,
        subtotal: 24000,
      },
    ],
    total: 28000,
    metodoPago: 'efectivo',
    origen: 'whatsapp',
    estado: 'pendiente',
    creadoEn: new Date('2026-11-17T18:00:00Z') as unknown as Domicilio['creadoEn'],
    actualizadoEn: new Date('2026-11-17T18:00:00Z') as unknown as Domicilio['actualizadoEn'],
    ...overrides,
  };
}

describe('despachoDomiciliosUtils', () => {
  it('resuelve tarifa, zona y tiempo estimado por barrio ignorando tildes y mayúsculas', () => {
    const config = getConfiguracionZonasDefault('laparada');

    const cercana = resolverTarifaPorBarrio('caobos', config, 20000);
    expect(cercana.zona?.id).toBe('zona-cercana');
    expect(cercana.tarifaEnvio).toBe(4000);
    expect(cercana.tiempoEstimadoMin).toBe(25);
    expect(cercana.esEnvioGratis).toBe(false);

    const sinTilde = resolverTarifaPorBarrio('pinar del rio', config, 30000);
    expect(sinTilde.zona?.id).toBe('zona-los-patios');
    expect(sinTilde.tarifaEnvio).toBe(8000);
    expect(sinTilde.tiempoEstimadoMin).toBe(40);

    const desconocido = resolverTarifaPorBarrio('Barrio Inventado XYZ', config, 30000);
    expect(desconocido.zona).toBeNull();
    expect(desconocido.tarifaEnvio).toBe(config.tarifaPorDefecto);
  });

  it('aplica envío gratis cuando el subtotal supera el monto mínimo configurado', () => {
    const config = {
      ...getConfiguracionZonasDefault('laparada'),
      envioGratisDesdeMonto: 50000,
    };

    const gratis = resolverTarifaPorBarrio('Caobos', config, 55000);
    expect(gratis.esEnvioGratis).toBe(true);
    expect(gratis.tarifaEnvio).toBe(0);
    expect(gratis.zona?.id).toBe('zona-cercana');

    const conCosto = resolverTarifaPorBarrio('Caobos', config, 35000);
    expect(conCosto.esEnvioGratis).toBe(false);
    expect(conCosto.tarifaEnvio).toBe(4000);
  });

  it('lista barrios disponibles sin duplicados únicamente de zonas activas', () => {
    const config = getConfiguracionZonasDefault('laparada');
    config.zonas[0].activa = false;
    const barrios = listarBarriosDisponibles(config);

    expect(barrios.some((b) => b.barrio === 'Caobos')).toBe(false);
    expect(barrios.some((b) => b.barrio === 'Los Pinos')).toBe(true);
  });

  it('calcula correctamente el semáforo SLA en verde, ámbar y rojo', () => {
    const base = new Date('2026-11-17T18:00:00Z');

    const enTiempo = calcularSlaDomicilio(base, undefined, base.getTime() + 12 * 60000);
    expect(enTiempo.estadoSla).toBe('en_tiempo');
    expect(enTiempo.minutosTranscurridos).toBe(12);
    expect(enTiempo.etiqueta).toContain('A tiempo');

    const atencion = calcularSlaDomicilio(base, undefined, base.getTime() + 28 * 60000);
    expect(atencion.estadoSla).toBe('atencion');
    expect(atencion.minutosTranscurridos).toBe(28);
    expect(atencion.etiqueta).toContain('En límite');

    const demorado = calcularSlaDomicilio(base, undefined, base.getTime() + 45 * 60000);
    expect(demorado.estadoSla).toBe('demorado');
    expect(demorado.minutosTranscurridos).toBe(45);
    expect(demorado.etiqueta).toContain('¡Demorado!');
  });

  it('excluye comandas internas de mesas de salón y calcula KPIs de despacho incluyendo efectivo en calle', () => {
    const ahora = new Date('2026-11-17T18:50:00Z').getTime();

    const comandaMesa = buildDomicilioMock({
      id: 'mesa-1',
      tipoServicio: 'salon',
      mesaNumero: 'Mesa 4',
    });
    const domPendiente = buildDomicilioMock({
      id: 'dom-1',
      estado: 'pendiente',
      creadoEn: new Date('2026-11-17T18:05:00Z') as unknown as Domicilio['creadoEn'], // 45 min -> demorado
    });
    const domEnCaminoEfectivo = buildDomicilioMock({
      id: 'dom-2',
      estado: 'en_camino',
      metodoPago: 'efectivo',
      total: 42000,
      creadoEn: new Date('2026-11-17T18:35:00Z') as unknown as Domicilio['creadoEn'], // 15 min -> en tiempo
    });
    const domEnCaminoTransf = buildDomicilioMock({
      id: 'dom-3',
      estado: 'en_camino',
      metodoPago: 'transferencia',
      total: 35000,
      creadoEn: new Date('2026-11-17T18:25:00Z') as unknown as Domicilio['creadoEn'], // 25 min -> atencion
    });
    const domEntregado = buildDomicilioMock({
      id: 'dom-4',
      estado: 'entregado',
      total: 50000,
      creadoEn: new Date('2026-11-17T17:30:00Z') as unknown as Domicilio['creadoEn'],
      entregadoEn: new Date('2026-11-17T17:52:00Z') as unknown as Domicilio['entregadoEn'], // 22 min
    });

    expect(esPedidoDomicilioReal(comandaMesa)).toBe(false);
    expect(esPedidoDomicilioReal(domPendiente)).toBe(true);

    const kpis = calcularKpisDespachoDomicilios(
      [comandaMesa, domPendiente, domEnCaminoEfectivo, domEnCaminoTransf],
      [domEntregado],
      ahora
    );

    expect(kpis.totalActivos).toBe(3);
    expect(kpis.pendientesCocina).toBe(1);
    expect(kpis.enRuta).toBe(2);
    expect(kpis.demoradosCriticos).toBe(1);
    expect(kpis.efectivoEnCalle).toBe(42000);
    expect(kpis.entregadosHoy).toBe(1);
    expect(kpis.facturacionEntregadosHoy).toBe(50000);
    expect(kpis.tiempoPromedioMinutos).toBe(22);
  });

  it('filtra domicilios por estado, canal, repartidor y texto de búsqueda', () => {
    const lista = [
      buildDomicilioMock({
        id: 'd1',
        clienteNombre: 'Ana Gómez',
        barrio: 'Caobos',
        origen: 'whatsapp',
        estado: 'pendiente',
      }),
      buildDomicilioMock({
        id: 'd2',
        clienteNombre: 'Pedro Ruiz',
        barrio: 'Atalaya',
        origen: 'web',
        estado: 'en_camino',
        domiciliarioId: 'rep-1',
        domiciliarioNombre: 'MateoMoto',
      }),
      buildDomicilioMock({
        id: 'd3',
        tipoServicio: 'salon',
        mesaNumero: '2',
      }),
    ];

    const sinAsignar = filtrarDomiciliosDespacho(lista, {
      busqueda: '',
      estado: 'todos',
      origen: 'todos',
      repartidor: 'sin_asignar',
    });
    expect(sinAsignar.map((d) => d.id)).toEqual(['d1']);

    const porRepartidorYBusqueda = filtrarDomiciliosDespacho(lista, {
      busqueda: 'atalaya',
      estado: 'en_camino',
      origen: 'web',
      repartidor: 'rep-1',
    });
    expect(porRepartidorYBusqueda.map((d) => d.id)).toEqual(['d2']);
  });

  it('genera tokens de rastreo de 32 caracteres hexadecimales compatibles con rastreo_pedidos', () => {
    const token = generarTokenRastreoCliente();
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it('construye enlaces WhatsApp para cliente con rastreo y hoja de ruta para repartidor', () => {
    const dom = buildDomicilioMock({
      id: 'dom-abc123',
      estado: 'en_camino',
      domiciliarioNombre: 'Mateo',
      tiempoEstimadoMin: 25,
      rastreoToken: '0123456789abcdef0123456789abcdef',
    });

    const urlCliente = construirUrlWhatsAppClienteDespacho(dom, 'La Parada', 'https://laparada.pages.dev');
    expect(urlCliente).toContain('https://wa.me/573115551234?text=');
    expect(decodeURIComponent(urlCliente)).toContain('Mateo');
    expect(decodeURIComponent(urlCliente)).toContain('https://laparada.pages.dev/rastreo/0123456789abcdef0123456789abcdef');

    const urlRepartidor = construirUrlWhatsAppHojaRutaRepartidor(
      '3201112233',
      [dom],
      'Mateo',
      'La Parada'
    );
    expect(urlRepartidor).toContain('https://wa.me/573201112233?text=');
    expect(decodeURIComponent(urlRepartidor)).toContain('HOJA DE RUTA');
    expect(decodeURIComponent(urlRepartidor)).toContain('google.com/maps');
  });

  it('exporta CSV con BOM UTF-8 y protección contra fórmulas CSV', () => {
    const dom = buildDomicilioMock({
      clienteNombre: '=CMD()',
      barrio: 'Caobos',
      zonaDomicilioNombre: 'Cercana (Centro - Caobos)',
      costoEnvio: 4000,
    });

    const csv = generarDomiciliosCsv([dom]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain("'=CMD()");
    expect(csv).toContain('Cercana (Centro - Caobos)');
    expect(csv).toContain('4000');
  });
});
