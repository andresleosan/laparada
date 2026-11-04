import { useState, useId, type FormEvent, useEffect } from 'react';
import { X, User, Phone, MapPin, FileText, Edit2 } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { Cliente } from '@/types/cliente';
import { normalizarTelefono } from '@/utils/clienteUtils';

interface EditarClienteModalProps {
  cliente: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (clienteId: string, updates: Partial<Cliente>) => Promise<void>;
  cargando?: boolean;
}

export function EditarClienteModal({
  cliente,
  isOpen,
  onClose,
  onSubmit,
  cargando = false,
}: EditarClienteModalProps) {
  const generatedId = useId();
  const titleId = `modal-editar-cliente-${generatedId.replace(/:/g, '')}-title`;

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [barrio, setBarrio] = useState('');
  const [notas, setNotas] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (cliente) {
      setNombre(cliente.nombre || '');
      setTelefono(cliente.telefono || '');
      setDireccion(cliente.direcciones?.[0] || '');
      setBarrio(cliente.barrio || '');
      setNotas(cliente.notas || '');
      setErrorLocal(null);
    }
  }, [cliente]);

  if (!isOpen || !cliente) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 2) {
      setErrorLocal('Ingresa el nombre del cliente (mínimo 2 letras).');
      return;
    }

    const telNormalizado = normalizarTelefono(telefono);
    if (telNormalizado.length < 7) {
      setErrorLocal('Ingresa un número telefónico válido (mínimo 7 dígitos).');
      return;
    }

    try {
      const direccionesFinales = direccion.trim()
        ? Array.from(new Set([direccion.trim(), ...(cliente.direcciones || [])]))
        : cliente.direcciones;

      await onSubmit(cliente.id, {
        nombre: nombreLimpio,
        telefono: telNormalizado,
        direcciones: direccionesFinales,
        barrio: barrio.trim() || undefined,
        notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : 'Error al actualizar el cliente.');
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
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/10 text-gold-400">
              <Edit2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Editar Cliente
              </h2>
              <p className="text-xs text-neutral-400">
                Actualizar información de contacto y preferencias
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {errorLocal && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-400"
            >
              {errorLocal}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Nombre Completo *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-3 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Teléfono Celular *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                type="tel"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-3 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Dirección Principal
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej: Calle 10 #15-20"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-3 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Barrio
              </label>
              <input
                type="text"
                value={barrio}
                onChange={(e) => setBarrio(e.target.value)}
                placeholder="Ej: Caobos, Centro"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Notas / Preferencias
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
              <textarea
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas sobre el cliente"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-3 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="min-h-[44px] rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="min-h-[44px] rounded-xl bg-gold-400 hover:bg-gold-500 px-5 py-2.5 text-xs font-bold text-base-dark transition-all disabled:opacity-50"
            >
              {cargando ? 'Actualizando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
