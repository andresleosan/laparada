import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { BonoPrepago, MovimientoBono } from '@/types';
import { evaluarEstadoBono } from '@/utils/bonosUtils';
import { BonoCard } from '../BonoCard';
import { EmitirBonoModal } from '../EmitirBonoModal';
import { HistorialBonoModal } from '../HistorialBonoModal';
import { RecargarBonoModal } from '../RecargarBonoModal';
import { RedimirBonoSelector } from '../RedimirBonoSelector';
import { TarjetaBonoQrModal } from '../TarjetaBonoQrModal';

const bonoBase: BonoPrepago = {
  id: 'bono_laparada_BON-2026-ABCDEF',
  negocioId: 'laparada',
  codigo: 'BON-2026-ABCDEF',
  tipo: 'bono_regalo',
  titularNombre: 'Valentina Ríos',
  titularTelefono: '3105559988',
  compradorNombre: 'Mateo Díaz',
  mensajeRegalo: 'Disfruta tu cena',
  montoInicial: 100000,
  saldoActual: 65000,
  totalCargadoHistorico: 100000,
  totalRedimidoHistorico: 35000,
  cantidadRecargas: 0,
  cantidadRedenciones: 1,
  recargable: true,
  estado: 'activo',
  metodoPagoEmision: 'transferencia',
  fechaEmision: new Date('2026-11-01T15:00:00Z'),
  fechaVencimiento: new Date('2027-02-01T23:59:59Z'),
  creadoEn: new Date('2026-11-01T15:00:00Z'),
  actualizadoEn: new Date('2026-11-10T15:00:00Z'),
};

const movsDemo: MovimientoBono[] = [
  {
    id: 'm1',
    negocioId: 'laparada',
    bonoId: bonoBase.id,
    bonoCodigo: bonoBase.codigo,
    titularNombre: bonoBase.titularNombre,
    tipo: 'redencion',
    monto: 35000,
    saldoPrevio: 100000,
    saldoResultante: 65000,
    codigoComprobante: 'RED-2026-1010',
    origen: 'pos',
    fecha: new Date('2026-11-10T15:00:00Z'),
  },
];

describe('Componentes de Bonos y Tarjetas Prepago', () => {
  it('renderiza BonoCard con saldo, modalidad, QR y acciones táctiles', () => {
    const evaluacion = evaluarEstadoBono(bonoBase, new Date('2026-11-18T12:00:00Z'));
    const html = renderToStaticMarkup(
      <BonoCard
        fila={{ bono: bonoBase, evaluacion }}
        onVerQr={vi.fn()}
        onRecargar={vi.fn()}
        onVerHistorial={vi.fn()}
        onCompartirWhatsApp={vi.fn()}
        onToggleBloqueo={vi.fn()}
      />
    );

    expect(html).toContain('Valentina Ríos');
    expect(html).toContain('BON-2026-ABCDEF');
    expect(html).toContain('Bono de Regalo');
    expect(html).toContain('Recargar Saldo');
    expect(html).toContain('Auditoría');
  });

  it('renderiza EmitirBonoModal, RecargarBonoModal, TarjetaBonoQrModal e HistorialBonoModal', () => {
    const htmlEmitir = renderToStaticMarkup(
      <EmitirBonoModal isOpen={true} onClose={vi.fn()} onEmitir={vi.fn()} />
    );
    expect(htmlEmitir).toContain('Emitir Bono, Tarjeta Prepago o Vale');
    expect(htmlEmitir).toContain('Efectivo');
    expect(htmlEmitir).toContain('Transferencia');
    expect(htmlEmitir).toContain('Emisión 100% Offline');

    const htmlRecargar = renderToStaticMarkup(
      <RecargarBonoModal
        isOpen={true}
        bono={bonoBase}
        negocioNombre="La Parada"
        onClose={vi.fn()}
        onConfirmarRecarga={vi.fn()}
      />
    );
    expect(htmlRecargar).toContain('Recargar Saldo');
    expect(htmlRecargar).toContain('BON-2026-ABCDEF');

    const htmlQr = renderToStaticMarkup(
      <TarjetaBonoQrModal
        isOpen={true}
        bono={bonoBase}
        negocioNombre="La Parada"
        onClose={vi.fn()}
      />
    );
    expect(htmlQr).toContain('id="bono-tarjeta-impresion"');
    expect(htmlQr).toContain('BON-2026-ABCDEF');
    expect(htmlQr).toContain('Imprimir Vale');

    const htmlHist = renderToStaticMarkup(
      <HistorialBonoModal
        isOpen={true}
        bono={bonoBase}
        movimientos={movsDemo}
        onClose={vi.fn()}
        onCambiarEstado={vi.fn()}
      />
    );
    expect(htmlHist).toContain('RED-2026-1010');
    expect(htmlHist).toContain('Extender +30 días');
  });

  it('renderiza RedimirBonoSelector en POS/Mesas en estado sin selección y con bono aplicado', () => {
    const htmlSinSeleccion = renderToStaticMarkup(
      <RedimirBonoSelector
        bonos={[bonoBase]}
        totalOrden={50000}
        seleccionActual={null}
        onAplicarBono={vi.fn()}
      />
    );
    expect(htmlSinSeleccion).toContain('Redimir Bono / Prepago');
    expect(htmlSinSeleccion).toContain('BON-2026-ABCDEF');

    const htmlConSeleccion = renderToStaticMarkup(
      <RedimirBonoSelector
        bonos={[bonoBase]}
        totalOrden={80000}
        seleccionActual={{
          bono: bonoBase,
          evaluacion: {
            valido: true,
            saldoDisponible: 65000,
            montoAplicable: 65000,
            saldoRestanteBono: 0,
            excedentePorPagar: 15000,
            cubreTotal: false,
          },
          montoRedimir: 65000,
        }}
        onAplicarBono={vi.fn()}
      />
    );
    expect(htmlConSeleccion).toContain('Bono Aplicado');
    expect(htmlConSeleccion).toContain('Excedente');
  });
});
