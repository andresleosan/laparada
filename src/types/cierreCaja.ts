import { Timestamp } from 'firebase/firestore';

/**
 * Conteo de denominaciones de moneda colombiana (COP)
 */
export interface DesgloseDenominaciones {
  // Billetes COP
  b100k?: number; // $100.000
  b50k?: number;  // $50.000
  b20k?: number;  // $20.000
  b10k?: number;  // $10.000
  b5k?: number;   // $5.000
  b2k?: number;   // $2.000
  // Monedas COP
  m1000?: number; // $1.000
  m500?: number;  // $500
  m200?: number;  // $200
  m100?: number;  // $100
  m50?: number;   // $50
}

export type EstadoCuadreCaja = 'cuadrado' | 'sobrante' | 'faltante';

/**
 * Resumen consolidado del arqueo físico de efectivo
 */
export interface ArqueoEfectivo {
  denominaciones: DesgloseDenominaciones;
  totalBilletes: number;
  totalMonedas: number;
  totalFisico: number;
  efectivoEsperado: number;
  diferencia: number; // totalFisico - efectivoEsperado
  estadoCuadre: EstadoCuadreCaja;
}

/**
 * Cierre de caja del día o turno
 */
export interface CierreCaja {
  id: string;
  fecha: Timestamp;
  totalIngresos: number;       // En COP, valor entero
  totalGastos: number;         // En COP, valor entero
  utilidadNeta: number;        // En COP, valor entero
  ventasPos: number;           // En COP, valor entero
  ventasWhatsapp: number;      // En COP, valor entero
  totalDescuentos?: number;    // En COP, valor total de descuentos y cortesías concedidos
  cantidadDescuentos?: number; // Cantidad de tickets con descuento aplicado
  totalAnuladas?: number;      // En COP, valor total de ventas anuladas en el turno
  cantidadAnuladas?: number;   // Cantidad de ventas anuladas en el turno
  notas?: string;              // Observaciones o notas de cierre
  negocioId: string;           // ID del negocio / tenant
  arqueo?: ArqueoEfectivo;     // Arqueo físico de billetes y monedas
  cajeroNombre?: string;       // Nombre del cajero o responsable
  efectivoInicial?: number;    // Base de caja inicial del día
  efectivoEsperado?: number;   // Saldo esperado en efectivo
  efectivoReal?: number;       // Saldo físico real contado
  diferenciaEfectivo?: number; // Diferencia (real - esperado)
}

