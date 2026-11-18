import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Phone,
  QrCode,
  Sparkles,
  User,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { MetodoPago } from '@/types';
import type { Mesa } from '@/types/mesa';
import type {
  EstadoAnticipoReserva,
  EstadoReserva,
  NuevaReservaInput,
  OcasionReserva,
  OrigenReserva,
  ReservaNegocio,
} from '@/types/reserva';
import { formatCOP } from '@/utils/formatCOP';
import {
  detectarConflictoHorarioMesa,
  evaluarDisponibilidadMesasParaReserva,
} from '@/utils/reservasUtils';

interface NuevaReservaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NuevaReservaInput) => Promise<void>;
  cargando?: boolean;
  mesas?: Mesa[];
  reservasExistentes?: ReservaNegocio[];
  mesaPreseleccionada?: Mesa | null;
  fechaHoraInicial?: string;
}

const ANTICIPOS_RAPIDOS_COP = [0, 20000, 50000, 100000] as const;

function getDefaultDateTime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function NuevaReservaModal({
  isOpen,
  onClose,
  onSubmit,
  cargando = false,
  mesas = [],
  reservasExistentes = [],
  mesaPreseleccionada = null,
  fechaHoraInicial,
}: NuevaReservaModalProps) {
  const generatedId = useId();
  const titleId = `modal-reserva-${generatedId.replace(/:/g, '')}-title`;

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [fechaHoraReserva, setFechaHoraReserva] = useState(
    () => fechaHoraInicial || getDefaultDateTime()
  );
  const [personas, setPersonas] = useState(2);
  const [origen, setOrigen] = useState<OrigenReserva>('pos');
  const [estado, setEstado] = useState<EstadoReserva>('confirmada');
  const [mesaId, setMesaId] = useState<string>(mesaPreseleccionada?.id || '');
  const [ocasionEspecial, setOcasionEspecial] = useState<OcasionReserva>('ninguna');
  const [anticipoMonto, setAnticipoMonto] = useState<number>(0);
  const [anticipoMetodo, setAnticipoMetodo] = useState<MetodoPago>('transferencia');
  const [anticipoEstado, setAnticipoEstado] = useState<EstadoAnticipoReserva>('pendiente');
  const [anticipoReferencia, setAnticipoReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorLocal(null);
    setClienteNombre('');
    setClienteTelefono('');
    setFechaHoraReserva(fechaHoraInicial || getDefaultDateTime());
    setPersonas(mesaPreseleccionada?.capacidad ? Math.min(mesaPreseleccionada.capacidad, 4) : 2);
    setOrigen('pos');
    setEstado('confirmada');
    setMesaId(mesaPreseleccionada?.id || '');
    setOcasionEspecial('ninguna');
    setAnticipoMonto(0);
    setAnticipoMetodo('transferencia');
    setAnticipoEstado('pendiente');
    setAnticipoReferencia('');
    setNotas('');
  }, [isOpen, mesaPreseleccionada, fechaHoraInicial]);

  const disponibilidadMesas = useMemo(() => {
    if (mesas.length === 0) return [];
    return evaluarDisponibilidadMesasParaReserva({
      mesas,
      reservas: reservasExistentes,
      fechaHoraReserva,
      personas,
    });
  }, [mesas, reservasExistentes, fechaHoraReserva, personas]);

  const mesaSeleccionadaObj = useMemo(
    () => mesas.find((m) => m.id === mesaId) || null,
    [mesas, mesaId]
  );

  const conflictoMesaSeleccionada = useMemo(() => {
    if (!mesaSeleccionadaObj) return { hayConflicto: false };
    return detectarConflictoHorarioMesa({
      mesaId: mesaSeleccionadaObj.id,
      mesaNumero: mesaSeleccionadaObj.numero,
      fechaHoraReserva,
      reservas: reservasExistentes,
    });
  }, [mesaSeleccionadaObj, fechaHoraReserva, reservasExistentes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const nombreLimpio = clienteNombre.trim();
    if (nombreLimpio.length < 2) {
      setErrorLocal('Ingresa el nombre del cliente (mínimo 2 letras).');
      return;
    }

    const telLimpio = clienteTelefono.trim();
    if (telLimpio.length < 7) {
      setErrorLocal('Ingresa un teléfono válido de contacto (mínimo 7 dígitos).');
      return;
    }

    if (!fechaHoraReserva) {
      setErrorLocal('Selecciona la fecha y hora de la reserva.');
      return;
    }

    if (personas < 1 || personas > 50) {
      setErrorLocal('La cantidad de comensales debe ser entre 1 y 50.');
      return;
    }

    const montoSeguro = Math.max(0, Math.round(Number(anticipoMonto) || 0));

    try {
      await onSubmit({
        clienteNombre: nombreLimpio,
        clienteTelefono: telLimpio,
        fechaHoraReserva,
        personas,
        origen,
        estado,
        ...(mesaSeleccionadaObj
          ? {
              mesaId: mesaSeleccionadaObj.id,
              mesaNumero: mesaSeleccionadaObj.numero,
              mesaNombre: mesaSeleccionadaObj.nombre,
              zonaPreferida: mesaSeleccionadaObj.zona,
            }
          : {}),
        ...(ocasionEspecial !== 'ninguna' ? { ocasionEspecial } : {}),
        ...(montoSeguro > 0
          ? {
              anticipoMonto: montoSeguro,
              anticipoMetodo,
              anticipoEstado,
              ...(anticipoReferencia.trim()
                ? { anticipoReferencia: anticipoReferencia.trim() }
                : {}),
            }
          : {}),
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      });
      onClose();
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : 'Error al guardar la reserva.');
    }
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl">
        {/* Cabecera */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/10 text-gold-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Nueva Reserva de Mesa
              </h2>
              <p className="text-xs text-neutral-400">
                Agenda en salón con mapa de mesas y anticipo offline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Cerrar modal de reserva"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorLocal && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {errorLocal}
            </div>
          )}

          {/* Nombre y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reserva-nombre"
                className="block text-xs font-semibold text-neutral-300 mb-1.5"
              >
                Nombre de quien reserva *
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                <input
                  id="reserva-nombre"
                  type="text"
                  required
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej. Carolina Gómez"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reserva-telefono"
                className="block text-xs font-semibold text-neutral-300 mb-1.5"
              >
                Teléfono WhatsApp *
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                <input
                  id="reserva-telefono"
                  type="tel"
                  required
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="Ej. 3124567890"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Fecha/Hora, Personas y Ocasión */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="reserva-fecha"
                className="block text-xs font-semibold text-neutral-300 mb-1.5"
              >
                Fecha y Hora *
              </label>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                <input
                  id="reserva-fecha"
                  type="datetime-local"
                  required
                  value={fechaHoraReserva}
                  onChange={(e) => setFechaHoraReserva(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-3 py-2.5 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reserva-personas"
                className="block text-xs font-semibold text-neutral-300 mb-1.5"
              >
                Comensales *
              </label>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                <input
                  id="reserva-personas"
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={personas}
                  onChange={(e) => setPersonas(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-4 py-2.5 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reserva-ocasion"
                className="block text-xs font-semibold text-neutral-300 mb-1.5"
              >
                Ocasión especial
              </label>
              <select
                id="reserva-ocasion"
                value={ocasionEspecial}
                onChange={(e) => setOcasionEspecial(e.target.value as OcasionReserva)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 min-h-[44px]"
              >
                <option value="ninguna">Sin ocasión especial</option>
                <option value="cumpleanos">🎂 Cumpleaños</option>
                <option value="aniversario">🥂 Aniversario</option>
                <option value="reunion_empresarial">💼 Reunión Empresarial</option>
                <option value="cita">✨ Cita Especial</option>
                <option value="otro">🎉 Otra celebración</option>
              </select>
            </div>
          </div>

          {/* Selector Visual de Mesa en Salón */}
          {disponibilidadMesas.length > 0 && (
            <div className="space-y-2.5 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
                  <Utensils className="h-3.5 w-3.5 text-gold-400" />
                  Asignar Mesa en Salón (Opcional)
                </span>
                <button
                  type="button"
                  aria-pressed={!mesaId}
                  onClick={() => setMesaId('')}
                  className={`min-h-[36px] rounded-xl px-3 text-xs font-semibold border transition-colors ${
                    !mesaId
                      ? 'border-gold-400 bg-gold-400/15 text-gold-400'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  Sin asignar todavía
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                {disponibilidadMesas.map((item) => {
                  const seleccionada = mesaId === item.mesa.id;
                  return (
                    <button
                      key={item.mesa.id}
                      type="button"
                      aria-pressed={seleccionada}
                      onClick={() => setMesaId(item.mesa.id)}
                      className={`flex flex-col items-start rounded-xl border p-2.5 text-left min-h-[44px] transition-all ${
                        seleccionada
                          ? 'border-gold-400 bg-gold-400/15 ring-1 ring-gold-400/50'
                          : !item.disponibleEnHorario
                            ? 'border-red-500/30 bg-red-950/20 text-neutral-300 hover:border-red-400/60'
                            : 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <span className="font-display text-xs font-bold text-white truncate">
                          {item.mesa.nombre}
                        </span>
                        {seleccionada && <CheckCircle2 className="h-3.5 w-3.5 text-gold-400 shrink-0" />}
                      </div>
                      <span className="text-[11px] text-neutral-400 mt-0.5 truncate w-full">
                        {item.mesa.capacidad} sillas · {item.mesa.zona || 'Salón'}
                      </span>
                      {item.recomendada && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          <Sparkles className="h-2.5 w-2.5" /> Recomendada
                        </span>
                      )}
                      {!item.disponibleEnHorario && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                          <AlertTriangle className="h-2.5 w-2.5" /> Conflicto horario
                        </span>
                      )}
                      {item.disponibleEnHorario && !item.capacidadSuficiente && (
                        <span className="mt-1 text-[10px] font-semibold text-amber-400">
                          Capacidad menor ({item.mesa.capacidad} &lt; {personas})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {conflictoMesaSeleccionada.hayConflicto && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    {conflictoMesaSeleccionada.mensaje}. Puedes elegir otra mesa disponible o ajustar la hora.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Anticipo Offline (Transferencia / Efectivo) */}
          <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Anticipo Offline (Transferencia / Efectivo)
              </span>
              {anticipoMonto > 0 && (
                <span className="font-display text-sm font-black text-gold-400">
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
                      ? 'border-gold-400 bg-gold-400 text-neutral-950'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {valor === 0 ? 'Sin anticipo' : formatCOP(valor)}
                </button>
              ))}
              <div className="flex-1 min-w-[130px]">
                <input
                  type="number"
                  min={0}
                  max={50000000}
                  step={1000}
                  aria-label="Monto libre de anticipo en COP"
                  value={anticipoMonto || ''}
                  onChange={(e) => setAnticipoMonto(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="Otro valor COP"
                  className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
                />
              </div>
            </div>

            {anticipoMonto > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="block text-[11px] font-semibold text-neutral-400 mb-1.5">
                    Medio de pago offline
                  </span>
                  <div className="grid grid-cols-2 gap-2">
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
                      <QrCode className="h-3.5 w-3.5" />
                      Transferencia
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
                      <Banknote className="h-3.5 w-3.5" />
                      Efectivo
                    </button>
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-neutral-400 mb-1.5">
                    Estado del anticipo
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={anticipoEstado === 'pendiente'}
                      onClick={() => setAnticipoEstado('pendiente')}
                      className={`min-h-[44px] rounded-xl border px-2.5 text-xs font-bold ${
                        anticipoEstado === 'pendiente'
                          ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      Por verificar
                    </button>
                    <button
                      type="button"
                      aria-pressed={anticipoEstado === 'verificado'}
                      onClick={() => setAnticipoEstado('verificado')}
                      className={`min-h-[44px] rounded-xl border px-2.5 text-xs font-bold ${
                        anticipoEstado === 'verificado'
                          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      Verificado ✓
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="reserva-anticipo-ref"
                    className="block text-[11px] font-semibold text-neutral-400 mb-1"
                  >
                    Comprobante / Referencia (Nequi, Bancolombia, Daviplata o recibo caja)
                  </label>
                  <input
                    id="reserva-anticipo-ref"
                    type="text"
                    maxLength={120}
                    value={anticipoReferencia}
                    onChange={(e) => setAnticipoReferencia(e.target.value)}
                    placeholder="Ej. Nequi #884129 · recibido en caja"
                    className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Origen y Estado inicial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reserva-origen"
                className="block text-xs font-semibold text-neutral-300 mb-1.5"
              >
                Canal de origen
              </label>
              <select
                id="reserva-origen"
                value={origen}
                onChange={(e) => setOrigen(e.target.value as OrigenReserva)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 min-h-[44px]"
              >
                <option value="pos">Punto Físico (POS / Local)</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="web">Tienda Web</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="reserva-estado"
                className="block text-xs font-semibold text-neutral-300 mb-1.5"
              >
                Estado inicial
              </label>
              <select
                id="reserva-estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoReserva)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 min-h-[44px]"
              >
                <option value="confirmada">Confirmada</option>
                <option value="pendiente">Pendiente por confirmar</option>
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label
              htmlFor="reserva-notas"
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              Observaciones o requerimientos (Opcional)
            </label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-500" />
              <textarea
                id="reserva-notas"
                rows={2}
                maxLength={500}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej. Silla para bebé, mesa cerca de la ventana, decoración..."
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="h-11 px-5 rounded-xl border border-neutral-800 bg-neutral-950 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="h-11 px-6 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 text-sm font-bold shadow-lg shadow-gold-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {cargando ? 'Guardando...' : 'Agendar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
