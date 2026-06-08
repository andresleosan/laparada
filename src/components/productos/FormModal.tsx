import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';

export interface FormModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading?: boolean;
  children: React.ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  title,
  onClose,
  onSubmit,
  loading = false,
  children,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeButton size="lg">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-700 pb-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-neutral-800 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} className="text-neutral-400" />
          </button>
        </div>

        {/* Form - scrollable content */}
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
        </form>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t border-neutral-700">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
            className="flex-1"
            onClick={onSubmit}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
