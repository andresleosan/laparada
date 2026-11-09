import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ContabilidadPage } from '../ContabilidadPage';
import { LibroFiscalDiarioTable } from '@/components/contabilidad/LibroFiscalDiarioTable';
import { Formulario310Card } from '@/components/contabilidad/Formulario310Card';
import { ConciliacionCajaVentasCard } from '@/components/contabilidad/ConciliacionCajaVentasCard';
import { ExportarSoftwareContableCard } from '@/components/contabilidad/ExportarSoftwareContableCard';
import type {
  ConsolidadoLibroFiscal,
  LiquidacionFormulario310,
  ResumenConciliacionContable,
} from '@/types/contabilidad';
import { getMapeoPucDefault } from '@/utils/contabilidadUtils';

const mockLibroFiscal: ConsolidadoLibroFiscal = {
  periodo: {
    tipo: 'bimestre_actual',
    inicio: new Date('2026-03-01'),
    fin: new Date('2026-04-30'),
    etiqueta: 'Bimestre 2 (Marzo - Abril) - 2026',
    ano: 2026,
    bimestre: 2,
  },
  entradas: [
    {
      fecha: '2026-03-15',
      consecutivoInicial: 'POS-00010',
      consecutivoFinal: 'POS-00025',
      totalDocumentos: 15,
      totalAnulados: 0,
      ingresosGravadosInc8: 300000,
      impuestoInc8: 24000,
      ingresosGravadosIva19: 0,
      impuestoIva19: 0,
      ingresosExcluidos: 0,
      totalVentasBrutas: 324000,
      totalDescuentos: 0,
      totalVentasNetas: 324000,
      propinasRecaudadas: 15000,
      totalCobradoEfectivo: 200000,
      totalCobradoTransferencia: 139000,
      totalEgresosGastos: 80000,
      saldoNetoOperacional: 244000,
    },
  ],
  totalDiasConOperacion: 1,
  totalDocumentosEmitidos: 15,
  totalDocumentosAnulados: 0,
  acumuladoVentasBrutas: 324000,
  acumuladoDescuentos: 0,
  acumuladoVentasNetas: 324000,
  acumuladoBaseInc8: 300000,
  acumuladoImpuestoInc8: 24000,
  acumuladoBaseIva19: 0,
  acumuladoImpuestoIva19: 0,
  acumuladoExcluidos: 0,
  acumuladoPropinas: 15000,
  acumuladoEfectivo: 200000,
  acumuladoTransferencia: 139000,
  acumuladoEgresosGastos: 80000,
  acumuladoSaldoNeto: 244000,
};

const mockFormulario310: LiquidacionFormulario310 = {
  anoGravable: 2026,
  bimestre: 2,
  bimestreNombre: 'Bimestre 2 (Marzo - Abril)',
  fechaInicio: '2026-03-01',
  fechaFin: '2026-04-30',
  ingresosBrutosRestaurantes8: 300000,
  descuentosYAnulaciones: 0,
  ingresosNetosGravados8: 300000,
  tarifaImpuesto: 8,
  impuestoGenerado8: 24000,
  ingresosExcluidosNoGravados: 0,
  totalIngresosNetos: 300000,
  totalImpuestoACargo: 24000,
  anticiposRetenciones: 0,
  saldoAPagar: 24000,
  propinasInformativas: 15000,
  totalOperacionesPos: 15,
  renglones: [
    {
      numeroRenglon: 28,
      codigo: 'ING_BRUTOS_REST',
      concepto: 'Ingresos brutos por servicios de restaurantes y bares',
      valor: 300000,
      esCalculado: false,
      explicacion: 'Total facturado',
    },
    {
      numeroRenglon: 31,
      codigo: 'ING_NETOS_GRAV_8',
      concepto: 'Ingresos netos gravados a la tarifa del 8%',
      valor: 300000,
      esCalculado: true,
      explicacion: 'Base neta',
    },
    {
      numeroRenglon: 40,
      codigo: 'IMP_GENERADO_8',
      concepto: 'Impuesto liquidado a la tarifa del 8%',
      valor: 24000,
      esCalculado: true,
      explicacion: 'Impuesto 8%',
    },
    {
      numeroRenglon: 52,
      codigo: 'TOTAL_SALDO_PAGAR',
      concepto: 'Total saldo a pagar por impuesto',
      valor: 24000,
      esCalculado: true,
      explicacion: 'Saldo final',
    },
  ],
};

const mockConciliacion: ResumenConciliacionContable = {
  periodo: mockLibroFiscal.periodo,
  items: [
    {
      fecha: '2026-03-15',
      totalVentasSistema: 324000,
      ventasEfectivoSistema: 200000,
      ventasTransferenciaSistema: 124000,
      totalEgresosCaja: 80000,
      efectivoEsperadoCaja: 120000,
      efectivoRealArqueado: 120000,
      diferenciaEfectivo: 0,
      estado: 'cuadrado',
    },
  ],
  totalVentasSistema: 324000,
  totalCobradoEfectivo: 200000,
  totalCobradoTransferencia: 124000,
  totalEgresosPeriodo: 80000,
  totalArqueadoFisico: 120000,
  diferenciaTotalNeta: 0,
  diasCuadrados: 1,
  diasConDiferencia: 0,
  diasSinCierre: 0,
  saludConciliacion: 'optima',
  porcentajeEfectivo: 62,
  porcentajeTransferencia: 38,
};

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: {
      id: 'laparada',
      nombre: 'La Parada GastroBar',
      nit: '901.458.789',
    },
  }),
}));

vi.mock('@/hooks/useContabilidad', () => ({
  useContabilidad: () => ({
    tipoPeriodo: 'bimestre_actual',
    anoSeleccionado: 2026,
    bimestreSeleccionado: 2,
    rangoPeriodo: mockLibroFiscal.periodo,
    loading: false,
    error: null,
    configuracionFiscal: null,
    mapeoPuc: getMapeoPucDefault(),
    libroFiscal: mockLibroFiscal,
    formulario310: mockFormulario310,
    conciliacion: mockConciliacion,
    asientosContables: [],
    cambiarPeriodo: vi.fn(),
    cambiarRangoPersonalizado: vi.fn(),
    guardarMapeo: vi.fn(),
    registrarCierreConciliacion: vi.fn(),
    exportarLibroFiscal: vi.fn(),
    exportarFormulario310: vi.fn(),
    exportarConciliacion: vi.fn(),
    exportarSoftware: vi.fn(),
    obtenerMensajeWhatsApp: vi.fn(() => 'Informe Contable Test'),
    refresh: vi.fn(),
  }),
}));

describe('ContabilidadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la cabecera, KPIs y navegación de pestañas', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ContabilidadPage />
      </MemoryRouter>
    );

    expect(html).toContain('Conciliación Contable &amp; Libro Fiscal');
    expect(html).toContain('Libro Fiscal (Art. 616 E.T.)');
    expect(html).toContain('Impoconsumo (Formulario 310 DIAN)');
    expect(html).toContain('Conciliación Ventas vs Caja');
    expect(html).toContain('Interfaces Software (Siigo / World Office / Helisa)');
    expect(html).toContain('Base Gravable INC (8%)');
    expect(html).toContain('Impoconsumo a Pagar (R52)');
  });

  it('renderiza el componente LibroFiscalDiarioTable con datos del consolidado', () => {
    const html = renderToStaticMarkup(
      <LibroFiscalDiarioTable
        consolidado={mockLibroFiscal}
        onExportarCsv={vi.fn()}
        nombreNegocio="La Parada"
        nit="901458789"
      />
    );

    expect(html).toContain('Libro Fiscal de Operaciones Diarias');
    expect(html).toContain('Art. 616 E.T.');
    expect(html).toContain('POS-00010');
    expect(html).toContain('POS-00025');
    expect(html).toContain('Totales Acumulados');
  });

  it('renderiza el componente Formulario310Card con renglones DIAN', () => {
    const html = renderToStaticMarkup(
      <Formulario310Card
        liquidacion={mockFormulario310}
        anoSeleccionado={2026}
        bimestreSeleccionado={2}
        onCambiarBimestre={vi.fn()}
        onExportarCsv={vi.fn()}
        onEnviarWhatsApp={vi.fn()}
        nombreNegocio="La Parada"
      />
    );

    expect(html).toContain('Declaración de Impoconsumo — Formulario 310 DIAN');
    expect(html).toContain('Total Saldo a Pagar en Bancos (Renglón 52)');
    expect(html).toContain('R28');
    expect(html).toContain('R31');
    expect(html).toContain('R40');
    expect(html).toContain('R52');
  });

  it('renderiza el componente ConciliacionCajaVentasCard con semáforo y detalle de arqueos', () => {
    const html = renderToStaticMarkup(
      <ConciliacionCajaVentasCard
        conciliacion={mockConciliacion}
        onExportarCsv={vi.fn()}
        onCerrarConciliacionMensual={vi.fn()}
      />
    );

    expect(html).toContain('Conciliación Contable de Ventas vs. Caja y Medios de Pago');
    expect(html).toContain('Conciliación Óptima');
    expect(html).toContain('Cuadrado');
    expect(html).toContain('Certificar Cierre Mensual');
  });

  it('renderiza el componente ExportarSoftwareContableCard con Siigo, World Office y Helisa', () => {
    const html = renderToStaticMarkup(
      <ExportarSoftwareContableCard
        asientos={[]}
        mapeoPuc={getMapeoPucDefault()}
        onGuardarMapeo={vi.fn()}
        onExportarSoftware={vi.fn()}
        nombreNegocio="La Parada"
      />
    );

    expect(html).toContain('Exportación Parametrizada para Software Contable');
    expect(html).toContain('Siigo Nube / Siigo Pyme');
    expect(html).toContain('World Office');
    expect(html).toContain('Helisa GW');
    expect(html).toContain('Libro Diario PUC (Excel / CSV)');
    expect(html).toContain('Configurar Cuentas PUC');
  });
});
