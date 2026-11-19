import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GastosPage } from '../GastosPage';
import { ControlCajaMenorCard } from '@/components/gastos/ControlCajaMenorCard';
import { RegistrarGastoModal } from '@/components/gastos/RegistrarGastoModal';

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada' },
    esSuperAdmin: false,
    usuarioNegocio: { nombre: 'Andrés', email: 'admin@laparada.co', rol: 'admin' },
  }),
}));

vi.mock('@/services/gastosService', () => ({
  getTodosGastos: vi.fn(async () => []),
  registrarGastoDetallado: vi.fn(),
  actualizarGasto: vi.fn(),
  eliminarGasto: vi.fn(),
}));

vi.mock('@/services/movimientosCajaService', () => ({
  getMovimientosCajaHoy: vi.fn(async () => []),
}));

vi.mock('@/components/ui/Toast', () => ({
  createToast: vi.fn(),
}));

describe('GastosPage & Componentes de Gastos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la cabecera, KPIs y control de Caja Menor en GastosPage', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <GastosPage />
      </MemoryRouter>
    );

    expect(html).toContain('Gastos Operativos &amp; Caja Menor');
    expect(html).toContain('Control de Caja Menor');
    expect(html).toContain('Servicios Públicos');
    expect(html).toContain('Arriendo');
    expect(html).toContain('Aseo');
    expect(html).toContain('Mantenimiento');
    expect(html).toContain('Transporte');
  });

  it('renderiza ControlCajaMenorCard con alerta de reposición cuando supera el 80%', () => {
    const html = renderToStaticMarkup(
      <ControlCajaMenorCard
        resumen={{
          fondoAsignadoCOP: 300000,
          totalEjecutadoGastos: 150000,
          totalEgresosMovimientosCaja: 110000,
          totalConsumidoCOP: 260000,
          saldoDisponibleCOP: 40000,
          porcentajeUso: 86.7,
          alertaReposicion: true,
          cantidadRegistros: 4,
        }}
      />
    );

    expect(html).toContain('Reponer Fondo (86.7%)');
    expect(html).toContain('Control de Caja Menor');
  });

  it('renderiza RegistrarGastoModal con los 4 orígenes de fondo offline', () => {
    const html = renderToStaticMarkup(
      <RegistrarGastoModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        responsableDefault="Andrés"
        guardando={false}
      />
    );

    expect(html).toContain('Registrar Gasto Operativo');
    expect(html).toContain('Caja del Turno (Efectivo)');
    expect(html).toContain('Fondo de Caja Menor');
    expect(html).toContain('Banco / Transferencia');
    expect(html).toContain('Efectivo Externo / Socio');
  });
});
