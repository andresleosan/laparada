export type MotivoAnulacionVenta =
  | 'error_digitacion'
  | 'cliente_cancelo'
  | 'plato_devuelto'
  | 'cambio_metodo_pago'
  | 'pedido_duplicado'
  | 'otro';

export interface MotivoAnulacionDef {
  id: MotivoAnulacionVenta;
  label: string;
  descripcion: string;
}

export interface DatosAnulacionVenta {
  motivo: MotivoAnulacionVenta;
  motivoPersonalizado?: string;
  notas?: string;
  revertirStock: boolean;
  usuarioNombre?: string;
}
