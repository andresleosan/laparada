import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Flame,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { Combo, Producto } from '@/types';
import { generarUrlWhatsAppReserva } from '@/utils/reservasUtils';

export type MotivoDevolucionStorefront =
  | 'temperatura_textura'
  | 'producto_incompleto'
  | 'error_preparacion'
  | 'empaque_transporte';

export type ModalidadCompensacionOffline =
  | 'reposicion_inmediata'
  | 'reembolso_transferencia'
  | 'bono_proximo_pedido';

export interface PilarGarantiaFrescura {
  id: string;
  titulo: string;
  descripcion: string;
  etiqueta: string;
}

export interface MotivoDevolucionInfo {
  id: MotivoDevolucionStorefront;
  label: string;
  descripcion: string;
}

export interface ModalidadCompensacionInfo {
  id: ModalidadCompensacionOffline;
  label: string;
  descripcion: string;
}

export interface SolicitudGarantiaConfirmada {
  radicado: string;
  platoNombre: string;
  motivo: MotivoDevolucionInfo;
  modalidad: ModalidadCompensacionInfo;
  codigoPedido?: string;
  clienteNombre: string;
  clienteTelefono: string;
  cuentaReembolsoOffline?: string;
  notas?: string;
}

export interface StorefrontGarantiaReposicionModalProps {
  isOpen: boolean;
  onClose: () => void;
  negocioNombre: string;
  negocioTelefono?: string;
  productos?: Producto[];
  combos?: Combo[];
}

export const PILARES_GARANTIA_FRESCURA_LA_PARADA: readonly PilarGarantiaFrescura[] = [
  {
    id: 'preparacion_instante',
    titulo: 'Preparación al Instante',
    descripcion: 'Freímos y armamos cada orden al confirmarla; cero platos recalentados.',
    etiqueta: 'Cocina en vivo',
  },
  {
    id: 'empaque_termico',
    titulo: 'Empaque Térmico Sellado',
    descripcion: 'Cajas ventiladas y sellos de seguridad para conservar crocancia y calor.',
    etiqueta: 'Sello intacto',
  },
  {
    id: 'trazabilidad_lotes',
    titulo: 'Trazabilidad de Lotes 72h',
    descripcion: 'Masas, carnes marinadas y salsas artesanales con control diario de lote.',
    etiqueta: 'Lotes frescos',
  },
  {
    id: 'reposicion_garantizada',
    titulo: 'Reposición 100% Sin Costo',
    descripcion: 'Si algo no llega perfecto, reponemos tu plato o reembolsamos manualmente.',
    etiqueta: 'Cero fricción',
  },
] as const;

export const MOTIVOS_DEVOLUCION_STOREFRONT: readonly MotivoDevolucionInfo[] = [
  {
    id: 'temperatura_textura',
    label: 'Temperatura o textura al llegar',
    descripcion: 'El plato llegó frío o perdió su crocancia en el camino.',
  },
  {
    id: 'producto_incompleto',
    label: 'Faltante en el pedido',
    descripcion: 'Faltó un acompañamiento, bebida o salsa artesanal.',
  },
  {
    id: 'error_preparacion',
    label: 'Error en preparación o modificación',
    descripcion: 'No coincide con el combo o término solicitado.',
  },
  {
    id: 'empaque_transporte',
    label: 'Empaque abierto o derrame',
    descripcion: 'El empaque sufrió daño durante el traslado a domicilio.',
  },
] as const;

export const MODALIDADES_COMPENSACION_OFFLINE: readonly ModalidadCompensacionInfo[] = [
  {
    id: 'reposicion_inmediata',
    label: 'Reposición inmediata del plato',
    descripcion: 'Preparamos y despachamos un plato nuevo sin costo adicional.',
  },
  {
    id: 'reembolso_transferencia',
    label: 'Reembolso por transferencia manual',
    descripcion: 'Devolución directa a tu cuenta Nequi, Daviplata o Bancolombia.',
  },
  {
    id: 'bono_proximo_pedido',
    label: 'Bono de reposición para próximo pedido',
    descripcion: 'Saldo a favor en tu nombre para canjear en tienda o WhatsApp.',
  },
] as const;

export const PLATOS_REFERENCIA_GARANTIA_DEFAULT: readonly string[] = [
  'Combo Arma tu Parada',
  'Bandeja de Tequeños Artesanales',
  'Panceroti Especial de la Casa',
  'Hamburguesa Artesanal La Parada',
] as const;

export function construirMensajeWhatsAppGarantiaStorefront(params: {
  solicitud: SolicitudGarantiaConfirmada;
  negocioNombre: string;
}): string {
  const negocio = (params.negocioNombre || 'La Parada').trim();
  const s = params.solicitud;
  const lineas: string[] = [
    `🛡️ *SOLICITUD DE GARANTÍA DE FRESCURA — ${negocio}*`,
    `📌 *Radicado:* ${s.radicado}`,
    `👤 *Cliente:* ${s.clienteNombre} (${s.clienteTelefono})`,
  ];

  if (s.codigoPedido?.trim()) {
    lineas.push(`🧾 *Código de pedido:* ${s.codigoPedido.trim()}`);
  }

  lineas.push(`🍽️ *Plato / Combo:* ${s.platoNombre}`);
  lineas.push(`⚠️ *Novedad reportada:* ${s.motivo.label}`);
  lineas.push(`✅ *Solución solicitada (100% offline):* ${s.modalidad.label}`);

  if (s.modalidad.id === 'reembolso_transferencia' && s.cuentaReembolsoOffline?.trim()) {
    lineas.push(`🏦 *Cuenta Nequi / Banco para reembolso:* ${s.cuentaReembolsoOffline.trim()}`);
  }

  if (s.notas?.trim()) {
    lineas.push(`📝 *Observaciones:* ${s.notas.trim()}`);
  }

  lineas.push('');
  lineas.push('Por favor indícame cómo coordinamos la reposición o atención prioritaria. ¡Gracias!');

  return lineas.join('\n');
}

export function generarUrlWhatsAppGarantiaStorefront(
  telefono: string,
  mensaje: string
): string {
  return generarUrlWhatsAppReserva(telefono, mensaje);
}

export function StorefrontGarantiaReposicionModal({
  isOpen,
  onClose,
  negocioNombre,
  negocioTelefono,
  productos = [],
  combos = [],
}: StorefrontGarantiaReposicionModalProps) {
  const generatedId = useId();
  const titleId = `storefront-garantia-${generatedId.replace(/:/g, '')}-title`;

  const platosDisponibles = useMemo(() => {
    const nombres = new Set<string>();
    for (const c of combos) {
      if (c.disponible !== false && c.nombre?.trim()) {
        nombres.add(c.nombre.trim());
      }
    }
    for (const p of productos) {
      if (p.disponible !== false && p.nombre?.trim()) {
        nombres.add(p.nombre.trim());
      }
    }
    const lista = Array.from(nombres).slice(0, 8);
    return lista.length > 0 ? lista : [...PLATOS_REFERENCIA_GARANTIA_DEFAULT];
  }, [combos, productos]);

  const [platoSeleccionado, setPlatoSeleccionado] = useState<string>(
    () => platosDisponibles[0] || PLATOS_REFERENCIA_GARANTIA_DEFAULT[0]
  );
  const [motivoId, setMotivoId] = useState<MotivoDevolucionStorefront>('temperatura_textura');
  const [modalidadId, setModalidadId] = useState<ModalidadCompensacionOffline>('reposicion_inmediata');
  const [codigoPedido, setCodigoPedido] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [cuentaReembolsoOffline, setCuentaReembolsoOffline] = useState('');
  const [notas, setNotas] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [solicitudConfirmada, setSolicitudConfirmada] = useState<SolicitudGarantiaConfirmada | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) return;
    setErrorLocal(null);
    setSolicitudConfirmada(null);
    setPlatoSeleccionado(platosDisponibles[0] || PLATOS_REFERENCIA_GARANTIA_DEFAULT[0]);
    setMotivoId('temperatura_textura');
    setModalidadId('reposicion_inmediata');
    setCodigoPedido('');
    setClienteNombre('');
    setClienteTelefono('');
    setCuentaReembolsoOffline('');
    setNotas('');
  }, [isOpen, platosDisponibles]);

  const urlWhatsApp = useMemo(() => {
    if (!solicitudConfirmada) return '';
    const mensaje = construirMensajeWhatsAppGarantiaStorefront({
      solicitud: solicitudConfirmada,
      negocioNombre,
    });
    return generarUrlWhatsAppGarantiaStorefront(negocioTelefono || '3001234567', mensaje);
  }, [solicitudConfirmada, negocioNombre, negocioTelefono]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const nombreLimpio = clienteNombre.trim();
    if (nombreLimpio.length < 2) {
      setErrorLocal('Por favor ingresa tu nombre completo (mínimo 2 caracteres).');
      return;
    }

    const telLimpio = clienteTelefono.trim();
    const digitosTel = telLimpio.replace(/\D/g, '');
    if (telLimpio.length < 7 || digitosTel.length < 7) {
      setErrorLocal('Ingresa un teléfono o WhatsApp válido (mínimo 7 dígitos).');
      return;
    }

    const motivo =
      MOTIVOS_DEVOLUCION_STOREFRONT.find((m) => m.id === motivoId) ||
      MOTIVOS_DEVOLUCION_STOREFRONT[0];
    const modalidad =
      MODALIDADES_COMPENSACION_OFFLINE.find((m) => m.id === modalidadId) ||
      MODALIDADES_COMPENSACION_OFFLINE[0];

    const radicado = `GAR-${Date.now().toString(36).slice(-5).toUpperCase()}`;

    setSolicitudConfirmada({
      radicado,
      platoNombre: platoSeleccionado || platosDisponibles[0],
      motivo,
      modalidad,
      ...(codigoPedido.trim() ? { codigoPedido: codigoPedido.trim() } : {}),
      clienteNombre: nombreLimpio,
      clienteTelefono: telLimpio,
      ...(modalidadId === 'reembolso_transferencia' && cuentaReembolsoOffline.trim()
        ? { cuentaReembolsoOffline: cuentaReembolsoOffline.trim() }
        : {}),
      ...(notas.trim() ? { notas: notas.trim() } : {}),
    });
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-2xl sm:p-6">
        {/* Cabecera */}
        <header className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Compromiso de Calidad · {negocioNombre}
            </span>
            <h2
              id={titleId}
              className="mt-1.5 font-display text-xl font-black text-white sm:text-2xl"
            >
              Garantía de Frescura 100% &amp; Reposición de Producto
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">
              Si tu pedido llegó con alguna novedad de temperatura, empaque o preparación,
              coordinamos tu reposición o devolución manual al instante sin trámites en línea.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar garantía de frescura y reposición"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Cuerpo */}
        <div className="my-4 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
          {solicitudConfirmada ? (
            <div
              data-testid="storefront-garantia-confirmada"
              className="space-y-4 rounded-2xl border border-emerald-500/35 bg-emerald-950/15 p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                    Radicado {solicitudConfirmada.radicado}
                  </span>
                  <h3 className="font-display text-lg font-black text-white">
                    ¡Solicitud de Garantía Lista para Cocina!
                  </h3>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-950/85 p-4 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-400">Cliente:</span>
                  <strong className="text-white">{solicitudConfirmada.clienteNombre}</strong>
                </div>
                {solicitudConfirmada.codigoPedido && (
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-400">Pedido:</span>
                    <strong className="font-mono text-amber-300">
                      {solicitudConfirmada.codigoPedido}
                    </strong>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-400">Plato afectado:</span>
                  <strong className="text-white text-right">{solicitudConfirmada.platoNombre}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-400">Motivo:</span>
                  <strong className="text-amber-300 text-right">
                    {solicitudConfirmada.motivo.label}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-neutral-400">Solución offline:</span>
                  <strong className="text-emerald-300 text-right">
                    {solicitudConfirmada.modalidad.label}
                  </strong>
                </div>
                {solicitudConfirmada.cuentaReembolsoOffline && (
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-400">Cuenta reembolso:</span>
                    <strong className="text-white text-right">
                      {solicitudConfirmada.cuentaReembolsoOffline}
                    </strong>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={urlWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-whatsapp-garantia-storefront"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-black text-neutral-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Enviar Solicitud por WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-xs font-bold text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 4 Pilares de Calidad y Frescura */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Nuestros 4 Pilares de Frescura Garantizada
                  </h3>
                  <span className="text-[11px] font-semibold text-emerald-400">
                    Respaldo directo en tienda
                  </span>
                </div>

                <div
                  data-testid="storefront-garantia-pilares"
                  className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                >
                  {PILARES_GARANTIA_FRESCURA_LA_PARADA.map((pilar, idx) => (
                    <article
                      key={pilar.id}
                      className="rounded-2xl border border-neutral-800 bg-neutral-900/75 p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                          {idx === 0 ? (
                            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : idx === 1 ? (
                            <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : idx === 2 ? (
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          <span>{pilar.etiqueta}</span>
                        </span>
                      </div>
                      <h4 className="font-display text-sm font-black text-white">{pilar.titulo}</h4>
                      <p className="text-[11px] leading-relaxed text-neutral-400">
                        {pilar.descripcion}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              {/* Formulario de Reporte / Devolución */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorLocal && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-medium text-red-300"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{errorLocal}</span>
                  </div>
                )}

                {/* Plato o combo afectado */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
                    <Utensils className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                    <span>¿Cuál plato o combo tuvo novedad?</span>
                  </label>
                  <div
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    role="group"
                    aria-label="Seleccionar plato o combo afectado"
                  >
                    {platosDisponibles.map((nombrePlato) => {
                      const seleccionado = platoSeleccionado === nombrePlato;
                      return (
                        <button
                          key={nombrePlato}
                          type="button"
                          aria-pressed={seleccionado}
                          onClick={() => setPlatoSeleccionado(nombrePlato)}
                          className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                            seleccionado
                              ? 'border-amber-400 bg-amber-500/20 text-white'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700 hover:text-white'
                          }`}
                        >
                          {nombrePlato}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Motivo */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-neutral-200">
                    Motivo de la novedad o devolución
                  </span>
                  <div
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    role="group"
                    aria-label="Seleccionar motivo de novedad o devolución"
                  >
                    {MOTIVOS_DEVOLUCION_STOREFRONT.map((motivo) => {
                      const activo = motivoId === motivo.id;
                      return (
                        <button
                          key={motivo.id}
                          type="button"
                          aria-pressed={activo}
                          onClick={() => setMotivoId(motivo.id)}
                          className={`min-h-[44px] rounded-xl border p-2.5 text-left transition-all ${
                            activo
                              ? 'border-amber-400 bg-amber-500/15 text-white'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <span className="block text-xs font-bold">{motivo.label}</span>
                          <span className="mt-0.5 block text-[11px] text-neutral-400">
                            {motivo.descripcion}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Modalidad de compensación 100% offline */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-neutral-200">
                    ¿Cómo prefieres que lo resolvamos? (100% offline, sin pasarelas en línea)
                  </span>
                  <div
                    className="grid grid-cols-1 gap-2"
                    role="group"
                    aria-label="Seleccionar modalidad de solución offline"
                  >
                    {MODALIDADES_COMPENSACION_OFFLINE.map((mod) => {
                      const activa = modalidadId === mod.id;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          aria-pressed={activa}
                          onClick={() => setModalidadId(mod.id)}
                          className={`min-h-[44px] rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                            activa
                              ? 'border-emerald-400 bg-emerald-500/15 text-white'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <span className="block text-xs font-bold">{mod.label}</span>
                          <span className="mt-0.5 block text-[11px] text-neutral-400">
                            {mod.descripcion}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {modalidadId === 'reembolso_transferencia' && (
                  <div>
                    <label
                      htmlFor="storefront-garantia-cuenta"
                      className="mb-1.5 block text-xs font-semibold text-neutral-300"
                    >
                      Número Nequi / Daviplata o cuenta Bancolombia para devolución manual (opcional)
                    </label>
                    <input
                      id="storefront-garantia-cuenta"
                      type="text"
                      maxLength={80}
                      value={cuentaReembolsoOffline}
                      onChange={(e) => setCuentaReembolsoOffline(e.target.value)}
                      placeholder="Ej: Nequi 315 888 9900"
                      className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                )}

                {/* Datos de contacto */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="storefront-garantia-codigo"
                      className="mb-1.5 block text-xs font-semibold text-neutral-300"
                    >
                      Código de Pedido (opcional)
                    </label>
                    <input
                      id="storefront-garantia-codigo"
                      type="text"
                      maxLength={40}
                      value={codigoPedido}
                      onChange={(e) => setCodigoPedido(e.target.value)}
                      placeholder="Ej: LP-8899"
                      className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="storefront-garantia-nombre"
                      className="mb-1.5 block text-xs font-semibold text-neutral-300"
                    >
                      Tu Nombre *
                    </label>
                    <input
                      id="storefront-garantia-nombre"
                      type="text"
                      required
                      maxLength={80}
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="Ej: Carlos Mendoza"
                      className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="storefront-garantia-telefono"
                      className="mb-1.5 block text-xs font-semibold text-neutral-300"
                    >
                      Teléfono WhatsApp *
                    </label>
                    <input
                      id="storefront-garantia-telefono"
                      type="tel"
                      required
                      maxLength={20}
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      placeholder="Ej: 3158889900"
                      className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="storefront-garantia-notas"
                    className="mb-1.5 block text-xs font-semibold text-neutral-300"
                  >
                    Observaciones adicionales (opcional)
                  </label>
                  <input
                    id="storefront-garantia-notas"
                    type="text"
                    maxLength={280}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Cuéntanos brevemente qué ocurrió para corregirlo en cocina..."
                    className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-neutral-800 pt-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-xs font-bold text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    data-testid="btn-confirmar-garantia-storefront"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-xs font-black text-neutral-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 active:scale-95"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <span>Confirmar Solicitud de Garantía</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </StorefrontDialog>
  );
}

export default StorefrontGarantiaReposicionModal;
