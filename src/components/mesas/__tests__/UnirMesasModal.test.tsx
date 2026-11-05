import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { UnirMesasModal } from '../UnirMesasModal';
import type { CuentaMesa, Mesa } from '@/types/mesa';

describe('UnirMesasModal', () => {
  const mesaPrincipalMock: Mesa = {
    id: 'm1',
    numero: 1,
    nombre: 'Mesa 1',
    capacidad: 4,
    zona: 'Salón Principal',
    estado: 'ocupada',
    cuentaActivaId: 'c1',
    totalActual: 40000,
    comensales: 3,
    negocioId: 'test_tenant',
  };

  const cuentaPrincipalMock: CuentaMesa = {
    id: 'c1',
    mesaId: 'm1',
    mesaNumero: 1,
    mesaNombre: 'Mesa 1',
    negocioId: 'test_tenant',
    estado: 'abierta',
    comensales: 3,
    rondas: [],
    items: [],
    total: 40000,
    apertura: { seconds: 100, nanoseconds: 0 },
  };

  const mesasMock: Mesa[] = [
    mesaPrincipalMock,
    {
      id: 'm2',
      numero: 2,
      nombre: 'Mesa 2',
      capacidad: 4,
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
      totalActual: 25000,
      comensales: 2,
      negocioId: 'test_tenant',
    },
  ];

  it('no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <UnirMesasModal
        isOpen={false}
        mesaPrincipal={mesaPrincipalMock}
        cuentaPrincipal={cuentaPrincipalMock}
        mesas={mesasMock}
        onClose={vi.fn()}
        onUnirMesas={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza cabecera, mesa principal y lista de otras mesas ocupadas para fusionar', () => {
    const html = renderToStaticMarkup(
      <UnirMesasModal
        isOpen={true}
        mesaPrincipal={mesaPrincipalMock}
        cuentaPrincipal={cuentaPrincipalMock}
        mesas={mesasMock}
        onClose={vi.fn()}
        onUnirMesas={vi.fn()}
      />
    );

    expect(html).toContain('Unir Mesas en Salón');
    expect(html).toContain('Mesa Principal Receptora:');
    expect(html).toContain('Mesa 1');
    expect(html).toContain('Mesa 3'); // Mesa ocupada elegible
    // Mesa 2 está libre, no debe aparecer para unir
    expect(html).not.toContain('Mesa 2');
  });

  it('muestra aviso si no hay otras mesas ocupadas para fusionar', () => {
    const sinOtrasOcupadas: Mesa[] = [mesaPrincipalMock, mesasMock[1]];
    const html = renderToStaticMarkup(
      <UnirMesasModal
        isOpen={true}
        mesaPrincipal={mesaPrincipalMock}
        cuentaPrincipal={cuentaPrincipalMock}
        mesas={sinOtrasOcupadas}
        onClose={vi.fn()}
        onUnirMesas={vi.fn()}
      />
    );

    expect(html).toContain('No hay otras mesas ocupadas en este momento para unir');
  });
});

