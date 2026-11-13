import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Phone, UserPlus, Users, X } from 'lucide-react';
import type { RegistrarTurnoEsperaInput } from '@/types/espera';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface RegistrarWalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: RegistrarTurnoEsperaInput) => Promise<void>;
  zonasDisponibles: string[];
  estimarTiempo: (personas: number, zonaPreferida?: string) => number;
}

const PRESETS_PERSONAS = [1, 2, 3, 4, 5, 6, 8];

export function RegistrarWalkInModal({
  isOpen,
  onClose,
  onSubmit,
  zonasDisponibles,
  estimarTiempo,
}: RegistrarWalkInModalProps) {
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [personas, setPersonas] = useState(2);
  const [zonaPreferida, setZonaPreferida] = useState('Cualquiera');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, guardando, onClose]);

  if (!isOpen) return null;

  const tiempoEstimado = estimarTiempo(personas, zonaPreferida);
  const opcionesZona = ['Cualquiera', ...zonasDisponibles.filter((z) => z !== 'Cualquiera')];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre.trim()) {
      setErrorLocal('Ingresa el nombre del comensal o grupo.');
      return;
    }

    try {
      setGuardando(true);
      setErrorLocal(null);
      await onSubmit({
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim() || undefined,
        personas,
        zonaPreferida,
        notas: notas.trim() || undefined,
        tiempoEstimadoMin: tiempoEstimado,
      });
      setClienteNombre('');
      setClienteTelefono('');
      setPersonas(2);
      setZonaPreferida('Cualquiera');
      setNotas('');
      onClose();
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : 'Error al registrar turno');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-walkin-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-walkin-title" className="font-display text-lg font-bold text-white">
                Registrar Comensal en Puerta
              </h2>
              <p className="text-xs text-neutral-400">
                Walk-in con estimación automática y aviso por WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de registro en lista de espera"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1">
          {errorLocal && (
            <div className="rounded-xl border border-red-800/80 bg-red-950/60 p-2.5 text-xs text-red-200">
              {errorLocal}
            </div>
          )}

          {/* Estimación dinámica en tiempo real */}
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-amber-200">
              <Clock className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span>Espera estimada para {personas} pers.:</span>
            </div>
            <span className="font-display text-base font-black text-amber-400">
              {tiempoEstimado === 0 ? 'Mesa disponible ya' : `~${tiempoEstimado} min`}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="walkin-nombre" className="mb-1 block text-xs font-semibold text-neutral-300">
                Nombre del comensal *
              </label>
              <Input
                id="walkin-nombre"
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Ej: Valentina Pérez"
                required
              />
            </div>

            <div>
              <label htmlFor="walkin-tel" className="mb-1 block text-xs font-semibold text-neutral-300">
                WhatsApp (para avisarle)
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <Input
                  id="walkin-tel"
                  type="tel"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="300 123 4567"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Selector de personas */}
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
              <Users className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              Número de personas
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS_PERSONAS.map((num) => (
                <button
                  key={num}
                  type="button"
                  aria-pressed={personas === num}
                  onClick={() => setPersonas(num)}
                  className={`min-h-[44px] min-w-[44px] rounded-xl border px-3 text-sm font-bold transition-colors ${
                    personas === num
                      ? 'border-amber-400 bg-amber-500 text-neutral-950'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  {num}
                </button>
              ))}
              <Input
                type="number"
                min={1}
                max={40}
                aria-label="Cantidad personalizada de personas"
                value={personas}
                onChange={(e) => setPersonas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-[44px] w-20 text-center font-bold"
              />
            </div>
          </div>

          {/* Zona preferida */}
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
              <MapPin className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              Zona preferida
            </span>
            <div className="flex flex-wrap gap-2">
              {opcionesZona.map((zona) => (
                <button
                  key={zona}
                  type="button"
                  aria-pressed={zonaPreferida === zona}
                  onClick={() => setZonaPreferida(zona)}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-semibold transition-colors ${
                    zonaPreferida === zona
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  {zona}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="walkin-notas" className="mb-1 block text-xs font-semibold text-neutral-300">
              Notas especiales (opcional)
            </label>
            <Input
              id="walkin-notas"
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Silla para bebé, cumpleaños, cerca al televisor"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px] text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando}
              className="min-h-[44px] bg-amber-500 text-xs font-black text-neutral-950 hover:bg-amber-400"
            >
              {guardando ? 'Registrando...' : 'Agregar a Lista de Espera'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
