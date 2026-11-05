import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import type { Proveedor, FacturaCompra } from '@/types/proveedor';

const mockProveedores: Proveedor[] = [
  {
    id: 'prov-1',
    negocioId: 'laparada',
    nombre: 'Carnes Santander SAS',
    contacto: 'Don Carlos',
    telefono: '3123456789',
    categoria: 'carnes',
    diasCreditoHabitual: 15,
    activo: true,
    nit: '900.123.456-7',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
  {
    id: 'prov-2',
    negocioId: 'laparada',
    nombre: 'Panadería La Floresta',
    contacto: 'Doña Rosa',
    telefono: '3109876543',
    categoria: 'panaderia',
    diasCreditoHabitual: 7,
    activo: true,
    nit: '901.888.777-2',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
];

const mockFacturas: FacturaCompra[] = [
  {
    id: 'fac-1',
    negocioId: 'laparada',
    proveedorId: 'prov-1',
    proveedorNombre: 'Carnes Santander SAS',
    numeroFactura: 'FAC-1001',
    fechaEmision: Timestamp.now(),
    fechaVencimiento: Timestamp.now(),
    condicionPago: 'credito',
    estado: 'pendiente',
    items: [
      {
        descripcion: 'Carne de res molida',
        cantidad: 10,
        unidad: 'kg',
        costoUnitario: 25000,
        subtotal: 250000,
      },
    ],
    subtotal: 250000,
    total: 250000,
    montoPagado: 50000,
    saldoPendiente: 200000,
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  },
];

const mockUseProveedoresReturn = {
  proveedores: mockProveedores,
  facturas: mockFacturas,
  cargando: false,
  error: null,
  busqueda: '',
  setBusqueda: vi.fn(),
  filtroCategoria: 'todas',
  setFiltroCategoria: vi.fn(),
  filtroEstado: 'todas',
  setFiltroEstado: vi.fn(),
  metricas: {
    deudaTotal: 200000,
    totalVencido: 0,
    cantidadVencidas: 0,
    totalPorVencerSemana: 200000,
    cantidadPorVencerSemana: 1,
    totalPagadoMes: 50000,
    proveedoresActivos: 2,
  },
  totalesPorProveedor: {
    'prov-1': {
      totalComprado: 250000,
      saldoPendiente: 200000,
      facturasPendientes: 1,
    },
    'prov-2': {
      totalComprado: 0,
      saldoPendiente: 0,
      facturasPendientes: 0,
    },
  },
  facturasFiltradas: mockFacturas,
  proveedoresFiltrados: mockProveedores,
  crearProveedorAction: vi.fn(),
  actualizarProveedorAction: vi.fn(),
  eliminarProveedorAction: vi.fn(),
  crearFacturaAction: vi.fn(),
  registrarPagoAction: vi.fn(),
  anularFacturaAction: vi.fn(),
  exportarCsvAction: vi.fn(),
};

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioId: 'laparada',
    negocio: { id: 'laparada', nombre: 'La Parada Hamburguesas' },
    usuarioNegocio: { uid: 'admin-1', nombre: 'Andrés Admin', rol: 'admin' },
    esSuperAdmin: false,
  }),
}));

vi.mock('@/hooks/useProveedores', () => ({
  useProveedores: () => mockUseProveedoresReturn,
}));

vi.mock('@/hooks/useInventario', () => ({
  useInventario: () => ({
    insumos: [],
    loading: false,
  }),
}));

vi.mock('@/services/firebase', () => ({ auth: null, db: {} }));

import { ProveedoresPage } from '../ProveedoresPage';

describe('ProveedoresPage', () => {
  it('renderiza la cabecera principal, KPIs de deuda y pestañas de navegación', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/proveedores">
        <ProveedoresPage />
      </StaticRouter>
    );

    expect(html).toContain('Proveedores y Cuentas por Pagar');
    expect(html).toContain('Deuda Total Pendiente');
    expect(html).toContain('Vencidas (En Mora)');
    expect(html).toContain('Por Vencer (7 días)');
    expect(html).toContain('Proveedores Aliados');
    expect(html).toContain('+ Nuevo Proveedor');
    expect(html).toContain('+ Registrar Compra');
    expect(html).toContain('Exportar CSV');
  });

  it('muestra las facturas filtradas y sus acciones', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/proveedores">
        <ProveedoresPage />
      </StaticRouter>
    );

    expect(html).toContain('FAC-1001');
    expect(html).toContain('Carnes Santander SAS');
    expect(html).toContain('Abonar / Pagar');
    expect(html).toContain('Detalle');
  });
});
