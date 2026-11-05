import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TransferirMesaModal } from '../TransferirMesaModal';
import type { Mesa } from '@/types/mesa';

describe('TransferirMesaModal', () => {
  const mesaOrigenMock: Mesa = {
    id: 'm1',
    numero: 1,
    nombre: 'Mesa 1',
    capacidad: 4,
    zona: 'Salón Principal',
    estado: 'ocupada',
    cuentaActivaId: 'c1',
    comensales: 3,
    negocioId: 'test_tenant',
  };

  const mesasMock: Mesa[] = [
    mesaOrigenMock,
    {
      id: 'm2',
      numero: 2,
      nombre: 'Mesa 2',
      capacidad: 6,
      zona: 'Terraza',
      estado: 'libre',
      negocioId: 'test_tenant',
    },
    {
      id: 'm3',
      numero: 3,
      nombre: 'Mesa 3',
      capacidad: 4,
      zona: 'Salón Principal',
      estado: 'ocupada',
      cuentaActivaId: 'c3',
      negocioId: 'test_tenant',
    },
  ];

  it('no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <TransferirMesaModal
        isOpen={false}
        mesaActual={mesaOrigenMock}
        mesas={mesasMock}
        onClose={vi.fn()}
        onTransferir={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza cabecera, mesa origen y opciones de mesas libres', () => {
    const html = renderToStaticMarkup(
      <TransferirMesaModal
        isOpen={true}
        mesaActual={mesaOrigenMock}
        mesas={mesasMock}
        onClose={vi.fn()}
        onTransferir={vi.fn()}
      />
    );

    expect(html).toContain('Trasladar Mesa 1');
    expect(html).toContain('Mesa Origen:');
    expect(html).toContain('Mesa 2'); // Mesa libre en Terraza
    // Mesa 3 está ocupada, no debe aparecer como opción de destino
    expect(html).not.toContain('Mesa 3 · Cap');
  });

  it('muestra aviso si no hay mesas libres disponibles', () => {
    const soloOcupadas: Mesa[] = [mesaOrigenMock, mesasMock[2]];
    const html = renderToStaticMarkup(
      <TransferirMesaModal
        isOpen={true}
        mesaActual={mesaOrigenMock}
        mesas={soloOcupadas}
        onClose={vi.fn()}
        onTransferir={vi.fn()}
      />
    );

    expect(html).toContain('No hay otras mesas libres disponibles');
  });
});

