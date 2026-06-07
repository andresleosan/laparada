// src/components/ui/Card.tsx
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevated?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, elevated = true, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-lg border border-neutral-700 bg-neutral-900
          ${elevated ? 'shadow-lg' : ''}
          ${className || ''}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
