// src/types/descuento.ts

export type TipoDescuento = 'porcentaje' | 'monto_fijo' | 'cortesia_100';

export type MotivoDescuentoId =
  | 'cortesia_casa'
  | 'cliente_vip'
  | 'convenio_comercial'
  | 'compensacion_servicio'
  | 'promocion_dia'
  | 'staff_personal'
  | 'otro';

export interface MotivoDescuentoDef {
  id: MotivoDescuentoId;
  label: string;
  descripcion: string;
}

export interface DescuentoAplicado {
  tipo: TipoDescuento;
  valor: number; // Porcentaje (ej: 10) o monto COP (ej: 5000) o 100 para cortesía
  montoDescontadoCOP: number; // En COP, valor exacto restado del subtotal
  motivo: string; // Motivo descriptivo
  motivoId?: MotivoDescuentoId;
  autorizadoPor?: string; // Nombre del cajero o administrador
}

