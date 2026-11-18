import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  QrCode,
  Sparkles,
  User,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { getMesas } from '@/services/mesasService';
import type { MetodoPago } from '@/types';
import type { Mesa } from '@/types/mesa';
import type { OcasionReserva, ReservaNegocio } from '@/types/reserva';
import { formatCOP } from '@/utils/formatCOP';
import { mesasDefaultIniciales } from '@/utils/mesasUtils';
import {
  construirMensajeConfirmacionReservaWhatsApp,
  evaluarDisponibilidadMesasParaReserva,
  formatearOcasionReserva,
  generarUrlWhatsAppReserva,
} from '@/utils/reservasUtils';

export interface StorefrontReservaModalProps {
  isOpen: boolean;
  onClose: () => void;
  negocioId: string;
  negocioNombre: string;
  negocioTelefono?: string;
  mesasIniciales?: Mesa[];
}

const COMENSALES_RAPIDOS = [2, 4, 6, 8] as const;
const ANTICIPOS_RAPIDOS_COP = [0, 20000, 50000, 100000] as const;

const OPCIONES_OCASION: Array<{ value: OcasionReserva; label: string }> = [
  { value: 'ninguna', label: 'Visita Casual' },
  { value: 'cumpleanos', label: '🎂 Cumpleaños' },
  { value: 'aniversario', label: '🥂 Aniversario' },
  { value: 'reunion_empresarial', label: '💼 Reunión Empresarial' },
  { value: 'cita', label: '✨ Cita Especial' },
];

function getDefaultReservaDateTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T19:30`;
}

function construirMesasFallback(negocioId: string): Mesa[] {
  return mesasDefaultIniciales(negocioId).map((m, idx) => ({
    ...m,
    id: `mesa-${negocioId}-${m.numero || idx + 1}`,
  }));
}

export function StorefrontReservaModal({
  isOpen,
  onClose,
  negocioId,
  negocioNombre,
  negocioTelefono,
  mesasIniciales,
}: StorefrontReservaModalProps) {
  const generatedId = useId();
  const titleId = `storefront-reserva-${generatedId.replace(/:/g, '')}-title`;

  const [mesas, setMesas] = useState<Mesa[]>(() =>
    mesasIniciales && mesasIniciales.length > 0 ? mesasIniciales : []
  );
  const [cargandoMesas, setCargandoMesas] = useState(false);

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [fechaHoraReserva, setFechaHoraReserva] = useState(() => getDefaultReservaDateTime());
  const [personas, setPersonas] = useState(2);
  const [mesaId, setMesaId] = useState('');
  const [ocasionEspecial, setOcasionEspecial] = useState<OcasionReserva>('ninguna');
  const [anticipoMonto, setAnticipoMonto] = useState<number>(0);
  const [anticipoMetodo, setAnticipoMetodo] = useState<MetodoPago>('transferencia');
  const [anticipoReferencia, setAnticipoReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [reservaConfirmada, setReservaConfirmada] = useState<ReservaNegocio | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setErrorLocal(null);
    setReservaConfirmada(null);
    setClienteNombre('');
    setClienteTelefono('');
    setFechaHoraReserva(getDefaultReservaDateTime());
    setPersonas(2);
    setMesaId('');
    setOcasionEspecial('ninguna');
    setAnticipoMonto(0);
    setAnticipoMetodo('transferencia');
    setAnticipoReferencia('');
    setNotas('');

    if (mesasIniciales && mesasIniciales.length > 0) {
      setMesas(mesasIniciales);
      setCargandoMesas(false);
      return;
    }

    let cancelado = false;
    setCargandoMesas(true);

    getMesas(negocioId)
      .then((res) => {
        if (cancelado) return;
        setMesas(res.length > 0 ? res : construirMesasFallback(negocioId));
      })
      .catch(() => {
        if (!cancelado) {
          setMesas(construirMesasFallback(negocioId));
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoMesas(false);
      });

    return () => {
      cancelado = true;
    };
  }, [isOpen, negocioId, mesasIniciales]);

  const disponibilidadMesas = useMemo(() => {
    if (mesas.length === 0) return [];
    return evaluarDisponibilidadMesasParaReserva({
      mesas,
      reservas: [],
      fechaHoraReserva,
      personas,
    });
  }, [mesas, fechaHoraReserva, personas]);

  const mesaActivaId = useMemo(() => {
    if (disponibilidadMesas.length === 0) return '';
    const actualValida = disponibilidadMesas.find(
      (item) => item.mesa.id === mesaId && item.capacidadSuficiente
    );
    if (actualValida) return actualValida.mesa.id;
    const sugerida =
      disponibilidadMesas.find((item) => item.recomendada) ||
      disponibilidadMesas.find((item) => item.capacidadSuficiente);
    return sugerida ? sugerida.mesa.id : '';
  }, [disponibilidadMesas, mesaId]);

  useEffect(() => {
    if (mesaActivaId && mesaActivaId !== mesaId) {
      setMesaId(mesaActivaId);
    }
  }, [mesaActivaId, mesaId]);

  const urlWhatsAppConfirmacion = useMemo(() => {
    if (!reservaConfirmada) return '';
    const mensaje = construirMensajeConfirmacionReservaWhatsApp({
      reserva: reservaConfirmada,
      negocioNombre,
    });
    return generarUrlWhatsAppReserva(negocioTelefono || '3001234567', mensaje);
  }, [reservaConfirmada, negocioNombre, negocioTelefono]);

  if (!isOpen) return null;

  const handleSeleccionarPersonas = (cantidad: number) => {
    const personasValidas = Math.max(1, Math.min(50, Math.floor(Number(cantidad) || 1)));
    setPersonas(personasValidas);
  };

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
      setErrorLocal('Ingresa un número de teléfono o WhatsApp válido (mínimo 7 dígitos).');
      return;
    }

    if (!fechaHoraReserva.trim()) {
      setErrorLocal('Selecciona la fecha y hora de tu reserva.');
      return;
    }

    const mesaSeleccionada = mesas.find((m) => m.id === mesaActivaId) || null;
    const montoLimpio = Math.max(0, Math.round(Number(anticipoMonto) || 0));

    const nuevaReserva: ReservaNegocio = {
      id: 'RES-WEB',
      negocioId,
      clienteNombre: nombreLimpio,
      clienteTelefono: telLimpio,
      fechaHoraReserva: fechaHoraReserva.trim(),
      personas: Math.max(1, Math.min(50, Math.floor(Number(personas) || 2))),
      ...(mesaSeleccionada
        ? {
            mesaId: mesaSeleccionada.id,
            mesaNumero: mesaSeleccionada.numero,
            mesaNombre: mesaSeleccionada.nombre,
            zonaPreferida: mesaSeleccionada.zona,
          }
        : {}),
      ...(ocasionEspecial !== 'ninguna' ? { ocasionEspecial } : {}),
      ...(montoLimpio > 0
        ? {
            anticipoMonto: montoLimpio,
            anticipoMetodo,
            anticipoEstado: 'pendiente' as const,
            ...(anticipoReferencia.trim() ? { anticipoReferencia: anticipoReferencia.trim() } : {}),
          }
        : { anticipoEstado: 'sin_anticipo' as const }),
      ...(notas.trim() ? { notas: notas.trim() } : {}),
      estado: 'pendiente',
      origen: 'web',
      creadoEn: new Date().toISOString(),
    };

    setReservaConfirmada(nuevaReserva);
  };

  const ocasionConfirmadaMeta = reservaConfirmada
    ? formatearOcasionReserva(reservaConfirmada.ocasionEspecial)
    : null;

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      returnFocusSelector="#storefront-reserva-button"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-3xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6 text-white shadow-2xl space-y-5">
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Calendar className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-black text-white leading-tight">
                Reservar Mesa en {negocioNombre}
              </h2>
              <p className="text-xs text-neutral-400">
                Elige tu mesa, ocasión especial y coordina sin pasarelas en línea
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de reserva"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {reservaConfirmada ? (
          <div data-testid="storefront-reserva-confirmada" className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </div>
              <h3 className="font-display text-xl font-black text-white">
                ¡Solicitud de Reserva Lista!
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Envía este resumen por WhatsApp para que el equipo de{' '}
                <strong className="text-amber-300">{negocioNombre}</strong> confirme tu mesa al instante.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
                <span className="text-neutral-400">Cliente:</span>
                <span className="font-bold text-white">
                  {reservaConfirmada.clienteNombre} · {reservaConfirmada.clienteTelefono}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
                <span className="text-neutral-400">Fecha y Comensales:</span>
                <span className="font-bold text-white">
                  {reservaConfirmada.fechaHoraReserva.replace('T', ' ')} · {reservaConfirmada.personas}{' '}
                  {reservaConfirmada.personas === 1 ? 'persona' : 'personas'}
                </span>
              </div>
              {reservaConfirmada.mesaNombre && (
                <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
                  <span className="text-neutral-400">Mesa elegida:</span>
                  <span className="font-bold text-amber-300">
                    {reservaConfirmada.mesaNombre}
                    {reservaConfirmada.zonaPreferida ? ` · ${reservaConfirmada.zonaPreferida}` : ''}
                  </span>
                </div>
              )}
              {ocasionConfirmadaMeta && (
                <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
                  <span className="text-neutral-400">Ocasión especial:</span>
                  <span className="font-bold text-white">
                    {ocasionConfirmadaMeta.emoji} {ocasionConfirmadaMeta.label}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-400">Anticipo offline:</span>
                {reservaConfirmada.anticipoMonto && reservaConfirmada.anticipoMonto > 0 ? (
                  <span className="font-bold text-emerald-300">
                    {formatCOP(reservaConfirmada.anticipoMonto)} ·{' '}
                    {reservaConfirmada.anticipoMetodo === 'efectivo'
                      ? 'Efectivo'
                      : 'Transferencia manual'}
                    {reservaConfirmada.anticipoReferencia
                      ? ` (Ref: ${reservaConfirmada.anticipoReferencia})`
                      : ''}
                  </span>
                ) : (
                  <span className="font-semibold text-neutral-300">Sin anticipo requerido</span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <a
                data-testid="link-whatsapp-reserva-storefront"
                href={urlWhatsAppConfirmacion}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-neutral-950 shadow-lg hover:bg-emerald-400 transition-colors"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Confirmar Reserva por WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setReservaConfirmada(null)}
                className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-xs font-bold text-neutral-200 hover:bg-neutral-700 transition-colors"
              >
                Editar Datos
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorLocal && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs font-semibold text-red-300"
              >
                {errorLocal}
              </div>
            )}

            {/* Datos de contacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="storefront-reserva-nombre"
                  className="block text-xs font-semibold text-neutral-300 mb-1.5"
                >
                  Tu Nombre Completo *
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                  <input
                    id="storefront-reserva-nombre"
                    type="text"
                    required
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Ej: Mariana Duarte"
                    className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="storefront-reserva-telefono"
                  className="block text-xs font-semibold text-neutral-300 mb-1.5"
                >
                  Teléfono WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                  <input
                    id="storefront-reserva-telefono"
                    type="tel"
                    inputMode="tel"
                    required
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    placeholder="Ej: 3105551234"
                    className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Fecha/Hora y Comensales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="storefront-reserva-fecha"
                  className="block text-xs font-semibold text-neutral-300 mb-1.5"
                >
                  Fecha y Hora *
                </label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                  <input
                    id="storefront-reserva-fecha"
                    type="datetime-local"
                    required
                    value={fechaHoraReserva}
                    onChange={(e) => setFechaHoraReserva(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="storefront-reserva-personas"
                  className="block text-xs font-semibold text-neutral-300 mb-1.5"
                >
                  Número de Comensales *
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {COMENSALES_RAPIDOS.map((num) => (
                    <button
                      key={num}
                      type="button"
                      aria-pressed={personas === num}
                      onClick={() => handleSeleccionarPersonas(num)}
                      className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                        personas === num
                          ? 'border-amber-400 bg-amber-400 text-neutral-950'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      {num} pers.
                    </button>
                  ))}
                  <div className="relative flex-1 min-w-[78px]">
                    <Users className="pointer-events-none absolute left-2.5 top-3.5 h-3.5 w-3.5 text-neutral-500" />
                    <input
                      id="storefront-reserva-personas"
                      type="number"
                      min={1}
                      max={50}
                      value={personas}
                      onChange={(e) => handleSeleccionarPersonas(parseInt(e.target.value, 10) || 1)}
                      aria-label="Cantidad exacta de comensales"
                      className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-8 pr-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mapa Interactivo de Mesas */}
            <div className="space-y-2.5 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <Utensils className="h-3.5 w-3.5" aria-hidden="true" />
                  Mapa de Mesas y Zonas
                </span>
                <span className="text-[11px] text-neutral-400">
                  Para {personas} {personas === 1 ? 'persona' : 'personas'}
                </span>
              </div>

              {cargandoMesas ? (
                <p className="py-4 text-center text-xs text-neutral-400">
                  Cargando mapa de mesas disponibles...
                </p>
              ) : (
                <div
                  data-testid="storefront-mapa-mesas"
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                >
                  {disponibilidadMesas.map((item) => {
                    const seleccionada = mesaActivaId === item.mesa.id;
                    return (
                      <button
                        key={item.mesa.id}
                        type="button"
                        data-testid={`btn-mesa-reserva-${item.mesa.numero}`}
                        aria-pressed={seleccionada}
                        disabled={!item.capacidadSuficiente}
                        onClick={() => setMesaId(item.mesa.id)}
                        className={`flex min-h-[44px] flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                          !item.capacidadSuficiente
                            ? 'cursor-not-allowed border-neutral-800/70 bg-neutral-900/40 text-neutral-500 opacity-55'
                            : seleccionada
                              ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/50 text-white'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between gap-1">
                          <span className="font-display text-xs font-bold truncate">
                            {item.mesa.nombre}
                          </span>
                          {seleccionada && (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                          )}
                        </div>
                        <span className="mt-0.5 text-[11px] text-neutral-400 truncate w-full">
                          {item.mesa.zona || 'Salón Principal'} · {item.mesa.capacidad} pers.
                        </span>
                        {item.recomendada && item.capacidadSuficiente && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                            🌟 Sugerida
                          </span>
                        )}
                        {!item.capacidadSuficiente && (
                          <span className="mt-1 text-[10px] font-semibold text-amber-400/80">
                            Capacidad insuficiente
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ocasión Especial */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-neutral-300">
                Ocasión Especial (Opcional)
              </span>
              <div className="flex flex-wrap gap-2">
                {OPCIONES_OCASION.map((op) => (
                  <button
                    key={op.value}
                    type="button"
                    aria-pressed={ocasionEspecial === op.value}
                    onClick={() => setOcasionEspecial(op.value)}
                    className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                      ocasionEspecial === op.value
                        ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Anticipo Offline */}
            <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Anticipo Offline (Opcional)
                </span>
                {anticipoMonto > 0 && (
                  <span className="font-display text-sm font-black text-amber-400">
                    {formatCOP(anticipoMonto)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {ANTICIPOS_RAPIDOS_COP.map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={anticipoMonto === valor}
                    onClick={() => setAnticipoMonto(valor)}
                    className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                      anticipoMonto === valor
                        ? 'border-amber-400 bg-amber-400 text-neutral-950'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    {valor === 0 ? 'Sin anticipo' : formatCOP(valor)}
                  </button>
                ))}
              </div>

              {anticipoMonto > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[11px] font-semibold text-neutral-400 mb-1.5">
                        Medio de pago offline
                      </span>
                      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Medio de pago offline">
                        <button
                          type="button"
                          aria-pressed={anticipoMetodo === 'transferencia'}
                          onClick={() => setAnticipoMetodo('transferencia')}
                          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold ${
                            anticipoMetodo === 'transferencia'
                              ? 'border-sky-400 bg-sky-500/15 text-sky-300'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                          }`}
                        >
                          <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Transferencia manual</span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={anticipoMetodo === 'efectivo'}
                          onClick={() => setAnticipoMetodo('efectivo')}
                          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold ${
                            anticipoMetodo === 'efectivo'
                              ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                          }`}
                        >
                          <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Efectivo</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="storefront-reserva-referencia"
                        className="block text-[11px] font-semibold text-neutral-400 mb-1.5"
                      >
                        Referencia o comprobante (Opcional)
                      </label>
                      <input
                        id="storefront-reserva-referencia"
                        type="text"
                        maxLength={120}
                        value={anticipoReferencia}
                        onChange={(e) => setAnticipoReferencia(e.target.value)}
                        placeholder="Ej: NEQUI-998877"
                        className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <p className="rounded-xl border border-purple-500/30 bg-neutral-900 p-2.5 text-[11px] text-neutral-300">
                    Coordinación 100% offline: el comprobante se envía directamente por WhatsApp o se
                    cancela en el punto físico. La app no procesa pagos en línea.
                  </p>
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <label
                htmlFor="storefront-reserva-notas"
                className="block text-xs font-semibold text-neutral-300 mb-1.5"
              >
                Notas o requerimientos especiales (Opcional)
              </label>
              <input
                id="storefront-reserva-notas"
                type="text"
                maxLength={500}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Silla para bebé, mesa cerca de la ventana..."
                className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 text-xs font-bold text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[44px] flex-1 rounded-xl bg-amber-500 px-4 text-xs font-black text-neutral-950 shadow-lg hover:bg-amber-400 transition-colors"
              >
                Confirmar Solicitud de Reserva
              </button>
            </div>
          </form>
        )}
      </div>
    </StorefrontDialog>
  );
}

export default StorefrontReservaModal;
