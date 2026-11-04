import type {
  CuentaMesa,
  DivisionCuentaResultado,
  EstadoMesa,
  Mesa,
  RondaComanda,
} from '@/types/mesa';
import type { ItemVenta } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { formatearModificadoresYNotas } from './propinasYModificadores';

/**
 * Agrupa y consolida todos los ítems de varias rondas sumando cantidades y subtotales.
 * Preserva modificadores y notas de cocina diferenciados (ej. Términos o exclusiones distintos).
 */
export function calcularConsolidadoItems(rondas: RondaComanda[]): ItemVenta[] {
  if (!Array.isArray(rondas) || rondas.length === 0) return [];

  const mapa = new Map<string, ItemVenta>();

  for (const ronda of rondas) {
    if (!Array.isArray(ronda.items)) continue;
    for (const item of ronda.items) {
      const modsKey = Array.isArray(item.modificadores) && item.modificadores.length > 0
        ? [...item.modificadores].sort().join('|')
        : '';
      const notasKey = (item.notas || '').trim().toLowerCase();
      const clave = `${item.tipo}_${item.referenciaId}_${modsKey}_${notasKey}`;
      const existente = mapa.get(clave);

      if (existente) {
        existente.cantidad += item.cantidad;
        existente.subtotal += item.subtotal;
      } else {
        mapa.set(clave, {
          tipo: item.tipo,
          referenciaId: item.referenciaId,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
          ...(item.modificadores && item.modificadores.length > 0 ? { modificadores: [...item.modificadores] } : {}),
          ...(item.notas && item.notas.trim() ? { notas: item.notas.trim() } : {}),
        });
      }
    }
  }

  return Array.from(mapa.values());
}

/**
 * Calcula el total en COP asegurando que no existan valores negativos ni NaN.
 */
export function calcularTotalCuenta(items: ItemVenta[]): number {
  if (!Array.isArray(items)) return 0;
  const total = items.reduce((sum, it) => sum + (Number.isFinite(it.subtotal) ? it.subtotal : 0), 0);
  return Math.max(0, Math.round(total));
}

/**
 * Divide la cuenta en partes iguales entre el número de comensales.
 * Si hay residuo indivisible, se indica explícitamente en COP.
 */
export function dividirCuentaEnPartesIguales(
  total: number,
  comensales: number
): DivisionCuentaResultado {
  const personas = Math.max(1, Math.floor(comensales || 1));
  const totalSeguro = Math.max(0, Math.round(total || 0));
  const montoPorPersona = Math.floor(totalSeguro / personas);
  const residuo = totalSeguro - montoPorPersona * personas;

  return {
    comensales: personas,
    totalOriginal: totalSeguro,
    montoPorPersona,
    residuo,
  };
}

export interface FiltroMesasOptions {
  estado?: EstadoMesa | 'todas';
  zona?: string;
  busqueda?: string;
}

/**
 * Filtra el listado de mesas según estado, zona y texto de búsqueda.
 */
export function filtrarMesas(mesas: Mesa[], filtro: FiltroMesasOptions): Mesa[] {
  if (!Array.isArray(mesas)) return [];

  const estadoFiltro = filtro.estado || 'todas';
  const zonaFiltro = filtro.zona && filtro.zona !== 'todas' ? filtro.zona.trim().toLowerCase() : null;
  const busqueda = (filtro.busqueda || '').trim().toLowerCase();

  return mesas.filter((mesa) => {
    // Filtro por estado
    if (estadoFiltro !== 'todas' && mesa.estado !== estadoFiltro) {
      return false;
    }

    // Filtro por zona
    if (zonaFiltro && (mesa.zona || '').trim().toLowerCase() !== zonaFiltro) {
      return false;
    }

    // Filtro por búsqueda textual
    if (busqueda) {
      const matchNumero = String(mesa.numero).includes(busqueda);
      const matchNombre = (mesa.nombre || '').toLowerCase().includes(busqueda);
      const matchMesero = (mesa.mesero || '').toLowerCase().includes(busqueda);
      const matchZona = (mesa.zona || '').toLowerCase().includes(busqueda);

      if (!matchNumero && !matchNombre && !matchMesero && !matchZona) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Obtiene la configuración visual del badge de estado de la mesa.
 */
export function getBadgeEstadoMesa(estado: EstadoMesa): {
  label: string;
  colorClass: string;
  dotClass: string;
  borderClass: string;
} {
  switch (estado) {
    case 'libre':
      return {
        label: 'Libre',
        colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        dotClass: 'bg-emerald-400',
        borderClass: 'border-emerald-500/40 hover:border-emerald-400',
      };
    case 'ocupada':
      return {
        label: 'Ocupada',
        colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dotClass: 'bg-amber-400',
        borderClass: 'border-amber-500/50 hover:border-amber-400',
      };
    case 'por_cobrar':
      return {
        label: 'Por Cobrar',
        colorClass: 'bg-yellow-400 text-neutral-950 font-bold border-yellow-300 shadow-sm',
        dotClass: 'bg-neutral-950',
        borderClass: 'border-yellow-400 hover:border-yellow-300 ring-2 ring-yellow-400/40 animate-pulse',
      };
    default:
      return {
        label: 'Desconocido',
        colorClass: 'bg-neutral-800 text-neutral-300 border-neutral-700',
        dotClass: 'bg-neutral-400',
        borderClass: 'border-neutral-800',
      };
  }
}

/**
 * Genera el texto con formato monoespaciado de la Pre-Cuenta (comanda de control de mesa).
 */
export function generarTextoPrecuentaTicket(cuenta: CuentaMesa, negocioNombre: string): string {
  const lineas: string[] = [];
  const separador = '--------------------------------';

  lineas.push(negocioNombre.toUpperCase());
  lineas.push('PRE-CUENTA DE SALÓN');
  lineas.push(separador);
  lineas.push(`MESA: ${cuenta.mesaNombre.toUpperCase()}`);
  if (cuenta.mesero) lineas.push(`ATENDIDO POR: ${cuenta.mesero}`);
  if (cuenta.comensales) lineas.push(`COMENSALES: ${cuenta.comensales}`);
  if (cuenta.clienteNombre) lineas.push(`CLIENTE: ${cuenta.clienteNombre}`);
  lineas.push(`FECHA: ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`);
  lineas.push(separador);
  lineas.push('CANT  PRODUCTO             TOTAL');
  lineas.push(separador);

  for (const it of cuenta.items) {
    const cantStr = String(it.cantidad).padEnd(5, ' ');
    const nombreRecortado = it.nombre.slice(0, 15).padEnd(16, ' ');
    const totalStr = formatCOP(it.subtotal).padStart(10, ' ');
    lineas.push(`${cantStr}${nombreRecortado}${totalStr}`);
    const modsStr = formatearModificadoresYNotas(it);
    if (modsStr) {
      lineas.push(`     ${modsStr.slice(0, 26)}`);
    }
  }

  lineas.push(separador);
  lineas.push(`SUBTOTAL: ${formatCOP(cuenta.total)}`);
  if (typeof cuenta.propina === 'number' && cuenta.propina > 0) {
    lineas.push(`PROPINA SUGERIDA: ${formatCOP(cuenta.propina)}`);
    lineas.push(`TOTAL: ${formatCOP(cuenta.total + cuenta.propina)}`);
  } else {
    lineas.push(`TOTAL A PAGAR: ${formatCOP(cuenta.total)}`);
  }

  if (Array.isArray(cuenta.pagosParciales) && cuenta.pagosParciales.length > 0) {
    lineas.push(separador);
    lineas.push('PAGOS / ABONOS PARCIALES:');
    cuenta.pagosParciales.forEach((p, idx) => {
      lineas.push(`Abono #${idx + 1} (${p.clienteNombre || 'Comensal'}): -${formatCOP(p.monto)}`);
    });
    if (typeof cuenta.saldoPendiente === 'number') {
      lineas.push(`SALDO RESTANTE: ${formatCOP(cuenta.saldoPendiente)}`);
    }
  }

  lineas.push(separador);
  lineas.push('¡Gracias por su visita!');
  lineas.push('Este documento no es una factura fiscal.');

  return lineas.join('\n');
}

/**
 * Plantilla de mesas iniciales predeterminadas para un nuevo restaurante o puesto de comida.
 */
export function mesasDefaultIniciales(negocioId: string): Omit<Mesa, 'id'>[] {
  return [
    {
      numero: 1,
      nombre: 'Mesa 1',
      capacidad: 4,
      zona: 'Salón Principal',
      estado: 'libre',
      negocioId,
    },
    {
      numero: 2,
      nombre: 'Mesa 2',
      capacidad: 4,
      zona: 'Salón Principal',
      estado: 'libre',
      negocioId,
    },
    {
      numero: 3,
      nombre: 'Mesa 3',
      capacidad: 2,
      zona: 'Salón Principal',
      estado: 'libre',
      negocioId,
    },
    {
      numero: 4,
      nombre: 'Mesa 4',
      capacidad: 6,
      zona: 'Terraza',
      estado: 'libre',
      negocioId,
    },
    {
      numero: 5,
      nombre: 'Mesa 5',
      capacidad: 4,
      zona: 'Terraza',
      estado: 'libre',
      negocioId,
    },
    {
      numero: 6,
      nombre: 'Barra 1',
      capacidad: 2,
      zona: 'Barra',
      estado: 'libre',
      negocioId,
    },
  ];
}
