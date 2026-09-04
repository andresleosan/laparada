// src/components/ui/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId.replace(/:/g, '')}`;
    const errorId = `${inputId}-error`;

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-neutral-50">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            w-full px-4 py-3 rounded-lg
            bg-neutral-800 border border-neutral-700
            text-neutral-50 placeholder-neutral-500
            focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            ${error ? 'ring-2 ring-status-error' : ''}
            ${className || ''}
          `}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-status-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
