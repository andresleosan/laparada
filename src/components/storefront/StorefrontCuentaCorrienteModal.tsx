import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  MessageCircle,
  Phone,
  ShieldCheck,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { formatCOP } from '@/utils/formatCOP';
import { generarUrlWhatsAppReserva } from '@/utils/reservasUtils';

export interface StorefrontCuentaCorrienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  negocioNombre: string;
  negocioTelefono?: string;
}

export type TipoSolicitudCuentaCorriente = 'personal' | 'corporativo';

export interface SolicitudCuentaCorrienteConfirmada {
  radicado: string;
  tipoCuenta: TipoSolicitudCuentaCorriente;
  cupoSolicitadoCOP: number;
  plazoDias: 7 | 15 | 30;
  metodoAbonoPreferido: 'transferencia' | 'efectivo';
  clienteNombre: string;
  clienteTelefono: string;
  empresa?: string;
  nit?: string;
  notas?: string;
}

const CUPOS_SUGERIDOS_COP = [100000, 200000, 350000, 500000, 1000000] as const;

const PLAZOS_CORTE: readonly { dias: 7 | 15 | 30; etiqueta: string; descripcion: string }[] = [
  { dias: 7, etiqueta: '7 días · Semanal', descripcion: 'Corte todos los lunes' },
  { dias: 15, etiqueta: '15 días · Quincenal', descripcion: 'Ideal equipos y nóminas' },
  { dias: 30, etiqueta: '30 días · Mensual', descripcion: 'Convenios empresariales' },
] as const;

function generarRadicadoCuentaCorriente(): string {
  const sufijo = String(Date.now()).slice(-4);
  return `CTA-${sufijo}`;
}

export function formatearMensajeSolicitudCuentaCorriente(
  solicitud: SolicitudCuentaCorrienteConfirmada,
  negocioNombre: string
): string {
  const tipoLabel =
    solicitud.tipoCuenta === 'corporativo'
      ? 'Convenio Corporativo / Empresa'
      : 'Cuenta Corriente Personal (Cliente Frecuente)';
  const metodoLabel =
    solicitud.metodoAbonoPreferido === 'transferencia'
      ? 'Transferencia bancaria / Nequi / Daviplata (offline)'
      : 'Efectivo directo en mostrador';

  const lineas: string[] = [
    `Hola *${negocioNombre}*, solicito apertura de *Cuenta Corriente / Cupo de Crédito Offline*:`,
    '',
    `• *Radicado:* ${solicitud.radicado}`,
    `• *Modalidad:* ${tipoLabel}`,
    `• *Cupo solicitado:* ${formatCOP(solicitud.cupoSolicitadoCOP)}`,
    `• *Plazo de corte:* ${solicitud.plazoDias} días`,
    `• *Abono preferido:* ${metodoLabel}`,
    '',
    `• *Titular / Contacto:* ${solicitud.clienteNombre}`,
    `• *WhatsApp:* ${solicitud.clienteTelefono}`,
  ];

  if (solicitud.empresa) {
    lineas.push(`• *Empresa:* ${solicitud.empresa}`);
  }
  if (solicitud.nit) {
    lineas.push(`• *NIT / Documento:* ${solicitud.nit}`);
  }
  if (solicitud.notas) {
    lineas.push(`• *Notas adicionales:* ${solicitud.notas}`);
  }

  lineas.push('');
  lineas.push('Quedo atento(a) a la activación de mi cupo en caja. ¡Muchas gracias!');

  return lineas.join('\n');
}

export function StorefrontCuentaCorrienteModal({
  isOpen,
  onClose,
  negocioNombre,
  negocioTelefono,
}: StorefrontCuentaCorrienteModalProps) {
  const titleId = useId();
  const [tipoCuenta, setTipoCuenta] = useState<TipoSolicitudCuentaCorriente>('corporativo');
  const [cupoSolicitado, setCupoSolicitado] = useState<number>(350000);
  const [plazoDias, setPlazoDias] = useState<7 | 15 | 30>(15);
  const [metodoAbonoPreferido, setMetodoAbonoPreferido] = useState<'transferencia' | 'efectivo'>(
    'transferencia'
  );
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [nit, setNit] = useState('');
  const [notas, setNotas] = useState('');
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState<SolicitudCuentaCorrienteConfirmada | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setErrorForm(null);
      setCopiado(false);
    }
  }, [isOpen]);

  const mensajeWhatsApp = useMemo(() => {
    if (!confirmada) return '';
    return formatearMensajeSolicitudCuentaCorriente(confirmada, negocioNombre);
  }, [confirmada, negocioNombre]);

  const urlWhatsApp = useMemo(() => {
    if (!confirmada) return '';
    return generarUrlWhatsAppReserva(negocioTelefono || '', mensajeWhatsApp);
  }, [confirmada, negocioTelefono, mensajeWhatsApp]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorForm(null);

    const nombreLimpio = clienteNombre.trim();
    const telefonoLimpio = clienteTelefono.trim();
    const empresaLimpia = empresa.trim();
    const nitLimpio = nit.trim();
    const notasLimpias = notas.trim();

    if (nombreLimpio.length < 3) {
      setErrorForm('Ingresa tu nombre completo para registrar la solicitud.');
      return;
    }

    const digitosTelefono = telefonoLimpio.replace(/\D/g, '');
    if (digitosTelefono.length < 7) {
      setErrorForm('Ingresa un número de WhatsApp válido (mínimo 7 dígitos).');
      return;
    }

    if (tipoCuenta === 'corporativo' && empresaLimpia.length < 2) {
      setErrorForm('Indica el nombre de la empresa u oficina para el convenio corporativo.');
      return;
    }

    if (!Number.isFinite(cupoSolicitado) || cupoSolicitado < 50000) {
      setErrorForm('El cupo solicitado debe ser de al menos $ 50.000 COP.');
      return;
    }

    setConfirmada({
      radicado: generarRadicadoCuentaCorriente(),
      tipoCuenta,
      cupoSolicitadoCOP: Math.round(cupoSolicitado),
      plazoDias,
      metodoAbonoPreferido,
      clienteNombre: nombreLimpio,
      clienteTelefono: telefonoLimpio,
      empresa: empresaLimpia || undefined,
      nit: nitLimpio || undefined,
      notas: notasLimpias || undefined,
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
      returnFocusSelector="#storefront-cuenta-corriente-button"
      className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 text-white shadow-2xl"
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 border-b border-neutral-800 bg-neutral-900/80 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
            <Wallet size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 id={titleId} className="font-display text-lg font-black text-white sm:text-xl">
              Cuenta Corriente &amp; Convenio Corporativo
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400">
              Solicita cupo de consumo a crédito 100% offline en {negocioNombre} y abona en efectivo
              o transferencia sin intereses.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar solicitud de cuenta corriente"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {confirmada ? (
          <div
            data-testid="storefront-cuenta-corriente-confirmada"
            className="space-y-5"
          >
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={22}
                  className="mt-0.5 shrink-0 text-emerald-400"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-300">
                    ¡Solicitud preparada! Radicado {confirmada.radicado}
                  </p>
                  <p className="text-xs text-neutral-300">
                    Envíala ahora por WhatsApp para que nuestro equipo valide tu cupo en caja y
                    active tu cuenta corriente sin trámites bancarios.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400">Modalidad</p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  {confirmada.tipoCuenta === 'corporativo'
                    ? 'Convenio Corporativo / Empresa'
                    : 'Cliente Frecuente / Personal'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                  Cupo Solicitado
                </p>
                <p className="mt-0.5 font-display text-lg font-black text-amber-400">
                  {formatCOP(confirmada.cupoSolicitadoCOP)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                  Plazo de Corte
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {confirmada.plazoDias} días calendario
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                  Abono Offline Preferido
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {confirmada.metodoAbonoPreferido === 'transferencia'
                    ? 'Transferencia / Nequi / Daviplata'
                    : 'Efectivo en mostrador'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400">Titular</p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {confirmada.clienteNombre} · {confirmada.clienteTelefono}
                </p>
              </div>
              {confirmada.empresa && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-neutral-400">Empresa</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">
                    {confirmada.empresa}
                    {confirmada.nit ? ` · NIT ${confirmada.nit}` : ''}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={urlWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-whatsapp-cuenta-corriente-storefront"
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-neutral-950 transition-colors hover:bg-emerald-400"
              >
                <MessageCircle size={18} aria-hidden="true" />
                <span>Enviar Solicitud por WhatsApp</span>
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
                Editar o crear otra solicitud
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Beneficios clave 100% offline */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
                <p className="text-xs font-bold text-amber-400">0% Intereses</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Consumes hoy y liquidas al corte acordado sin recargos.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
                <p className="text-xs font-bold text-emerald-400">100% Offline</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Abonos directos en efectivo en mostrador o transferencia bancaria.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
                <p className="text-xs font-bold text-sky-400">Control por WhatsApp</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Recibe tu estado de cuenta y comprobante de cada abono.
                </p>
              </div>
            </div>

            {/* 1. Modalidad de cuenta */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                1. Tipo de cuenta corriente
              </span>
              <div
                role="group"
                aria-label="Seleccionar tipo de cuenta corriente"
                className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
              >
                <button
                  type="button"
                  aria-pressed={tipoCuenta === 'corporativo'}
                  onClick={() => setTipoCuenta('corporativo')}
                  className={`flex min-h-[52px] items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                    tipoCuenta === 'corporativo'
                      ? 'border-amber-500 bg-amber-500/15 text-white'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <Building2
                    size={18}
                    className={tipoCuenta === 'corporativo' ? 'text-amber-400' : 'text-neutral-400'}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-bold">Convenio Corporativo / Empresa</p>
                    <p className="text-[11px] text-neutral-400">
                      Oficinas, equipos de trabajo y pedidos recurrentes
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  aria-pressed={tipoCuenta === 'personal'}
                  onClick={() => setTipoCuenta('personal')}
                  className={`flex min-h-[52px] items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                    tipoCuenta === 'personal'
                      ? 'border-amber-500 bg-amber-500/15 text-white'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <User
                    size={18}
                    className={tipoCuenta === 'personal' ? 'text-amber-400' : 'text-neutral-400'}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-bold">Cliente Frecuente / Personal</p>
                    <p className="text-[11px] text-neutral-400">
                      Fiado controlado en mostrador y salón
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Cupo sugerido */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                2. Cupo de crédito solicitado (COP)
              </span>
              <div
                role="group"
                aria-label="Seleccionar cupo sugerido de crédito"
                className="flex flex-wrap gap-2"
              >
                {CUPOS_SUGERIDOS_COP.map((monto) => (
                  <button
                    key={monto}
                    type="button"
                    aria-pressed={cupoSolicitado === monto}
                    onClick={() => setCupoSolicitado(monto)}
                    className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                      cupoSolicitado === monto
                        ? 'border-amber-500 bg-amber-500 text-neutral-950'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    {formatCOP(monto)}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Plazo de corte y método de abono offline */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
                  <CalendarClock size={14} className="text-amber-400" aria-hidden="true" />
                  3. Plazo de corte
                </span>
                <div
                  role="group"
                  aria-label="Seleccionar plazo de corte"
                  className="space-y-2"
                >
                  {PLAZOS_CORTE.map((plazo) => (
                    <button
                      key={plazo.dias}
                      type="button"
                      aria-pressed={plazoDias === plazo.dias}
                      onClick={() => setPlazoDias(plazo.dias)}
                      className={`flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3.5 py-2 text-left text-xs transition-all ${
                        plazoDias === plazo.dias
                          ? 'border-amber-500 bg-amber-500/15 text-white'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <span className="font-bold">{plazo.etiqueta}</span>
                      <span className="text-[11px] text-neutral-400">{plazo.descripcion}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
                  <CreditCard size={14} className="text-emerald-400" aria-hidden="true" />
                  4. Abono offline preferido
                </span>
                <div
                  role="group"
                  aria-label="Seleccionar método de abono offline"
                  className="space-y-2"
                >
                  <button
                    type="button"
                    aria-pressed={metodoAbonoPreferido === 'transferencia'}
                    onClick={() => setMetodoAbonoPreferido('transferencia')}
                    className={`flex min-h-[48px] w-full flex-col justify-center rounded-xl border px-3.5 py-2 text-left transition-all ${
                      metodoAbonoPreferido === 'transferencia'
                        ? 'border-emerald-500 bg-emerald-500/15 text-white'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-xs font-bold">Transferencia / Nequi / Daviplata</span>
                    <span className="text-[11px] text-neutral-400">
                      Envías comprobante directo por WhatsApp
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={metodoAbonoPreferido === 'efectivo'}
                    onClick={() => setMetodoAbonoPreferido('efectivo')}
                    className={`flex min-h-[48px] w-full flex-col justify-center rounded-xl border px-3.5 py-2 text-left transition-all ${
                      metodoAbonoPreferido === 'efectivo'
                        ? 'border-emerald-500 bg-emerald-500/15 text-white'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-xs font-bold">Efectivo en mostrador</span>
                    <span className="text-[11px] text-neutral-400">
                      Abono parcial o total directo en caja
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Resumen en vivo */}
            <div
              data-testid="storefront-cuenta-corriente-resumen-vivo"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  Resumen de tu solicitud
                </p>
                <p className="text-xs text-neutral-200">
                  {tipoCuenta === 'corporativo' ? 'Convenio Corporativo' : 'Cuenta Personal'} ·
                  Corte cada {plazoDias} días · 0% intereses
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">Cupo</p>
                <p className="font-display text-xl font-black text-amber-400">
                  {formatCOP(cupoSolicitado)}
                </p>
              </div>
            </div>

            {/* 5. Datos de contacto */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="storefront-cartera-nombre"
                  className="mb-1 block text-xs font-semibold text-neutral-300"
                >
                  Nombre completo del titular *
                </label>
                <input
                  id="storefront-cartera-nombre"
                  type="text"
                  required
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej. Andrés Gómez"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="storefront-cartera-telefono"
                  className="mb-1 flex items-center gap-1 text-xs font-semibold text-neutral-300"
                >
                  <Phone size={12} aria-hidden="true" />
                  WhatsApp de contacto *
                </label>
                <input
                  id="storefront-cartera-telefono"
                  type="tel"
                  required
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="Ej. 3158889900"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="storefront-cartera-empresa"
                  className="mb-1 block text-xs font-semibold text-neutral-300"
                >
                  Empresa / Oficina {tipoCuenta === 'corporativo' ? '*' : '(opcional)'}
                </label>
                <input
                  id="storefront-cartera-empresa"
                  type="text"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Ej. Clínica Norte SAS"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="storefront-cartera-nit"
                  className="mb-1 block text-xs font-semibold text-neutral-300"
                >
                  NIT o Cédula (opcional)
                </label>
                <input
                  id="storefront-cartera-nit"
                  type="text"
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  placeholder="Ej. 901.234.567-8"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="storefront-cartera-notas"
                className="mb-1 block text-xs font-semibold text-neutral-300"
              >
                Personas autorizadas o notas del convenio (opcional)
              </label>
              <textarea
                id="storefront-cartera-notas"
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej. Autorizados: María y Carlos · Pedidos de almuerzo de lunes a viernes."
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

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
                Sin tarjetas de crédito ni cobros automáticos en línea.
              </p>

              <button
                type="submit"
                data-testid="btn-confirmar-cuenta-corriente-storefront"
                className="min-h-[48px] rounded-2xl bg-amber-500 px-6 py-3 text-sm font-black text-neutral-950 transition-colors hover:bg-amber-400"
              >
                Preparar Solicitud de Cupo
              </button>
            </div>
          </form>
        )}
      </div>
    </StorefrontDialog>
  );
}
