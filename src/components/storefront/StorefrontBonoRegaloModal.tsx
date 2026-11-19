import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  Gift,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { formatCOP } from '@/utils/formatCOP';
import type { TipoBonoPrepago } from '@/types';
import {
  MONTOS_RAPIDOS_BONO_COP,
  generarUrlWhatsAppBono,
  getEtiquetaTipoBono,
  sanitizarMontoBonoCOP,
} from '@/utils/bonosUtils';

export interface StorefrontBonoRegaloModalProps {
  isOpen: boolean;
  onClose: () => void;
  negocioNombre: string;
  negocioTelefono?: string;
}

export type OcasionBonoStorefront =
  | 'cumpleanos'
  | 'aniversario'
  | 'agradecimiento'
  | 'corporativo'
  | 'libre';

export interface SolicitudBonoStorefrontConfirmada {
  radicado: string;
  tipo: TipoBonoPrepago;
  montoCOP: number;
  vigenciaDias: 60 | 90 | 180 | 365;
  recargable: boolean;
  metodoPagoPreferido: 'transferencia' | 'efectivo';
  ocasion: OcasionBonoStorefront;
  compradorNombre: string;
  compradorTelefono: string;
  destinatarioNombre: string;
  destinatarioTelefono?: string;
  mensajeRegalo?: string;
}

const MODALIDADES_BONO_STOREFRONT: readonly {
  tipo: TipoBonoPrepago;
  etiqueta: string;
  descripcion: string;
}[] = [
  {
    tipo: 'bono_regalo',
    etiqueta: 'Bono de Regalo',
    descripcion: 'Obsequio digital con dedicatoria y código QR único',
  },
  {
    tipo: 'tarjeta_prepago',
    etiqueta: 'Tarjeta Prepago',
    descripcion: 'Saldo recargable para consumos frecuentes en caja o mesa',
  },
  {
    tipo: 'vale_consumo',
    etiqueta: 'Vale de Consumo',
    descripcion: 'Cortesías corporativas, premios de equipo o eventos',
  },
] as const;

const VIGENCIAS_STOREFRONT: readonly { dias: 60 | 90 | 180 | 365; etiqueta: string }[] = [
  { dias: 60, etiqueta: '60 días' },
  { dias: 90, etiqueta: '90 días' },
  { dias: 180, etiqueta: '180 días' },
  { dias: 365, etiqueta: '365 días' },
] as const;

const OCASIONES_BONO: readonly { id: OcasionBonoStorefront; etiqueta: string }[] = [
  { id: 'cumpleanos', etiqueta: 'Cumpleaños' },
  { id: 'aniversario', etiqueta: 'Aniversario' },
  { id: 'agradecimiento', etiqueta: 'Agradecimiento' },
  { id: 'corporativo', etiqueta: 'Corporativo' },
  { id: 'libre', etiqueta: 'Libre' },
] as const;

const ETIQUETA_OCASION: Record<OcasionBonoStorefront, string> = {
  cumpleanos: 'Cumpleaños',
  aniversario: 'Aniversario',
  agradecimiento: 'Agradecimiento',
  corporativo: 'Corporativo',
  libre: 'Regalo libre',
};

export function generarRadicadoBonoStorefront(): string {
  const sufijo = String(Date.now()).slice(-4);
  return `BON-SOL-${sufijo}`;
}

export function formatearMensajeSolicitudBonoStorefront(
  solicitud: SolicitudBonoStorefrontConfirmada,
  negocioNombre: string
): string {
  const nombreNegocio = negocioNombre.trim() || 'La Parada';
  const etiquetaModalidad = getEtiquetaTipoBono(solicitud.tipo);
  const etiquetaOcasion = ETIQUETA_OCASION[solicitud.ocasion];
  const metodoLabel =
    solicitud.metodoPagoPreferido === 'transferencia'
      ? 'Transferencia bancaria / Nequi / Daviplata (offline)'
      : 'Efectivo directo en mostrador';
  const recargableLabel = solicitud.recargable
    ? 'Sí (tarjeta recargable en caja)'
    : 'No (consumo hasta agotar saldo)';

  const lineas: string[] = [
    `Hola *${nombreNegocio}*, solicito la emisión de un *${etiquetaModalidad}* con Código QR Único:`,
    '',
    `• *Radicado:* ${solicitud.radicado}`,
    `• *Modalidad:* ${etiquetaModalidad}`,
    `• *Valor:* ${formatCOP(solicitud.montoCOP)} COP`,
    `• *Vigencia:* ${solicitud.vigenciaDias} días`,
    `• *Recargable:* ${recargableLabel}`,
    `• *Ocasión:* ${etiquetaOcasion}`,
    `• *Pago offline preferido:* ${metodoLabel}`,
    '',
    `• *Beneficiario:* ${solicitud.destinatarioNombre}`,
    ...(solicitud.destinatarioTelefono
      ? [`• *WhatsApp beneficiario:* ${solicitud.destinatarioTelefono}`]
      : []),
    ...(solicitud.mensajeRegalo ? [`• *Dedicatoria:* "${solicitud.mensajeRegalo}"`] : []),
    `• *Solicitante:* ${solicitud.compradorNombre}`,
    `• *WhatsApp solicitante:* ${solicitud.compradorTelefono}`,
    '',
    'Quedo atento(a) para realizar el pago offline en caja o por transferencia y recibir el Código QR del bono. ¡Muchas gracias!',
  ];

  return lineas.join('\n');
}

export function StorefrontBonoRegaloModal({
  isOpen,
  onClose,
  negocioNombre,
  negocioTelefono,
}: StorefrontBonoRegaloModalProps) {
  const titleId = useId();
  const [tipo, setTipo] = useState<TipoBonoPrepago>('bono_regalo');
  const [montoCOP, setMontoCOP] = useState<number>(50000);
  const [vigenciaDias, setVigenciaDias] = useState<60 | 90 | 180 | 365>(90);
  const [recargable, setRecargable] = useState<boolean>(false);
  const [metodoPagoPreferido, setMetodoPagoPreferido] = useState<'transferencia' | 'efectivo'>(
    'transferencia'
  );
  const [ocasion, setOcasion] = useState<OcasionBonoStorefront>('cumpleanos');
  const [destinatarioNombre, setDestinatarioNombre] = useState('');
  const [destinatarioTelefono, setDestinatarioTelefono] = useState('');
  const [compradorNombre, setCompradorNombre] = useState('');
  const [compradorTelefono, setCompradorTelefono] = useState('');
  const [mensajeRegalo, setMensajeRegalo] = useState('');
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState<SolicitudBonoStorefrontConfirmada | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setErrorForm(null);
      setCopiado(false);
    }
  }, [isOpen]);

  const handleSeleccionarTipo = (nuevoTipo: TipoBonoPrepago) => {
    setTipo(nuevoTipo);
    if (nuevoTipo === 'tarjeta_prepago') {
      setRecargable(true);
    }
  };

  const mensajeWhatsApp = useMemo(() => {
    if (!confirmada) return '';
    return formatearMensajeSolicitudBonoStorefront(confirmada, negocioNombre);
  }, [confirmada, negocioNombre]);

  const urlWhatsApp = useMemo(() => {
    if (!confirmada) return '';
    return generarUrlWhatsAppBono(negocioTelefono || '', mensajeWhatsApp);
  }, [confirmada, negocioTelefono, mensajeWhatsApp]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorForm(null);

    const montoSanitizado = sanitizarMontoBonoCOP(montoCOP);
    const destNombreLimpio = destinatarioNombre.trim();
    const destTelLimpio = destinatarioTelefono.trim();
    const compNombreLimpio = compradorNombre.trim();
    const compTelLimpio = compradorTelefono.trim();
    const mensajeLimpio = mensajeRegalo.trim();

    if (montoSanitizado < 10000) {
      setErrorForm('El valor del bono debe ser de al menos $ 10.000 COP.');
      return;
    }

    if (destNombreLimpio.length < 2) {
      setErrorForm('Ingresa el nombre del beneficiario que disfrutará el bono.');
      return;
    }

    if (compNombreLimpio.length < 3) {
      setErrorForm('Ingresa tu nombre completo como solicitante del bono.');
      return;
    }

    const digitosComprador = compTelLimpio.replace(/\D/g, '');
    if (digitosComprador.length < 7) {
      setErrorForm('Ingresa un número de WhatsApp válido de al menos 7 dígitos.');
      return;
    }

    setConfirmada({
      radicado: generarRadicadoBonoStorefront(),
      tipo,
      montoCOP: montoSanitizado,
      vigenciaDias,
      recargable,
      metodoPagoPreferido,
      ocasion,
      compradorNombre: compNombreLimpio,
      compradorTelefono: compTelLimpio,
      destinatarioNombre: destNombreLimpio,
      destinatarioTelefono: destTelLimpio || undefined,
      mensajeRegalo: mensajeLimpio || undefined,
    });
  };

  const handleCopiarResumen = async () => {
    if (!mensajeWhatsApp) return;
    try {
      await navigator.clipboard.writeText(mensajeWhatsApp);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  const handleNuevaSolicitud = () => {
    setConfirmada(null);
    setErrorForm(null);
    setCopiado(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      returnFocusSelector="#storefront-bonos-regalo-button"
      className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 text-white shadow-2xl"
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 border-b border-neutral-800 bg-neutral-900/80 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-rose-500/30 bg-rose-500/15 text-rose-400">
            <Gift size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 id={titleId} className="font-display text-lg font-black text-white sm:text-xl">
              Bonos de Regalo &amp; Tarjetas Prepago
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400">
              Emisión 100% offline con código QR único en {negocioNombre}. Paga en efectivo o
              transferencia y redime en mostrador POS o salón.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar asistente de bonos de regalo"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {confirmada ? (
          <div data-testid="storefront-bono-confirmado" className="space-y-5">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={22}
                  className="mt-0.5 shrink-0 text-emerald-400"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-300">
                    ¡Bono configurado! Radicado {confirmada.radicado}
                  </p>
                  <p className="text-xs text-neutral-300">
                    Envía esta solicitud por WhatsApp para coordinar el pago offline en caja o por
                    transferencia y recibir la tarjeta digital con Código QR Único.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400">Modalidad</p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  {getEtiquetaTipoBono(confirmada.tipo)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400">Valor</p>
                <p className="mt-0.5 font-display text-lg font-black text-amber-400">
                  {formatCOP(confirmada.montoCOP)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400">Vigencia</p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {confirmada.vigenciaDias} días calendario
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                  Pago Offline
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {confirmada.metodoPagoPreferido === 'transferencia'
                    ? 'Transferencia / Nequi / Daviplata'
                    : 'Efectivo en mostrador'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                  Beneficiario
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {confirmada.destinatarioNombre}
                  {confirmada.destinatarioTelefono ? ` · ${confirmada.destinatarioTelefono}` : ''}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                  Solicitante
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {confirmada.compradorNombre} · {confirmada.compradorTelefono}
                </p>
              </div>
              {confirmada.mensajeRegalo && (
                <div className="sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                    Dedicatoria
                  </p>
                  <p className="mt-0.5 text-xs italic text-neutral-200">
                    &ldquo;{confirmada.mensajeRegalo}&rdquo;
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={urlWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-whatsapp-bono-storefront"
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-neutral-950 transition-colors hover:bg-emerald-400"
              >
                <MessageCircle size={18} aria-hidden="true" />
                <span>Solicitar Bono por WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={handleCopiarResumen}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-xs font-bold text-neutral-200 transition-colors hover:border-neutral-600 hover:text-white"
              >
                <Copy size={16} aria-hidden="true" />
                <span>{copiado ? '¡Copiado!' : 'Copiar resumen'}</span>
              </button>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleNuevaSolicitud}
                className="min-h-[44px] px-4 text-xs font-semibold text-amber-400 underline-offset-4 hover:underline"
              >
                Editar o configurar otro bono
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Beneficios clave 100% offline */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
                <p className="text-xs font-bold text-rose-400">Código QR Único</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Tarjeta digital verificable en caja y mesas con saldo protegido.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
                <p className="text-xs font-bold text-emerald-400">100% Offline</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Pagas directamente por transferencia bancaria o efectivo en mostrador.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
                <p className="text-xs font-bold text-amber-400">Redención Flexible</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Consumo parcial o total en mostrador POS y salón sin comisiones.
                </p>
              </div>
            </div>

            {/* 1. Modalidad */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                1. Modalidad del instrumento
              </span>
              <div
                role="group"
                aria-label="Seleccionar modalidad de bono"
                className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
              >
                {MODALIDADES_BONO_STOREFRONT.map((mod) => {
                  const Icono =
                    mod.tipo === 'bono_regalo'
                      ? Gift
                      : mod.tipo === 'tarjeta_prepago'
                        ? CreditCard
                        : Ticket;
                  const activo = tipo === mod.tipo;
                  return (
                    <button
                      key={mod.tipo}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => handleSeleccionarTipo(mod.tipo)}
                      className={`flex min-h-[56px] items-start gap-2.5 rounded-2xl border p-3 text-left transition-all ${
                        activo
                          ? 'border-amber-500 bg-amber-500/15 text-white'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <Icono
                        size={17}
                        className={`mt-0.5 shrink-0 ${activo ? 'text-amber-400' : 'text-neutral-400'}`}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-xs font-bold">{mod.etiqueta}</p>
                        <p className="text-[11px] text-neutral-400">{mod.descripcion}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Valor sugerido */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                2. Valor del bono (COP)
              </span>
              <div
                role="group"
                aria-label="Seleccionar valor sugerido del bono"
                className="flex flex-wrap gap-2"
              >
                {MONTOS_RAPIDOS_BONO_COP.map((monto) => (
                  <button
                    key={monto}
                    type="button"
                    aria-pressed={montoCOP === monto}
                    onClick={() => setMontoCOP(monto)}
                    className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                      montoCOP === monto
                        ? 'border-amber-500 bg-amber-500 text-neutral-950'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    {formatCOP(monto)}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Vigencia y 4. Pago offline */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
                  <CalendarClock size={14} className="text-amber-400" aria-hidden="true" />
                  3. Vigencia del saldo
                </span>
                <div
                  role="group"
                  aria-label="Seleccionar vigencia del bono"
                  className="grid grid-cols-2 gap-2"
                >
                  {VIGENCIAS_STOREFRONT.map((vig) => (
                    <button
                      key={vig.dias}
                      type="button"
                      aria-pressed={vigenciaDias === vig.dias}
                      onClick={() => setVigenciaDias(vig.dias)}
                      className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                        vigenciaDias === vig.dias
                          ? 'border-amber-500 bg-amber-500/15 text-white'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      {vig.etiqueta}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
                  <CreditCard size={14} className="text-emerald-400" aria-hidden="true" />
                  4. Pago offline preferido
                </span>
                <div
                  role="group"
                  aria-label="Seleccionar método de pago offline del bono"
                  className="space-y-2"
                >
                  <button
                    type="button"
                    aria-pressed={metodoPagoPreferido === 'transferencia'}
                    onClick={() => setMetodoPagoPreferido('transferencia')}
                    className={`flex min-h-[48px] w-full flex-col justify-center rounded-xl border px-3.5 py-2 text-left transition-all ${
                      metodoPagoPreferido === 'transferencia'
                        ? 'border-emerald-500 bg-emerald-500/15 text-white'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-xs font-bold">Transferencia / Nequi / Daviplata</span>
                    <span className="text-[11px] text-neutral-400">
                      Envías comprobante por WhatsApp y activamos tu QR
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={metodoPagoPreferido === 'efectivo'}
                    onClick={() => setMetodoPagoPreferido('efectivo')}
                    className={`flex min-h-[48px] w-full flex-col justify-center rounded-xl border px-3.5 py-2 text-left transition-all ${
                      metodoPagoPreferido === 'efectivo'
                        ? 'border-emerald-500 bg-emerald-500/15 text-white'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-xs font-bold">Efectivo en mostrador</span>
                    <span className="text-[11px] text-neutral-400">
                      Pagas y recibes tu bono impreso o digital al instante
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Ocasión */}
            <div className="space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
                <Sparkles size={14} className="text-rose-400" aria-hidden="true" />
                5. Ocasión del regalo
              </span>
              <div
                role="group"
                aria-label="Seleccionar ocasión del regalo"
                className="flex flex-wrap gap-2"
              >
                {OCASIONES_BONO.map((oc) => (
                  <button
                    key={oc.id}
                    type="button"
                    aria-pressed={ocasion === oc.id}
                    onClick={() => setOcasion(oc.id)}
                    className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                      ocasion === oc.id
                        ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    {oc.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {/* Previsualización en vivo de la tarjeta digital */}
            <div
              data-testid="storefront-bono-resumen-vivo"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-neutral-900 via-neutral-950 to-amber-950/30 px-4 py-3.5"
            >
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  {negocioNombre} · {getEtiquetaTipoBono(tipo)}
                </p>
                <p className="text-sm font-bold text-white">
                  Para: {destinatarioNombre.trim() || 'Tu invitado especial'}
                </p>
                <p className="text-xs text-neutral-300">
                  Vigencia {vigenciaDias} días · {ETIQUETA_OCASION[ocasion]} · Pago 100% offline · QR
                  único
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">Saldo</p>
                <p className="font-display text-xl font-black text-amber-400">
                  {formatCOP(montoCOP)}
                </p>
              </div>
            </div>

            {/* 6. Datos de beneficiario y solicitante */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="storefront-bono-destinatario"
                  className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-300"
                >
                  <User size={12} aria-hidden="true" />
                  Nombre del beneficiario (¿Quién recibe?) *
                </label>
                <input
                  id="storefront-bono-destinatario"
                  type="text"
                  required
                  value={destinatarioNombre}
                  onChange={(e) => setDestinatarioNombre(e.target.value)}
                  placeholder="Ej. Camila Rojas"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="storefront-bono-destinatario-tel"
                  className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-300"
                >
                  <Phone size={12} aria-hidden="true" />
                  WhatsApp del beneficiario (opcional)
                </label>
                <input
                  id="storefront-bono-destinatario-tel"
                  type="tel"
                  value={destinatarioTelefono}
                  onChange={(e) => setDestinatarioTelefono(e.target.value)}
                  placeholder="Ej. 3124445566"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="storefront-bono-comprador"
                  className="mb-1 block text-xs font-semibold text-neutral-300"
                >
                  Tu nombre completo (Solicitante) *
                </label>
                <input
                  id="storefront-bono-comprador"
                  type="text"
                  required
                  value={compradorNombre}
                  onChange={(e) => setCompradorNombre(e.target.value)}
                  placeholder="Ej. Laura Méndez"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="storefront-bono-comprador-tel"
                  className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-300"
                >
                  <Phone size={12} aria-hidden="true" />
                  Tu WhatsApp de contacto *
                </label>
                <input
                  id="storefront-bono-comprador-tel"
                  type="tel"
                  required
                  value={compradorTelefono}
                  onChange={(e) => setCompradorTelefono(e.target.value)}
                  placeholder="Ej. 3147778899"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="storefront-bono-mensaje"
                className="mb-1 block text-xs font-semibold text-neutral-300"
              >
                Mensaje o dedicatoria en la tarjeta (opcional)
              </label>
              <textarea
                id="storefront-bono-mensaje"
                rows={2}
                maxLength={180}
                value={mensajeRegalo}
                onChange={(e) => setMensajeRegalo(e.target.value)}
                placeholder="Ej. ¡Feliz cumpleaños! Disfruta tus favoritos en La Parada."
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <label
              htmlFor="storefront-bono-recargable"
              className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/70 px-3.5 py-2.5 text-xs text-neutral-200"
            >
              <input
                id="storefront-bono-recargable"
                type="checkbox"
                checked={recargable}
                onChange={(e) => setRecargable(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-amber-500 focus:ring-amber-500"
              />
              <RefreshCw size={14} className="shrink-0 text-amber-400" aria-hidden="true" />
              <span>Permitir recargas futuras de saldo en caja (efectivo o transferencia)</span>
            </label>

            {errorForm && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-300"
              >
                {errorForm}
              </p>
            )}

            <div className="flex flex-col gap-2.5 border-t border-neutral-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                <ShieldCheck size={14} className="shrink-0 text-emerald-400" aria-hidden="true" />
                Sin pasarelas de pago en línea ni comisiones adicionales.
              </p>

              <button
                type="submit"
                data-testid="btn-confirmar-bono-storefront"
                className="min-h-[48px] rounded-2xl bg-amber-500 px-6 py-3 text-sm font-black text-neutral-950 transition-colors hover:bg-amber-400"
              >
                Preparar Bono por WhatsApp
              </button>
            </div>
          </form>
        )}
      </div>
    </StorefrontDialog>
  );
}
