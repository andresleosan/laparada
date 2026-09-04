// src/components/ui/Modal.tsx
import React from 'react';
import { X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeButton?: boolean;
  labelledBy?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeButton = true,
  labelledBy,
}: ModalProps) {
  const generatedId = React.useId();
  const titleId = labelledBy || `modal-${generatedId.replace(/:/g, '')}-title`;

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
    >
      <div
        className={`
          ${sizeStyles[size]} w-full
          max-h-[90dvh] overflow-y-auto rounded-2xl border border-[#ded8cc]
          bg-[#fffdf8] text-[#201f1b] shadow-2xl
        `}
      >
        {(title || closeButton) && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5e0d6] bg-[#fffdf8] px-5 py-4">
            {title && <h2 id={titleId} className="font-display text-xl font-bold text-[#201f1b]">{title}</h2>}
            {!title && !labelledBy && <h2 id={titleId} className="sr-only">Ventana de diálogo</h2>}
            {closeButton && (
              <button
                type="button"
                onClick={onClose}
                className="ml-auto grid h-11 w-11 place-items-center rounded-full border border-[#ded8cc] bg-white text-[#5f5a50] hover:bg-[#f0ede4]"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="admin-modal-content p-5 sm:p-6">{children}</div>
      </div>
    </StorefrontDialog>
  );
}
