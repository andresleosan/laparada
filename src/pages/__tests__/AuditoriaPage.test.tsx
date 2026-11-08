import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Timestamp } from 'firebase/firestore';

vi.mock('@/hooks/useAuditoria', () => ({
  useAuditoria: () => ({
    todosEventos: [],
    eventosFiltrados: [
      {
        id: 'ev_test_1',
        negocioId: 'laparada',
        categoria: 'anulacion_venta',
        severidad: 'critica',
        titulo: 'Venta Anulada #998877',
        descripcion: 'Baja controlada de ticket por $65.000',
        motivo: 'Pedido duplicado en mostrador',
        montoImpacto: 65000,
        responsableNombre: 'Andrés Admin',
        responsableRol: 'admin',
        entidadTipo: 'venta',
        referenciaId: 'venta_998877',
        codigoVisible: '#998877',
        fecha: Timestamp.fromDate(new Date('2026-11-07T20:00:00Z')),
        origenRegistro: 'bitacora_inmutable',
        huellaForense: 'AUD-7F3E-91A2',
      },
    ],
    metricas: {
      totalEventos: 1,
      eventosCriticosYAltos: 1,
      impactoFinancieroTotal: 65000,
      totalAnulacionesCOP: 65000,
      cantidadAnulaciones: 1,
      totalCortesiasYDescuentosCOP: 0,
      cantidadCortesiasYDescuentos: 0,
      totalMermasCOP: 0,
      cantidadMermas: 0,
      cantidadAjustesStock: 0,
      cantidadCancelacionesComanda: 0,
      totalDescuadresCajaCOP: 0,
      cantidadDescuadresCaja: 0,
      cantidadAccesosPersonal: 0,
      nivelRiesgo: 'moderado',
      porcentajeInmutable: 100,
    },
    responsablesUnicos: ['Andrés Admin'],
    filtros: {
      busqueda: '',
      categoria: 'todas',
      severidad: 'todas',
      responsable: 'todos',
      rangoFecha: '30dias',
      soloImpactoFinanciero: false,
    },
    loading: false,
    error: null,
    actualizarFiltro: vi.fn(),
    limpiarFiltros: vi.fn(),
    registrarIncidenteManual: vi.fn(),
    exportarCSV: vi.fn(),
    compartirWhatsApp: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import { AuditoriaPage } from '../AuditoriaPage';

describe('AuditoriaPage', () => {
  it('renderiza el Centro de Auditoría, semáforo de riesgo, KPIs forenses y tarjetas con huella inmutable', () => {
    const html = renderToStaticMarkup(<AuditoriaPage />);

    expect(html).toContain('Centro de Auditoría &amp; Bitácora Forense');
    expect(html).toContain('Semáforo Forense: Atención Preventiva');
    expect(html).toContain('AUD-7F3E-91A2');
    expect(html).toContain('Venta Anulada #998877');
    expect(html).toContain('Pedido duplicado en mostrador');
    expect(html).toContain('Exportar Excel (CSV)');
    expect(html).toContain('Registrar Acta');
  });
});
