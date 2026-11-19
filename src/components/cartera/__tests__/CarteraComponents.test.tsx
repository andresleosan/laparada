import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Cliente, CuentaCorriente, MovimientoCartera } from '@/types';
import { CuentaCorrienteCard } from '../CuentaCorrienteCard';
import { ConfigurarCupoModal } from '../ConfigurarCupoModal';
import { RegistrarAbonoModal } from '../RegistrarAbonoModal';
import { EstadoCuentaModal } from '../EstadoCuentaModal';
import { evaluarEstadoCartera } from '@/utils/carteraUtils';

const cuentaDemo: CuentaCorriente = {
  id: 'cc_laparada_cli1',
  negocioId: 'laparada',
  clienteId: 'cli1',
  clienteNombre: 'Carlos Mendoza',
  clienteTelefono: '3105551234',
  empresa: 'Clínica Norte SAS',
  nit: '900123456-1',
  cupoCredito: 200000,
  saldoActual: 80000,
  plazoDias: 15,
  estado: 'activa',
  totalConsumosHistorico: 150000,
  totalAbonosHistorico: 70000,
  cantidadConsumos: 3,
  cantidadAbonos: 1,
  creadoEn: new Date('2026-10-01T12:00:00Z'),
  actualizadoEn: new Date('2026-11-01T12:00:00Z'),
};

const clienteDemo: Cliente = {
  id: 'cli1',
  negocioId: 'laparada',
  nombre: 'Carlos Mendoza',
  telefono: '3105551234',
  direcciones: [],
  totalPedidos: 5,
  totalConsumido: 250000,
  primerPedidoEn: new Date('2026-10-01T12:00:00Z'),
  ultimoPedidoEn: new Date('2026-11-10T12:00:00Z'),
  origenRegistro: 'pos',
  creadoEn: new Date('2026-10-01T12:00:00Z'),
  actualizadoEn: new Date('2026-11-10T12:00:00Z'),
};

const movDemo: MovimientoCartera = {
  id: 'mov1',
  negocioId: 'laparada',
  cuentaCorrienteId: cuentaDemo.id,
  clienteId: 'cli1',
  clienteNombre: 'Carlos Mendoza',
  clienteTelefono: '3105551234',
  tipo: 'consumo_credito',
  monto: 80000,
  saldoPrevio: 0,
  saldoResultante: 80000,
  codigoComprobante: 'FIA-2026-A1B2',
  origen: 'pos',
  fecha: new Date('2026-11-10T18:00:00Z'),
};

describe('Componentes de Cartera', () => {
  it('renderiza CuentaCorrienteCard con saldo, cupo, empresa y acciones accesibles', () => {
    const html = renderToStaticMarkup(
      <CuentaCorrienteCard
        fila={{ cuenta: cuentaDemo, evaluacion: evaluarEstadoCartera(cuentaDemo, [movDemo]) }}
        onRegistrarAbono={vi.fn()}
        onVerEstadoCuenta={vi.fn()}
        onConfigurarCupo={vi.fn()}
        onEnviarRecordatorioWhatsApp={vi.fn()}
      />
    );

    expect(html).toContain('Carlos Mendoza');
    expect(html).toContain('Clínica Norte SAS');
    expect(html).toContain('Registrar Abono');
    expect(html).toContain('Estado de Cuenta');
    expect(html).toContain('Configurar cupo de Carlos Mendoza');
  });

  it('renderiza ConfigurarCupoModal con opciones rápidas de cupo, plazo y estado', () => {
    const html = renderToStaticMarkup(
      <ConfigurarCupoModal
        isOpen
        clientes={[clienteDemo]}
        onClose={vi.fn()}
        onGuardar={vi.fn()}
      />
    );

    expect(html).toContain('Habilitar Cuenta Corriente');
    expect(html).toContain('Cupo Máximo Autorizado');
    expect(html).toContain('30 días');
    expect(html).toContain('Activa (Autorizada)');
    expect(html).toContain('Bloqueada (Sin Fiado)');
  });

  it('renderiza RegistrarAbonoModal con medios 100% offline (Efectivo y Transferencia)', () => {
    const html = renderToStaticMarkup(
      <RegistrarAbonoModal
        isOpen
        cuenta={cuentaDemo}
        negocioNombre="La Parada"
        onClose={vi.fn()}
        onConfirmarAbono={vi.fn()}
      />
    );

    expect(html).toContain('Registrar Abono a Cartera');
    expect(html).toContain('Recaudo 100% Offline');
    expect(html).toContain('Efectivo');
    expect(html).toContain('Transferencia');
    expect(html).toContain('100% Total');
  });

  it('renderiza EstadoCuentaModal con movimientos, CSV y enlace WhatsApp', () => {
    const html = renderToStaticMarkup(
      <EstadoCuentaModal
        isOpen
        cuenta={cuentaDemo}
        movimientos={[movDemo]}
        negocioNombre="La Parada"
        onClose={vi.fn()}
        onRegistrarAbono={vi.fn()}
      />
    );

    expect(html).toContain('Estado de Cuenta');
    expect(html).toContain('FIA-2026-A1B2');
    expect(html).toContain('https://wa.me/573105551234');
    expect(html).toContain('CSV');
  });
});
