import { useState, useId, useEffect, useRef, type FormEvent } from 'react';
import { MapPin, Plus, Users, Utensils, X } from 'lucide-react';

export interface NuevaMesaModalProps {
  isOpen: boolean;
  zonasExistentes: string[];
  siguienteNumero: number;
  onClose: () => void;
  onSubmit: (data: {
    numero: number;
    nombre: string;
    capacidad: number;
    zona: string;
  }) => Promise<void>;
  cargando?: boolean;
}

export function NuevaMesaModal({
  isOpen,
  zonasExistentes,
  siguienteNumero,
  onClose,
  onSubmit,
  cargando = false,
}: NuevaMesaModalProps) {
  const generatedId = useId();
  const titleId = `modal-nueva-mesa-${generatedId.replace(/:/g, '')}-title`;
  const modalRef = useRef<HTMLDivElement>(null);

  const [numero, setNumero] = useState<number>(siguienteNumero || 1);
  const [nombre, setNombre] = useState<string>(`Mesa ${siguienteNumero || 1}`);
  const [capacidad, setCapacidad] = useState<number>(4);
  const [zona, setZona] = useState<string>(zonasExistentes[0] || 'Salón Principal');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const numLimpio = Math.max(1, Math.floor(numero || 1));
    const nomLimpio = (nombre || `Mesa ${numLimpio}`).trim();
    const capLimpia = Math.max(1, Math.floor(capacidad || 4));
    const zonaLimpia = (zona || 'Salón Principal').trim();

    try {
      await onSubmit({
        numero: numLimpio,
        nombre: nomLimpio,
        capacidad: capLimpia,
        zona: zonaLimpia,
      });
      onClose();
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : 'Error al crear la mesa.');
    }
  };

  const zonasPredeterminadas = Array.from(
    new Set(['Salón Principal', 'Terraza', 'Barra', 'VIP', ...zonasExistentes])
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-xl font-bold text-white">
                Nueva Mesa en Salón
              </h2>
              <p className="text-xs text-neutral-400">
                Configura un nuevo punto de atención para comensales
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorLocal && (
          <div className="mt-4 rounded-xl bg-red-950/50 border border-red-500/50 p-3 text-xs text-red-300">
            {errorLocal}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Número
              </label>
              <input
                type="number"
                min="1"
                value={numero}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 1);
                  setNumero(val);
                  setNombre(`Mesa ${val}`);
                }}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 px-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Capacidad
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={capacidad}
                  onChange={(e) => setCapacidad(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Nombre de la Mesa
            </label>
            <div className="relative">
              <Utensils className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                placeholder="Ej. Mesa 1, Barra 2..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Zona o Ambiente
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                list="zonas-sugeridas"
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                placeholder="Ej. Salón Principal, Terraza, Barra..."
                required
              />
              <datalist id="zonas-sugeridas">
                {zonasPredeterminadas.map((z) => (
                  <option key={z} value={z} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-2.5 text-sm font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {cargando ? 'Guardando...' : 'Crear Mesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
