// src/components/ui/Button.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      children,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'font-medium transition-all duration-200 flex items-center justify-center gap-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-gold-400 text-base-dark hover:bg-gold-500 active:bg-gold-600',
      secondary:
        'bg-neutral-700 text-neutral-50 hover:bg-neutral-600 active:bg-neutral-800',
      danger:
        'bg-status-error text-white hover:bg-red-600 active:bg-red-700',
      ghost:
        'bg-transparent text-gold-400 hover:bg-neutral-800 active:bg-neutral-700',
    };

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm min-h-10',
      md: 'px-4 py-3 text-base min-h-12',
      lg: 'px-6 py-4 text-lg min-h-14',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className || ''}
        `}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
