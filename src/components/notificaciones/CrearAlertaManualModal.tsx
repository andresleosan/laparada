import { useState, type FormEvent } from 'react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { AlertCircle, Bell, X, Send } from 'lucide-react';
import type {
  ModuloNotificacion,
  UrgenciaNotificacion,
  CrearNotificacionInput,
} from '@/types/notificacion';

interface CrearAlertaManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCrear: (input: CrearNotificacionInput) => Promise<string | void>;
}

const MODULOS_DISPONIBLES: Array<{ id: ModuloNotificacion; label: string; ruta: string }> = [
  { id: 'cocina', label: 'Cocina & KDS', ruta: '/cocina' },
  { id: 'salon', label: 'Salón & Mesas', ruta: '/mesas' },
  { id: 'inventario', label: 'Bodega & Insumos', ruta: '/inventario' },
  { id: 'pedidos', label: 'Pedidos Web / Kiosco', ruta: '/pedidos' },
  { id: 'caja', label: 'Caja & POS', ruta: '/admin' },
  { id: 'sistema', label: 'General / Equipo', ruta: '/notificaciones' },
];

const URGENCIAS_DISPONIBLES: Array<{
  id: UrgenciaNotificacion;
  label: string;
  desc: string;
  colorClass: string;
}> = [
  {
    id: 'critica',
    label: 'Crítica',
    desc: 'Atención urgente inmediata (alarma doble)',
    colorClass: 'border-rose-500/50 bg-rose-950/30 text-rose-300',
  },
  {
    id: 'alta',
    label: 'Alta',
    desc: 'Prioridad alta de turno (timbre de cocina)',
    colorClass: 'border-amber-500/50 bg-amber-950/30 text-amber-300',
  },
  {
    id: 'media',
    label: 'Media',
    desc: 'Operación rutinaria (ding suave)',
    colorClass: 'border-sky-500/50 bg-sky-950/30 text-sky-300',
  },
  {
    id: 'baja',
    label: 'Informativa',
    desc: 'Aviso general sin sonido invasivo',
    colorClass: 'border-neutral-700 bg-neutral-800/60 text-neutral-300',
  },
];

export function CrearAlertaManualModal({
  isOpen,
  onClose,
  onCrear,
}: CrearAlertaManualModalProps) {
  const [modulo, setModulo] = useState<ModuloNotificacion>('cocina');
  const [urgencia, setUrgencia] = useState<UrgenciaNotificacion>('alta');
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enlace, setEnlace] = useState('/cocina');
  const [enviando, setEnviando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleModuloChange = (nuevoModulo: ModuloNotificacion) => {
    setModulo(nuevoModulo);
    const mod = MODULOS_DISPONIBLES.find((m) => m.id === nuevoModulo);
    if (mod) {
      setEnlace(mod.ruta);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const tituloTrim = titulo.trim();
    const mensajeTrim = mensaje.trim();

    if (!tituloTrim) {
      setErrorValidacion('Por favor ingresa un título para la alerta');
      return;
    }
    if (!mensajeTrim) {
      setErrorValidacion('Por favor ingresa el mensaje descriptivo');
      return;
    }

    setErrorValidacion(null);
    setEnviando(true);
    try {
      await onCrear({
        modulo,
        tipo: 'alerta_manual_equipo',
        titulo: tituloTrim,
        mensaje: mensajeTrim,
        urgencia,
        enlace: enlace.trim() || undefined,
        origen: 'manual',
      });
      onClose();
    } catch (err) {
      console.error('Error al emitir alerta manual:', err);
      setErrorValidacion('Ocurrió un error al registrar la alerta. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <StorefrontDialog
      labelledBy="crear-alerta-modal-titulo"
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-neutral-900 border border-amber-500/30 p-6 sm:p-8 shadow-2xl text-white">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Bell className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="crear-alerta-modal-titulo"
                className="font-display text-xl font-black uppercase text-amber-400 tracking-wide"
              >
                Emitir Alerta Operativa
              </h2>
              <p className="text-xs text-neutral-400 font-medium">
                Notifica al personal en tiempo real con timbre de urgencia
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
            aria-label="Cerrar modal de alerta"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {errorValidacion && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorValidacion}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Selector de Módulo Destino */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Módulo de la Alerta
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MODULOS_DISPONIBLES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModuloChange(m.id)}
                  aria-pressed={modulo === m.id}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left ${
                    modulo === m.id
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md'
                      : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de Nivel de Urgencia */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Nivel de Urgencia & Timbre
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {URGENCIAS_DISPONIBLES.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUrgencia(u.id)}
                  aria-pressed={urgencia === u.id}
                  className={`min-h-[44px] p-3 rounded-xl text-left border transition-all ${
                    urgencia === u.id
                      ? `${u.colorClass} ring-2 ring-amber-400/60 font-bold`
                      : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase">{u.label}</span>
                    {urgencia === u.id && (
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <p className="text-[11px] mt-0.5 opacity-80">{u.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Título de la Alerta */}
          <div>
            <label
              htmlFor="alerta-input-titulo"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5"
            >
              Título de la Alerta *
            </label>
            <input
              id="alerta-input-titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: ¡Mesa 4 requiere atención del capitán!"
              className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              maxLength={80}
              required
            />
          </div>

          {/* Mensaje descriptivo */}
          <div>
            <label
              htmlFor="alerta-input-mensaje"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5"
            >
              Detalle o Instrucción para el Equipo *
            </label>
            <textarea
              id="alerta-input-mensaje"
              rows={3}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Explica con claridad la situación o requerimiento..."
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              maxLength={300}
              required
            />
          </div>

          {/* Enlace o Pantalla sugerida */}
          <div>
            <label
              htmlFor="alerta-input-enlace"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5"
            >
              Ruta / Pantalla de Destino (Opcional)
            </label>
            <input
              id="alerta-input-enlace"
              type="text"
              value={enlace}
              onChange={(e) => setEnlace(e.target.value)}
              placeholder="/cocina, /mesas, /inventario..."
              className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="min-h-[44px] px-5 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-700 hover:text-white transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>{enviando ? 'Emitiendo...' : 'Emitir Alerta'}</span>
            </button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
