import { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, AlertTriangle, Archive, MessageSquare } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import type { EncuestaSatisfaccion, EstadoEncuestaSatisfaccion } from '@/types/satisfaccion';

interface ResponderQuejaModalProps {
  isOpen: boolean;
  encuesta: EncuestaSatisfaccion | null;
  onGuardar: (
    encuestaId: string,
    estado: EstadoEncuestaSatisfaccion,
    notasInternas?: string,
    contactadoPorWhatsApp?: boolean,
    atendidaPor?: string
  ) => Promise<void>;
  onClose: () => void;
}

export function ResponderQuejaModal({
  isOpen,
  encuesta,
  onGuardar,
  onClose,
}: ResponderQuejaModalProps) {
  const [estado, setEstado] = useState<EstadoEncuestaSatisfaccion>('en_seguimiento');
  const [notasInternas, setNotasInternas] = useState('');
  const [contactado, setContactado] = useState(false);
  const [atendidaPor, setAtendidaPor] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (encuesta) {
      setEstado(encuesta.estado || 'en_seguimiento');
      setNotasInternas(encuesta.notasInternas || '');
      setContactado(Boolean(encuesta.contactadoPorWhatsApp));
      setAtendidaPor(encuesta.atendidaPor || '');
    }
  }, [encuesta]);

  if (!isOpen || !encuesta) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGuardando(true);
      await onGuardar(
        encuesta.id,
        estado,
        notasInternas.trim(),
        contactado,
        atendidaPor.trim()
      );
      onClose();
    } catch (err) {
      console.error('Error al actualizar encuesta:', err);
    } finally {
      setGuardando(false);
    }
  };

  const estados: Array<{ id: EstadoEncuestaSatisfaccion; label: string; icon: typeof CheckCircle; color: string }> = [
    { id: 'nueva', label: 'Nueva', icon: Clock, color: 'text-sky-400 border-sky-400/40' },
    { id: 'en_seguimiento', label: 'En Seguimiento', icon: AlertTriangle, color: 'text-amber-400 border-amber-400/40' },
    { id: 'resuelta', label: 'Resuelta', icon: CheckCircle, color: 'text-emerald-400 border-emerald-400/40' },
    { id: 'archivada', label: 'Archivada', icon: Archive, color: 'text-neutral-400 border-neutral-600' },
  ];

  return (
    <StorefrontDialog
      labelledBy="responder-queja-title"
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-white w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <MessageSquare className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="responder-queja-title" className="text-lg font-bold font-display">
                Gestionar Retroalimentación
              </h2>
              <p className="text-xs text-neutral-400">
                Encuesta de {encuesta.clienteNombre || 'Comensal'} ({encuesta.calificacion}★)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Selector de Estado */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              Estado de Seguimiento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {estados.map((item) => {
                const IconComponent = item.icon;
                const isSelected = estado === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEstado(item.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all min-h-[44px] text-left ${
                      isSelected
                        ? `bg-neutral-800 ${item.color} shadow-inner`
                        : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nombre del responsable */}
          <div>
            <label htmlFor="responsable-input" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Atendido por (Responsable)
            </label>
            <input
              id="responsable-input"
              type="text"
              value={atendidaPor}
              onChange={(e) => setAtendidaPor(e.target.value)}
              placeholder="Ej: Administrador Juan, Mesero Carlos"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/80 min-h-[44px]"
            />
          </div>

          {/* Toggle contactado por WhatsApp */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <div>
              <p className="text-sm font-medium text-white">¿Contactado por WhatsApp?</p>
              <p className="text-xs text-neutral-400">
                Marca si ya le escribiste o llamaste al comensal.
              </p>
            </div>
            <input
              type="checkbox"
              id="contactado-check"
              checked={contactado}
              onChange={(e) => setContactado(e.target.checked)}
              className="w-5 h-5 accent-amber-400 cursor-pointer rounded"
            />
          </div>

          {/* Notas internas */}
          <div>
            <label htmlFor="notas-internas-input" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Bitácora y Notas Internas
            </label>
            <Textarea
              id="notas-internas-input"
              rows={3}
              value={notasInternas}
              onChange={(e) => setNotasInternas(e.target.value)}
              placeholder="Ej: Se habló con cocina sobre la temperatura del pan. Se le ofreció postre gratis en su próxima visita..."
              className="w-full bg-neutral-950 border-neutral-800 text-sm text-white placeholder-neutral-500 focus:border-amber-400/80"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={guardando}
              className="min-h-[44px]"
            >
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
