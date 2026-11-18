import { useEffect, useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Minus,
  Package,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type {
  Combo,
  CotizacionComercial,
  CrearCotizacionInput,
  EstadoAnticipoCotizacion,
  EstadoCotizacion,
  Insumo,
  ItemCotizacion,
  ItemVenta,
  MetodoPago,
  ModalidadEntregaEvento,
  MovimientoKardex,
  Producto,
  TipoEventoCotizacion,
} from '@/types';
import {
  CONDICIONES_COMERCIALES_DEFAULT,
  MODALIDADES_ENTREGA_CATALOGO,
  SERVICIOS_EXTRA_CATERING_CATALOGO,
  TIPOS_EVENTO_CATALOGO,
  calcularTotalesCotizacion,
  obtenerFechaLocalYYYYMMDD,
  simularCostosYMargenCotizacion,
  sumarDiasFechaYYYYMMDD,
} from '@/utils/cotizacionesUtils';
import { formatCOP } from '@/utils/formatCOP';

export interface CotizacionFormPrefill {
  clienteNombre?: string;
  clienteTelefono?: string;
  direccionEvento?: string;
  barrioEvento?: string;
  items?: ItemVenta[];
}

export interface CotizacionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (input: CrearCotizacionInput, cotizacionId?: string) => Promise<void>;
  cotizacionEditar?: CotizacionComercial | null;
  codigoSugerido: string;
  productos: Producto[];
  combos: Combo[];
  insumos: Insumo[];
  movimientosKardex?: MovimientoKardex[];
  prefillPos?: CotizacionFormPrefill | null;
  responsableNombre?: string;
  guardando?: boolean;
}

function convertirItemsVentaACotizacion(items: ItemVenta[]): ItemCotizacion[] {
  return (items || []).map((item, idx) => ({
    id: `pos_${idx}_${Date.now()}`,
    tipo: item.tipo === 'combo' ? 'combo' : 'producto',
    referenciaId: item.referenciaId,
    nombre: item.nombre,
    cantidad: Math.max(1, Math.floor(Number(item.cantidad) || 1)),
    precioUnitario: Math.max(0, Math.round(Number(item.precioUnitario) || 0)),
    subtotal: Math.max(0, Math.round(Number(item.subtotal) || 0)),
    ...(item.modificadores && item.modificadores.length > 0
      ? { modificadores: item.modificadores }
      : {}),
    ...(item.notas ? { notas: item.notas } : {}),
    ...(item.eleccionesCombo && item.eleccionesCombo.length > 0
      ? { eleccionesCombo: item.eleccionesCombo }
      : {}),
  }));
}

export function CotizacionFormModal({
  isOpen,
  onClose,
  onGuardar,
  cotizacionEditar = null,
  codigoSugerido,
  productos,
  combos,
  insumos,
  movimientosKardex = [],
  prefillPos = null,
  responsableNombre = 'Administrador',
  guardando = false,
}: CotizacionFormModalProps) {
  const titleId = `cotizacion-form-${useId().replace(/:/g, '')}`;

  const [clienteNombre, setClienteNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [nitEmpresa, setNitEmpresa] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [tipoEvento, setTipoEvento] = useState<TipoEventoCotizacion>('corporativo');
  const [modalidadEntrega, setModalidadEntrega] =
    useState<ModalidadEntregaEvento>('domicilio_evento');
  const [fechaEvento, setFechaEvento] = useState(() => sumarDiasFechaYYYYMMDD(3));
  const [horaEvento, setHoraEvento] = useState('12:30');
  const [fechaVencimiento, setFechaVencimiento] = useState(() => sumarDiasFechaYYYYMMDD(7));
  const [invitados, setInvitados] = useState('25');
  const [direccionEvento, setDireccionEvento] = useState('');
  const [barrioEvento, setBarrioEvento] = useState('');
  const [notasEvento, setNotasEvento] = useState('');
  const [condicionesComerciales, setCondicionesComerciales] = useState(
    CONDICIONES_COMERCIALES_DEFAULT
  );
  const [estado, setEstado] = useState<Exclude<EstadoCotizacion, 'convertida'>>('borrador');

  const [items, setItems] = useState<ItemCotizacion[]>([]);
  const [modoDescuento, setModoDescuento] = useState<'cop' | 'pct'>('pct');
  const [descuentoValor, setDescuentoValor] = useState('0');
  const [descuentoMotivo, setDescuentoMotivo] = useState('');
  const [costoLogistica, setCostoLogistica] = useState('0');

  const [anticipoMonto, setAnticipoMonto] = useState('0');
  const [anticipoMetodo, setAnticipoMetodo] = useState<MetodoPago>('transferencia');
  const [anticipoEstado, setAnticipoEstado] =
    useState<EstadoAnticipoCotizacion>('sin_anticipo');
  const [anticipoReferencia, setAnticipoReferencia] = useState('');

  // Buscador del armador de ítems
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  const [tabCatalogo, setTabCatalogo] = useState<'productos' | 'combos' | 'extras'>('productos');
  const [extraNombre, setExtraNombre] = useState('');
  const [extraPrecio, setExtraPrecio] = useState('');
  const [extraCosto, setExtraCosto] = useState('');
  const [errorForm, setErrorForm] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorForm('');
    setBusquedaCatalogo('');

    if (cotizacionEditar) {
      setClienteNombre(cotizacionEditar.clienteNombre || '');
      setEmpresa(cotizacionEditar.empresa || '');
      setNitEmpresa(cotizacionEditar.nitEmpresa || '');
      setClienteTelefono(cotizacionEditar.clienteTelefono || '');
      setClienteEmail(cotizacionEditar.clienteEmail || '');
      setTipoEvento(cotizacionEditar.tipoEvento || 'corporativo');
      setModalidadEntrega(cotizacionEditar.modalidadEntrega || 'domicilio_evento');
      setFechaEvento(cotizacionEditar.fechaEvento || sumarDiasFechaYYYYMMDD(3));
      setHoraEvento(cotizacionEditar.horaEvento || '12:30');
      setFechaVencimiento(cotizacionEditar.fechaVencimiento || sumarDiasFechaYYYYMMDD(7));
      setInvitados(String(cotizacionEditar.invitados || 20));
      setDireccionEvento(cotizacionEditar.direccionEvento || '');
      setBarrioEvento(cotizacionEditar.barrioEvento || '');
      setNotasEvento(cotizacionEditar.notasEvento || '');
      setCondicionesComerciales(
        cotizacionEditar.condicionesComerciales || CONDICIONES_COMERCIALES_DEFAULT
      );
      setEstado(
        cotizacionEditar.estado === 'convertida' ? 'aprobada' : cotizacionEditar.estado
      );
      setItems(cotizacionEditar.items || []);

      if (cotizacionEditar.descuentoPorcentaje && cotizacionEditar.descuentoPorcentaje > 0) {
        setModoDescuento('pct');
        setDescuentoValor(String(cotizacionEditar.descuentoPorcentaje));
      } else {
        setModoDescuento('cop');
        setDescuentoValor(String(cotizacionEditar.descuento || 0));
      }
      setDescuentoMotivo(cotizacionEditar.descuentoMotivo || '');
      setCostoLogistica(String(cotizacionEditar.costoLogistica || 0));
      setAnticipoMonto(String(cotizacionEditar.anticipoMonto || 0));
      setAnticipoMetodo(cotizacionEditar.anticipoMetodo || 'transferencia');
      setAnticipoEstado(cotizacionEditar.anticipoEstado || 'sin_anticipo');
      setAnticipoReferencia(cotizacionEditar.anticipoReferencia || '');
      return;
    }

    // Nueva cotización (o precargada desde el ticket POS)
    setClienteNombre(prefillPos?.clienteNombre || '');
    setEmpresa('');
    setNitEmpresa('');
    setClienteTelefono(prefillPos?.clienteTelefono || '');
    setClienteEmail('');
    setTipoEvento('corporativo');
    setModalidadEntrega(prefillPos?.direccionEvento ? 'domicilio_evento' : 'recoger_local');
    setFechaEvento(sumarDiasFechaYYYYMMDD(3));
    setHoraEvento('12:30');
    setFechaVencimiento(sumarDiasFechaYYYYMMDD(7));
    setInvitados('25');
    setDireccionEvento(prefillPos?.direccionEvento || '');
    setBarrioEvento(prefillPos?.barrioEvento || '');
    setNotasEvento('');
    setCondicionesComerciales(CONDICIONES_COMERCIALES_DEFAULT);
    setEstado('borrador');
    setItems(prefillPos?.items ? convertirItemsVentaACotizacion(prefillPos.items) : []);
    setModoDescuento('pct');
    setDescuentoValor('0');
    setDescuentoMotivo('');
    setCostoLogistica('0');
    setAnticipoMonto('0');
    setAnticipoMetodo('transferencia');
    setAnticipoEstado('sin_anticipo');
    setAnticipoReferencia('');
  }, [isOpen, cotizacionEditar, prefillPos]);

  const descuentoNum = Math.max(0, Number(descuentoValor) || 0);
  const costoLogisticaNum = Math.max(0, Math.round(Number(costoLogistica) || 0));
  const invitadosNum = Math.max(1, Math.floor(Number(invitados) || 1));
  const anticipoNum = Math.max(0, Math.round(Number(anticipoMonto) || 0));

  const simulacion = useMemo(
    () =>
      simularCostosYMargenCotizacion({
        items,
        productos,
        combos,
        insumos,
        movimientosKardex,
        descuento: modoDescuento === 'cop' ? descuentoNum : undefined,
        descuentoPorcentaje: modoDescuento === 'pct' ? descuentoNum : undefined,
        costoLogistica: costoLogisticaNum,
        invitados: invitadosNum,
      }),
    [
      items,
      productos,
      combos,
      insumos,
      movimientosKardex,
      modoDescuento,
      descuentoNum,
      costoLogisticaNum,
      invitadosNum,
    ]
  );

  const totales = useMemo(
    () =>
      calcularTotalesCotizacion({
        items,
        descuento: modoDescuento === 'cop' ? descuentoNum : undefined,
        descuentoPorcentaje: modoDescuento === 'pct' ? descuentoNum : undefined,
        costoLogistica: costoLogisticaNum,
        anticipoMonto: anticipoNum,
        anticipoEstado: anticipoNum > 0 && anticipoEstado === 'sin_anticipo' ? 'pendiente' : anticipoEstado,
      }),
    [items, modoDescuento, descuentoNum, costoLogisticaNum, anticipoNum, anticipoEstado]
  );

  const productosFiltrados = useMemo(() => {
    const q = busquedaCatalogo.trim().toLowerCase();
    return (productos || [])
      .filter((p) => p.disponible !== false)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q))
      .slice(0, 18);
  }, [productos, busquedaCatalogo]);

  const combosFiltrados = useMemo(() => {
    const q = busquedaCatalogo.trim().toLowerCase();
    return (combos || [])
      .filter((c) => c.disponible !== false)
      .filter((c) => !q || c.nombre.toLowerCase().includes(q))
      .slice(0, 18);
  }, [combos, busquedaCatalogo]);

  if (!isOpen) return null;

  const agregarItemCatalogo = (
    tipo: 'producto' | 'combo',
    refId: string,
    nombre: string,
    precioUnitario: number,
    cantidadInicial = 1
  ) => {
    const cantAgregar = Math.max(1, Math.floor(cantidadInicial));
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.tipo === tipo && it.referenciaId === refId);
      if (idx >= 0) {
        return prev.map((it, i) => {
          if (i !== idx) return it;
          const nuevaCant = it.cantidad + cantAgregar;
          return {
            ...it,
            cantidad: nuevaCant,
            subtotal: nuevaCant * it.precioUnitario,
          };
        });
      }
      return [
        ...prev,
        {
          id: `${tipo}_${refId}_${Date.now()}`,
          tipo,
          referenciaId: refId,
          nombre,
          cantidad: cantAgregar,
          precioUnitario: Math.round(precioUnitario),
          subtotal: cantAgregar * Math.round(precioUnitario),
        },
      ];
    });
  };

  const agregarServicioExtra = (nombre: string, precio: number, costo: number) => {
    const limpio = nombre.trim();
    if (!limpio) return;
    const precioInt = Math.max(0, Math.round(precio));
    const costoInt = Math.max(0, Math.round(costo));
    setItems((prev) => [
      ...prev,
      {
        id: `extra_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        tipo: 'servicio_extra',
        nombre: limpio,
        cantidad: 1,
        precioUnitario: precioInt,
        subtotal: precioInt,
        ...(costoInt > 0 ? { costoUnitarioEstimado: costoInt } : {}),
      },
    ]);
  };

  const actualizarCantidadItem = (itemId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      setItems((prev) => prev.filter((it) => it.id !== itemId));
      return;
    }
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              cantidad: Math.floor(nuevaCantidad),
              subtotal: Math.floor(nuevaCantidad) * it.precioUnitario,
            }
          : it
      )
    );
  };

  const actualizarPrecioItem = (itemId: string, nuevoPrecio: number) => {
    const precioSeguro = Math.max(0, Math.round(nuevoPrecio || 0));
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              precioUnitario: precioSeguro,
              subtotal: it.cantidad * precioSeguro,
            }
          : it
      )
    );
  };

  const aplicarAnticipo50Pct = () => {
    const sugerido = Math.round(totales.totalCotizado * 0.5);
    setAnticipoMonto(String(sugerido));
    if (anticipoEstado === 'sin_anticipo' && sugerido > 0) {
      setAnticipoEstado('pendiente');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm('');

    if (items.length === 0) {
      setErrorForm('Agrega al menos un producto, combo o servicio para armar la propuesta.');
      return;
    }
    if (anticipoNum > totales.totalCotizado) {
      setErrorForm('El anticipo no puede superar el total cotizado de la propuesta.');
      return;
    }

    const input: CrearCotizacionInput = {
      codigo: cotizacionEditar?.codigo || codigoSugerido,
      clienteNombre: clienteNombre.trim(),
      empresa: empresa.trim() || undefined,
      nitEmpresa: nitEmpresa.trim() || undefined,
      clienteTelefono: clienteTelefono.trim(),
      clienteEmail: clienteEmail.trim() || undefined,
      tipoEvento,
      modalidadEntrega,
      fechaEvento,
      horaEvento: horaEvento.trim() || undefined,
      fechaVencimiento,
      invitados: invitadosNum,
      direccionEvento: direccionEvento.trim() || undefined,
      barrioEvento: barrioEvento.trim() || undefined,
      notasEvento: notasEvento.trim() || undefined,
      condicionesComerciales: condicionesComerciales.trim() || undefined,
      items,
      descuento: modoDescuento === 'cop' ? descuentoNum : totales.descuento,
      descuentoPorcentaje: modoDescuento === 'pct' && descuentoNum > 0 ? descuentoNum : undefined,
      descuentoMotivo: descuentoMotivo.trim() || undefined,
      costoLogistica: costoLogisticaNum,
      costoEstimadoInsumos: simulacion.costoTotalEstimadoCOP,
      utilidadEstimada: simulacion.utilidadBrutaCOP,
      margenEstimadoPct: simulacion.margenBrutoPct,
      anticipoMonto: anticipoNum,
      anticipoMetodo: anticipoNum > 0 ? anticipoMetodo : undefined,
      anticipoEstado:
        anticipoNum === 0
          ? 'sin_anticipo'
          : anticipoEstado === 'sin_anticipo'
            ? 'pendiente'
            : anticipoEstado,
      anticipoReferencia: anticipoReferencia.trim() || undefined,
      estado,
      responsableNombre,
    };

    try {
      await onGuardar(input, cotizacionEditar?.id);
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar la cotización.');
    }
  };

  const rentabilidadBadge =
    simulacion.nivelRentabilidad === 'optimo'
      ? {
          label: 'Margen Óptimo (≥ 55%)',
          classes: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
        }
      : simulacion.nivelRentabilidad === 'aceptable'
        ? {
            label: 'Margen Aceptable (35–54%)',
            classes: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
          }
        : simulacion.nivelRentabilidad === 'riesgo'
          ? {
              label: 'Margen en Riesgo (< 35%)',
              classes: 'border-red-500/40 bg-red-500/15 text-red-300',
            }
          : {
              label: 'Sin Costeo de Receta',
              classes: 'border-neutral-700 bg-neutral-800 text-neutral-300',
            };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      canClose={!guardando}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-sm"
    >
      <div className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-[#0A0A0A] text-white shadow-2xl">
        {/* Cabecera */}
        <header className="flex items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold-400/40 bg-gold-400/15 text-gold-400">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id={titleId} className="font-display text-lg sm:text-xl font-black text-white truncate">
                  {cotizacionEditar ? 'Editar Propuesta Comercial' : 'Nueva Cotización & Catering'}
                </h2>
                <span className="rounded-lg border border-gold-400/40 bg-gold-400/10 px-2 py-0.5 font-mono text-xs font-bold text-gold-400">
                  {cotizacionEditar?.codigo || codigoSugerido}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Arma la propuesta comercial y simula costos de insumos, stock en bodega y margen del evento en vivo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar armador de cotización"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Cuerpo en dos columnas */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            {/* COLUMNA IZQUIERDA: Datos del Evento + Armador de Ítems */}
            <div className="space-y-5">
              {/* Sección 1: Cliente & Empresa */}
              <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-3">
                <h3 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-gold-400">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  1. Cliente / Empresa y Detalles del Evento
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">Nombre de Contacto *</span>
                    <input
                      type="text"
                      required
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="Ej: Laura Gómez"
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">WhatsApp / Teléfono *</span>
                    <input
                      type="tel"
                      required
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      placeholder="Ej: 3151234567"
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">Empresa / Organización (Opcional)</span>
                    <input
                      type="text"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      placeholder="Ej: Constructora Norte S.A.S."
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">NIT / Cédula (Opcional)</span>
                    <input
                      type="text"
                      value={nitEmpresa}
                      onChange={(e) => setNitEmpresa(e.target.value)}
                      placeholder="Ej: 901.234.567-8"
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">Tipo de Evento</span>
                    <select
                      value={tipoEvento}
                      onChange={(e) => setTipoEvento(e.target.value as TipoEventoCotizacion)}
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    >
                      {TIPOS_EVENTO_CATALOGO.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emoji} {t.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">Modalidad de Servicio</span>
                    <select
                      value={modalidadEntrega}
                      onChange={(e) =>
                        setModalidadEntrega(e.target.value as ModalidadEntregaEvento)
                      }
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    >
                      {MODALIDADES_ENTREGA_CATALOGO.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.shortLabel}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">Invitados Estimados *</span>
                    <div className="relative">
                      <Users className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                      <input
                        type="number"
                        min={1}
                        max={5000}
                        required
                        value={invitados}
                        onChange={(e) => setInvitados(e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-9 pr-3 text-sm font-bold text-white focus:border-gold-400 focus:outline-none"
                      />
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">Fecha del Evento *</span>
                    <input
                      type="date"
                      required
                      min={obtenerFechaLocalYYYYMMDD()}
                      value={fechaEvento}
                      onChange={(e) => setFechaEvento(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">Hora del Evento</span>
                    <input
                      type="time"
                      value={horaEvento}
                      onChange={(e) => setHoraEvento(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">Válida Hasta *</span>
                    <input
                      type="date"
                      required
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </label>
                </div>

                {modalidadEntrega === 'domicilio_evento' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs">
                      <span className="font-semibold text-neutral-300">Dirección / Sede del Evento</span>
                      <input
                        type="text"
                        value={direccionEvento}
                        onChange={(e) => setDireccionEvento(e.target.value)}
                        placeholder="Ej: Av. Libertadores #12-40, Salón Cristal"
                        className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="font-semibold text-neutral-300">Barrio / Sector</span>
                      <input
                        type="text"
                        value={barrioEvento}
                        onChange={(e) => setBarrioEvento(e.target.value)}
                        placeholder="Ej: Caobos / Quinta Oriental"
                        className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                      />
                    </label>
                  </div>
                )}
              </section>

              {/* Sección 2: Armador de Menú y Servicios */}
              <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-gold-400">
                    <Package className="h-4 w-4" aria-hidden="true" />
                    2. Armador de Menú & Servicios Catering
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { id: 'productos', label: 'Productos' },
                        { id: 'combos', label: 'Combos' },
                        { id: 'extras', label: 'Servicios Extra' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        aria-pressed={tabCatalogo === tab.id}
                        onClick={() => setTabCatalogo(tab.id)}
                        className={`min-h-[36px] rounded-lg border px-3 text-xs font-bold transition-colors ${
                          tabCatalogo === tab.id
                            ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                            : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {tabCatalogo !== 'extras' ? (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                      <input
                        type="text"
                        value={busquedaCatalogo}
                        onChange={(e) => setBusquedaCatalogo(e.target.value)}
                        placeholder={
                          tabCatalogo === 'productos'
                            ? 'Buscar producto para añadir a la propuesta...'
                            : 'Buscar combo para añadir...'
                        }
                        className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-9 pr-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                      />
                    </div>

                    <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {tabCatalogo === 'productos' &&
                        productosFiltrados.map((prod) => (
                          <div
                            key={prod.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-white">{prod.nombre}</p>
                              <p className="text-[11px] font-semibold text-gold-400">
                                {formatCOP(prod.precio)}
                                {prod.receta && prod.receta.length > 0 && (
                                  <span className="ml-1.5 text-[10px] text-emerald-400">
                                    · Escandallo
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  agregarItemCatalogo('producto', prod.id, prod.nombre, prod.precio, 1)
                                }
                                aria-label={`Agregar 1 unidad de ${prod.nombre}`}
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-gold-400/40 bg-gold-400/15 px-2.5 text-xs font-bold text-gold-300 hover:bg-gold-400 hover:text-black"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  agregarItemCatalogo(
                                    'producto',
                                    prod.id,
                                    prod.nombre,
                                    prod.precio,
                                    invitadosNum
                                  )
                                }
                                title={`Agregar 1 por invitado (${invitadosNum})`}
                                aria-label={`Agregar ${invitadosNum} unidades de ${prod.nombre}`}
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 px-2 text-[11px] font-bold text-neutral-200 hover:border-gold-400 hover:text-gold-300"
                              >
                                ×{invitadosNum}
                              </button>
                            </div>
                          </div>
                        ))}

                      {tabCatalogo === 'combos' &&
                        combosFiltrados.map((combo) => (
                          <div
                            key={combo.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-white">{combo.nombre}</p>
                              <p className="text-[11px] font-semibold text-gold-400">
                                {formatCOP(combo.precioEspecial)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  agregarItemCatalogo(
                                    'combo',
                                    combo.id,
                                    combo.nombre,
                                    combo.precioEspecial,
                                    1
                                  )
                                }
                                aria-label={`Agregar 1 combo ${combo.nombre}`}
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-gold-400/40 bg-gold-400/15 px-2.5 text-xs font-bold text-gold-300 hover:bg-gold-400 hover:text-black"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  agregarItemCatalogo(
                                    'combo',
                                    combo.id,
                                    combo.nombre,
                                    combo.precioEspecial,
                                    invitadosNum
                                  )
                                }
                                aria-label={`Agregar ${invitadosNum} combos ${combo.nombre}`}
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 px-2 text-[11px] font-bold text-neutral-200 hover:border-gold-400 hover:text-gold-300"
                              >
                                ×{invitadosNum}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {SERVICIOS_EXTRA_CATERING_CATALOGO.map((srv) => (
                        <button
                          key={srv.nombre}
                          type="button"
                          onClick={() =>
                            agregarServicioExtra(srv.nombre, srv.precioSugerido, srv.costoEstimado)
                          }
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:border-gold-400 hover:text-gold-300"
                        >
                          <Plus className="h-3.5 w-3.5 text-gold-400" />
                          <span>{srv.nombre}</span>
                          <span className="font-mono text-gold-400">
                            {formatCOP(srv.precioSugerido)}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
                      <input
                        type="text"
                        value={extraNombre}
                        onChange={(e) => setExtraNombre(e.target.value)}
                        placeholder="Servicio personalizado (ej: Decoración mesa)"
                        className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white focus:border-gold-400 focus:outline-none"
                      />
                      <input
                        type="number"
                        min={0}
                        value={extraPrecio}
                        onChange={(e) => setExtraPrecio(e.target.value)}
                        placeholder="Precio venta COP"
                        className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white focus:border-gold-400 focus:outline-none"
                      />
                      <input
                        type="number"
                        min={0}
                        value={extraCosto}
                        onChange={(e) => setExtraCosto(e.target.value)}
                        placeholder="Costo interno COP"
                        className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white focus:border-gold-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          agregarServicioExtra(
                            extraNombre,
                            Number(extraPrecio) || 0,
                            Number(extraCosto) || 0
                          );
                          setExtraNombre('');
                          setExtraPrecio('');
                          setExtraCosto('');
                        }}
                        className="min-h-[44px] rounded-xl bg-gold-400 px-4 text-xs font-black text-black hover:bg-gold-500"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                )}

                {/* Tabla de ítems agregados a la propuesta */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-semibold">
                      Ítems en la Propuesta ({items.length})
                    </span>
                    <span className="font-mono text-gold-400 font-bold">
                      Subtotal: {formatCOP(totales.subtotal)}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-700 bg-neutral-950/60 p-4 text-center text-xs text-neutral-400">
                      Selecciona productos, combos o servicios arriba para construir la cotización.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-white">
                              {item.nombre}
                              <span className="ml-1.5 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] uppercase text-neutral-400">
                                {item.tipo === 'servicio_extra' ? 'Servicio' : item.tipo}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => actualizarCantidadItem(item.id, item.cantidad - 1)}
                              aria-label={`Disminuir cantidad de ${item.nombre}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-gold-400"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={item.cantidad}
                              aria-label={`Cantidad de ${item.nombre}`}
                              onChange={(e) =>
                                actualizarCantidadItem(item.id, Number(e.target.value) || 1)
                              }
                              className="h-9 w-14 rounded-lg border border-neutral-700 bg-neutral-900 text-center text-xs font-bold text-white"
                            />
                            <button
                              type="button"
                              onClick={() => actualizarCantidadItem(item.id, item.cantidad + 1)}
                              aria-label={`Aumentar cantidad de ${item.nombre}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-gold-400"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>

                            <input
                              type="number"
                              min={0}
                              step={500}
                              value={item.precioUnitario}
                              aria-label={`Precio unitario de ${item.nombre}`}
                              onChange={(e) =>
                                actualizarPrecioItem(item.id, Number(e.target.value) || 0)
                              }
                              className="h-9 w-24 rounded-lg border border-neutral-700 bg-neutral-900 px-2 text-right font-mono text-xs text-gold-300"
                            />

                            <span className="w-24 text-right font-mono text-xs font-bold text-white">
                              {formatCOP(item.subtotal)}
                            </span>

                            <button
                              type="button"
                              onClick={() => actualizarCantidadItem(item.id, 0)}
                              aria-label={`Quitar ${item.nombre}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-900/60 bg-red-950/40 text-red-400 hover:bg-red-600 hover:text-white"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Sección 3: Descuento, Logística, Anticipo Offline y Notas */}
              <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-3">
                <h3 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-gold-400">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  3. Condiciones Comerciales & Anticipo 100% Offline
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-300">Descuento Volumen</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setModoDescuento('pct')}
                          aria-pressed={modoDescuento === 'pct'}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            modoDescuento === 'pct'
                              ? 'bg-gold-400 text-black'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoDescuento('cop')}
                          aria-pressed={modoDescuento === 'cop'}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            modoDescuento === 'cop'
                              ? 'bg-gold-400 text-black'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          COP
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={modoDescuento === 'pct' ? 100 : undefined}
                      value={descuentoValor}
                      onChange={(e) => setDescuentoValor(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>

                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">Logística / Transporte (COP)</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={costoLogistica}
                      onChange={(e) => setCostoLogistica(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </label>

                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">Estado Comercial</span>
                    <select
                      value={estado}
                      onChange={(e) =>
                        setEstado(e.target.value as Exclude<EstadoCotizacion, 'convertida'>)
                      }
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    >
                      <option value="borrador">Borrador</option>
                      <option value="enviada">Enviada al Cliente</option>
                      <option value="aprobada">Aprobada / Confirmada</option>
                      <option value="rechazada">Rechazada</option>
                    </select>
                  </label>
                </div>

                {/* Anticipo offline */}
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-300">
                      Anticipo Offline (Transferencia Bancaria / Nequi / Efectivo)
                    </span>
                    <button
                      type="button"
                      onClick={aplicarAnticipo50Pct}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30"
                    >
                      Sugerir 50% ({formatCOP(Math.round(totales.totalCotizado * 0.5))})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                    <label className="space-y-1 text-xs">
                      <span className="text-neutral-400">Monto Anticipo (COP)</span>
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={anticipoMonto}
                        onChange={(e) => setAnticipoMonto(e.target.value)}
                        className="min-h-[42px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-bold text-white"
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-neutral-400">Método Offline</span>
                      <select
                        value={anticipoMetodo}
                        onChange={(e) => setAnticipoMetodo(e.target.value as MetodoPago)}
                        className="min-h-[42px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-2.5 text-xs text-white"
                      >
                        <option value="transferencia">Transferencia</option>
                        <option value="efectivo">Efectivo</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-neutral-400">Estado Anticipo</span>
                      <select
                        value={anticipoEstado}
                        onChange={(e) =>
                          setAnticipoEstado(e.target.value as EstadoAnticipoCotizacion)
                        }
                        className="min-h-[42px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-2.5 text-xs text-white"
                      >
                        <option value="sin_anticipo">Sin anticipo</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="verificado">Verificado</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-neutral-400">Comprobante / Ref</span>
                      <input
                        type="text"
                        value={anticipoReferencia}
                        onChange={(e) => setAnticipoReferencia(e.target.value)}
                        placeholder="Ej: Nequi #88412"
                        className="min-h-[42px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-2.5 text-xs text-white"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">Notas del Evento / Cocina</span>
                    <textarea
                      rows={2}
                      value={notasEvento}
                      onChange={(e) => setNotasEvento(e.target.value)}
                      placeholder="Ej: Empacar en cajas de 20, salsas aparte, entregar en portería norte..."
                      className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2.5 text-xs text-white focus:border-gold-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="font-semibold text-neutral-300">Condiciones Comerciales</span>
                    <textarea
                      rows={2}
                      value={condicionesComerciales}
                      onChange={(e) => setCondicionesComerciales(e.target.value)}
                      className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-2.5 text-xs text-white focus:border-gold-400 focus:outline-none"
                    />
                  </label>
                </div>
              </section>
            </div>

            {/* COLUMNA DERECHA: Simulador Interno de Costos, Margen y Stock en Bodega */}
            <aside className="space-y-4">
              <div className="sticky top-0 rounded-2xl border border-gold-400/35 bg-neutral-950 p-4 space-y-4 shadow-xl">
                <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-gold-400" aria-hidden="true" />
                    <h3 className="font-display text-sm font-black uppercase tracking-wider text-white">
                      Simulador Financiero (Interno)
                    </h3>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${rentabilidadBadge.classes}`}
                  >
                    {rentabilidadBadge.label}
                  </span>
                </div>

                {/* Total comercial */}
                <div className="rounded-2xl border border-gold-400/30 bg-gradient-to-br from-gold-400/15 to-transparent p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Total Propuesta Comercial
                  </p>
                  <p className="mt-1 font-display text-3xl font-black text-gold-400">
                    {formatCOP(totales.totalCotizado)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-300">
                    <span>
                      Por invitado ({invitadosNum}):{' '}
                      <strong className="text-white">
                        {formatCOP(simulacion.precioPorInvitadoCOP)}
                      </strong>
                    </span>
                    {totales.anticipoAplicable > 0 && (
                      <span className="text-emerald-300 font-semibold">
                        Saldo: {formatCOP(totales.saldoPendiente)}
                      </span>
                    )}
                  </div>
                </div>

                {/* KPIs de Costo y Margen */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
                    <p className="text-[11px] text-neutral-400">Costo Insumos + Serv.</p>
                    <p className="mt-0.5 font-display text-lg font-black text-white">
                      {formatCOP(simulacion.costoTotalEstimadoCOP)}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      Food Cost: {simulacion.foodCostPct}% · {formatCOP(simulacion.costoPorInvitadoCOP)}/inv.
                    </p>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
                    <p className="text-[11px] text-neutral-400">Utilidad Bruta Est.</p>
                    <p
                      className={`mt-0.5 font-display text-lg font-black ${
                        simulacion.utilidadBrutaCOP >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {formatCOP(simulacion.utilidadBrutaCOP)}
                    </p>
                    <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                      <TrendingUp className="h-3 w-3" />
                      Margen Bruto: {simulacion.margenBrutoPct}%
                    </p>
                  </div>
                </div>

                {/* Explosión de Insumos de Bodega para el Evento */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300">
                      Requerimiento de Bodega ({simulacion.insumosRequeridos.length} insumos)
                    </span>
                    {simulacion.insumosConDeficit.length > 0 ? (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                        {simulacion.insumosConDeficit.length} con déficit
                      </span>
                    ) : simulacion.insumosRequeridos.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Stock cubierto
                      </span>
                    ) : null}
                  </div>

                  {simulacion.insumosRequeridos.length === 0 ? (
                    <p className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-400">
                      Los productos con escandallo configurado mostrarán aquí el consumo exacto y la disponibilidad en bodega.
                    </p>
                  ) : (
                    <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                      {simulacion.insumosRequeridos.map((ins) => (
                        <div
                          key={ins.insumoId}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                            ins.tieneStockSuficiente
                              ? 'border-neutral-800 bg-neutral-900/70 text-neutral-200'
                              : 'border-red-500/40 bg-red-950/30 text-red-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-bold">{ins.nombre}</p>
                            <p className="text-[10px] opacity-80">
                              Req: {ins.cantidadRequerida} {ins.unidad} · Bodega: {ins.stockActual}{' '}
                              {ins.unidad}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono text-xs font-bold">
                              {formatCOP(ins.costoTotalCOP)}
                            </p>
                            {!ins.tieneStockSuficiente && (
                              <p className="text-[10px] font-black text-red-300">
                                Faltan {ins.faltante} {ins.unidad}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {simulacion.itemsSinCosteo.length > 0 && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5 text-[11px] text-amber-200">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                      <span>
                        Sin receta/costo de referencia: {simulacion.itemsSinCosteo.slice(0, 3).join(', ')}
                        {simulacion.itemsSinCosteo.length > 3
                          ? ` (+${simulacion.itemsSinCosteo.length - 3})`
                          : ''}
                        .
                      </span>
                    </div>
                  )}

                  <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <Sparkles className="h-3.5 w-3.5 text-gold-400 shrink-0" />
                    Los costos y márgenes son 100% privados y nunca se muestran al cliente en WhatsApp ni PDF.
                  </p>
                </div>

                {errorForm && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/50 bg-red-950/50 p-3 text-xs font-semibold text-red-200"
                  >
                    {errorForm}
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={guardando}
                    className="min-h-[48px] w-full rounded-xl bg-gold-400 px-4 text-sm font-black text-black transition-colors hover:bg-gold-500 disabled:opacity-50"
                  >
                    {guardando
                      ? 'Guardando propuesta...'
                      : cotizacionEditar
                        ? 'Guardar Cambios de Cotización'
                        : 'Crear Cotización Comercial'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={guardando}
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-xs font-bold text-neutral-300 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
