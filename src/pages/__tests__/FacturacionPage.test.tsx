import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { FacturacionPage } from '../FacturacionPage';
import { AlertaResolucionBanner } from '@/components/facturacion/AlertaResolucionBanner';
import { ComprobanteZModal } from '@/components/facturacion/ComprobanteZModal';
import type { ComprobanteZ, ConfiguracionFiscal, EvaluacionResolucionDian } from '@/types';

const mockConfiguracion: ConfiguracionFiscal = {
  negocioId: 'laparada',
  habilitado: true,
  razonSocial: 'COMERCIALIZADORA GASTRONÓMICA LA PARADA S.A.S.',
  nombreComercial: 'LA PARADA',
  nit: '901.845.123',
  dv: '5',
  tipoDocumentoIdentidad: 'NIT',
  regimenFiscal: 'responsable_inc',
  responsabilidad: 'Responsable de Impuesto Nacional al Consumo (INC 8%)',
  direccionFiscal: 'Av. 0 # 10-20, Barrio La Playa',
  municipio: 'Cúcuta',
  departamento: 'Norte de Santander',
  telefonoContacto: '310 123 4567',
  correoFiscal: 'facturacion@laparada.com',
  leyendaFiscal: 'Documento Equivalente Electrónico POS expedido conforme a resolución DIAN vigente',
  tarifaDefault: {
    tipo: 'inc',
    porcentaje: 8,
    nombre: 'Impuesto Nacional al Consumo (INC 8%)',
  },
  preciosIncluyenImpuesto: true,
  resolucion: {
    numeroResolucion: '18764089123456',
    fechaExpedicion: '2026-01-15',
    fechaVencimiento: '2027-01-15',
    prefijo: 'POS',
    rangoInicial: 1,
    rangoFinal: 10000,
    consecutivoActual: 154,
  },
  alertas: {
    diasAnticipacionVencimiento: 30,
    consecutivosMinimosRestantes: 100,
  },
};

const mockEvaluacionOptima: EvaluacionResolucionDian = {
  estado: 'optimo',
  diasRestantes: 240,
  foliosRestantes: 9846,
  porcentajeFoliosUsados: 2,
  color: 'verde',
  mensaje: 'Resolución DIAN vigente. 9846 folios disponibles (240 días restantes).',
  requiereAtencion: false,
};

const mockEvaluacionAlerta: EvaluacionResolucionDian = {
  estado: 'proximo_a_vencer',
  diasRestantes: 15,
  foliosRestantes: 45,
  porcentajeFoliosUsados: 95,
  color: 'amarillo',
  mensaje: 'La resolución DIAN vence en 15 días (fecha límite: 2026-11-23).',
  requiereAtencion: true,
};

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: {
      id: 'laparada',
      nombre: 'La Parada',
    },
  }),
}));

vi.mock('@/hooks/useFacturacion', () => ({
  useFacturacion: () => ({
    configuracion: mockConfiguracion,
    comprobantesZ: [],
    loading: false,
    evaluacionResolucion: mockEvaluacionOptima,
    guardarConfiguracion: vi.fn(),
    generarCorteZ: vi.fn(() => ({
      id: 'z-test',
      negocioId: 'laparada',
      numeroZ: 'Z-20261108-0001',
      fechaCorte: '2026-11-08',
      horaGeneracion: '22:00',
      generadoPor: 'Cajero POS',
      resolucionNumero: '18764089123456',
      prefijo: 'POS',
      rangoInicial: 1,
      rangoFinal: 5,
      consecutivoInicialTexto: 'POS-00001',
      consecutivoFinalTexto: 'POS-00005',
      totalDocumentosEmitidos: 5,
      totalDocumentosAnulados: 0,
      totalVentasBrutas: 150000,
      totalDescuentos: 0,
      totalVentasNetas: 150000,
      baseGravableInc8: 138889,
      impuestoInc8: 11111,
      baseGravableIva19: 0,
      impuestoIva19: 0,
      baseExenta: 0,
      totalImpuestos: 11111,
      totalPropinas: 5000,
      totalCobrado: 155000,
      totalEfectivo: 155000,
      totalTransferencia: 0,
    })),
    guardarCorteZ: vi.fn(),
    asignarConsecutivo: vi.fn(),
  }),
}));

vi.mock('@/services/ventasService', () => ({
  getVentasRecientes: vi.fn().mockResolvedValue([]),
}));

describe('FacturacionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el título y los controles de pestañas de navegación', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <FacturacionPage />
      </MemoryRouter>
    );

    expect(html).toContain('Facturación &amp; Documento Equivalente POS');
    expect(html).toContain('DIAN Colombia');
    expect(html).toContain('Resolución DIAN');
    expect(html).toContain('Comprobante Z Diario');
    expect(html).toContain('Historial POS');
  });

  it('renderiza AlertaResolucionBanner en estado óptimo', () => {
    const html = renderToStaticMarkup(
      <AlertaResolucionBanner evaluacion={mockEvaluacionOptima} />
    );

    expect(html).toContain('Resolución DIAN al día');
    expect(html).toContain('240 días restantes');
    expect(html).toContain('9846 folios libres');
  });

  it('renderiza AlertaResolucionBanner con advertencia de vencimiento y botón de acción', () => {
    const html = renderToStaticMarkup(
      <AlertaResolucionBanner
        evaluacion={mockEvaluacionAlerta}
        onRenovarClick={() => {}}
      />
    );

    expect(html).toContain('Advertencia de Resolución DIAN');
    expect(html).toContain('proximo a vencer');
    expect(html).toContain('Actualizar Resolución');
  });

  it('renderiza ComprobanteZModal con datos fiscales oficiales y desglose', () => {
    const comprobantePrueba: ComprobanteZ = {
      id: 'corte-123',
      negocioId: 'laparada',
      numeroZ: 'Z-20261108-0001',
      fechaCorte: '2026-11-08',
      horaGeneracion: '22:30',
      generadoPor: 'Cajero Principal',
      resolucionNumero: '18764089123456',
      prefijo: 'POS',
      rangoInicial: 101,
      rangoFinal: 120,
      consecutivoInicialTexto: 'POS-00101',
      consecutivoFinalTexto: 'POS-00120',
      totalDocumentosEmitidos: 20,
      totalDocumentosAnulados: 1,
      totalVentasBrutas: 450000,
      totalDescuentos: 15000,
      totalVentasNetas: 435000,
      baseGravableInc8: 402778,
      impuestoInc8: 32222,
      baseGravableIva19: 0,
      impuestoIva19: 0,
      baseExenta: 0,
      totalImpuestos: 32222,
      totalPropinas: 20000,
      totalCobrado: 455000,
      totalEfectivo: 300000,
      totalTransferencia: 155000,
    };

    const html = renderToStaticMarkup(
      <ComprobanteZModal
        comprobante={comprobantePrueba}
        configuracion={mockConfiguracion}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).toContain('COMERCIALIZADORA GASTRONÓMICA LA PARADA S.A.S.');
    expect(html).toContain('Z-20261108-0001');
    expect(html).toContain('POS-00101 a POS-00120');
    expect(html).toContain('Base Gravable INC (8%)');
    expect(html).toContain('Formas de Pago');
  });
});
