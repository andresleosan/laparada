import { useState, useId, type FormEvent } from 'react';
import { X, Calendar, Clock, User, Phone, Users, FileText } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { NuevaReservaInput, OrigenReserva, EstadoReserva } from '@/types/reserva';

interface NuevaReservaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NuevaReservaInput) => Promise<void>;
  cargando?: boolean;
}

export function NuevaReservaModal({
  isOpen,
  onClose,
  onSubmit,
  cargando = false,
}: NuevaReservaModalProps) {
  const generatedId = useId();
  const titleId = `modal-reserva-${generatedId.replace(/:/g, '')}-title`;

  // Fecha y hora sugerida: Hoy redondeado a la próxima hora
  const getDefaultDateTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [fechaHoraReserva, setFechaHoraReserva] = useState(getDefaultDateTime());
  const [personas, setPersonas] = useState(2);
  const [origen, setOrigen] = useState<OrigenReserva>('pos');
  const [estado, setEstado] = useState<EstadoReserva>('confirmada');
  const [notas, setNotas] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

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

    try {
      await onSubmit({
        clienteNombre: nombreLimpio,
        clienteTelefono: telLimpio,
        fechaHoraReserva,
        personas,
        origen,
        estado,
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
      <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl">
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
              <p className="text-xs text-neutral-400">Agendar visita de comensales en el local</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorLocal && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {errorLocal}
            </div>
          )}

          {/* Nombre del cliente */}
          <div>
            <label htmlFor="reserva-nombre" className="block text-xs font-semibold text-neutral-300 mb-1.5">
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

          {/* Teléfono */}
          <div>
            <label htmlFor="reserva-telefono" className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Teléfono de contacto (WhatsApp / Llamada) *
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

          {/* Fecha y Hora + Personas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reserva-fecha" className="block text-xs font-semibold text-neutral-300 mb-1.5">
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
              <label htmlFor="reserva-personas" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Personas (Comensales) *
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
          </div>

          {/* Origen y Estado inicial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reserva-origen" className="block text-xs font-semibold text-neutral-300 mb-1.5">
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
              <label htmlFor="reserva-estado" className="block text-xs font-semibold text-neutral-300 mb-1.5">
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
            <label htmlFor="reserva-notas" className="block text-xs font-semibold text-neutral-300 mb-1.5">
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
                placeholder="Ej. Cumpleaños, mesa cerca de la ventana, decorado..."
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
