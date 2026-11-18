import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type {
  Combo,
  ModalidadEntregaEvento,
  Producto,
  TipoEventoCotizacion,
} from '@/types';
import {
  CONDICIONES_COMERCIALES_DEFAULT,
  MODALIDADES_ENTREGA_CATALOGO,
  SERVICIOS_EXTRA_CATERING_CATALOGO,
  TIPOS_EVENTO_CATALOGO,
  formatearModalidadEntrega,
  formatearTipoEvento,
} from '@/utils/cotizacionesUtils';
import { formatCOP } from '@/utils/formatCOP';
import { generarUrlWhatsAppReserva } from '@/utils/reservasUtils';

export interface StorefrontCotizacionEventoModalProps {
  isOpen: boolean;
  onClose: () => void;
  negocioNombre: string;
  negocioTelefono?: string;
  productos?: Producto[];
  combos?: Combo[];
}

export interface ItemSeleccionadoCotizacionPublica {
  id: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  esServicioExtra?: boolean;
}

export interface SolicitudCotizacionEventoConfirmada {
  radicado: string;
  tipoEvento: TipoEventoCotizacion;
  modalidadEntrega: ModalidadEntregaEvento;
  invitados: number;
  fechaEvento: string;
  horaEvento: string;
  clienteNombre: string;
  empresa?: string;
  clienteTelefono: string;
  direccionEvento?: string;
  notasEvento?: string;
  items: ItemSeleccionadoCotizacionPublica[];
  totalEstimadoCOP: number;
  estimadoPorInvitadoCOP: number;
  anticipoSugeridoCOP: number;
  saldoEstimadoCOP: number;
  metodoAnticipoPreferido: 'transferencia' | 'efectivo';
}

interface PaqueteSugeridoEvento {
  id: string;
  nombre: string;
  descripcion: string;
  precioPorInvitado: number;
  etiqueta: string;
}

export const PAQUETES_EVENTO_SUGERIDOS: readonly PaqueteSugeridoEvento[] = [
  {
    id: 'coffee_break_artesanal',
    nombre: 'Estación Coffee Break & Pasabocas',
    descripcion: 'Tequeños, mini pancerotis, salsas artesanales de la casa y bebida por invitado.',
    precioPorInvitado: 14000,
    etiqueta: 'Ideal oficinas',
  },
  {
    id: 'combo_corporativo_parada',
    nombre: 'Combo Ejecutivo La Parada',
    descripcion: 'Plato fuerte artesanal, acompañamiento, salsa de la casa y bebida personal.',
    precioPorInvitado: 22000,
    etiqueta: 'Más solicitado',
  },
  {
    id: 'fiesta_picada_premium',
    nombre: 'Fiesta & Picadas Premium',
    descripcion: 'Surtido abundante de fritos artesanales, carnes desmechadas, papas y bebidas.',
    precioPorInvitado: 28000,
    etiqueta: 'Celebraciones',
  },
] as const;

const INVITADOS_RAPIDOS = [20, 30, 50, 80, 120] as const;

function getFechaEventoDefault(): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 5);
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generarRadicadoPublicoEvento(): string {
  const sufijo = String(Date.now()).slice(-4);
  return `EVT-${sufijo}`;
}

export function construirMensajeWhatsAppSolicitudEvento(
  solicitud: SolicitudCotizacionEventoConfirmada,
  negocioNombre: string
): string {
  const tipoMeta = formatearTipoEvento(solicitud.tipoEvento);
  const lineas: string[] = [
    `🎉 *SOLICITUD DE COTIZACIÓN DE EVENTO / CATERING — ${negocioNombre.toUpperCase()}*`,
    `📋 *Radicado:* ${solicitud.radicado}`,
    `━━━━━━━━━━━━━━━━━━`,
    `👤 *Contacto:* ${solicitud.clienteNombre}`,
  ];

  if (solicitud.empresa) {
    lineas.push(`🏢 *Empresa / Organización:* ${solicitud.empresa}`);
  }

  lineas.push(
    `📱 *Teléfono:* ${solicitud.clienteTelefono}`,
    `${tipoMeta.emoji} *Tipo de evento:* ${tipoMeta.label}`,
    `👥 *Invitados estimados:* ${solicitud.invitados} personas`,
    `📅 *Fecha tentativa:* ${solicitud.fechaEvento} · ${solicitud.horaEvento}`,
    `🚚 *Modalidad:* ${formatearModalidadEntrega(solicitud.modalidadEntrega)}`
  );

  if (solicitud.direccionEvento) {
    lineas.push(`📍 *Lugar / Dirección:* ${solicitud.direccionEvento}`);
  }

  lineas.push(`━━━━━━━━━━━━━━━━━━`, `🍽️ *Selección referencial:*`);
  solicitud.items.forEach((item) => {
    lineas.push(
      `• ${item.cantidad}x ${item.nombre} (${formatCOP(item.precioUnitario * item.cantidad)})`
    );
  });

  lineas.push(
    `━━━━━━━━━━━━━━━━━━`,
    `💰 *Inversión estimada:* ${formatCOP(solicitud.totalEstimadoCOP)} (${formatCOP(solicitud.estimadoPorInvitadoCOP)} / invitado)`,
    `🏦 *Anticipo 50% offline (${solicitud.metodoAnticipoPreferido === 'transferencia' ? 'Transferencia' : 'Efectivo'}):* ${formatCOP(solicitud.anticipoSugeridoCOP)}`,
    `💵 *Saldo al entregar / iniciar:* ${formatCOP(solicitud.saldoEstimadoCOP)}`
  );

  if (solicitud.notasEvento) {
    lineas.push(`📝 *Notas:* ${solicitud.notasEvento}`);
  }

  lineas.push(
    ``,
    `Quedo atento(a) para recibir la propuesta formal y coordinar el anticipo offline. ¡Gracias!`
  );

  return lineas.join('\n');
}

export function StorefrontCotizacionEventoModal({
  isOpen,
  onClose,
  negocioNombre,
  negocioTelefono,
  productos = [],
  combos = [],
}: StorefrontCotizacionEventoModalProps) {
  const generatedId = useId();
  const titleId = `storefront-cotizacion-evento-${generatedId.replace(/:/g, '')}-title`;

  const [tipoEvento, setTipoEvento] = useState<TipoEventoCotizacion>('corporativo');
  const [modalidadEntrega, setModalidadEntrega] =
    useState<ModalidadEntregaEvento>('domicilio_evento');
  const [invitados, setInvitados] = useState<number>(30);
  const [paqueteSeleccionadoId, setPaqueteSeleccionadoId] = useState<string>(
    PAQUETES_EVENTO_SUGERIDOS[1].id
  );
  const [serviciosExtrasActivos, setServiciosExtrasActivos] = useState<string[]>([]);
  const [cantidadesCatalogo, setCantidadesCatalogo] = useState<Record<string, number>>({});
  const [fechaEvento, setFechaEvento] = useState<string>(() => getFechaEventoDefault());
  const [horaEvento, setHoraEvento] = useState<string>('12:30');
  const [clienteNombre, setClienteNombre] = useState<string>('');
  const [empresa, setEmpresa] = useState<string>('');
  const [clienteTelefono, setClienteTelefono] = useState<string>('');
  const [direccionEvento, setDireccionEvento] = useState<string>('');
  const [metodoAnticipoPreferido, setMetodoAnticipoPreferido] = useState<
    'transferencia' | 'efectivo'
  >('transferencia');
  const [notasEvento, setNotasEvento] = useState<string>('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [solicitudConfirmada, setSolicitudConfirmada] =
    useState<SolicitudCotizacionEventoConfirmada | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTipoEvento('corporativo');
    setModalidadEntrega('domicilio_evento');
    setInvitados(30);
    setPaqueteSeleccionadoId(PAQUETES_EVENTO_SUGERIDOS[1].id);
    setServiciosExtrasActivos([]);
    setCantidadesCatalogo({});
    setFechaEvento(getFechaEventoDefault());
    setHoraEvento('12:30');
    setClienteNombre('');
    setEmpresa('');
    setClienteTelefono('');
    setDireccionEvento('');
    setMetodoAnticipoPreferido('transferencia');
    setNotasEvento('');
    setErrorLocal(null);
    setCopiado(false);
    setSolicitudConfirmada(null);
  }, [isOpen]);

  const itemsCatalogoRapido = useMemo(() => {
    const listaCombos = combos
      .filter((c) => c.disponible !== false)
      .slice(0, 3)
      .map((c) => ({
        id: `combo-${c.id}`,
        nombre: c.nombre,
        precioUnitario: Math.max(0, Math.round(c.precioEspecial)),
      }));

    const listaProductos = productos
      .filter((p) => p.disponible !== false)
      .slice(0, 4)
      .map((p) => ({
        id: `prod-${p.id}`,
        nombre: p.nombre,
        precioUnitario: Math.max(0, Math.round(p.precio)),
      }));

    return [...listaCombos, ...listaProductos].slice(0, 6);
  }, [combos, productos]);

  const itemsSeleccionados = useMemo<ItemSeleccionadoCotizacionPublica[]>(() => {
    const resultado: ItemSeleccionadoCotizacionPublica[] = [];

    const paquete = PAQUETES_EVENTO_SUGERIDOS.find((p) => p.id === paqueteSeleccionadoId);
    if (paquete) {
      resultado.push({
        id: `paquete-${paquete.id}`,
        nombre: paquete.nombre,
        precioUnitario: paquete.precioPorInvitado,
        cantidad: Math.max(1, invitados),
      });
    }

    itemsCatalogoRapido.forEach((item) => {
      const qty = cantidadesCatalogo[item.id] || 0;
      if (qty > 0) {
        resultado.push({
          id: item.id,
          nombre: item.nombre,
          precioUnitario: item.precioUnitario,
          cantidad: qty,
        });
      }
    });

    serviciosExtrasActivos.forEach((nombreExtra) => {
      const meta = SERVICIOS_EXTRA_CATERING_CATALOGO.find((s) => s.nombre === nombreExtra);
      if (meta) {
        resultado.push({
          id: `extra-${meta.nombre}`,
          nombre: meta.nombre,
          precioUnitario: meta.precioSugerido,
          cantidad: 1,
          esServicioExtra: true,
        });
      }
    });

    return resultado;
  }, [paqueteSeleccionadoId, invitados, itemsCatalogoRapido, cantidadesCatalogo, serviciosExtrasActivos]);

  const resumenFinanciero = useMemo(() => {
    const totalEstimadoCOP = itemsSeleccionados.reduce(
      (acc, item) => acc + item.precioUnitario * item.cantidad,
      0
    );
    const invitadosSeguros = Math.max(1, invitados);
    const estimadoPorInvitadoCOP = Math.round(totalEstimadoCOP / invitadosSeguros);
    const anticipoSugeridoCOP = Math.round(totalEstimadoCOP * 0.5);
    const saldoEstimadoCOP = Math.max(0, totalEstimadoCOP - anticipoSugeridoCOP);
    return {
      totalEstimadoCOP,
      estimadoPorInvitadoCOP,
      anticipoSugeridoCOP,
      saldoEstimadoCOP,
    };
  }, [itemsSeleccionados, invitados]);

  const toggleServicioExtra = (nombreServicio: string) => {
    setServiciosExtrasActivos((prev) =>
      prev.includes(nombreServicio)
        ? prev.filter((item) => item !== nombreServicio)
        : [...prev, nombreServicio]
    );
  };

  const ajustarCantidadCatalogo = (itemId: string, delta: number) => {
    setCantidadesCatalogo((prev) => {
      const actual = prev[itemId] || 0;
      const siguiente = Math.max(0, Math.min(500, actual + delta));
      if (siguiente === 0) {
        const copia = { ...prev };
        delete copia[itemId];
        return copia;
      }
      return { ...prev, [itemId]: siguiente };
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setErrorLocal(null);

    if (!clienteNombre.trim()) {
      setErrorLocal('Ingresa tu nombre completo para preparar la cotización.');
      return;
    }

    const telLimpio = clienteTelefono.replace(/\D/g, '');
    if (telLimpio.length < 7) {
      setErrorLocal('Ingresa un número de WhatsApp válido (mínimo 7 dígitos).');
      return;
    }

    if (!fechaEvento.trim()) {
      setErrorLocal('Selecciona la fecha tentativa del evento.');
      return;
    }

    if (itemsSeleccionados.length === 0) {
      setErrorLocal('Selecciona al menos un paquete sugerido o producto del menú.');
      return;
    }

    if (modalidadEntrega === 'domicilio_evento' && !direccionEvento.trim()) {
      setErrorLocal('Indica la dirección o barrio del evento para calcular la logística.');
      return;
    }

    const confirmada: SolicitudCotizacionEventoConfirmada = {
      radicado: generarRadicadoPublicoEvento(),
      tipoEvento,
      modalidadEntrega,
      invitados: Math.max(1, invitados),
      fechaEvento,
      horaEvento: horaEvento || '12:30',
      clienteNombre: clienteNombre.trim(),
      empresa: empresa.trim() || undefined,
      clienteTelefono: clienteTelefono.trim(),
      direccionEvento: direccionEvento.trim() || undefined,
      notasEvento: notasEvento.trim() || undefined,
      items: itemsSeleccionados,
      ...resumenFinanciero,
      metodoAnticipoPreferido,
    };

    setSolicitudConfirmada(confirmada);
  };

  const mensajeWhatsApp = useMemo(() => {
    if (!solicitudConfirmada) return '';
    return construirMensajeWhatsAppSolicitudEvento(solicitudConfirmada, negocioNombre);
  }, [solicitudConfirmada, negocioNombre]);

  const urlWhatsApp = useMemo(() => {
    if (!solicitudConfirmada) return '#';
    const telefonoDestino = negocioTelefono || '573000000000';
    return generarUrlWhatsAppReserva(telefonoDestino, mensajeWhatsApp);
  }, [solicitudConfirmada, negocioTelefono, mensajeWhatsApp]);

  const handleCopiarResumen = async () => {
    if (!mensajeWhatsApp) return;
    try {
      await navigator.clipboard.writeText(mensajeWhatsApp);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  if (!isOpen) return null;

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      returnFocusSelector="#storefront-cotizar-evento-button"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5"
    >
      <div className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-amber-500/30 bg-[#0A0A0A] text-neutral-100 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 bg-neutral-950/90 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-400">
              <Briefcase size={20} aria-hidden="true" />
            </div>
            <div>
              <h2
                id={titleId}
                className="font-display text-lg font-black text-white sm:text-xl"
              >
                Cotización de Eventos &amp; Catering
              </h2>
              <p className="text-xs text-neutral-400">
                Armador referencial para empresas, fiestas y refrigerios en {negocioNombre} · Pago 100% offline.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar asistente de cotización de eventos"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {solicitudConfirmada ? (
            <div
              data-testid="storefront-cotizacion-confirmada"
              className="space-y-5"
            >
              <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={24}
                    className="mt-0.5 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <span className="inline-block rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                      Radicado {solicitudConfirmada.radicado}
                    </span>
                    <h3 className="font-display text-lg font-black text-white">
                      ¡Resumen listo para enviar por WhatsApp!
                    </h3>
                    <p className="text-xs text-neutral-300">
                      Tu estimación para{' '}
                      <strong className="text-white">
                        {solicitudConfirmada.empresa || solicitudConfirmada.clienteNombre}
                      </strong>{' '}
                      ({solicitudConfirmada.invitados} invitados) está lista. Envía el mensaje a{' '}
                      {negocioNombre} para recibir la propuesta formal y separar la fecha.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                    Inversión Estimada
                  </p>
                  <p className="mt-1 font-display text-xl font-black text-amber-400">
                    {formatCOP(solicitudConfirmada.totalEstimadoCOP)}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {formatCOP(solicitudConfirmada.estimadoPorInvitadoCOP)} por invitado
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                    Anticipo 50% Offline
                  </p>
                  <p className="mt-1 font-display text-xl font-black text-emerald-400">
                    {formatCOP(solicitudConfirmada.anticipoSugeridoCOP)}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {solicitudConfirmada.metodoAnticipoPreferido === 'transferencia'
                      ? 'Transferencia directa'
                      : 'Efectivo en local'}
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                    Saldo contra entrega
                  </p>
                  <p className="mt-1 font-display text-xl font-black text-white">
                    {formatCOP(solicitudConfirmada.saldoEstimadoCOP)}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {solicitudConfirmada.fechaEvento} · {solicitudConfirmada.horaEvento}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-2 text-xs">
                <p className="font-bold text-white">Detalle incluido en tu solicitud:</p>
                <ul className="space-y-1 text-neutral-300">
                  {solicitudConfirmada.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span>
                        {item.cantidad}x {item.nombre}
                      </span>
                      <span className="font-semibold text-amber-300">
                        {formatCOP(item.precioUnitario * item.cantidad)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="pt-2 text-[11px] text-neutral-400">
                  {formatearTipoEvento(solicitudConfirmada.tipoEvento).label} ·{' '}
                  {formatearModalidadEntrega(solicitudConfirmada.modalidadEntrega)}
                  {solicitudConfirmada.direccionEvento
                    ? ` · ${solicitudConfirmada.direccionEvento}`
                    : ''}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={urlWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-whatsapp-cotizacion-storefront"
                  className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-neutral-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
                >
                  <MessageCircle size={18} aria-hidden="true" />
                  <span>Enviar Cotización por WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopiarResumen}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-xs font-bold text-neutral-200 transition-colors hover:bg-neutral-800"
                >
                  <Copy size={16} aria-hidden="true" />
                  <span>{copiado ? '¡Copiado!' : 'Copiar resumen'}</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* 1. Tipo de Evento */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  1. ¿Qué tipo de evento planeas?
                </p>
                <div
                  role="group"
                  aria-label="Seleccionar tipo de evento"
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                >
                  {TIPOS_EVENTO_CATALOGO.slice(0, 6).map((tipo) => {
                    const activo = tipoEvento === tipo.id;
                    return (
                      <button
                        key={tipo.id}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => setTipoEvento(tipo.id)}
                        className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                          activo
                            ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-sm'
                            : 'border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <span aria-hidden="true">{tipo.emoji}</span>
                        <span className="truncate">{tipo.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Invitados y Modalidad */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <label
                    htmlFor="storefront-cotizacion-invitados"
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400"
                  >
                    <Users size={14} aria-hidden="true" />
                    <span>2. Cantidad de invitados</span>
                  </label>
                  <div
                    role="group"
                    aria-label="Cantidad rápida de invitados"
                    className="flex flex-wrap gap-2"
                  >
                    {INVITADOS_RAPIDOS.map((cantidad) => {
                      const activo = invitados === cantidad;
                      return (
                        <button
                          key={cantidad}
                          type="button"
                          aria-pressed={activo}
                          onClick={() => setInvitados(cantidad)}
                          className={`min-h-[44px] min-w-[48px] rounded-xl border px-3 text-xs font-black transition-all ${
                            activo
                              ? 'border-amber-400 bg-amber-500 text-neutral-950'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          {cantidad}
                        </button>
                      );
                    })}
                    <input
                      id="storefront-cotizacion-invitados"
                      type="number"
                      min={1}
                      max={5000}
                      value={invitados}
                      onChange={(e) =>
                        setInvitados(Math.max(1, Math.min(5000, Number(e.target.value) || 1)))
                      }
                      aria-label="Número exacto de invitados"
                      className="min-h-[44px] w-20 rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-center text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Modalidad de servicio
                  </p>
                  <div
                    role="group"
                    aria-label="Seleccionar modalidad de entrega del evento"
                    className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                  >
                    {MODALIDADES_ENTREGA_CATALOGO.map((mod) => {
                      const activo = modalidadEntrega === mod.id;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          aria-pressed={activo}
                          onClick={() => setModalidadEntrega(mod.id)}
                          className={`min-h-[44px] rounded-xl border px-2.5 py-2 text-xs font-bold transition-all ${
                            activo
                              ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                              : 'border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          {mod.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Paquete sugerido por invitado */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <Sparkles size={14} aria-hidden="true" />
                    <span>3. Paquete sugerido por invitado</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setPaqueteSeleccionadoId('')}
                    className="text-[11px] font-semibold text-neutral-400 underline hover:text-white"
                  >
                    Solo productos sueltos
                  </button>
                </div>

                <div
                  role="group"
                  aria-label="Seleccionar paquete sugerido de catering"
                  data-testid="storefront-cotizacion-paquetes"
                  className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
                >
                  {PAQUETES_EVENTO_SUGERIDOS.map((paquete) => {
                    const activo = paqueteSeleccionadoId === paquete.id;
                    return (
                      <button
                        key={paquete.id}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => setPaqueteSeleccionadoId(paquete.id)}
                        className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${
                          activo
                            ? 'border-amber-400 bg-amber-500/15 shadow-md shadow-amber-500/10'
                            : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="inline-block rounded-full bg-neutral-950 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            {paquete.etiqueta}
                          </span>
                          <p className="text-xs font-black text-white">{paquete.nombre}</p>
                          <p className="text-[11px] leading-snug text-neutral-400">
                            {paquete.descripcion}
                          </p>
                        </div>
                        <p className="mt-3 font-display text-sm font-black text-amber-400">
                          {formatCOP(paquete.precioPorInvitado)}{' '}
                          <span className="font-sans text-[10px] font-normal text-neutral-400">
                            / invitado
                          </span>
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Productos del menú (opcional) */}
              {itemsCatalogoRapido.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Adicionales del menú (opcional)
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {itemsCatalogoRapido.map((item) => {
                      const cantidad = cantidadesCatalogo[item.id] || 0;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white">{item.nombre}</p>
                            <p className="text-[11px] text-amber-400">
                              {formatCOP(item.precioUnitario)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`Disminuir ${item.nombre}`}
                              onClick={() => ajustarCantidadCatalogo(item.id, -5)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-amber-400 hover:text-white"
                            >
                              <Minus size={14} aria-hidden="true" />
                            </button>
                            <span className="w-8 text-center text-xs font-black text-white">
                              {cantidad}
                            </span>
                            <button
                              type="button"
                              aria-label={`Agregar ${item.nombre}`}
                              onClick={() => ajustarCantidadCatalogo(item.id, 5)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                            >
                              <Plus size={14} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Servicios extra catering (solo precio público, nunca costo interno) */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Servicios de logística y montaje (opcional)
                </p>
                <div
                  role="group"
                  aria-label="Seleccionar servicios adicionales de catering"
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  {SERVICIOS_EXTRA_CATERING_CATALOGO.map((servicio) => {
                    const activo = serviciosExtrasActivos.includes(servicio.nombre);
                    return (
                      <button
                        key={servicio.nombre}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => toggleServicioExtra(servicio.nombre)}
                        className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                          activo
                            ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
                            : 'border-neutral-800 bg-neutral-900/70 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <span className="font-semibold">{servicio.nombre}</span>
                        <span className="shrink-0 font-bold text-amber-300">
                          +{formatCOP(servicio.precioSugerido)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resumen financiero en vivo */}
              <div
                data-testid="storefront-cotizacion-resumen-vivo"
                className="rounded-2xl border border-amber-500/30 bg-neutral-950 p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Estimación referencial ({invitados} invitados)
                    </p>
                    <p className="font-display text-2xl font-black text-amber-400">
                      {formatCOP(resumenFinanciero.totalEstimadoCOP)}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-neutral-300">
                      Por invitado:{' '}
                      <strong className="text-white">
                        {formatCOP(resumenFinanciero.estimadoPorInvitadoCOP)}
                      </strong>
                    </p>
                    <p className="text-emerald-400 font-semibold">
                      Anticipo 50% offline: {formatCOP(resumenFinanciero.anticipoSugeridoCOP)}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400">{CONDICIONES_COMERCIALES_DEFAULT}</p>
              </div>

              {/* 4. Datos del contacto y fecha */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  4. Datos del evento y contacto
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="storefront-cotizacion-nombre"
                      className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-300"
                    >
                      <User size={13} aria-hidden="true" />
                      <span>Nombre completo *</span>
                    </label>
                    <input
                      id="storefront-cotizacion-nombre"
                      type="text"
                      required
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="Ej. Laura Gómez"
                      className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="storefront-cotizacion-empresa"
                      className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-300"
                    >
                      <Building2 size={13} aria-hidden="true" />
                      <span>Empresa u organización (opcional)</span>
                    </label>
                    <input
                      id="storefront-cotizacion-empresa"
                      type="text"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      placeholder="Ej. Constructora Norte SAS"
                      className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="storefront-cotizacion-telefono"
                      className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-300"
                    >
                      <Phone size={13} aria-hidden="true" />
                      <span>WhatsApp de contacto *</span>
                    </label>
                    <input
                      id="storefront-cotizacion-telefono"
                      type="tel"
                      required
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      placeholder="Ej. 315 888 9900"
                      className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="storefront-cotizacion-fecha"
                        className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-300"
                      >
                        <Calendar size={13} aria-hidden="true" />
                        <span>Fecha *</span>
                      </label>
                      <input
                        id="storefront-cotizacion-fecha"
                        type="date"
                        required
                        value={fechaEvento}
                        onChange={(e) => setFechaEvento(e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="storefront-cotizacion-hora"
                        className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-300"
                      >
                        <Clock size={13} aria-hidden="true" />
                        <span>Hora</span>
                      </label>
                      <input
                        id="storefront-cotizacion-hora"
                        type="time"
                        value={horaEvento}
                        onChange={(e) => setHoraEvento(e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {modalidadEntrega === 'domicilio_evento' && (
                  <div>
                    <label
                      htmlFor="storefront-cotizacion-direccion"
                      className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-300"
                    >
                      <MapPin size={13} aria-hidden="true" />
                      <span>Dirección y barrio del evento *</span>
                    </label>
                    <input
                      id="storefront-cotizacion-direccion"
                      type="text"
                      required
                      value={direccionEvento}
                      onChange={(e) => setDireccionEvento(e.target.value)}
                      placeholder="Ej. Av. Libertadores #12-30, Barrio Caobos"
                      className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-neutral-300">
                    Método preferido para el anticipo offline (50%)
                  </span>
                  <div
                    role="group"
                    aria-label="Método preferido de anticipo offline"
                    className="grid grid-cols-2 gap-2"
                  >
                    <button
                      type="button"
                      aria-pressed={metodoAnticipoPreferido === 'transferencia'}
                      onClick={() => setMetodoAnticipoPreferido('transferencia')}
                      className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-all ${
                        metodoAnticipoPreferido === 'transferencia'
                          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-300'
                      }`}
                    >
                      Transferencia directa (Nequi / Banco)
                    </button>
                    <button
                      type="button"
                      aria-pressed={metodoAnticipoPreferido === 'efectivo'}
                      onClick={() => setMetodoAnticipoPreferido('efectivo')}
                      className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-all ${
                        metodoAnticipoPreferido === 'efectivo'
                          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-300'
                      }`}
                    >
                      Efectivo en punto físico
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="storefront-cotizacion-notas"
                    className="mb-1 block text-xs font-semibold text-neutral-300"
                  >
                    Notas especiales o restricciones alimentarias (opcional)
                  </label>
                  <textarea
                    id="storefront-cotizacion-notas"
                    rows={2}
                    value={notasEvento}
                    onChange={(e) => setNotasEvento(e.target.value)}
                    placeholder="Ej. Requerimos factura con NIT, 5 opciones sin picante..."
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-white placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {errorLocal && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300"
                >
                  {errorLocal}
                </div>
              )}

              <button
                type="submit"
                data-testid="btn-confirmar-cotizacion-storefront"
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 px-5 py-3 text-sm font-black text-neutral-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-300"
              >
                <Briefcase size={18} aria-hidden="true" />
                <span>Generar Solicitud de Cotización</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </StorefrontDialog>
  );
}
