import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

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
    <Modal isOpen={isOpen} onClose={onClose} title={title} closeButton size="lg">
      <form onSubmit={onSubmit} className="w-full space-y-6">
        <div className="space-y-4">{children}</div>
        <div className="flex gap-3 border-t border-[#e5e0d6] pt-4">
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
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
