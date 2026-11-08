import { useState, useId, useEffect, useRef, type FormEvent } from 'react';
import { FileText, Phone, User, Users, Utensils, X } from 'lucide-react';
import type { Mesa } from '@/types/mesa';

export interface AbrirMesaModalProps {
  isOpen: boolean;
  mesa: Mesa | null;
  onClose: () => void;
  onSubmit: (params: {
    mesaId: string;
    comensales: number;
    mesero?: string;
    meseroId?: string;
    meseroNombre?: string;
    clienteNombre?: string;
    clienteTelefono?: string;
    notas?: string;
  }) => Promise<void>;
  cargando?: boolean;
  meserosDisponibles?: Array<{ id: string; nombre: string }>;
}

export function AbrirMesaModal({
  isOpen,
  mesa,
  onClose,
  onSubmit,
  cargando = false,
  meserosDisponibles = [],
}: AbrirMesaModalProps) {
  const generatedId = useId();
  const titleId = `modal-abrir-mesa-${generatedId.replace(/:/g, '')}-title`;
  const modalRef = useRef<HTMLDivElement>(null);

  const [comensales, setComensales] = useState<number>(mesa?.capacidad || 2);
  const [mesero, setMesero] = useState('');
  const [meseroId, setMeseroId] = useState<string | undefined>(undefined);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mesa) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const cant = Math.max(1, Math.floor(comensales || 1));
    if (cant < 1 || cant > 50) {
      setErrorLocal('La cantidad de comensales debe estar entre 1 y 50.');
      return;
    }

    try {
      await onSubmit({
        mesaId: mesa.id,
        comensales: cant,
        mesero: mesero.trim() || undefined,
        meseroId: meseroId || undefined,
        meseroNombre: mesero.trim() || undefined,
        clienteNombre: clienteNombre.trim() || undefined,
        clienteTelefono: clienteTelefono.trim() || undefined,
        notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : 'Error al abrir la mesa.');
    }
  };

  const opcionesRapidas = [1, 2, 4, 6, 8];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Utensils className="h-6 w-6" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-xl font-bold text-white">
                Abrir {mesa.nombre}
              </h2>
              <p className="text-xs text-neutral-400">
                {mesa.zona} · Capacidad: {mesa.capacidad} personas
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
          {/* Selector de Comensales */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Número de Comensales
            </label>
            <div className="flex items-center gap-2 mb-2">
              {opcionesRapidas.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setComensales(num)}
                  aria-pressed={comensales === num}
                  className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all ${
                    comensales === num
                      ? 'bg-amber-400 text-neutral-950 shadow-md font-black'
                      : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="relative">
              <Users className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
              <input
                type="number"
                min="1"
                max="50"
                value={comensales}
                onChange={(e) => setComensales(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                placeholder="Cantidad manual"
                required
              />
            </div>
          </div>

          {/* Mesero Asignado */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Mesero / Atendido por (opcional)
            </label>

            {meserosDisponibles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {meserosDisponibles.map((m) => {
                  const isSelected = mesero.toLowerCase() === m.nombre.toLowerCase();
                  return (
                    <button
                      key={m.id || m.nombre}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setMesero('');
                          setMeseroId(undefined);
                        } else {
                          setMesero(m.nombre);
                          setMeseroId(m.id);
                        }
                      }}
                      className={`min-h-[36px] rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-neutral-950 font-black shadow-sm'
                          : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      {m.nombre}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                value={mesero}
                onChange={(e) => {
                  setMesero(e.target.value);
                  setMeseroId(undefined);
                }}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                placeholder="Ej. Carlos, Ana..."
              />
            </div>
          </div>

          {/* Datos del Cliente (Opcional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Cliente (opcional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                  placeholder="Ej. Familia Pérez"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Teléfono (opcional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <input
                  type="tel"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                  placeholder="Ej. 3001234567"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Notas iniciales (opcional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                placeholder="Ej. Cumpleaños, traer copas extra..."
              />
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
              {cargando ? 'Abriendo mesa...' : 'Confirmar Apertura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
