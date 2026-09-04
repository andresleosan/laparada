import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { getNextDialogFocusIndex } from '@/utils/dialogFocus';

interface StorefrontDialogProps {
  labelledBy: string;
  onClose: () => void;
  returnFocusSelector?: string;
  canClose?: boolean;
  className: string;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function StorefrontDialog({
  labelledBy,
  onClose,
  returnFocusSelector,
  canClose = true,
  className,
  children,
}: StorefrontDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);
  onCloseRef.current = onClose;
  canCloseRef.current = canClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const appRoot = document.getElementById('root');
    const rootWasInert = appRoot?.hasAttribute('inert') ?? false;
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden');
    const previousBodyOverflow = document.body.style.overflow;

    const getFocusableElements = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.getAttribute('aria-hidden') !== 'true'
      );

    (getFocusableElements()[0] ?? dialog).focus();
    appRoot?.setAttribute('inert', '');
    appRoot?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (canCloseRef.current) onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      const nextIndex = getNextDialogFocusIndex(
        currentIndex,
        focusableElements.length,
        event.shiftKey
      );

      event.preventDefault();
      (nextIndex >= 0 ? focusableElements[nextIndex] : dialog).focus();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;

      if (appRoot) {
        if (!rootWasInert) appRoot.removeAttribute('inert');
        if (previousAriaHidden == null) appRoot.removeAttribute('aria-hidden');
        else appRoot.setAttribute('aria-hidden', previousAriaHidden);
      }

      const returnTarget = returnFocusSelector
        ? document.querySelector<HTMLElement>(returnFocusSelector)
        : previouslyFocused?.isConnected && previouslyFocused !== document.body
          ? previouslyFocused
          : null;
      returnTarget?.focus();
    };
  }, [returnFocusSelector]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      className={className}
    >
      {children}
    </div>,
    document.body
  );
}
